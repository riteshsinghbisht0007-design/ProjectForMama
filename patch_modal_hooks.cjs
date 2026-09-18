const fs = require('fs');
let code = fs.readFileSync('src/components/SummonDetailModal.tsx', 'utf8');

const target = "  const [editUrgency, setEditUrgency] = useState<'Standard' | 'High' | 'Urgent'>('Standard');";
const replacement = `  const [editUrgency, setEditUrgency] = useState<'Standard' | 'High' | 'Urgent'>('Standard');
  const [editRawFile, setEditRawFile] = useState<File | null>(null);
  const [editAttachmentPreview, setEditAttachmentPreview] = useState<string | null>(null);
  const [editFileName, setEditFileName] = useState<string>('');
  const [removeImage, setRemoveImage] = useState<boolean>(false);
  const [isFullImageOpen, setIsFullImageOpen] = useState<boolean>(false);
  
  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

code = code.replace(target, replacement);

fs.writeFileSync('src/components/SummonDetailModal.tsx', code);
console.log("Patched SummonDetailModal hooks");
