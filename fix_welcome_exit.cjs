const fs = require('fs');

let content = fs.readFileSync('src/components/WelcomeAnimation.tsx', 'utf8');

content = content.replace(
  /exit={{ opacity: 0, scale: 1.05, filter: 'blur\(10px\)' }}/g,
  "exit={{ opacity: 0, y: -20 }}"
);

content = content.replace(
  /transition={{ duration: 0.8, ease: \[0.22, 1, 0.36, 1\] }}/g,
  "transition={{ duration: 0.5, ease: 'easeOut' }}"
);

fs.writeFileSync('src/components/WelcomeAnimation.tsx', content);

