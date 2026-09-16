const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  /\{showWelcome && currentUser && \([\s\S]*?setShowWelcome\(false\);\n          \}\} \n        \/>\n      \)\}/m,
  `{postLoginStage !== 'dashboard' && currentUser && (
        <WelcomeAnimation 
          user={currentUser} 
          stage={postLoginStage}
          onStageChange={setPostLoginStage}
        />
      )}`
);

fs.writeFileSync('src/App.tsx', content);

