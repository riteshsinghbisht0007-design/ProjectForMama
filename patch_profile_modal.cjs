const fs = require('fs');
let code = fs.readFileSync('src/components/OfficerProfileModal.tsx', 'utf8');

code = code.replace(
  "const [rank, setRank] = useState(currentUser?.rank || '');",
  "const [rank, setRank] = useState(currentUser?.rank || '');\n  const [upcomingAlertDays, setUpcomingAlertDays] = useState(currentUser?.upcomingAlertDays || 7);"
);

code = code.replace(
  "setRank(currentUser.rank || '');",
  "setRank(currentUser.rank || '');\n      setUpcomingAlertDays(currentUser.upcomingAlertDays || 7);"
);

code = code.replace(
  "rank,\n        photoURL,",
  "rank,\n        photoURL,\n        upcomingAlertDays,"
);

const newField = `
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Upcoming Hearing Alerts (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={upcomingAlertDays}
                  onChange={(e) => setUpcomingAlertDays(parseInt(e.target.value) || 7)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Number of days in advance to show upcoming court hearings.</p>
              </div>
`;

code = code.replace(
  /<div>\s*<label className="block text-xs font-bold text-foreground mb-1">\s*Rank/,
  newField + "\n              $&"
);

fs.writeFileSync('src/components/OfficerProfileModal.tsx', code);
