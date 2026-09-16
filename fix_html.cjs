const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/<html class="dark" lang="en">/g, '<html lang="en">');
html = html.replace(/<body class="bg-\[#0b1326\] text-\[#dae2fd\] font-sans antialiased selection:bg-\[#2f4a70\] selection:text-\[#d5e3ff\] min-h-screen">/g, '<body class="bg-background text-foreground font-sans antialiased selection:bg-primary-btn selection:text-white min-h-screen">');

fs.writeFileSync('index.html', html);
