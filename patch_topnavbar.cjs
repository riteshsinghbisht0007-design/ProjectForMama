const fs = require('fs');
let code = fs.readFileSync('src/components/TopNavBar.tsx', 'utf8');

code = code.replace(
  "import { useSummons } from '../context/SummonContext';",
  "import { useSummons } from '../context/SummonContext';\nimport { useNotifications } from '../context/NotificationContext';"
);

// We need to replace upcomingCount logic with unreadCount
const countLogicRegex = /const upcomingCount = summons\.filter[^]+?\}\)\.length;/;
code = code.replace(countLogicRegex, "const { unreadCount } = useNotifications();");

// Replace {upcomingCount} with {unreadCount}
code = code.replace(/upcomingCount > 0/g, "unreadCount > 0");
code = code.replace(/>\{upcomingCount\}</g, ">{unreadCount}<");

fs.writeFileSync('src/components/TopNavBar.tsx', code);
