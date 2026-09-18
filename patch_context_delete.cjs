const fs = require('fs');
let code = fs.readFileSync('src/context/SummonContext.tsx', 'utf8');

const targetDelete = `  const deleteSummon = async (id: string) => {
    if (!currentUser) return;
    try {
      const response = await fetch(\`/api/summons/\${id}\`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete summon from database');
      }`;

const replacementDelete = `  const deleteSummon = async (id: string) => {
    if (!currentUser) return;
    try {
      const summonToDelete = summons.find(s => s.id === id);
      
      const response = await fetch(\`/api/summons/\${id}\`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete summon from database');
      }

      if (summonToDelete) {
        try {
          const { storage, deleteObject, ref, isFirebaseConfigured } = await import('../services/firebase');
          if (isFirebaseConfigured && storage) {
            if (summonToDelete.imageUrl && summonToDelete.imageUrl.includes('firebasestorage.googleapis.com')) {
               const fileRef = ref(storage, summonToDelete.imageUrl);
               await deleteObject(fileRef).catch(() => {});
            }
            if (summonToDelete.pdfUrl && summonToDelete.pdfUrl.includes('firebasestorage.googleapis.com')) {
               const fileRef = ref(storage, summonToDelete.pdfUrl);
               await deleteObject(fileRef).catch(() => {});
            }
          }
        } catch (e) {}
      }`;

code = code.replace(targetDelete, replacementDelete);

fs.writeFileSync('src/context/SummonContext.tsx', code);
console.log("Patched SummonContext delete");
