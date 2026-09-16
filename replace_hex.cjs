const fs = require('fs');
const path = require('path');

const replacements = [
  // Backgrounds
  { pattern: /bg-\[#0B1326\]/g, replacement: 'bg-background' },
  { pattern: /bg-\[#0B1221\]/g, replacement: 'bg-background' },
  { pattern: /bg-\[#0A192F\]/g, replacement: 'bg-background-alt' },
  { pattern: /bg-\[#131B2E\]\/50/g, replacement: 'bg-card/50' },
  { pattern: /bg-\[#131B2E\]\/80/g, replacement: 'bg-card/80' },
  { pattern: /bg-\[#131B2E\]\/90/g, replacement: 'bg-card/90' },
  { pattern: /bg-\[#131B2E\]/g, replacement: 'bg-card' },
  { pattern: /bg-\[#171F33\]/g, replacement: 'bg-card-hover' },
  { pattern: /bg-\[#1E293B\]/g, replacement: 'bg-muted' },
  { pattern: /bg-\[#1E3A5F\]/g, replacement: 'bg-primary-muted' },
  { pattern: /bg-\[#2F4A70\]/g, replacement: 'bg-primary-btn text-white' }, // Explicit text-white for primary buttons
  { pattern: /bg-\[#3B82F6\]/g, replacement: 'bg-primary-hover' },
  { pattern: /bg-\[#FEF3C7\]/g, replacement: 'bg-warning-muted' },
  { pattern: /bg-\[#2B1300\]\/40/g, replacement: 'bg-warning-muted/40' },
  { pattern: /bg-\[#4D2600\]\/50/g, replacement: 'bg-warning-muted/50' },
  { pattern: /bg-\[#2B1300\]/g, replacement: 'bg-warning-muted' },
  { pattern: /bg-\[#2F1500\]/g, replacement: 'bg-warning-muted' },
  { pattern: /bg-\[#4D2600\]/g, replacement: 'bg-warning-muted' },
  { pattern: /bg-\[#064E3B\]\/30/g, replacement: 'bg-success-muted/30' },
  { pattern: /bg-\[#064E3B\]\/60/g, replacement: 'bg-success-muted/60' },
  { pattern: /bg-\[#064E3B\]/g, replacement: 'bg-success-muted' },
  { pattern: /bg-\[#133155\]\/60/g, replacement: 'bg-info-muted/60' },
  { pattern: /bg-\[#133155\]/g, replacement: 'bg-info-muted' },

  // Borders
  { pattern: /border-\[#222A3D\]/g, replacement: 'border-border' },
  { pattern: /border-\[#39475F\]/g, replacement: 'border-border-strong' },
  { pattern: /border-\[#FFB77D\]/g, replacement: 'border-warning' },
  { pattern: /border-\[#ADC8F5\]/g, replacement: 'border-primary-text' },
  { pattern: /border-\[#B9C7E4\]/g, replacement: 'border-info-text' },
  { pattern: /border-\[#34D399\]/g, replacement: 'border-success' },
  { pattern: /border-dashed border-\[#ADC8F5\]\/60/g, replacement: 'border-dashed border-primary-text/60' },

  // Hover Backgrounds
  { pattern: /hover:bg-\[#131B2E\]/g, replacement: 'hover:bg-card' },
  { pattern: /hover:bg-\[#171F33\]/g, replacement: 'hover:bg-card-hover' },
  { pattern: /hover:bg-\[#1E293B\]/g, replacement: 'hover:bg-muted' },
  { pattern: /hover:bg-\[#3B82F6\]/g, replacement: 'hover:bg-primary-hover text-white' }, // ensure text stays white on hover
  { pattern: /hover:bg-\[#2F4A70\]/g, replacement: 'hover:bg-primary-btn text-white' },
  { pattern: /hover:bg-\[#1E3A5F\]/g, replacement: 'hover:bg-primary-muted' },

  // Hover Borders
  { pattern: /hover:border-\[#39475F\]/g, replacement: 'hover:border-border-strong' },
  { pattern: /hover:border-\[#ADC8F5\]/g, replacement: 'hover:border-primary-text' },

  // Text colors
  { pattern: /text-\[#DAE2FD\]/g, replacement: 'text-foreground' },
  { pattern: /text-\[#C5C6CD\]/g, replacement: 'text-foreground-alt' },
  { pattern: /text-\[#8F9097\]/g, replacement: 'text-muted-foreground' },
  { pattern: /text-\[#5A6072\]/g, replacement: 'text-muted-foreground-alt' },
  { pattern: /text-\[#606778\]/g, replacement: 'text-muted-foreground-alt' },
  { pattern: /text-\[#ADC8F5\]/g, replacement: 'text-primary-text' },
  { pattern: /text-\[#8BBBFF\]/g, replacement: 'text-primary-text-bright' },
  { pattern: /text-\[#FFB77D\]/g, replacement: 'text-warning' },
  { pattern: /text-\[#FDBA74\]/g, replacement: 'text-warning' },
  { pattern: /text-\[#34D399\]/g, replacement: 'text-success' },
  { pattern: /text-\[#B9C7E4\]/g, replacement: 'text-info-text' },

  // Hover Text colors
  { pattern: /hover:text-\[#DAE2FD\]/g, replacement: 'hover:text-foreground' },
  { pattern: /hover:text-\[#ADC8F5\]/g, replacement: 'hover:text-primary-text' },
  { pattern: /hover:text-\[#8BBBFF\]/g, replacement: 'hover:text-primary-text-bright' },
  { pattern: /hover:text-\[#FFB77D\]/g, replacement: 'hover:text-warning' },
  
  // Fill colors (SVG)
  { pattern: /fill-\[#1E293B\]/g, replacement: 'fill-muted' },

  // Ring colors
  { pattern: /ring-\[#39475F\]/g, replacement: 'ring-border-strong' },
  { pattern: /ring-\[#ADC8F5\]/g, replacement: 'ring-primary-text' },
  { pattern: /focus:border-\[#ADC8F5\]/g, replacement: 'focus:border-primary-text' },
  { pattern: /focus:ring-\[#ADC8F5\]\/20/g, replacement: 'focus:ring-primary-text/20' },
  
  // Group-hover
  { pattern: /group-hover:text-\[#DAE2FD\]/g, replacement: 'group-hover:text-foreground' },
  { pattern: /group-hover:text-\[#ADC8F5\]/g, replacement: 'group-hover:text-primary-text' },
  { pattern: /group-hover:text-\[#FFB77D\]/g, replacement: 'group-hover:text-warning' },
  { pattern: /group-hover:bg-\[#1E3A5F\]/g, replacement: 'group-hover:bg-primary-muted' },
  { pattern: /group-hover:bg-\[#2F4A70\]/g, replacement: 'group-hover:bg-primary-btn group-hover:text-white' },

  // Selection
  { pattern: /selection:bg-\[#2F4A70\]/g, replacement: 'selection:bg-primary-btn selection:text-white' },

  // Edge text-white replacing (do this last)
  { pattern: /text-white/g, replacement: 'text-foreground' },
  // But wait! If we do this, the ones we just added (e.g. `bg-primary-btn text-white`) will ALSO be changed to `bg-primary-btn text-foreground`!
];

// So we will do a two-pass approach for text-white. 
// First replace existing text-white with text-foreground.
// THEN run the hex replacements which will re-inject text-white where needed.

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Pass 1: Replace text-white with text-foreground
      content = content.replace(/text-white/g, 'text-foreground');
      
      // Pass 2: Hex replacements
      for (const { pattern, replacement } of replacements) {
        content = content.replace(pattern, replacement);
      }
      
      // Cleanup duplicated text-white and text-foreground
      content = content.replace(/text-foreground text-foreground/g, 'text-foreground');
      content = content.replace(/text-foreground text-white/g, 'text-white');
      content = content.replace(/text-white text-foreground/g, 'text-white');
      content = content.replace(/text-white text-white/g, 'text-white');

      // Cleanup duplicated bg-primary-btn
      content = content.replace(/bg-primary-btn text-white text-white/g, 'bg-primary-btn text-white');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
