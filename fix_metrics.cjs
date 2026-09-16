const fs = require('fs');

let content = fs.readFileSync('src/components/MetricCardsGrid.tsx', 'utf8');
content = content.replace(
  "className={`text-left p-4 rounded-xl border transition-all duration-200 relative overflow-hidden ${",
  "className={`text-left p-4 rounded-xl border card-premium relative overflow-hidden ${"
);
content = content.replace(
  "hover:border-border-strong hover:bg-card-hover'",
  "hover:border-primary-btn/30 hover:bg-card-hover'"
);
fs.writeFileSync('src/components/MetricCardsGrid.tsx', content);
