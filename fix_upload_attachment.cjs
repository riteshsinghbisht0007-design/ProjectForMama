const fs = require('fs');

let content = fs.readFileSync('src/context/SummonContext.tsx', 'utf8');

const oldUpload = `  // 2. Instant document attachment converter (fast base64/dataURL, no cloud upload latency)
  const uploadAttachment = async (
    _summonId: string,
    fileOrDataUrl: string | File,
    _fileName: string
  ): Promise<string> => {
    if (typeof fileOrDataUrl === 'string') {
      return fileOrDataUrl;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve((reader.result as string) || '');
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(fileOrDataUrl);
    });
  };`;

const newUpload = `  // 2. Secure cloud document upload
  const uploadAttachment = async (
    summonId: string,
    fileOrDataUrl: string | File,
    fileName: string
  ): Promise<string> => {
    if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('http')) {
      return fileOrDataUrl; // Already a URL
    }

    try {
      let fileToUpload: Blob;
      if (typeof fileOrDataUrl === 'string') {
        // It's a base64 data URL, convert to Blob
        const fetchResponse = await fetch(fileOrDataUrl);
        fileToUpload = await fetchResponse.blob();
      } else {
        fileToUpload = fileOrDataUrl;
      }

      // Import firebase storage here or dynamically
      const { storage, storageRef, uploadBytes, getDownloadURL } = await import('../services/firebase');
      
      const fileExt = fileName.split('.').pop() || 'png';
      const storagePath = \`summons/\${summonId}/\${Date.now()}.\${fileExt}\`;
      const fileRef = storageRef(storage, storagePath);
      
      await uploadBytes(fileRef, fileToUpload);
      const downloadURL = await getDownloadURL(fileRef);
      return downloadURL;
    } catch (err) {
      console.error('Failed to upload attachment:', err);
      // Fallback to dataURL if upload fails
      if (typeof fileOrDataUrl === 'string') return fileOrDataUrl;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.readAsDataURL(fileOrDataUrl);
      });
    }
  };`;

content = content.replace(oldUpload, newUpload);

fs.writeFileSync('src/context/SummonContext.tsx', content);
