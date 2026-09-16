const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf8');

appContent = appContent.replace(
  /const \[showWelcome, setShowWelcome\] = useState<boolean>\(\(\) => \{\n    return !sessionStorage\.getItem\('summonsmitra_welcomed'\);\n  \}\);/g,
  `const [postLoginStage, setPostLoginStage] = useState<'idle' | 'hello' | 'email' | 'hold' | 'exit' | 'dashboard'>(() => {
    return sessionStorage.getItem('summonsmitra_welcomed') ? 'dashboard' : 'idle';
  });

  React.useEffect(() => {
    if (currentUser && postLoginStage === 'idle') {
      setPostLoginStage('hello');
    }
  }, [currentUser, postLoginStage]);`
);

appContent = appContent.replace(
  /\{showWelcome && currentUser && \(\n        <WelcomeAnimation \n          user=\{currentUser\} \n          onComplete=\{\(\) => \{\n            sessionStorage\.setItem\('summonsmitra_welcomed', 'true'\);\n            setShowWelcome\(false\);\n          \}\}\n        \/>\n      \)\}/,
  `{postLoginStage !== 'dashboard' && currentUser && (
        <WelcomeAnimation 
          user={currentUser} 
          stage={postLoginStage}
          onStageChange={setPostLoginStage}
        />
      )}`
);

appContent = appContent.replace(
  /\{!showWelcome && \(/g,
  `{postLoginStage === 'dashboard' && (`
);

fs.writeFileSync('src/App.tsx', appContent);
