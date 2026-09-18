const fs = require('fs');
let code = fs.readFileSync('src/services/firebase.ts', 'utf8');

code = code.replace(
  "  getDownloadURL,\n} from 'firebase/storage';",
  "  getDownloadURL,\n  deleteObject,\n} from 'firebase/storage';"
);

code = code.replace(
  "  getDownloadURL,\n};",
  "  getDownloadURL,\n  deleteObject,\n};"
);

fs.writeFileSync('src/services/firebase.ts', code);
console.log("Patched firebase.ts with deleteObject");
