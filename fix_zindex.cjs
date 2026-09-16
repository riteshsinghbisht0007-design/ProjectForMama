const fs = require('fs');
let content = fs.readFileSync('src/components/WelcomeAnimation.tsx', 'utf8');
content = content.replace(/className="fixed inset-0 z-50/g, 'className="fixed inset-0 z-[100]');
fs.writeFileSync('src/components/WelcomeAnimation.tsx', content);
