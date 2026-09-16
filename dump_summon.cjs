const { MongoClient } = require('mongodb');
async function dump() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'summonsviewer');
    const summons = await db.collection('summons').find({}).toArray();
    console.log(JSON.stringify(summons[0], null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
dump();
