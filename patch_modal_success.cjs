const fs = require('fs');
let code = fs.readFileSync('src/components/AddSummonModal.tsx', 'utf8');

if (!code.includes('const [saveSuccess, setSaveSuccess] = useState(false);')) {
  code = code.replace(
    /const \[isSubmitting, setIsSubmitting\] = useState\(false\);/,
    'const [isSubmitting, setIsSubmitting] = useState(false);\n  const [saveSuccess, setSaveSuccess] = useState(false);'
  );
}

code = code.replace(
  /showToast\(`Summon \$\{summonNumber\.trim\(\)\} registered and saved successfully`, 'success', 'Docket Saved'\);\n\s*\/\/ Reset & close\n\s*stopCamera\(\);\n\s*onClose\(\);/,
  `setSaveSuccess(true);
      showToast(\`Summon \$\{summonNumber.trim()\} registered and saved successfully\`, 'success', 'Docket Saved');
      setTimeout(() => {
        stopCamera();
        onClose();
        setSaveSuccess(false);
      }, 1000);`
);

code = code.replace(
  /\{isSubmitting \? \([\s\S]*?\) : \([\s\S]*?\) : \([\s\S]*?\)\s*\}\s*<\/button>/g, // wait, regular expression with ternary needs care
  ''
);
fs.writeFileSync('src/components/AddSummonModal.tsx', code);
