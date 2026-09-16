const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const oldAuth = `  // Authentication Middleware (Strict token validation)
  const requireAuth = async (req: any, res: any, next: any) => {
    let token = req.cookies?.auth_token;
    
    // Fallback to Bearer token if cookie is not present
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    try {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing');
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      req.user = { uid: decoded.firebaseUid || decoded.userId, _id: decoded.userId };
      next();
    } catch (error) {
      console.error('[Auth] Token verification failed:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    }
  };`;

const newAuth = `  // Authentication Middleware (Strict token validation)
  const requireAuth = async (req: any, res: any, next: any) => {
    let cookieToken = req.cookies?.auth_token;
    let bearerToken = null;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      bearerToken = req.headers.authorization.split(' ')[1];
    }

    const token = bearerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    try {
      // 1. Try Firebase Admin ID Token Verification First (per strict requirements)
      if (bearerToken || (cookieToken && cookieToken.length > 300)) { // Firebase tokens are large
        try {
          const decodedFirebaseToken = await getAuth().verifyIdToken(token);
          req.user = { uid: decodedFirebaseToken.uid, _id: null };
          return next();
        } catch (firebaseErr) {
          // If it fails to verify as Firebase token, fallback to local JWT verification
        }
      }

      // 2. Verify local JWT Session
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing');
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      req.user = { uid: decoded.firebaseUid || decoded.userId, _id: decoded.userId };
      next();
    } catch (error) {
      console.error('[Auth] Token verification failed:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    }
  };`;

content = content.replace(oldAuth, newAuth);
fs.writeFileSync('server.ts', content);
