const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldCookie = `
  const setAuthCookie = (res: any, token: string) => {
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction, // Use secure cookies in production (HTTPS)
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin iframes
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  };
`;

const newCookie = `
  const setAuthCookie = (res: any, token: string) => {
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true, // Always true in AI Studio (HTTPS)
      sameSite: 'none', // Required for cross-origin iframes
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  };
`;

const oldLogout = `
  app.post('/api/auth/logout', (req: any, res: any) => {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax'
    });
    res.json({ success: true });
  });
`;

const newLogout = `
  app.post('/api/auth/logout', (req: any, res: any) => {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    res.json({ success: true });
  });
`;

code = code.replace(oldCookie.trim(), newCookie.trim());
code = code.replace(oldLogout.trim(), newLogout.trim());

fs.writeFileSync('server.ts', code);
