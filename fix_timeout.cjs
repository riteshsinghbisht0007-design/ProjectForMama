const fs = require('fs');

let content = fs.readFileSync('src/utils/ocrService.ts', 'utf8');
content = content.replace(
  "const timeoutId = setTimeout(() => controller.abort(), 45000);",
  "const timeoutId = setTimeout(() => controller.abort(new Error('Timeout')), 120000);"
);

content = content.replace(
  "failMessage = 'Document OCR timed out after 45 seconds. Please enter details manually.';",
  "failMessage = 'Document OCR timed out. The scan took too long. Please enter details manually.';"
);

fs.writeFileSync('src/utils/ocrService.ts', content);
