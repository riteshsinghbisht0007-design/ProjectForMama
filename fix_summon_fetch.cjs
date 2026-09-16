const fs = require('fs');

let code = fs.readFileSync('src/context/SummonContext.tsx', 'utf8');

// The fetches are generally fetch('/api/...', { headers: ...
// Or fetch(\`/api/...\`, { headers: ...
// Let's do a replace that matches headers: { and prepends credentials: 'include',

code = code.replace(/headers: \{/g, "credentials: 'include',\n        headers: {");

fs.writeFileSync('src/context/SummonContext.tsx', code);
