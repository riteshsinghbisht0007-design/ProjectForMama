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

  const rawError = localError || authError;
  const displayError =
    rawError && (rawError.toLowerCase().includes('api-key') || rawError.toLowerCase().includes('api key'))
      ? null
      : rawError;

  const handleGoogleAuth = async () => {
    setLocalError(null);
    clearAuthError();
    setResetSuccess(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setLocalError(err.message || 'Google sign-in failed');
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
      setLocalError(err.message || 'Facebook sign-in failed');
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
    <div className="min-h-screen bg-[#0B1326] text-[#DAE2FD] flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#1E3A5F]/25 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#0A192F] border border-[#39475F] flex items-center justify-center shadow-2xl">
            <Shield className="w-7 h-7 text-[#ADC8F5]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
              SUMMONS MITRA
            </h1>
            <p className="text-xs text-[#8F9097] mt-1">
              Official Police Court Liaison & Judicial Notice Portal
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-[#131B2E] border border-[#222A3D] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          {displayError && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Authentication Notice</span>
                <span>{displayError}</span>
              </div>
            </div>
          )}

          {resetSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-700 rounded-xl text-xs text-emerald-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
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
                <h2 className="text-sm font-bold text-white">Reset Official Access Password</h2>
                <p className="text-xs text-[#8F9097]">
                  Enter your registered police email to receive secure recovery instructions.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#8F9097] block mb-1">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8F9097] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={emailOrBadge}
                    onChange={(e) => setEmailOrBadge(e.target.value)}
                    placeholder="officer@delhipolice.gov.in"
                    className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#5A6072] focus:outline-none focus:border-[#ADC8F5]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#2F4A70] hover:bg-[#3B82F6] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg disabled:opacity-50 cursor-pointer"
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
                className="w-full text-center text-xs text-[#ADC8F5] hover:underline flex items-center justify-center gap-1 pt-2"
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
                  className="w-full py-2.5 px-4 rounded-xl border border-[#39475F] bg-[#171F33] hover:bg-[#1E293B] text-xs font-semibold text-white flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#ADC8F5]" />
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
                  className="w-full py-2.5 px-4 rounded-xl border border-[#222A3D] bg-[#1877F2]/15 hover:bg-[#1877F2]/25 text-xs font-semibold text-[#8BBBFF] flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Continue with Facebook</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-[#222A3D]" />
                <span className="text-[11px] uppercase tracking-wider text-[#8F9097] font-mono">
                  Or Officer Department ID
                </span>
                <span className="h-px flex-1 bg-[#222A3D]" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-[#8F9097] block mb-1">
                        Officer Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#8F9097] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Inspector Rakesh Sharma"
                          className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#5A6072] focus:outline-none focus:border-[#ADC8F5]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-[#8F9097] block mb-1">
                          Badge Number
                        </label>
                        <input
                          type="text"
                          value={badgeNumber}
                          onChange={(e) => setBadgeNumber(e.target.value)}
                          placeholder="e.g. DL-4402"
                          className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5A6072] font-mono focus:outline-none focus:border-[#ADC8F5]"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#8F9097] block mb-1">Rank</label>
                        <select
                          value={rank}
                          onChange={(e) => setRank(e.target.value)}
                          className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ADC8F5]"
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
                        <label className="text-xs font-medium text-[#8F9097] block mb-1">
                          Police Station
                        </label>
                        <input
                          type="text"
                          value={policeStation}
                          onChange={(e) => setPoliceStation(e.target.value)}
                          placeholder="e.g. PS Tis Hazari"
                          className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5A6072] focus:outline-none focus:border-[#ADC8F5]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#8F9097] block mb-1">District</label>
                        <input
                          type="text"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="e.g. Central Delhi"
                          className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5A6072] focus:outline-none focus:border-[#ADC8F5]"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    {mode === 'register' ? 'Official Email / ID' : 'Badge # or Official Email'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8F9097] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      id="auth-email-input"
                      value={emailOrBadge}
                      onChange={(e) => setEmailOrBadge(e.target.value)}
                      placeholder="e.g. DL-4402 or officer@delhipolice.gov.in"
                      className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#5A6072] focus:outline-none focus:border-[#ADC8F5]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[#8F9097]">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setLocalError(null);
                          clearAuthError();
                        }}
                        className="text-[11px] text-[#ADC8F5] hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8F9097] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      id="auth-password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#5A6072] focus:outline-none focus:border-[#ADC8F5]"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  id="auth-submit-btn"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2F4A70] hover:bg-[#3B82F6] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg disabled:opacity-50 cursor-pointer mt-2"
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
              <div className="text-center pt-1 border-t border-[#222A3D]">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setLocalError(null);
                    clearAuthError();
                    setResetSuccess(null);
                  }}
                  className="text-xs text-[#ADC8F5] hover:underline cursor-pointer"
                >
                  {mode === 'login'
                    ? 'Need new department credentials? Register Officer'
                    : 'Already have credentials? Sign In'}
                </button>
              </div>

              {/* Quick Preset Roster Logins for Rapid Verification */}
              <div className="pt-2 border-t border-[#222A3D] space-y-2">
                <span className="text-[10px] font-mono uppercase text-[#8F9097] block text-center">
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
                    className="p-2 rounded-lg bg-[#0B1326] border border-[#222A3D] hover:border-[#39475F] text-[11px] text-left transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-white truncate">SI Rajesh Sharma</div>
                    <div className="text-[10px] font-mono text-[#FFB77D]">DL-POL-4402</div>
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
                    className="p-2 rounded-lg bg-[#0B1326] border border-[#222A3D] hover:border-[#39475F] text-[11px] text-left transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-white truncate">Insp. Vikram Rathore</div>
                    <div className="text-[10px] font-mono text-[#ADC8F5]">DL-POL-7821</div>
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
