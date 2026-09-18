const fs = require('fs');
let code = fs.readFileSync('src/context/NotificationContext.tsx', 'utf8');

code = code.replace(
  "import { useAuth } from './AuthContext';",
  "import { useAuth } from './AuthContext';\nimport { useSummons } from './SummonContext';"
);

code = code.replace(
  "const { currentUser } = useAuth();",
  "const { currentUser } = useAuth();\n  const { summons } = useSummons();"
);

code = code.replace(
  "useEffect(() => {\n    if (currentUser) {\n      fetchNotifications();\n    } else {\n      setNotifications([]);\n    }\n  }, [currentUser, fetchNotifications]);",
  "useEffect(() => {\n    if (currentUser) {\n      fetchNotifications();\n    } else {\n      setNotifications([]);\n    }\n  }, [currentUser, summons, fetchNotifications]);"
);

fs.writeFileSync('src/context/NotificationContext.tsx', code);
