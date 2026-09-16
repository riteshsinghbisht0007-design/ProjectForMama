const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /onComplete=\{\(\) => \{\n            sessionStorage.setItem\('summonsmitra_welcomed', 'true'\);\n            setShowWelcome\(false\);\n          \}\}/g,
  `onComplete={() => {
            sessionStorage.setItem('summonsmitra_welcomed', 'true');
            setShowWelcome(false);
          }}`
);

fs.writeFileSync('src/App.tsx', content);

