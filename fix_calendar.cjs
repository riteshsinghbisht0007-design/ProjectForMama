const fs = require('fs');

let content = fs.readFileSync('src/components/HearingCalendarView.tsx', 'utf8');

content = content.replace(
  /className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground"/g,
  'className="p-1.5 rounded-lg border border-border text-foreground btn-premium"'
);

content = content.replace(
  /className="px-2.5 py-1 text-xs rounded-lg border border-border hover:bg-muted text-primary-text"/g,
  'className="px-2.5 py-1 text-xs rounded-lg border border-border text-primary-text btn-premium"'
);

content = content.replace(
  /className="px-3 py-1.5 bg-primary-btn text-white hover:bg-primary-hover font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"/g,
  'className="px-3 py-1.5 bg-primary-btn text-white font-bold text-xs rounded-lg flex items-center gap-1.5 btn-premium"'
);

content = content.replace(
  /className="p-3.5 bg-background border border-border hover:border-border-strong rounded-xl cursor-pointer transition-colors space-y-2"/g,
  'className="p-3.5 bg-background border border-border rounded-xl cursor-pointer space-y-2 card-premium"'
);

fs.writeFileSync('src/components/HearingCalendarView.tsx', content);
