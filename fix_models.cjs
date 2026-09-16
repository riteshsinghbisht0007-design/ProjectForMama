const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "fallbackModels: ['gemini-2.5-flash', 'gemini-2.5-flash'],",
  "fallbackModels: ['gemini-2.0-flash-exp', 'gemini-1.5-flash'],"
);

content = content.replace(
  "const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash'];",
  "const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash'];"
);

fs.writeFileSync('server.ts', content);
