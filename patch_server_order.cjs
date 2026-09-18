const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const notifRegex = /  app\.get\('\/api\/notifications'[\s\S]*?\}\);\s*$/m;

// Find the block manually from app.get('/api/notifications' up to the app.delete cleanup
// The block spans from `app.get('/api/notifications'` to the end of `app.delete('/api/notifications/cleanup/:summonsId'`

const startString = "  app.get('/api/notifications', requireAuth,";
const endString = "res.status(500).json({ error: err.message });\n    }\n  });"; // end of delete

let startIndex = code.indexOf(startString);
let tempStr = code.substring(startIndex);
let endBlock = tempStr.indexOf(endString) + endString.length;

let block = code.substring(startIndex, startIndex + endBlock);

// Remove block from its current location
code = code.replace(block, '');

// Insert it right before the Vite middleware initialization
const insertPoint = "  // Vite middleware for development";
code = code.replace(insertPoint, block + "\n\n" + insertPoint);

fs.writeFileSync('server.ts', code);
