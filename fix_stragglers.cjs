const fs = require('fs');
const path = require('path');

const replacements = [
  // Gradients
  { pattern: /from-\[#1E3A5F\]/g, replacement: 'from-primary-muted' },
  { pattern: /to-\[#0A192F\]/g, replacement: 'to-background-alt' },
  { pattern: /from-\[#2F4A70\]/g, replacement: 'from-primary-btn' },
  { pattern: /to-\[#FFB77D\]/g, replacement: 'to-warning' },
  { pattern: /from-\[#FFB77D\]/g, replacement: 'from-warning' },
  { pattern: /to-\[#FDBA74\]/g, replacement: 'to-warning' },

  // Backgrounds & borders
  { pattern: /bg-\[#222A3D\]/g, replacement: 'bg-border' }, // Or border-strong?
  { pattern: /border-t-\[#3B82F6\]/g, replacement: 'border-t-primary-hover' },
  { pattern: /bg-\[#FFB77D\]/g, replacement: 'bg-warning' },
  { pattern: /bg-\[#FFB77D\]\/20/g, replacement: 'bg-warning/20' },
  { pattern: /bg-\[#FFB77D\]\/10/g, replacement: 'bg-warning/10' },
  { pattern: /bg-\[#FFB77D\]\/80/g, replacement: 'bg-warning/80' },

  // Text
  { pattern: /text-\[#2F1500\]/g, replacement: 'text-warning-muted' },

  // Placeholders
  { pattern: /placeholder-\[#8F9097\]/g, replacement: 'placeholder-muted-foreground' },
  { pattern: /placeholder-\[#606778\]/g, replacement: 'placeholder-muted-foreground' },
  { pattern: /placeholder-\[#5A6072\]/g, replacement: 'placeholder-muted-foreground-alt' },

  // Colors in WelcomeAnimation
  { pattern: /via-\[#DAE2FD\]/g, replacement: 'via-foreground' },
  { pattern: /to-\[#ADC8F5\]/g, replacement: 'to-primary-text' },

  // Edge cases
  { pattern: /bg-muted hover:bg-\[#222A3D\]/g, replacement: 'bg-muted hover:bg-border' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      for (const { pattern, replacement } of replacements) {
        content = content.replace(pattern, replacement);
      }
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
