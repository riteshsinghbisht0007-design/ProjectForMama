const { MongoClient } = require('mongodb');
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

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found");
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("MongoDB ping: ✅ Authenticated successfully");
    const dbName = process.env.MONGODB_DB_NAME;
    if (dbName) {
       const db = client.db(dbName);
       await db.command({ ping: 1 });
       console.log(`Database '${dbName}' access: ✅`);
    }
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  } finally {
    await client.close();
  }
}

testConnection();
