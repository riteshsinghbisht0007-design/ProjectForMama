const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const badBlockRegex = /  app\.get\('\/api\/auth\/me', requireAuth, async \(req: any, res: any\) => \{\n    if \(!db\) return res\.status\(503\)\.json\(\{ error: 'Database disconnected' \}\);\n\n  app\.put\('\/api\/auth\/me', requireAuth, async \(req: any, res: any\) => \{[\s\S]*?  \}\);\n\n    try \{/g;

const match = badBlockRegex.exec(content);
if (match) {
  console.log("Found bad block!");
  
  // Replace the bad structure with a proper sequence
  const correctStructure = `  app.get('/api/auth/me', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {`;
    
  // But wait, we also need to extract the app.put and place it before or after app.get.
  // The app.put block is:
  const appPutBlock = `  app.put('/api/auth/me', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const updates = { ...req.body };
      delete updates._id;
      delete updates.uid;
      delete updates.providerId;
      delete updates.password;
      delete updates.createdAt;
      
      updates.updatedAt = new Date();

      const filter = req.user._id ? { _id: new ObjectId(req.user._id) } : { providerId: req.user.uid };
      
      const result = await db.collection('users').findOneAndUpdate(
        filter,
        { $set: updates },
        { returnDocument: 'after' }
      );

      if (!result) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = result;
      delete user.password;
      res.json({ user: { ...user, uid: user.providerId || user._id.toString() } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });`;

  const newContent = content.replace(badBlockRegex, correctStructure)
                            .replace("app.get('/api/auth/me', requireAuth", appPutBlock + "\n\n  app.get('/api/auth/me', requireAuth");

  fs.writeFileSync('server.ts', newContent);
  console.log("Fixed routes!");
} else {
  console.log("Could not find bad block");
}
