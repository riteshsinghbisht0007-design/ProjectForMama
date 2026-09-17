const fs = require('fs');
let code = fs.readFileSync('src/context/SummonContext.tsx', 'utf8');

const replacement = `
  const uploadAttachment = async (
    summonId: string,
    fileOrDataUrl: string | File,
    fileName: string
  ): Promise<string> => {
    if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('http')) {
      return fileOrDataUrl;
    }

    try {
      const { storage, storageRef, uploadBytes, getDownloadURL, isFirebaseConfigured } = await import('../services/firebase');
      
      let fileToUpload: File | Blob;
      if (typeof fileOrDataUrl === 'string') {
        const res = await fetch(fileOrDataUrl);
        fileToUpload = await res.blob();
      } else {
        fileToUpload = fileOrDataUrl;
      }

      if (!isFirebaseConfigured) {
        throw new Error('Firebase Storage not configured, falling back to local base64.');
      }

      const fileRef = storageRef(storage, \`summons/\${currentUser?.uid}/\${summonId}_\${fileName}\`);
      
      // Add timeout to prevent hanging
      const uploadPromise = uploadBytes(fileRef, fileToUpload);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), 10000));
      
      await Promise.race([uploadPromise, timeoutPromise]);
      const downloadURL = await getDownloadURL(fileRef);
      return downloadURL;
    } catch (err) {
      console.warn('Failed to upload attachment, falling back to data URL:', err);
      // Fallback to dataURL if upload fails
      if (typeof fileOrDataUrl === 'string') return fileOrDataUrl;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.readAsDataURL(fileOrDataUrl);
      });
    }
  };
`;

code = code.replace(/const uploadAttachment = async \([\s\S]*?catch \(err\) \{[\s\S]*?\}\s*\};\s*const addSummon = async/m, replacement.trim() + '\n\n  const addSummon = async');

fs.writeFileSync('src/context/SummonContext.tsx', code);
