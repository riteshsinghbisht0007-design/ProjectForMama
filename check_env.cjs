const fs = require('fs');

const loadEnv = (file) => {
  if (fs.existsSync(file)) {
    const envContent = fs.readFileSync(file, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const splitIdx = trimmed.indexOf('=');
        const key = trimmed.slice(0, splitIdx).trim();
        const val = trimmed.slice(splitIdx + 1).trim().replace(/^["'](.*)["']$/, '$1');
        if (!process.env[key] && val && !val.startsWith('your_')) {
          process.env[key] = val;
        }
      }
    }
  }
};
loadEnv('.env');
loadEnv('.env.local');

const vars = [
  'MONGODB_DB_NAME',
  'MONGODB_URI',
  'GEMINI_API_KEY',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_MEASUREMENT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET'
];

console.log("=== ENV VARIABLE REPORT ===");
vars.forEach(v => {
  const val = process.env[v];
  let status = "❌ Missing/Empty";
  if (val && val.trim().length > 0) {
      if (val.startsWith('your_') || val.includes('placeholder')) {
         status = "⚠️ Needs attention (Placeholder value)";
      } else {
         status = "✅ Configured";
      }
  }
  console.log(`${v}: ${status}`);
});

console.log("\n=== MongoDB Check ===");
const uri = process.env.MONGODB_URI;
if (uri) {
   let hasCreds = false;
   try {
     const url = new URL(uri);
     if (url.username && url.password) {
       hasCreds = true;
     }
     console.log(`URI valid format: ✅`);
     console.log(`Username exists: ${url.username ? '✅' : '❌'}`);
     console.log(`Password exists: ${url.password ? '✅' : '❌'}`);
   } catch(e) {
     console.log(`URI valid format: ❌ (${e.message})`);
   }
} else {
   console.log("MONGODB_URI is missing.");
}

