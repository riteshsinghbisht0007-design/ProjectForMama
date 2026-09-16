const fs = require('fs');
let code = fs.readFileSync('src/services/firebase.ts', 'utf8');

code = code.replace(
  "export const facebookProvider = new FacebookAuthProvider();",
  "export const facebookProvider = new FacebookAuthProvider();\nfacebookProvider.addScope('email');"
);

fs.writeFileSync('src/services/firebase.ts', code);
