const { MongoClient } = require('mongodb');
async function check() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("No MONGODB_URI in process.env");
    return;
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'summonsviewer');
    const summons = await db.collection('summons').find({}).toArray();
    console.log(`Found ${summons.length} summons`);
    if (summons.length > 0) {
      console.log(summons[0].summonNumber, summons[0].personName);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
check();
