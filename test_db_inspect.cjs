const { MongoClient } = require('mongodb');
require('dotenv').config();
async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'summons_app');
  const s = await db.collection('summons').findOne({});
  console.log(s);
  process.exit(0);
}
run();
