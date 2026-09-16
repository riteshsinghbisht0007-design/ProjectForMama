const fs = require('fs');
let content = fs.readFileSync('src/components/WelcomeAnimation.tsx', 'utf8');
content = content.replace(/from 'framer-motion'/g, "from 'motion/react'");
fs.writeFileSync('src/components/WelcomeAnimation.tsx', content);
