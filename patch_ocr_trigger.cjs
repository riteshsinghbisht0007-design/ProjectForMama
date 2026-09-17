const fs = require('fs');
let code = fs.readFileSync('src/components/AddSummonModal.tsx', 'utf8');

const replacement = `
  const triggerOcrPipeline = async (dataUrl: string, mime: string) => {
    if (isExtracting) return; // Prevent concurrent OCR runs
    setCurrentStep('processing');
    setIsExtracting(true);
`;

code = code.replace(/const triggerOcrPipeline = async \(dataUrl: string, mime: string\) => \{\s*setCurrentStep\('processing'\);\s*setIsExtracting\(true\);/, replacement);
fs.writeFileSync('src/components/AddSummonModal.tsx', code);
