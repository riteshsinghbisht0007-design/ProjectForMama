const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'className="px-5 py-2.5 rounded-xl bg-primary-btn text-white hover:bg-primary-hover font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-blue-500/20 transition-all cursor-pointer"',
  'className="px-5 py-2.5 rounded-xl bg-primary-btn text-white font-bold text-xs flex items-center gap-2 btn-premium cursor-pointer"'
);

// Tabs
content = content.replace(
  "className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${",
  "className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 btn-premium ${"
);

// Search input
content = content.replace(
  'className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-text/50 text-foreground placeholder:text-muted-foreground"',
  'className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm input-premium text-foreground placeholder:text-muted-foreground"'
);

// Add empty state buttons
content = content.replace(
  'className="px-6 py-2.5 rounded-lg bg-primary-btn text-white hover:bg-primary-hover font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-blue-500/20 transition-all mx-auto cursor-pointer"',
  'className="px-6 py-2.5 rounded-lg bg-primary-btn text-white font-bold text-sm flex items-center gap-2 btn-premium mx-auto cursor-pointer"'
);

content = content.replace(
  'className="px-6 py-2.5 rounded-lg bg-muted text-foreground hover:bg-border font-bold text-sm flex items-center gap-2 transition-all mx-auto cursor-pointer"',
  'className="px-6 py-2.5 rounded-lg bg-muted text-foreground font-bold text-sm flex items-center gap-2 btn-premium mx-auto cursor-pointer"'
);

fs.writeFileSync('src/App.tsx', content);
