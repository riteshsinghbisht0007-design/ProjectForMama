const fs = require('fs');

let content = fs.readFileSync('src/components/SummonDetailModal.tsx', 'utf8');

content = content.replace(
  /className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-pointer"/g,
  'className="p-1.5 rounded-lg text-muted-foreground btn-premium cursor-pointer"'
);
content = content.replace(
  /className="px-4 py-2 rounded-lg bg-emerald-950\/60 hover:bg-emerald-900 border border-emerald-800\/60 text-emerald-300 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"/g,
  'className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 btn-premium cursor-pointer"'
);

fs.writeFileSync('src/components/SummonDetailModal.tsx', content);
