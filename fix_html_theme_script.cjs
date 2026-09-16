const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const script = `
    <script>
      if (localStorage.theme === 'light' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: light)').matches)) {
        document.documentElement.classList.remove('dark')
      } else {
        document.documentElement.classList.add('dark')
      }
    </script>
  </head>
`;

html = html.replace('</head>', script);
fs.writeFileSync('index.html', html);
