const fs = require('fs');
let content = fs.readFileSync('src/components/OfficerProfileModal.tsx', 'utf8');

// Add ImageCropperModal import
if (!content.includes('ImageCropperModal')) {
  content = content.replace(
    "import { useSummons } from '../context/SummonContext';",
    "import { useSummons } from '../context/SummonContext';\nimport { ImageCropperModal } from './ImageCropperModal';"
  );
}

// Add state for cropping
if (!content.includes('cropImageSrc')) {
  content = content.replace(
    "const [isLoggingOut, setIsLoggingOut] = useState(false);",
    `const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);`
  );
}

// Replace handleAvatarSelect
const newHandleAvatarSelect = `
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (e.g. max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    setCropImageSrc(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPhotoURL(base64);
      updateOfficerProfile({ photoURL: base64 }).catch(err => {
        alert("Failed to save profile picture: " + err.message);
      });
    };
    reader.readAsDataURL(croppedBlob);
  };
`;
content = content.replace(
  /const handleAvatarSelect = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?URL\(file\);\n  \};/,
  newHandleAvatarSelect.trim()
);

// Add the cropper modal at the end of the return
content = content.replace(
  /<\/div>\n    <\/div>\n  \);\n\};/,
  `    </div>

      {cropImageSrc && (
        <ImageCropperModal
          isOpen={true}
          onClose={() => setCropImageSrc(null)}
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          aspectRatio={1} // Square for profile
        />
      )}
    </div>
  );
};`
);

fs.writeFileSync('src/components/OfficerProfileModal.tsx', content);

