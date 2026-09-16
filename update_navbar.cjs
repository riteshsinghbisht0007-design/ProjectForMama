const fs = require('fs');

let nav = fs.readFileSync('src/components/TopNavBar.tsx', 'utf8');

// Imports
nav = nav.replace(
  "import { Shield, Bell, User, Clock, CheckCircle2, Users } from 'lucide-react';",
  "import { Shield, Bell, User, Clock, CheckCircle2, Users, Sun, Moon } from 'lucide-react';"
);

// State for theme
nav = nav.replace(
  "const { summons } = useSummons();",
  `const { summons } = useSummons();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };`
);

// Toggle button in UI
const witnessBtn = `{/* Witness & Person Directory */}`;
const toggleBtn = `
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            className="p-2 rounded-lg bg-card border border-border hover:bg-muted text-primary-text hover:text-foreground transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          {/* Witness & Person Directory */}`;

nav = nav.replace(witnessBtn, toggleBtn);

fs.writeFileSync('src/components/TopNavBar.tsx', nav);
