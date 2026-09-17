const fs = require('fs');
let code = fs.readFileSync('src/components/AddSummonModal.tsx', 'utf8');

code = code.replace(
  /<span>Saving to Cloud Database\.\.\.<\/span>/g,
  '<span>Saving...</span>'
);

code = code.replace(
  /<span>Save Judicial Summon<\/span>/g,
  '<span>Save Summons</span>'
);

fs.writeFileSync('src/components/AddSummonModal.tsx', code);
