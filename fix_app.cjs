const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldReturn = `  // If not logged in, render the AuthScreen
  if (!currentUser) {
    return <AuthScreen />;
  }

  const handleOpenAddForDate = (dateStr: string) => {
    setDefaultHearingDate(dateStr);
    setIsAddModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary-btn selection:text-white">`;

const newReturn = `  // If not logged in, render the AuthScreen
  if (!currentUser) {
    return <AuthScreen />;
  }

  const handleOpenAddForDate = (dateStr: string) => {
    setDefaultHearingDate(dateStr);
    setIsAddModalOpen(true);
  };

  if (showWelcome && currentUser) {
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

content = content.replace(oldReturn, newReturn);
fs.writeFileSync('src/App.tsx', content);
