const fs = require('fs');
let code = fs.readFileSync('src/utils/ocrService.ts', 'utf8');

code = code.replace(
  /export const optimizeImageForOcr = async \(\s*dataUrl: string,\s*mimeType: string,\s*maxDimension = 2048,\s*quality = 0\.85\s*\)/,
  'export const optimizeImageForOcr = async (\n  dataUrl: string,\n  mimeType: string,\n  maxDimension = 1500,\n  quality = 0.75\n)'
);

fs.writeFileSync('src/utils/ocrService.ts', code);
