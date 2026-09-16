const fs = require('fs');

let code = fs.readFileSync('src/components/AuthScreen.tsx', 'utf8');

const oldFbHandler = `
  const handleFacebookAuth = async () => {
    setLocalError(null);
    clearAuthError();
    setResetSuccess(null);
    setLoading(true);
    try {
      await loginWithFacebook();
    } catch (err: any) {
      setLocalError(err.message || 'Facebook sign-in failed');
    } finally {
      setLoading(false);
    }
  };
`;

const newFbHandler = `
  const handleFacebookAuth = async () => {
    setLocalError(null);
    clearAuthError();
    setResetSuccess(null);
    setLoading(true);
    try {
      await loginWithFacebook();
    } catch (err: any) {
      let msg = err.message || 'Facebook sign-in failed';
      if (msg.includes('auth/account-exists-with-different-credential')) {
        msg = 'An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address (like Google).';
      } else if (msg.includes('auth/operation-not-supported-in-this-environment')) {
         msg = 'Facebook login is not properly configured in Firebase or HTTP is not supported.';
      } else if (msg.includes('auth/internal-error')) {
         msg = 'Firebase Internal Error: Did you add the Facebook App ID and App Secret in Firebase Console?';
      } else if (msg.includes('auth/unauthorized-domain')) {
         msg = 'This domain is not authorized for OAuth operations for your Firebase project.';
      }
      setLocalError(msg);
    } finally {
      setLoading(false);
    }
  };
`;

code = code.replace(oldFbHandler.trim(), newFbHandler.trim());
fs.writeFileSync('src/components/AuthScreen.tsx', code);
