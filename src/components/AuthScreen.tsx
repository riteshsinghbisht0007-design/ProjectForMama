import React, { useState } from 'react';
import {
  Shield,
  Lock,
  User,
  Building,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const {
    loginWithGoogle,
    loginWithGoogleFallback,
    loginWithFacebook,
    loginWithCredentials,
    registerOfficer,
    resetPassword,
    authError,
    clearAuthError,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [emailOrBadge, setEmailOrBadge] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [policeStation, setPoliceStation] = useState('PS Tis Hazari');
  const [district, setDistrict] = useState('Central District, Delhi');
  const [rank, setRank] = useState('Sub-Inspector');
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const rawError = localError || authError;
  const displayError =
    rawError && (rawError.toLowerCase().includes('api-key') || rawError.toLowerCase().includes('api key'))
      ? null
      : rawError;

  const isDomainError =
    Boolean(displayError) &&
    (displayError!.toLowerCase().includes('unauthorized-domain') ||
      displayError!.toLowerCase().includes('domain not authorized'));

  const handleGoogleAuth = async () => {
    setLocalError(null);
    clearAuthError();
    setResetSuccess(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.warn('[AuthScreen] Google auth notice:', err.message || err);
      const msg = err.message || '';
      if (msg.includes('auth/unauthorized-domain') || msg.includes('unauthorized-domain') || err.code === 'auth/unauthorized-domain') {
        try {
          await loginWithGoogleFallback();
          return;
        } catch (fallbackErr: any) {
          setLocalError(fallbackErr.message || 'Google sign-in failed');
        }
      } else {
        setLocalError(msg || 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };


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

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();
    setResetSuccess(null);

    if (!emailOrBadge.trim()) {
      setLocalError('Please enter your official email address');
      return;
    }

    const email = emailOrBadge.includes('@')
      ? emailOrBadge.trim()
      : `${emailOrBadge.trim().toLowerCase()}@delhipolice.gov.in`;

    setLoading(true);
    try {
      const ok = await resetPassword(email);
      if (ok) {
        setResetSuccess(`Password reset instructions have been dispatched to ${email}`);
      } else {
        setLocalError('Could not process password reset for this address.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();
    setResetSuccess(null);

    if (!emailOrBadge.trim() || !password.trim()) {
      setLocalError('Officer ID / Email and Password are required');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        if (!displayName.trim() || !badgeNumber.trim()) {
          setLocalError('Officer Full Name and Badge Number are required for registration');
          setLoading(false);
          return;
        }

        const email = emailOrBadge.includes('@')
          ? emailOrBadge.trim()
          : `${emailOrBadge.trim().toLowerCase()}@delhipolice.gov.in`;

        const success = await registerOfficer(
          displayName.trim(),
          badgeNumber.trim(),
          email,
          policeStation.trim(),
          district.trim(),
          rank,
          password
        );

        if (!success && !authError) {
          setLocalError('Failed to register officer credentials');
        }
      } else {
        const success = await loginWithCredentials(emailOrBadge.trim(), password);
        if (!success && !authError) {
          setLocalError('Invalid Officer ID or password. Please verify credentials.');
        }
      }
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Quick preset logins for instant verification
  const handlePresetLogin = async (
    name: string,
    badge: string,
    station: string,
    rnk: string
  ) => {
    setLocalError(null);
    clearAuthError();
    setResetSuccess(null);
    setLoading(true);
    try {
      await loginWithCredentials(`${badge.toLowerCase()}@delhipolice.gov.in`, 'Police@2026', {
        displayName: name,
        badgeNumber: badge,
        policeStation: station,
        district: 'Central District, Delhi',
        rank: rnk,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-muted/25 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary-muted to-background-alt border border-border-strong flex items-center justify-center shadow-2xl">
            <Shield className="w-7 h-7 text-primary-text" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
              SUMMONS MITRA
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Official Police Court Liaison & Judicial Notice Portal
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-5 relative group transition-all duration-300 hover:border-[#60A5FA]">
          {displayError && (
            isDomainError ? (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2.5">
                <div className="flex items-center gap-2 text-amber-500 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Google Sign-In: Domain Whitelist Required</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Firebase Authentication requires your current preview domain to be registered before Google OAuth can authenticate:
                </p>
                <div className="p-2 bg-background/80 rounded-lg border border-border flex items-center justify-between gap-2">
                  <code className="font-mono text-[11px] text-foreground truncate select-all">
                    {typeof window !== 'undefined' ? window.location.hostname : ''}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(window.location.hostname);
                        setCopiedDomain(true);
                        setTimeout(() => setCopiedDomain(false), 2000);
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-secondary hover:bg-muted text-[11px] font-medium text-foreground transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedDomain ? 'Copied!' : 'Copy Domain'}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <strong>In Firebase Console:</strong> Authentication → Settings → Authorized domains → Add domain.
                </p>
                <div className="pt-1.5 border-t border-amber-500/20">
                  <button
                    type="button"
                    onClick={() =>
                      handlePresetLogin(
                        'Sub-Insp. Rajesh Sharma',
                        'DL-POL-4402',
                        'Connaught Place PS',
                        'Sub-Inspector'
                      )
                    }
                    className="w-full py-2 px-3 rounded-lg bg-primary-btn hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <span>Instant Demo Login (No Firebase Config Needed)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-900 dark:text-red-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <div className="flex-1">
                  <span className="font-semibold block mb-0.5">Authentication Notice</span>
                  <span>{displayError}</span>
                </div>
              </div>
            )
          )}

          {resetSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-200 rounded-xl text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Password Reset Dispatched</span>
                <span>{resetSuccess}</span>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD MODE */}
          {mode === 'forgot' ? (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-foreground">Reset Official Access Password</h2>
                <p className="text-xs text-muted-foreground">
                  Enter your registered police email to receive secure recovery instructions.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={emailOrBadge}
                    onChange={(e) => setEmailOrBadge(e.target.value)}
                    placeholder="officer@delhipolice.gov.in"
                    className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground-alt focus:outline-none focus:border-primary-text"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-primary-btn text-white hover:bg-primary-hover text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Dispatch Reset Link</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setLocalError(null);
                  setResetSuccess(null);
                  clearAuthError();
                }}
                className="w-full text-center text-xs text-primary-text hover:underline flex items-center justify-center gap-1 pt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </form>
          ) : (
            <>
              {/* Social Sign-In Buttons */}
              <div className="space-y-2.5">
                {/* Google Sign-In */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  id="btn-google-login"
                  className="relative z-10 w-full py-2.5 px-4 rounded-xl border border-border bg-card hover:bg-card-hover hover:border-[#2563EB] text-xs font-semibold text-foreground flex items-center justify-center gap-3 transition-all duration-200 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary-text" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.9z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.8-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16c1.9 3.8 5.8 6.4 10.4 6.4z"
                      />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                {/* Facebook Sign-In */}
                <button
                  type="button"
                  onClick={handleFacebookAuth}
                  disabled={loading}
                  id="btn-facebook-login"
                  className="w-full py-2.5 px-4 rounded-xl border border-[#1877F2]/30 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-xs font-semibold text-[#1877F2] flex items-center justify-center gap-3 transition-colors shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Continue with Facebook</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
                  Or Officer Department ID
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Officer Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Inspector Rakesh Sharma"
                          className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground-alt focus:outline-none focus:border-primary-text"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                          Badge Number
                        </label>
                        <input
                          type="text"
                          value={badgeNumber}
                          onChange={(e) => setBadgeNumber(e.target.value)}
                          placeholder="e.g. DL-4402"
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground-alt font-mono focus:outline-none focus:border-primary-text"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Rank</label>
                        <select
                          value={rank}
                          onChange={(e) => setRank(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-text"
                        >
                          <option value="Sub-Inspector">Sub-Inspector</option>
                          <option value="Inspector">Inspector</option>
                          <option value="Head Constable">Head Constable</option>
                          <option value="Constable">Constable</option>
                          <option value="ACP / DSP">ACP / DSP</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                          Police Station
                        </label>
                        <input
                          type="text"
                          value={policeStation}
                          onChange={(e) => setPoliceStation(e.target.value)}
                          placeholder="e.g. PS Tis Hazari"
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground-alt focus:outline-none focus:border-primary-text"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">District</label>
                        <input
                          type="text"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="e.g. Central Delhi"
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground-alt focus:outline-none focus:border-primary-text"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    {mode === 'register' ? 'Official Email / ID' : 'Badge # or Official Email'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      id="auth-email-input"
                      value={emailOrBadge}
                      onChange={(e) => setEmailOrBadge(e.target.value)}
                      placeholder="e.g. DL-4402 or officer@delhipolice.gov.in"
                      className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground-alt focus:outline-none focus:border-primary-text"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-muted-foreground">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setLocalError(null);
                          clearAuthError();
                        }}
                        className="text-[11px] text-primary-text hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      id="auth-password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground-alt focus:outline-none focus:border-primary-text"
                      required
                    />
                  </div>
                </div>

                <button
                type="submit"
                disabled={loading}
                id="auth-submit-btn"
                className="relative z-10 w-full py-2.5 px-4 rounded-xl bg-primary-btn text-white hover:bg-primary-hover shadow-sm hover:shadow-md text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 cursor-pointer mt-2"
              >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{mode === 'register' ? 'Register Officer Account' : 'Authenticate & Enter Portal'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Toggle Login / Register */}
              <div className="text-center pt-1 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setLocalError(null);
                    clearAuthError();
                    setResetSuccess(null);
                  }}
                  className="text-xs text-primary-text hover:underline cursor-pointer"
                >
                  {mode === 'login'
                    ? 'Need new department credentials? Register Officer'
                    : 'Already have credentials? Sign In'}
                </button>
              </div>

              {/* Quick Preset Roster Logins for Rapid Verification */}
              <div className="pt-2 border-t border-border space-y-2">
                <span className="text-[10px] font-mono uppercase text-muted-foreground block text-center">
                  Quick Field Test Credentials
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handlePresetLogin(
                        'Sub-Insp. Rajesh Sharma',
                        'DL-POL-4402',
                        'Connaught Place PS',
                        'Sub-Inspector'
                      )
                    }
                    className="p-2 rounded-lg bg-background border border-border hover:border-border-strong text-[11px] text-left transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-foreground truncate">SI Rajesh Sharma</div>
                    <div className="text-[10px] font-mono text-warning">DL-POL-4402</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handlePresetLogin(
                        'Insp. Vikram Rathore',
                        'DL-POL-7821',
                        'PS Tis Hazari',
                        'Inspector'
                      )
                    }
                    className="p-2 rounded-lg bg-background border border-border hover:border-border-strong text-[11px] text-left transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-foreground truncate">Insp. Vikram Rathore</div>
                    <div className="text-[10px] font-mono text-primary-text">DL-POL-7821</div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
