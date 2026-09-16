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
      
      // If a button has both text-white and text-primary-text (from old code), we remove text-primary-text
      content = content.replace(/text-white text-primary-text/g, 'text-white');
      content = content.replace(/bg-primary-btn text-white hover:bg-primary-hover text-white/g, 'bg-primary-btn text-white hover:bg-primary-hover');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
