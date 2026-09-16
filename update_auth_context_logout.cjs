const fs = require('fs');

let code = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const oldLogout = `
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await firebaseSignOut(auth).catch(() => {});
    } catch (err) {
      console.error("Logout error", err);
    }
    setCurrentUser(null);
  };
`;

const newLogout = `
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await firebaseSignOut(auth).catch(() => {});
    } catch (err) {
      console.error("Logout error", err);
    }
    setCurrentUser(null);
    window.location.href = '/';
  };
`;

code = code.replace(oldLogout, newLogout);

fs.writeFileSync('src/context/AuthContext.tsx', code);
