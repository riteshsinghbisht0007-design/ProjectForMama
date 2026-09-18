const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const badCode = `
      try {
      const { summonsId } = req.params;
      await db.collection('notifications').deleteMany({ userId: req.user.uid, summonsId });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
`;

code = code.replace(badCode, '');
fs.writeFileSync('server.ts', code);
