const fs = require('fs');
let code = fs.readFileSync('src/utils/shareService.ts', 'utf8');

const oldShare = `export const shareSummonNative = async (summon: Summon, splitImageUrl?: string): Promise<boolean> => {
  const text = generateFormattedForwardText(summon);

  if (navigator.share) {
    try {
      if (splitImageUrl && navigator.canShare) {
        const blob = await (await fetch(splitImageUrl)).blob();
        const file = new File([blob], \`Summon_\${summon.summonNumber.replace(/[^a-zA-Z0-9]/g, '_')}.png\`, {
          type: 'image/png',
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: \`Summon Notice - \${summon.personName} (\${summon.caseNumber})\`,
            text,
            files: [file],
          });
          return true;
        }
      }`;

const newShare = `export const shareSummonNative = async (summon: Summon, splitImageUrl?: string): Promise<boolean> => {
  const text = generateFormattedForwardText(summon);

  if (navigator.share) {
    try {
      const targetImageUrl = splitImageUrl || summon.imageUrl;
      if (targetImageUrl && navigator.canShare) {
        try {
          const res = await fetch(targetImageUrl);
          const blob = await res.blob();
          const extension = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
          const file = new File([blob], \`Summon_\${summon.summonNumber.replace(/[^a-zA-Z0-9]/g, '_')}.\${extension}\`, {
            type: blob.type,
          });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: \`Summon Notice - \${summon.personName} (\${summon.caseNumber})\`,
              text,
              files: [file],
            });
            return true;
          }
        } catch (fetchErr) {
          console.warn('Failed to fetch image for sharing', fetchErr);
        }
      }`;

code = code.replace(oldShare, newShare);

fs.writeFileSync('src/utils/shareService.ts', code);
console.log("Patched shareService.ts");
