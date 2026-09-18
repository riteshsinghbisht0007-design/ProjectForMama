const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "const filter = req.user._id ? { _id: new ObjectId(req.user._id) } : { providerId: req.user.uid };",
  "const filter = (req.user._id && ObjectId.isValid(req.user._id)) ? { _id: new ObjectId(req.user._id) } : { providerId: req.user.uid };"
);

fs.writeFileSync('server.ts', code);
