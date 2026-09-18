const fs = require('fs');
let code = fs.readFileSync('src/components/OfficerProfileModal.tsx', 'utf8');

const newSetting = `
              <div className="mt-4 pt-4 border-t border-border">
                <h3 className="text-sm font-bold text-foreground mb-3">Notification Preferences</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground">Browser Notifications</span>
                    <p className="text-[10px] text-muted-foreground">Receive system-level alerts for urgent hearings.</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (Notification.permission === 'default') {
                        const perm = await Notification.requestPermission();
                        if (perm === 'granted') {
                          alert('Browser notifications enabled.');
                        } else {
                          alert('Browser notifications denied.');
                        }
                      } else if (Notification.permission === 'granted') {
                        alert('Browser notifications are already enabled.');
                      } else {
                        alert('Browser notifications are blocked. Please enable them in your browser settings.');
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-colors"
                  >
                    Configure
                  </button>
                </div>
              </div>
`;

code = code.replace(
  /<\/div>\s*<\/div>\s*\{!isSaving \? \(\s*<div className="p-6 border-t border-border bg-background-alt flex justify-between items-center">/g,
  newSetting + "\n            </div>\n          </div>\n\n          {!isSaving ? (\n            <div className=\"p-6 border-t border-border bg-background-alt flex justify-between items-center\">"
);

fs.writeFileSync('src/components/OfficerProfileModal.tsx', code);
