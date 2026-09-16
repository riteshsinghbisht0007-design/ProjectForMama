const fs = require('fs');

let content = fs.readFileSync('src/components/AuthScreen.tsx', 'utf8');

// Inputs
content = content.replace(
  /className="w-full bg-background-alt border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-text\/50 text-foreground placeholder:text-muted-foreground transition-all"/g,
  'className="w-full bg-background-alt border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm input-premium text-foreground placeholder:text-muted-foreground"'
);

// Buttons
content = content.replace(
  /className="w-full py-2.5 px-4 rounded-xl bg-primary-btn hover:bg-primary-hover text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500\/20 transition-all disabled:opacity-50 cursor-pointer"/g,
  'className="w-full py-2.5 px-4 rounded-xl bg-primary-btn text-white text-sm font-bold flex items-center justify-center gap-2 btn-premium cursor-pointer"'
);

content = content.replace(
  /className="w-full py-2.5 px-4 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"/g,
  'className="w-full py-2.5 px-4 rounded-xl border border-border bg-card text-xs font-semibold text-foreground flex items-center justify-center gap-3 btn-premium cursor-pointer"'
);

content = content.replace(
  /className="w-full py-2.5 px-4 rounded-xl border border-border bg-\[\#1877F2\]\/15 hover:bg-\[\#1877F2\]\/25 text-xs font-semibold text-primary-text-bright flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"/g,
  'className="w-full py-2.5 px-4 rounded-xl border border-border bg-[#1877F2]/15 text-xs font-semibold text-primary-text-bright flex items-center justify-center gap-3 btn-premium cursor-pointer"'
);

content = content.replace(
  /className="flex items-center justify-between text-xs text-muted-foreground pt-2"/g,
  'className="flex items-center justify-between text-xs text-muted-foreground pt-3"'
);

fs.writeFileSync('src/components/AuthScreen.tsx', content);
