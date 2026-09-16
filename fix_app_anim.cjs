const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add motion import if not exists
if (!content.includes('import { motion }')) {
  content = content.replace("import { useAuth }", "import { motion } from 'motion/react';\nimport { useAuth }");
}

const returnStart = `  return (
    <>
      {showWelcome && currentUser && (
        <WelcomeAnimation 
          user={currentUser} 
          onComplete={() => {
            sessionStorage.setItem('summonsmitra_welcomed', 'true');
            setShowWelcome(false);
          }} 
        />
      )}
      <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-white">`;

const newReturnStart = `
  const dashboardVariants = {
    hidden: { opacity: 0, y: 100 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.8, 
        ease: [0.22, 1, 0.36, 1],
        when: "beforeChildren",
        staggerChildren: 0.08
      } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <>
      {showWelcome && currentUser && (
        <WelcomeAnimation 
          user={currentUser} 
          onComplete={() => {
            sessionStorage.setItem('summonsmitra_welcomed', 'true');
            setShowWelcome(false);
          }} 
        />
      )}
      {!showWelcome && (
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={dashboardVariants}
          className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-white"
        >
`;

content = content.replace(returnStart, newReturnStart);

// Close motion.div
content = content.replace(/<\/div>\n    <\/>\n  \);\n}\n/g, '        </motion.div>\n      )}\n    </>\n  );\n}\n');

// Replace static divs with motion.divs
content = content.replace(
  /<TopNavBar/g, 
  '<motion.div variants={itemVariants} className="w-full relative z-30">\n          <TopNavBar'
);
content = content.replace(
  /onOpenAlerts=\{\(\) => setIsAlertsOpen\(true\)\}\n      \/>/g,
  'onOpenAlerts={() => setIsAlertsOpen(true)}\n          />\n        </motion.div>'
);

content = content.replace(
  /\{(\/\* Welcome & Command Header \*\/)\}\n(.*?)<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-5 shadow-lg">/g,
  '{$1}\n        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-5 shadow-lg">'
);

content = content.replace(
  /<\/div>\n\n        \{\/\* Dynamic Metric Statistics Grid \*\/\}/g,
  '</motion.div>\n\n        {/* Dynamic Metric Statistics Grid */}'
);

content = content.replace(
  /\{\/\* Dynamic Metric Statistics Grid \*\/\}\n(.*?)<MetricCardsGrid/g,
  '{/* Dynamic Metric Statistics Grid */}\n        <motion.div variants={itemVariants}><MetricCardsGrid'
);

content = content.replace(
  /if \(activeTab === 'calendar'\) setActiveTab\('docket'\);\n          \}\}\n        \/>/g,
  "if (activeTab === 'calendar') setActiveTab('docket');\n          }}\n        /></motion.div>"
);

content = content.replace(
  /\{\/\* Primary View Switcher Tabs \*\/\}\n(.*?)<div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-3">/g,
  '{/* Primary View Switcher Tabs */}\n        <motion.div variants={itemVariants} className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-3">'
);

// We need to close it after the tabs ends. It ends with </div>
content = content.replace(
  /<\/select>\n            <\/div>\n          \)\}\n        <\/div>\n\n        \{\/\* TAB 1/g,
  '</select>\n            </div>\n          )}\n        </motion.div>\n\n        {/* TAB 1'
);

content = content.replace(
  /\{\/\* TAB 1: DOCKET LIST VIEW \*\/\}\n(.*?)<div className="space-y-4">/g,
  '{/* TAB 1: DOCKET LIST VIEW */}\n        {activeTab === \'docket\' && (\n          <motion.div variants={itemVariants} className="space-y-4">'
);
content = content.replace(
  /<\/div>\n            \)\}\n          <\/div>\n        \)\}/g,
  '</div>\n            )}\n          </motion.div>\n        )}'
);

content = content.replace(
  /\{\/\* TAB 2: COURT CALENDAR VIEW \*\/\}\n(.*?)<HearingCalendarView/g,
  '{/* TAB 2: COURT CALENDAR VIEW */}\n        {activeTab === \'calendar\' && (\n          <motion.div variants={itemVariants}><HearingCalendarView'
);

content = content.replace(
  /onAddSummonForDate=\{handleOpenAddForDate\}\n          \/>\n        \)\}/g,
  'onAddSummonForDate={handleOpenAddForDate}\n          /></motion.div>\n        )}'
);

fs.writeFileSync('src/App.tsx', content);

