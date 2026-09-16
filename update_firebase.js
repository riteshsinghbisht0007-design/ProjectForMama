const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'services', 'firebase.ts');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('OAuthProvider')) {
    content = content.replace(
        "import {",
        "import {\n  OAuthProvider,"
    );
    
    content = content.replace(
        "export const facebookProvider = new FacebookAuthProvider();",
        "export const facebookProvider = new FacebookAuthProvider();\nexport const appleProvider = new OAuthProvider('apple.com');"
    );
    fs.writeFileSync(file, content);
}
