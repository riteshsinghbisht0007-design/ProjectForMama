const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldLogic = `
      // Verify Firebase ID Token
      const decodedToken = await getAuth().verifyIdToken(idToken);
      const email = decodedToken.email;
      
      if (!email) {
        return res.status(400).json({ error: 'OAuth provider did not return an email address' });
      }

      let user = await db.collection('users').findOne({ email: email.toLowerCase() });
      
      if (!user) {
        // Create new user from social login
        const newUser = {
          email: email.toLowerCase(),
          displayName: decodedToken.name || email.split('@')[0],
          photoURL: decodedToken.picture || null,
          authProvider: provider || 'oauth',
          providerId: decodedToken.uid,
`;

const newLogic = `
      // Verify Firebase ID Token
      const decodedToken = await getAuth().verifyIdToken(idToken);
      const email = decodedToken.email ? decodedToken.email.toLowerCase() : null;
      const uid = decodedToken.uid;
      
      let user = null;
      if (email) {
        user = await db.collection('users').findOne({
          $or: [{ providerId: uid }, { email: email }]
        });
      } else {
        user = await db.collection('users').findOne({ providerId: uid });
      }
      
      if (!user) {
        // Create new user from social login
        const newUser = {
          email: email,
          displayName: decodedToken.name || (email ? email.split('@')[0] : 'Officer'),
          photoURL: decodedToken.picture || null,
          authProvider: provider || 'oauth',
          providerId: uid,
`;

code = code.replace(oldLogic.trim(), newLogic.trim());
fs.writeFileSync('server.ts', code);
