const fs = require('fs');

let code = fs.readFileSync('src/components/AuthScreen.tsx', 'utf8');

const oldAppleHandler = `
  const handleAppleAuth = async () => {
    setLocalError(null);
    clearAuthError();
    setResetSuccess(null);
    setLoading(true);
    try {
      await loginWithApple();
    } catch (err: any) {
      setLocalError(err.message || 'Apple sign-in failed');
    } finally {
      setLoading(false);
    }
  };
`;

const newAppleHandler = `
  const handleAppleAuth = async () => {
    setLocalError(null);
    clearAuthError();
    setResetSuccess(null);
    setLoading(true);
    try {
      await loginWithApple();
    } catch (err: any) {
      console.error("Apple Sign-In Error:", err);
      let msg = err.message || 'Apple sign-in failed';
      if (msg.includes('auth/account-exists-with-different-credential')) {
        msg = 'An account already exists with the same email address but different sign-in credentials.';
      } else if (msg.includes('auth/operation-not-supported-in-this-environment')) {
         msg = 'Apple login is not properly configured in Firebase or HTTP is not supported.';
      } else if (msg.includes('auth/internal-error') || msg.includes('auth/invalid-credential')) {
         msg = 'Apple Sign-In Configuration Missing: You must configure the Services ID, Team ID, Key ID, and Private Key in the Firebase Console (Authentication > Sign-in method > Apple).';
      } else if (msg.includes('auth/unauthorized-domain')) {
         msg = 'This domain is not authorized for OAuth operations for your Firebase project.';
      } else if (msg.includes('auth/popup-closed-by-user') || msg.includes('auth/cancelled-popup-request')) {
         msg = 'Sign-in was cancelled.';
      } else {
         msg = 'Apple Sign-In is currently unavailable. Please try again or use another sign-in method.';
      }
      setLocalError(msg);
    } finally {
      setLoading(false);
    }
  };
`;

code = code.replace(oldAppleHandler.trim(), newAppleHandler.trim());
fs.writeFileSync('src/components/AuthScreen.tsx', code);
