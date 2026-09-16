const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      content = content.replace(/bg-primary-btn text-foreground/g, 'bg-primary-btn text-white');
      content = content.replace(/hover:bg-primary-hover text-foreground/g, 'hover:bg-primary-hover text-white');
      content = content.replace(/hover:bg-primary-btn text-foreground/g, 'hover:bg-primary-btn text-white');
      content = content.replace(/group-hover:bg-primary-btn text-foreground/g, 'group-hover:bg-primary-btn text-white');
      content = content.replace(/group-hover:text-foreground/g, 'group-hover:text-white'); // for the ones combined with group-hover:bg-primary-btn

      // Clean up multiple text-white
      content = content.replace(/text-white text-white/g, 'text-white');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
