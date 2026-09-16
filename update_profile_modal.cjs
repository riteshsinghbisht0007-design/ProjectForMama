const fs = require('fs');

let code = fs.readFileSync('src/components/OfficerProfileModal.tsx', 'utf8');

// Add isLoggingOut state
code = code.replace(
  "  const [isSaving, setIsSaving] = useState(false);",
  "  const [isSaving, setIsSaving] = useState(false);\n  const [isLoggingOut, setIsLoggingOut] = useState(false);"
);

// Replace handleLogout
const oldHandleLogout = `
  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out of the police summon portal?')) {
      onClose();
      await logout();
    }
  };
`;

const newHandleLogout = `
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      onClose();
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setIsLoggingOut(false);
    }
  };
`;

code = code.replace(oldHandleLogout.trim(), newHandleLogout.trim());

// Update the logout button to show a loader
const oldLogoutBtn = `
          {/* Logout Button */}
          <div className="border-t border-[#222A3D] pt-4">
            <button
              onClick={handleLogout}
              id="logout-btn"
              className="w-full py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" /> End Officer Session & Log Out
            </button>
          </div>
`;

const newLogoutBtn = `
          {/* Logout Button */}
          <div className="border-t border-[#222A3D] pt-4">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              id="logout-btn"
              className="w-full py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? (
                <div className="w-4 h-4 border-2 border-red-200 border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {isLoggingOut ? 'Ending Session...' : 'End Officer Session & Log Out'}
            </button>
          </div>
`;

code = code.replace(oldLogoutBtn.trim(), newLogoutBtn.trim());

fs.writeFileSync('src/components/OfficerProfileModal.tsx', code);
