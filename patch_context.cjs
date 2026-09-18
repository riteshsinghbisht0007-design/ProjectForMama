const fs = require('fs');
let code = fs.readFileSync('src/context/SummonContext.tsx', 'utf8');

// Update interface
code = code.replace(
  "updateSummon: (id: string, updates: Partial<Summon>) => Promise<void>;",
  "updateSummon: (id: string, updates: Partial<Summon>, attachmentFile?: File | Blob | null, fileName?: string) => Promise<void>;"
);

// Update implementation
const oldUpdate = "  const updateSummon = async (id: string, updates: Partial<Summon>) => {";
const newUpdate = `  const updateSummon = async (id: string, updates: Partial<Summon>, attachmentFile?: File | Blob | null, fileName?: string) => {`;

code = code.replace(oldUpdate, newUpdate);

const oldUploadLogic = `    const updatedRecord = { ...updates, updatedAt: now };`;
const newUploadLogic = `    let finalImageUrl = updates.imageUrl;
    let finalPdfUrl = updates.pdfUrl;
    if (attachmentFile && fileName) {
      const dataUrl = await uploadAttachment(id, attachmentFile as File, fileName);
      if (fileName.toLowerCase().endsWith('.pdf')) {
        finalPdfUrl = dataUrl;
      } else {
        finalImageUrl = dataUrl;
      }
    }
    const updatedRecord = { ...updates, updatedAt: now, ...(finalImageUrl !== undefined && { imageUrl: finalImageUrl }), ...(finalPdfUrl !== undefined && { pdfUrl: finalPdfUrl }) };`;

code = code.replace(oldUploadLogic, newUploadLogic);

fs.writeFileSync('src/context/SummonContext.tsx', code);
console.log("Patched SummonContext.tsx");
