const fs = require('fs');

let content = fs.readFileSync('src/components/SummonDetailModal.tsx', 'utf8');

content = content.replace(
  /<button\n\s*onClick=\{handleSaveEdit\}[\s\S]*?<\/button>/,
  match => `<div className="flex items-center">\n                  ${match}`
);

content = content.replace(
  /<X className="w-3\.5 h-3\.5" \/> Cancel\n\s*<\/button>/,
  match => `${match}\n                </div>`
);

fs.writeFileSync('src/components/SummonDetailModal.tsx', content);

