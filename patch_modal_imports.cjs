const fs = require('fs');
let code = fs.readFileSync('src/components/SummonDetailModal.tsx', 'utf8');

code = code.replace("  ExternalLink,", "  ExternalLink,\n  Image as ImageIcon,");

fs.writeFileSync('src/components/SummonDetailModal.tsx', code);
console.log("Patched SummonDetailModal imports");
