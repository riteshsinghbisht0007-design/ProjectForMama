const fs = require('fs');
let code = fs.readFileSync('src/components/ImageCropperModal.tsx', 'utf8');

const replacement = `
      // Add max dimension scaling for performance
      const MAX_DIMENSION = 1600;
      let finalWidth = completedCrop.width * scaleX;
      let finalHeight = completedCrop.height * scaleY;
      
      if (finalWidth > MAX_DIMENSION || finalHeight > MAX_DIMENSION) {
        if (finalWidth > finalHeight) {
          finalHeight = Math.round(finalHeight * (MAX_DIMENSION / finalWidth));
          finalWidth = MAX_DIMENSION;
        } else {
          finalWidth = Math.round(finalWidth * (MAX_DIMENSION / finalHeight));
          finalHeight = MAX_DIMENSION;
        }
      }

      canvas.width = finalWidth;
      canvas.height = finalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingQuality = 'high';

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      ctx.drawImage(
        imgRef.current,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        finalWidth,
        finalHeight
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
          }
        },
        'image/jpeg',
        0.75 // Optimized quality for fast OCR
      );
`;

code = code.replace(/canvas\.width = Math\.floor\(completedCrop\.width \* scaleX \* pixelRatio\);[\s\S]*?0\.95\s*\);/m, replacement);
fs.writeFileSync('src/components/ImageCropperModal.tsx', code);
