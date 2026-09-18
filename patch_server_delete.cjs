const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "await db.collection('summons').deleteOne({ _id: id, userId: req.user.uid });",
  "await db.collection('summons').deleteOne({ _id: id, userId: req.user.uid });\n      await db.collection('notifications').deleteMany({ summonsId: id, userId: req.user.uid });"
);

fs.writeFileSync('server.ts', code);
