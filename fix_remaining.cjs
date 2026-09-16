const fs = require('fs');
const files = [
  'src/components/OfficerProfileModal.tsx',
  'src/components/SplitScreenshotModal.tsx',
  'src/components/UrgentAlertsModal.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // buttons
    content = content.replace(
      /className="px-6 py-2 rounded-lg bg-primary-btn text-white hover:bg-primary-hover font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"/g,
      'className="px-6 py-2 rounded-lg bg-primary-btn text-white font-bold text-sm flex items-center gap-2 btn-premium cursor-pointer"'
    );
    content = content.replace(
      /className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-border font-medium text-sm transition-colors cursor-pointer"/g,
      'className="px-4 py-2 rounded-lg bg-muted text-foreground font-medium text-sm btn-premium cursor-pointer"'
    );
    content = content.replace(
      /className="px-4 py-2 rounded-xl bg-muted text-foreground hover:bg-border font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"/g,
      'className="px-4 py-2 rounded-xl bg-muted text-foreground font-bold text-xs flex items-center gap-2 btn-premium cursor-pointer"'
    );
    content = content.replace(
      /className="px-4 py-2 rounded-xl bg-primary-btn text-white hover:bg-primary-hover font-bold text-xs flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500\/20 cursor-pointer"/g,
      'className="px-4 py-2 rounded-xl bg-primary-btn text-white font-bold text-xs flex items-center gap-2 btn-premium cursor-pointer"'
    );
    content = content.replace(
      /className="px-3 py-1\.5 rounded-lg border border-border hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-2 transition-colors"/g,
      'className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground flex items-center gap-2 btn-premium cursor-pointer"'
    );

    // split cards
    content = content.replace(
      /className="p-3 bg-card border border-border hover:border-red-500\/50 rounded-xl cursor-pointer transition-colors space-y-2 relative"/g,
      'className="p-3 bg-card border border-border rounded-xl cursor-pointer space-y-2 relative card-premium"'
    );
    content = content.replace(
      /className="p-4 bg-card border border-border hover:border-primary-text\/50 rounded-xl cursor-pointer transition-colors flex items-center justify-between group"/g,
      'className="p-4 bg-card border border-border rounded-xl cursor-pointer flex items-center justify-between group card-premium"'
    );
    fs.writeFileSync(file, content);
  }
});
