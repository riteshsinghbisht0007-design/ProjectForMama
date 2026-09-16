const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. requireAuth update
code = code.replace(
  "req.user = { uid: decoded.userId };",
  "req.user = { uid: decoded.firebaseUid || decoded.userId, _id: decoded.userId };"
);

// 2. /api/auth/social update
code = code.replace(
  "const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });",
  "const token = jwt.sign({ userId: user._id.toString(), firebaseUid: user.providerId }, process.env.JWT_SECRET, { expiresIn: '7d' });"
);
code = code.replace(
  "res.json({ user: { ...user, uid: user._id.toString() } });",
  "res.json({ user: { ...user, uid: user.providerId || user._id.toString() } });"
);

// 3. /api/auth/login update
code = code.replace(
  "const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });",
  "const token = jwt.sign({ userId: user._id.toString(), firebaseUid: user.providerId }, process.env.JWT_SECRET, { expiresIn: '7d' });"
);

// 4. /api/auth/me update
code = code.replace(
  "const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.uid) });",
  "const user = await db.collection('users').findOne({ _id: new ObjectId(req.user._id) });"
);

// 5. DB indexes update
code = code.replace(
  "await db.collection('users').createIndex({ email: 1 }, { unique: true });",
  "await db.collection('users').createIndex({ email: 1 }, { unique: true });\n      await db.collection('summons').createIndex({ userId: 1 });\n      await db.collection('witnesses').createIndex({ userId: 1 });"
);

fs.writeFileSync('server.ts', code);
