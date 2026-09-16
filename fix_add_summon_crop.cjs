const fs = require('fs');

let content = fs.readFileSync('src/components/AddSummonModal.tsx', 'utf8');

// 1. Add ImageCropperModal import
if (!content.includes('ImageCropperModal')) {
  content = content.replace(
    "import { SelectPersonModal } from './SelectPersonModal';",
    "import { SelectPersonModal } from './SelectPersonModal';\nimport { ImageCropperModal } from './ImageCropperModal';"
  );
}

// 2. Add cropImageSrc state
if (!content.includes('cropImageSrc')) {
  content = content.replace(
    "const [formError, setFormError] = useState<string | null>(null);",
    "const [formError, setFormError] = useState<string | null>(null);\n  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);\n  const [cropMimeType, setCropMimeType] = useState<string>('image/jpeg');\n  const [cropFileName, setCropFileName] = useState<string>('image.jpg');"
  );
}

// 3. Update handleCapturePhoto
content = content.replace(
  /const handleCapturePhoto = \(\) => \{[\s\S]*?triggerOcrPipeline\(dataUrl, 'image\/jpeg'\);\n    \}\n  \};/,
  `const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 800;
    canvas.height = videoRef.current.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const captureName = \`Camera_Capture_\${Date.now()}.jpg\`;
      
      setCropMimeType('image/jpeg');
      setCropFileName(captureName);
      setCropImageSrc(dataUrl);
      stopCamera();
    }
  };`
);

// 4. Update handleImageUpload
content = content.replace(
  /const handleImageUpload = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?reader\.readAsDataURL\(file\);\n  \};/,
  `const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCropFileName(file.name);
    setCropMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };`
);

// 5. Add handleCropComplete
const handleCropCompleteStr = `
  const handleCropComplete = (croppedBlob: Blob) => {
    setCropImageSrc(null);
    const file = new File([croppedBlob], cropFileName, { type: cropMimeType });
    setRawFile(file);
    setAttachmentType('image');
    setFileName(cropFileName);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAttachmentPreview(dataUrl);
      triggerOcrPipeline(dataUrl, cropMimeType);
    };
    reader.readAsDataURL(croppedBlob);
  };
`;

if (!content.includes('handleCropComplete')) {
  content = content.replace(
    "const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {",
    handleCropCompleteStr + "\n  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {"
  );
}

// 6. Render ImageCropperModal
if (!content.includes('<ImageCropperModal')) {
  content = content.replace(
    "        </div>\n      </div>\n    </div>",
    `        </div>
      </div>
      {cropImageSrc && (
        <ImageCropperModal
          isOpen={true}
          onClose={() => setCropImageSrc(null)}
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          // no aspect ratio = free crop for documents
        />
      )}
    </div>`
  );
}

fs.writeFileSync('src/components/AddSummonModal.tsx', content);

