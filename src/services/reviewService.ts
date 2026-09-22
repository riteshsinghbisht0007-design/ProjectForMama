import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface AppReview {
  userId: string;
  officerName?: string;
  badgeNumber?: string;
  rank?: string;
  rating: number; // 1 to 5
  feedback: string;
  appVersion?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Loads the existing review for the current officer, if any.
 * Checks the fast server database endpoint first (~4ms) and falls back
 * to Firestore with a bounded timeout to prevent UI freezes.
 */
export const fetchMyReview = async (userId: string): Promise<AppReview | null> => {
  if (!userId) return null;

  // 1. Try Server API first (direct in-memory/MongoDB database, fast ~4ms response)
  try {
    const headers: Record<string, string> = {};
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch {
        // Fall back to session cookie
      }
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('/api/reviews/mine', {
      credentials: 'include',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json.review) {
        return json.review as AppReview;
      }
    }
  } catch (apiErr) {
    console.warn('[Review Service] Server review fetch notice:', apiErr);
  }

  // 2. Secondary check from Firestore /reviews/{userId} (with bounded 1.8s timeout to never hang)
  if (db && auth.currentUser?.uid === userId) {
    try {
      const docRef = doc(db, 'reviews', userId);
      const docSnap = await Promise.race([
        getDoc(docRef),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore fetch timeout')), 1800)
        ),
      ]);
      if (docSnap && docSnap.exists()) {
        return docSnap.data() as AppReview;
      }
    } catch {
      // Offline or unavailable - handled gracefully
    }
  }

  return null;
};

/**
 * Saves or updates an officer's app review.
 * Enforces authenticated user ID, valid 1-5 rating, and feedback text length.
 * Writes to the primary database and syncs to Firestore with guaranteed timeout termination.
 */
export const saveMyReview = async (params: {
  userId: string;
  rating: number;
  feedback: string;
  officerName?: string;
  badgeNumber?: string;
  rank?: string;
}): Promise<{ success: boolean; message: string; review?: AppReview }> => {
  const { userId, rating, feedback, officerName, badgeNumber, rank } = params;

  if (!userId) {
    return {
      success: false,
      message: 'Please sign in before submitting a review.',
    };
  }

  if (!rating || rating < 1 || rating > 5) {
    return {
      success: false,
      message: 'Please select a star rating between 1 and 5.',
    };
  }

  const cleanFeedback = feedback.trim();
  if (cleanFeedback.length < 3) {
    return {
      success: false,
      message: 'Feedback must contain at least 3 meaningful characters.',
    };
  }

  if (cleanFeedback.length > 2000) {
    return {
      success: false,
      message: 'Feedback cannot exceed 2,000 characters.',
    };
  }

  const reviewPayload: AppReview = {
    userId,
    rating: Math.round(rating),
    feedback: cleanFeedback,
    officerName: (officerName || '').trim(),
    badgeNumber: (badgeNumber || '').trim(),
    rank: (rank || '').trim(),
    appVersion: '1.0.0',
    updatedAt: new Date().toISOString(),
  };

  let firestoreSaved = false;
  let serverSaved = false;
  let failureReason: 'unauthenticated' | 'permission-denied' | 'network-error' | 'unknown' = 'unknown';

  // 1. Primary write to backend database via /api/reviews (AbortController bounded to 7s)
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch {
        // Continue with session cookie
      }
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const res = await fetch('/api/reviews', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(reviewPayload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      serverSaved = true;
    } else {
      if (res.status === 401) {
        failureReason = 'unauthenticated';
      } else if (res.status === 403) {
        failureReason = 'permission-denied';
      } else {
        failureReason = 'network-error';
      }
    }
  } catch (apiErr: any) {
    console.warn('[Review Service] Backend write notice:', apiErr?.message || apiErr);
    failureReason = 'network-error';
  }

  // 2. Sync to Firestore /users/{userId}/reviews/{userId} and /reviews/{userId}
  if (db && auth.currentUser?.uid === userId) {
    try {
      const userReviewDocRef = doc(db, 'users', userId, 'reviews', userId);
      const topReviewDocRef = doc(db, 'reviews', userId);
      const dataToSave = {
        ...reviewPayload,
        createdAt: serverTimestamp(),
      };
      
      const firestoreWritePromise = Promise.all([
        setDoc(userReviewDocRef, dataToSave, { merge: true }),
        setDoc(topReviewDocRef, dataToSave, { merge: true }).catch(() => {})
      ]);
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore write timeout')), 2500)
      );
      await Promise.race([firestoreWritePromise, timeoutPromise]);
      firestoreSaved = true;
    } catch (fsErr: any) {
      console.warn('[Review Service] Firestore write notice:', fsErr?.message || fsErr);
      if (fsErr?.code === 'permission-denied') {
        failureReason = 'permission-denied';
      }
    }
  }

  if (firestoreSaved || serverSaved) {
    return {
      success: true,
      message: 'Review saved successfully!',
      review: reviewPayload,
    };
  }

  // Map any failure into clean, friendly user messaging (never raw tech error strings)
  let friendlyMessage = "We couldn't save your review. Please check your connection and try again.";
  if (failureReason === 'unauthenticated') {
    friendlyMessage = 'Please sign in before submitting a review.';
  } else if (failureReason === 'permission-denied') {
    friendlyMessage = "Sorry, we couldn't save your review right now. Please try again.";
  }

  return {
    success: false,
    message: friendlyMessage,
  };
};
