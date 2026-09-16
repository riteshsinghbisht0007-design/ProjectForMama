const fs = require('fs');

let code = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

// replace all fetch('/api/auth/...' with fetch('/api/auth/...', { credentials: 'include', ... }
// Since I already wrote the objects, I'll just regex replace "headers:" with "credentials: 'include',\n        headers:"

code = code.replace(/headers: \{ 'Content-Type': 'application\/json' \}/g, "credentials: 'include',\n        headers: { 'Content-Type': 'application/json' }");

// And for the GET /api/auth/me
code = code.replace("await fetch('/api/auth/me');", "await fetch('/api/auth/me', { credentials: 'include' });");
// For logout
code = code.replace("await fetch('/api/auth/logout', { method: 'POST' });", "await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });");

fs.writeFileSync('src/context/AuthContext.tsx', code);
