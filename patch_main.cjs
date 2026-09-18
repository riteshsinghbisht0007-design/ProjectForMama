const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');

if (!code.includes('NotificationProvider')) {
  code = code.replace(
    "import { SummonProvider } from './context/SummonContext';",
    "import { SummonProvider } from './context/SummonContext';\nimport { NotificationProvider } from './context/NotificationContext';"
  );
  
  code = code.replace(
    "<SummonProvider>",
    "<SummonProvider>\n            <NotificationProvider>"
  );
  
  code = code.replace(
    "</SummonProvider>",
    "</NotificationProvider>\n          </SummonProvider>"
  );
  
  fs.writeFileSync('src/main.tsx', code);
}
