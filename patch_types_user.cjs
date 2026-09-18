const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace(
  "authProvider: 'google' | 'facebook' | 'password';",
  "authProvider: 'google' | 'facebook' | 'password';\n  upcomingAlertDays?: number;"
);
fs.writeFileSync('src/types.ts', code);
