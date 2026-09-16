const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const updatedErrorHandling = `      if (!response.ok) {
        let err;
        try {
          err = await response.json();
        } catch (parseErr) {
          throw new Error(\`Server returned \${response.status} \${response.statusText}\`);
        }
        throw new Error(err?.error || 'Failed to update profile');
      }`;

content = content.replace(
  /      if \(!response\.ok\) \{\n        const err = await response\.json\(\);\n        throw new Error\(err\.error \|\| 'Failed to update profile'\);\n      \}/,
  updatedErrorHandling
);

fs.writeFileSync('src/context/AuthContext.tsx', content);
