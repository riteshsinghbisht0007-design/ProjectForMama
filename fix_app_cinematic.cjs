const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldCode = `  if (showWelcome && currentUser) {
    return (
      <WelcomeAnimation 
        user={currentUser} 
        onComplete={() => {
          sessionStorage.setItem('summonsmitra_welcomed', 'true');
          setShowWelcome(false);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-white">`;

const newCode = `  return (
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

content = content.replace(oldCode, newCode);

// We need to also close the fragment at the end of the return statement
content = content.replace(/<\/div>\n  \);\n}\n/g, '    </div>\n    </>\n  );\n}\n');

fs.writeFileSync('src/App.tsx', content);
