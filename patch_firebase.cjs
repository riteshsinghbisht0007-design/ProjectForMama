const fs = require('fs');
let code = fs.readFileSync('src/services/firebase.ts', 'utf8');

if (!code.includes("deleteObject")) {
  code = code.replace(
    "uploadBytes, getDownloadURL }",
    "uploadBytes, getDownloadURL, deleteObject }"
  );
  fs.writeFileSync('src/services/firebase.ts', code);
  console.log("Patched firebase.ts");
}
