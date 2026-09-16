const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'summonsviewer');
  
  const summons = await db.collection('summons').find({}).limit(5).toArray();
  console.log("Summons:", JSON.stringify(summons, null, 2));

  const users = await db.collection('users').find({}).limit(5).toArray();
  console.log("Users:", JSON.stringify(users, null, 2));
  
  await client.close();
}
run();
