const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];",
  "const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash'];"
);

code = code.replace(
  "primaryModel: 'gemini-3.1-flash-lite',",
  "primaryModel: 'gemini-2.5-flash',"
);
code = code.replace(
  "fallbackModels: ['gemini-3.8-flash', 'gemini-flash-latest'],",
  "fallbackModels: ['gemini-2.0-flash-exp', 'gemini-1.5-flash'],"
);

fs.writeFileSync('server.ts', code);
