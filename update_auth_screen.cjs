const fs = require('fs');

let code = fs.readFileSync('src/components/AuthScreen.tsx', 'utf8');

// Add loginWithApple to destructuring
code = code.replace(
  "    loginWithFacebook,\n    loginWithCredentials,",
  "    loginWithFacebook,\n    loginWithApple,\n    loginWithCredentials,"
);

// Add handleAppleAuth function
const appleAuthFunc = `
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

code = code.replace(
  "  const handleFacebookAuth = async () => {",
  appleAuthFunc + "\n  const handleFacebookAuth = async () => {"
);

// Add Apple button in JSX
const appleBtn = `
                {/* Apple Sign-In */}
                <button
                  type="button"
                  onClick={handleAppleAuth}
                  disabled={loading}
                  id="btn-apple-login"
                  className="w-full py-2.5 px-4 rounded-xl border border-[#39475F] bg-[#171F33] hover:bg-[#1E293B] text-xs font-semibold text-white flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#ADC8F5]" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 384 512" fill="currentColor">
                      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                    </svg>
                  )}
                  <span>Continue with Apple</span>
                </button>
`;

code = code.replace(
  "                {/* Facebook Sign-In */}",
  appleBtn + "\n                {/* Facebook Sign-In */}"
);

fs.writeFileSync('src/components/AuthScreen.tsx', code);
