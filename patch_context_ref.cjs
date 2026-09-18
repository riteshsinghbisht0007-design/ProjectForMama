const fs = require('fs');
let code = fs.readFileSync('src/context/SummonContext.tsx', 'utf8');

code = code.replace(
  "const { storage, deleteObject, ref, isFirebaseConfigured } = await import('../services/firebase');",
  "const { storage, deleteObject, storageRef, isFirebaseConfigured } = await import('../services/firebase');"
);

code = code.replace(
  "const fileRef = ref(storage, summonToDelete.imageUrl);",
  "const fileRef = storageRef(storage, summonToDelete.imageUrl);"
);

code = code.replace(
  "const fileRef = ref(storage, summonToDelete.pdfUrl);",
  "const fileRef = storageRef(storage, summonToDelete.pdfUrl);"
);

fs.writeFileSync('src/context/SummonContext.tsx', code);
console.log("Patched SummonContext ref");
