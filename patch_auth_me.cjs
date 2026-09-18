const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldAuthMe = `
  app.get('/api/auth/me', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const user = await db.collection('users').findOne({ _id: new ObjectId(req.user._id) });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      delete user.password;
      res.json({ user: { ...user, uid: user.providerId || user._id.toString() } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });`;

const newAuthMe = `
  app.get('/api/auth/me', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      let user = null;
      if (req.user._id && ObjectId.isValid(req.user._id)) {
        user = await db.collection('users').findOne({ _id: new ObjectId(req.user._id) });
      } else if (req.user.uid) {
        user = await db.collection('users').findOne({ providerId: req.user.uid });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      delete user.password;
      res.json({ user: { ...user, uid: user.providerId || user._id.toString() } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });`;

code = code.replace(oldAuthMe, newAuthMe);
fs.writeFileSync('server.ts', code);
