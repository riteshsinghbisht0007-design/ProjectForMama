const fs = require('fs');
let content = fs.readFileSync('src/components/WitnessDirectoryModal.tsx', 'utf8');

content = content.replace(
  /className="p-3 bg-card border border-border hover:border-border-strong rounded-xl transition-colors space-y-2 relative group"/g,
  'className="p-3 bg-card border border-border rounded-xl space-y-2 relative group card-premium"'
);

content = content.replace(
  /className="p-1\.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"/g,
  'className="p-1.5 rounded-lg text-muted-foreground btn-premium cursor-pointer"'
);

content = content.replace(
  /className="p-1\.5 rounded-lg hover:bg-muted text-primary-text hover:text-foreground transition-colors cursor-pointer"/g,
  'className="p-1.5 rounded-lg text-primary-text btn-premium cursor-pointer"'
);

content = content.replace(
  /className="p-1\.5 rounded-lg hover:bg-muted text-foreground hover:text-foreground transition-colors cursor-pointer"/g,
  'className="p-1.5 rounded-lg text-foreground btn-premium cursor-pointer"'
);

fs.writeFileSync('src/components/WitnessDirectoryModal.tsx', content);
