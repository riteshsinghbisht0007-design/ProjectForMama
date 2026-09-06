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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const { loginWithGoogle, loginWithFacebook, loginWithCredentials } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [policeStation, setPoliceStation] = useState('PS Tis Hazari');
  const [district, setDistrict] = useState('Central District');
  const [rank, setRank] = useState('Sub-Inspector');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithFacebook();
    } catch (err: any) {
      setError(err.message || 'Facebook sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Email and Password are required');
      return;
    }
    if (mode === 'register' && !displayName.trim()) {
      setError('Officer Name is required for registration');
      return;
    }

    setLoading(true);
    try {
      await loginWithCredentials(email.trim(), password, {
        displayName: displayName.trim() || 'Police Officer',
        badgeNumber: badgeNumber.trim() || `DL-${Math.floor(1000 + Math.random() * 9000)}`,
        policeStation,
        district,
        rank,
      });
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Quick preset logins for instant verification
  const handlePresetLogin = (name: string, badge: string, station: string, rnk: string) => {
    loginWithCredentials(`${badge.toLowerCase()}@police.gov.in`, 'secure_pass', {
      displayName: name,
      badgeNumber: badge,
      policeStation: station,
      district: 'Central District, Delhi',
      rank: rnk,
    });
  };

  return (
    <div className="min-h-screen bg-[#0B1326] text-[#DAE2FD] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#1E3A5F]/20 rounded-full blur-3xl pointer-events-none" />

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
        <div className="bg-[#131B2E] border border-[#222A3D] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Social Sign-In Buttons */}
          <div className="space-y-3">
            {/* Google Sign-In */}
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              id="btn-google-login"
              className="w-full py-2.5 px-4 rounded-xl border border-[#39475F] bg-[#171F33] hover:bg-[#1E293B] text-xs font-semibold text-white flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50"
            >
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
              <span>Continue with Google</span>
            </button>

            {/* Facebook Sign-In */}
            <button
              onClick={handleFacebookAuth}
              disabled={loading}
              id="btn-facebook-login"
              className="w-full py-2.5 px-4 rounded-xl border border-[#222A3D] bg-[#1877F2]/20 hover:bg-[#1877F2]/30 text-xs font-semibold text-[#8BBBFF] flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50"
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
              Or Officer ID Login
            </span>
            <span className="h-px flex-1 bg-[#222A3D]" />
          </div>

          {/* Form */}
          <form onSubmit={handleCredentialsAuth} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Officer Full Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Inspector Rakesh Sharma"
                    className="w-full bg-[#0B1326] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                    required
                  />
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
                      placeholder="e.g. DL-8841"
                      className="w-full bg-[#0B1326] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#ADC8F5]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#8F9097] block mb-1">Rank</label>
                    <input
                      type="text"
                      value={rank}
                      onChange={(e) => setRank(e.target.value)}
                      placeholder="Sub-Inspector"
                      className="w-full bg-[#0B1326] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Police Station
                  </label>
                  <input
                    type="text"
                    value={policeStation}
                    onChange={(e) => setPoliceStation(e.target.value)}
                    placeholder="e.g. PS Tis Hazari"
                    className="w-full bg-[#0B1326] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-[#8F9097] block mb-1">
                Official Department Email / Officer ID
              </label>
              <input
                type="email"
                id="input-login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@police.gov.in"
                className="w-full bg-[#0B1326] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#8F9097] block mb-1">
                Password / Security PIN
              </label>
              <input
                type="password"
                id="input-login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0B1326] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                required
              />
            </div>

            <button
              type="submit"
              id="btn-login-submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#2F4A70] hover:bg-[#3B82F6] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-50"
            >
              <span>{mode === 'login' ? 'Access Judicial Terminal' : 'Register Officer Profile'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-xs text-[#ADC8F5] hover:underline"
            >
              {mode === 'login'
                ? 'Need to register a new police officer account?'
                : 'Already have an officer account? Sign in'}
            </button>
          </div>
        </div>

        {/* Quick Demo Officer Switcher */}
        <div className="p-4 bg-[#0A192F] border border-[#222A3D] rounded-xl text-xs space-y-2 text-center">
          <span className="text-[11px] text-[#8F9097] block font-mono">
            Fast-Login Verification Accounts:
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                handlePresetLogin('Insp. Rakesh Sharma', 'DL-8841', 'PS Tis Hazari', 'Inspector')
              }
              className="px-3 py-1.5 rounded-lg bg-[#131B2E] border border-[#222A3D] hover:border-[#ADC8F5] text-[11px] text-[#DAE2FD]"
            >
              👮 Insp. R. Sharma (DL-8841)
            </button>
            <button
              type="button"
              onClick={() =>
                handlePresetLogin('SI Anjali Verma', 'DL-9102', 'PS Rohini North', 'Sub-Inspector')
              }
              className="px-3 py-1.5 rounded-lg bg-[#131B2E] border border-[#222A3D] hover:border-[#ADC8F5] text-[11px] text-[#DAE2FD]"
            >
              👮‍♀️ SI Anjali Verma (DL-9102)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
