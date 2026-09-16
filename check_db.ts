import { MongoClient, ServerApiVersion } from 'mongodb';
import fs from 'fs';

let envPath = '.env';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2 && !line.startsWith('#')) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["'](.*)["']$/, '$1');
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI as string, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'summonsviewer');
  
  const summons = await db.collection('summons').find({}).limit(5).toArray();
  console.log("Summons count:", summons.length);
  if (summons.length > 0) {
    console.log("Sample summon userId:", summons[0].userId);
  }

  const users = await db.collection('users').find({}).limit(5).toArray();
  console.log("Users count:", users.length);
  if (users.length > 0) {
    console.log("Sample user providerId:", users[0].providerId, "mongoId:", users[0]._id);
  }
  
  await client.close();
}
run();
