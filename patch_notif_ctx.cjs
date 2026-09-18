const fs = require('fs');
let code = fs.readFileSync('src/context/NotificationContext.tsx', 'utf8');

code = code.replace(
  "upcomingDays=7",
  "upcomingDays=${currentUser?.upcomingAlertDays || 7}"
);

fs.writeFileSync('src/context/NotificationContext.tsx', code);
