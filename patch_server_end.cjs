const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const bad = `  app.delete('/api/notifications/cleanup/:summonsId', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });

  app.listen(PORT, '0.0.0.0', () => {`;

const good = `  app.delete('/api/notifications/cleanup/:summonsId', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { summonsId } = req.params;
      await db.collection('notifications').deleteMany({ userId: req.user.uid, summonsId });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {`;

code = code.replace(bad, good);
fs.writeFileSync('server.ts', code);
