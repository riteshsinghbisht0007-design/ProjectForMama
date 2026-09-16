const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const profileEndpoint = `
  app.put('/api/auth/me', requireAuth, async (req: any, res: any) => {
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
  });
`;

if (!content.includes("app.put('/api/auth/me'")) {
  content = content.replace(
    /app\.get\('\/api\/auth\/me', requireAuth, async \(req: any, res: any\) => \{[\s\S]*?\}\);/,
    match => match + "\n" + profileEndpoint
  );
  fs.writeFileSync('server.ts', content);
}
