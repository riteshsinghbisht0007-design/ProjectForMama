const fs = require('fs');
let code = fs.readFileSync('src/components/TopNavBar.tsx', 'utf8');

code = code.replace(
  "{upcomingCount}",
  "{unreadCount}"
);

fs.writeFileSync('src/components/TopNavBar.tsx', code);
