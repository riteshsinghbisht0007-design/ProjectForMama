const fs = require('fs');
let code = fs.readFileSync('src/components/SummonDetailModal.tsx', 'utf8');

const importTarget = "import { downloadSummonNoticePDF } from '../utils/pdfService';";
code = code.replace(importTarget, importTarget + "\nimport { ImageCropperModal } from './ImageCropperModal';");

const hooksTarget = "  const [removeImage, setRemoveImage] = useState<boolean>(false);";
const hooksNew = `  const [removeImage, setRemoveImage] = useState<boolean>(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState<string>('');
  const [cropMimeType, setCropMimeType] = useState<string>('image/jpeg');`;
code = code.replace(hooksTarget, hooksNew);

const handlerTarget = `  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditRawFile(file);
    setEditFileName(file.name);
    setRemoveImage(false);
    const reader = new FileReader();
    reader.onload = () => {
      setEditAttachmentPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };`;

const handlerNew = `  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleEditCropComplete = (croppedBlob: Blob) => {
    setCropImageSrc(null);
    const file = new File([croppedBlob], cropFileName, { type: cropMimeType });
    setEditRawFile(file);
    setEditFileName(cropFileName);
    setRemoveImage(false);
    const reader = new FileReader();
    reader.onload = () => {
      setEditAttachmentPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };`;
code = code.replace(handlerTarget, handlerNew);

const modalTarget = `          {/* Full Image Modal */}`;
const modalNew = `      {cropImageSrc && (
        <ImageCropperModal
          isOpen={!!cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          imageSrc={cropImageSrc}
          onCropComplete={handleEditCropComplete}
        />
      )}
          {/* Full Image Modal */}`;
code = code.replace(modalTarget, modalNew);

fs.writeFileSync('src/components/SummonDetailModal.tsx', code);
console.log("Patched SummonDetailModal crop");
