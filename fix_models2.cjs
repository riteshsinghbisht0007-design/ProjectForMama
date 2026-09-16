const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "primaryModel: 'gemini-2.5-flash',",
  "primaryModel: 'gemini-3.8-flash',"
);
content = content.replace(
  "fallbackModels: ['gemini-2.0-flash-exp', 'gemini-1.5-flash'],",
  "fallbackModels: ['gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-image'],"
);
content = content.replace(
  "const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash'];",
  "const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-image'];"
);

fs.writeFileSync('server.ts', content);
