const fs = require('fs');
let code = fs.readFileSync('src/services/firebase.ts', 'utf8');

code = code.replace(
  "export const appleProvider = new OAuthProvider('apple.com');",
  "export const appleProvider = new OAuthProvider('apple.com');\nappleProvider.addScope('email');\nappleProvider.addScope('name');"
);

fs.writeFileSync('src/services/firebase.ts', code);
