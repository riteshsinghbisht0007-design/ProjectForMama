const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const notifBlockRegex = /\/\/ --- Notifications Endpoints ---[\s\S]*?app\.delete\('\/api\/notifications\/cleanup\/:summonsId'[\s\S]*?\}\);\s*\n/;
const match = code.match(notifBlockRegex);

if (match) {
  const notifCode = match[0];
  code = code.replace(notifBlockRegex, '');
  
  // Insert before app.listen
  code = code.replace(
    /app\.listen\(PORT,/,
    notifCode + "\n  app.listen(PORT,"
  );
  
  fs.writeFileSync('server.ts', code);
  console.log('moved routes');
} else {
  console.log('not found');
}
