const fs = require('fs');
let content = fs.readFileSync('src/components/TopNavBar.tsx', 'utf8');

content = content.replace(/className="p-2 rounded-lg bg-card border border-border hover:bg-muted text-primary-text hover:text-foreground transition-colors cursor-pointer"/g, 'className="p-2 rounded-lg bg-card border border-border text-primary-text hover:text-primary-hover btn-premium cursor-pointer"');
content = content.replace(/className="relative p-2 rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-colors"/g, 'className="relative p-2 rounded-lg bg-card border border-border text-foreground btn-premium cursor-pointer"');
content = content.replace(/className="flex items-center gap-2 p-1.5 rounded-lg bg-card border border-border hover:border-border-strong transition-all"/g, 'className="flex items-center gap-2 p-1.5 rounded-lg bg-card border border-border hover:border-border-strong btn-premium cursor-pointer"');
content = content.replace(/bg-background-alt border-b border-border backdrop-blur-md bg-opacity-95 shadow-lg/g, 'bg-background/80 border-b border-border backdrop-blur-xl shadow-premium');

fs.writeFileSync('src/components/TopNavBar.tsx', content);
