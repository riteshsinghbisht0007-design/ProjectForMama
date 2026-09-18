const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
if (!code.includes('Loader2,')) {
  code = code.replace("Plus,", "Plus,\n  Loader2,");
  fs.writeFileSync('src/App.tsx', code);
}
