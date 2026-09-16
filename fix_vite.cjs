const fs = require('fs');

let content = fs.readFileSync('vite.config.ts', 'utf8');

if (!content.includes('hmr: false')) {
  content = content.replace(
    /allowedHosts: true,/,
    "allowedHosts: true,\n    hmr: false,"
  );
  fs.writeFileSync('vite.config.ts', content);
}
