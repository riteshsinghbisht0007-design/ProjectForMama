const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /\{\/\* TAB 1: DOCKET LIST VIEW \*\/\}\n        \{activeTab === 'docket' && \(\n          <div className="space-y-4">/,
  '{/* TAB 1: DOCKET LIST VIEW */}\n        {activeTab === \'docket\' && (\n          <motion.div variants={itemVariants} className="space-y-4">'
);

content = content.replace(
  /\{\/\* TAB 2: COURT CALENDAR VIEW \*\/\}\n        \{activeTab === 'calendar' && \(\n          <HearingCalendarView/,
  '{/* TAB 2: COURT CALENDAR VIEW */}\n        {activeTab === \'calendar\' && (\n          <motion.div variants={itemVariants}><HearingCalendarView'
);

fs.writeFileSync('src/App.tsx', content);

