const fs = require('fs');

let content = fs.readFileSync('src/components/AddSummonModal.tsx', 'utf8');

// Modifying input fields in modal
content = content.replace(
  /className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-text\/50 text-foreground"/g,
  'className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm input-premium text-foreground"'
);
content = content.replace(
  /className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-text\/50 text-foreground resize-none"/g,
  'className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm input-premium text-foreground resize-none"'
);

// Buttons
content = content.replace(
  /className="px-6 py-2 rounded-lg bg-primary-btn text-white hover:bg-primary-hover font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"/g,
  'className="px-6 py-2 rounded-lg bg-primary-btn text-white font-bold text-sm flex items-center gap-2 btn-premium cursor-pointer"'
);
content = content.replace(
  /className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-border font-medium text-sm transition-colors cursor-pointer"/g,
  'className="px-4 py-2 rounded-lg bg-muted text-foreground font-medium text-sm btn-premium cursor-pointer"'
);

fs.writeFileSync('src/components/AddSummonModal.tsx', content);
