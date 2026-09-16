const fs = require('fs');

let content = fs.readFileSync('src/components/SummonCard.tsx', 'utf8');

content = content.replace(
  "className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden bg-card border-border hover:border-border-strong hover:bg-card-hover group shadow-sm ${",
  "className={`p-4 rounded-xl border card-premium cursor-pointer relative overflow-hidden bg-card group ${"
);

fs.writeFileSync('src/components/SummonCard.tsx', content);
