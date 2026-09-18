const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace UrgentAlertsModal with NotificationPanelModal
code = code.replace(
  "import { UrgentAlertsModal } from './components/UrgentAlertsModal';",
  "import { NotificationPanelModal } from './components/NotificationPanelModal';\nimport { PriorityAlertsDashboardWidget } from './components/PriorityAlertsDashboardWidget';"
);

// Add the widget below MetricCardsGrid
code = code.replace(
  /<MetricCardsGrid[\s\S]*?\/>/,
  `$&
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
            <PriorityAlertsDashboardWidget onSelectSummon={(sid) => {
              const s = summons.find(x => x.id === sid);
              if (s) setSelectedSummon(s);
            }} />
          </div>`
);

// Replace UrgentAlertsModal component usage
const oldAlertsModal = /<UrgentAlertsModal[\s\S]*?\/>/;
const newAlertsModal = `<NotificationPanelModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        onSelectSummon={(sid) => {
          const s = summons.find(x => x.id === sid);
          if (s) setSelectedSummon(s);
        }}
      />`;

code = code.replace(oldAlertsModal, newAlertsModal);

fs.writeFileSync('src/App.tsx', code);
