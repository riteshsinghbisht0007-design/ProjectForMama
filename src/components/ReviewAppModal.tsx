import React, { useState, useEffect, useRef } from 'react';
import { Star, X, Send, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchMyReview, saveMyReview, AppReview } from '../services/reviewService';

interface ReviewAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewAppModal: React.FC<ReviewAppModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [existingReview, setExistingReview] = useState<AppReview | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmittingRef = useRef<boolean>(false);

  // Load existing review if already submitted
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return;

    let isMounted = true;
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setIsSuccess(false);

    fetchMyReview(currentUser.uid)
      .then((review) => {
        if (!isMounted) return;
        if (review) {
          setExistingReview(review);
          setRating(review.rating || 5);
          setFeedback(review.feedback || '');
        }
      })
      .catch((err) => {
        console.warn('[Review Modal] Notice on loading previous review:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUser?.uid]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions synchronously
    if (isSubmittingRef.current || isSubmitting || isSuccess) {
      return;
    }

    if (!currentUser?.uid) {
      setErrorMessage('Please sign in before submitting a review.');
      return;
    }

    if (rating < 1 || rating > 5) {
      setErrorMessage('Please select a star rating between 1 and 5.');
      return;
    }

    const cleanFeedback = feedback.trim();
    if (!cleanFeedback || cleanFeedback.length < 3) {
      setErrorMessage('Feedback must contain at least 3 meaningful characters.');
      return;
    }

    if (cleanFeedback.length > 2000) {
      setErrorMessage('Feedback cannot exceed 2,000 characters.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await saveMyReview({
        userId: currentUser.uid,
        rating,
        feedback: cleanFeedback,
        officerName: currentUser.displayName || undefined,
        badgeNumber: currentUser.badgeNumber || undefined,
        rank: currentUser.rank || undefined,
      });

      if (res.success) {
        setIsSuccess(true);
        setSuccessMessage(res.message);
        if (res.review) {
          setExistingReview(res.review);
        }
        // Smoothly close and return to profile after brief visual confirmation
        setTimeout(() => {
          onClose();
        }, 1600);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage("We couldn't save your review. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const getRatingLabel = (stars: number) => {
    switch (stars) {
      case 1:
        return 'Needs Major Improvement';
      case 2:
        return 'Fair - Several Issues';
      case 3:
        return 'Good - Meets Operational Needs';
      case 4:
        return 'Very Good - Reliable & Helpful';
      case 5:
        return 'Excellent - Outstanding Judicial Assistant';
      default:
        return 'Select a rating';
    }
  };

  const activeDisplayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div
      id="review-app-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h2 id="review-modal-title" className="text-base font-bold text-foreground">
                Review My App
              </h2>
              <p className="text-xs text-muted-foreground">
                Help us improve Summons Mitra for field officers and judicial staff
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close review dialog"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-primary-btn border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground">Loading your officer review record...</p>
            </div>
          ) : (
            <>
              {/* Success alert */}
              {successMessage && (
                <div
                  id="review-success-banner"
                  className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-start gap-2.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{successMessage}</div>
                </div>
              )}

              {/* Error alert */}
              {errorMessage && (
                <div
                  id="review-error-banner"
                  className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-xl text-xs flex items-start gap-2.5 transition-all"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">{errorMessage}</div>
                </div>
              )}

              {/* Existing review indicator */}
              {existingReview && !successMessage && (
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg text-[11px] text-blue-700 dark:text-blue-300 flex items-center justify-between">
                  <span>You previously reviewed this app. Saving again will update your review.</span>
                  {existingReview.updatedAt && (
                    <span className="font-mono text-[10px] opacity-75">
                      {new Date(existingReview.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              {/* Star Rating Section */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Overall Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= activeDisplayRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        id={`star-rating-${star}`}
                        disabled={isSubmitting || isSuccess}
                        onClick={() => {
                          setRating(star);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        aria-label={`${star} star${star > 1 ? 's' : ''}`}
                        className="p-1 rounded hover:scale-110 active:scale-95 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:cursor-not-allowed"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            isFilled
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-muted-foreground/30 hover:text-amber-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-3 text-xs font-medium text-amber-600 dark:text-amber-400">
                    {getRatingLabel(activeDisplayRating)}
                  </span>
                </div>
              </div>

              {/* Feedback Text Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="review-feedback" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /> Officer Feedback & Remarks <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[11px] font-mono ${feedback.length > 1900 ? 'text-amber-500 font-bold' : 'text-muted-foreground'}`}>
                    {feedback.length} / 2000
                  </span>
                </div>
                <textarea
                  id="review-feedback"
                  rows={4}
                  value={feedback}
                  onChange={(e) => {
                    setFeedback(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Share your experience using SummonsMitra in the field: summon scanning accuracy, warrant scheduling, court alerts, or suggestions for improvement..."
                  disabled={isSubmitting || isSuccess}
                  maxLength={2000}
                  className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary-text focus:outline-none focus:ring-1 focus:ring-primary-btn/30 resize-none transition-all disabled:opacity-60"
                />
                <p className="text-[10px] text-muted-foreground">
                  Minimum 3 characters. Your review will be securely associated with your authenticated officer profile.
                </p>
              </div>

              {/* Submitting Officer Context Pill */}
              {currentUser && (
                <div className="p-2.5 bg-muted/40 rounded-lg border border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Submitting as:</span>
                  <span className="font-semibold text-foreground">
                    {currentUser.displayName || 'Officer'} {currentUser.badgeNumber ? `(#${currentUser.badgeNumber})` : ''}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-review-btn"
                  disabled={isSubmitting || isSuccess || feedback.trim().length < 3}
                  className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    isSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-primary-btn hover:bg-primary-hover active:scale-[0.98] text-white'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Saving Review...</span>
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Review saved successfully!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 shrink-0" />
                      <span>Save Review</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

