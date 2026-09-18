const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace urgentCount with unreadCount from useNotifications
code = code.replace(
  "import { useSummons } from './context/SummonContext';",
  "import { useSummons } from './context/SummonContext';\nimport { useNotifications } from './context/NotificationContext';"
);

const urgentRegex = /\/\/ Urgent hearings count[\s\S]*?\}\)\.length;/;
code = code.replace(urgentRegex, "const { unreadCount } = useNotifications();");
code = code.replace(/urgentCount > 0/g, "unreadCount > 0");
code = code.replace(/>\{urgentCount\} /g, ">{unreadCount} ");

fs.writeFileSync('src/App.tsx', code);
