const fs = require('fs');
let code = fs.readFileSync('src/components/AddSummonModal.tsx', 'utf8');

const replacement = `
  const handleSaveSummon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double clicks
    
    setFormError(null);
`;

code = code.replace(/const handleSaveSummon = async \(e: React\.FormEvent\) => \{\s*e\.preventDefault\(\);\s*setFormError\(null\);/, replacement);
fs.writeFileSync('src/components/AddSummonModal.tsx', code);
