const fs = require('fs');

let code = fs.readFileSync('src/utils/ocrService.ts', 'utf8');

code = code.replace(/fetch\('\/api\/ocr\/health', \{ method: 'GET' \}\);/g, "fetch('/api/ocr/health', { method: 'GET', credentials: 'include' });");
code = code.replace(/fetch\('\/api\/ocr', \{/g, "fetch('/api/ocr', {\n      credentials: 'include',");

fs.writeFileSync('src/utils/ocrService.ts', code);
