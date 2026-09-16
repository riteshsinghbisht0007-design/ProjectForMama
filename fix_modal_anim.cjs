const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

const anims = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.25s ease-out forwards;
}

.animate-scaleIn {
  animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
`;

if (!css.includes('@keyframes fadeIn')) {
  css += anims;
  fs.writeFileSync('src/index.css', css);
}

const filesToUpdate = [
  'src/components/AddSummonModal.tsx',
  'src/components/SummonDetailModal.tsx',
  'src/components/OfficerProfileModal.tsx',
  'src/components/SelectPersonModal.tsx',
  'src/components/SplitScreenshotModal.tsx',
  'src/components/UrgentAlertsModal.tsx',
  'src/components/WitnessDirectoryModal.tsx'
];

filesToUpdate.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /className="fixed inset-0 z-50 flex items-center justify-center (.*?) bg-black\/(?:60|80|85) backdrop-blur-(?:sm|md|lg)(.*?)"/,
    'className="fixed inset-0 z-50 flex items-center justify-center $1 bg-black/60 backdrop-blur-md $2 animate-fadeIn"'
  );
  content = content.replace(
    /className="(.*?) bg-background border border-border rounded-2xl(.*?) shadow-2xl(.*?)"/,
    'className="$1 bg-background border border-border rounded-2xl$2 shadow-premium-hover animate-scaleIn$3"'
  );
  fs.writeFileSync(file, content);
});

