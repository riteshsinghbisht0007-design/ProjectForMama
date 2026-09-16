const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/uid: user\._id\.toString\(\)/g, "uid: user.providerId || user._id.toString()");

fs.writeFileSync('server.ts', code);
