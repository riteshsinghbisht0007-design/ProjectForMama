const fs = require('fs');
let content = fs.readFileSync('src/components/SelectPersonModal.tsx', 'utf8');

content = content.replace(
  /className="p-3 bg-card border border-border hover:border-primary-btn\/30 hover:bg-card-hover rounded-xl cursor-pointer transition-all flex items-center justify-between group"/g,
  'className="p-3 bg-card border border-border rounded-xl cursor-pointer flex items-center justify-between group card-premium"'
);

fs.writeFileSync('src/components/SelectPersonModal.tsx', content);
