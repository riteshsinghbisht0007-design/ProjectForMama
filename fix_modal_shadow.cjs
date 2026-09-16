const fs = require('fs');

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
  content = content.replace(/shadow-2xl/g, 'shadow-premium-hover animate-scaleIn');
  content = content.replace(/shadow-xl/g, 'shadow-premium animate-scaleIn');
  fs.writeFileSync(file, content);
});

