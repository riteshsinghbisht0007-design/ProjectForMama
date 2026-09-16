const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const oldMime = `      // Strip potential data URL prefix
      const cleanBase64 = image.includes('base64,') ? image.split('base64,')[1] : image;

      // Normalize mimeType
      let normalizedMime = mimeType || 'image/jpeg';
      if (normalizedMime.includes('pdf')) {
        normalizedMime = 'application/pdf';
      } else if (normalizedMime.includes('png')) {
        normalizedMime = 'image/png';
      } else if (normalizedMime.includes('webp')) {
        normalizedMime = 'image/webp';
      } else {
        normalizedMime = 'image/jpeg';
      }`;

const newMime = `      // Trust the data URL's mime type if available
      let actualMime = mimeType || 'image/jpeg';
      if (image.startsWith('data:')) {
        const extractedMime = image.split(';')[0].split(':')[1];
        if (extractedMime) {
          actualMime = extractedMime;
        }
      }

      // Strip potential data URL prefix
      const cleanBase64 = image.includes('base64,') ? image.split('base64,')[1] : image;

      // Normalize mimeType
      let normalizedMime = actualMime.toLowerCase();
      if (normalizedMime.includes('pdf')) {
        normalizedMime = 'application/pdf';
      } else if (normalizedMime.includes('png')) {
        normalizedMime = 'image/png';
      } else if (normalizedMime.includes('webp')) {
        normalizedMime = 'image/webp';
      } else if (normalizedMime.includes('heic') || normalizedMime.includes('heif')) {
        normalizedMime = 'image/heic';
      } else {
        normalizedMime = 'image/jpeg'; // fallback
      }`;

content = content.replace(oldMime, newMime);
fs.writeFileSync('server.ts', content);
