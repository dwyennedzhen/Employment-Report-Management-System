import React, { useState, useEffect } from 'react';
import {
  Lock,
  LogIn,
  UserPlus,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Building2,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../services/api';
import { Campus, User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

const DEFAULT_CAMPUSES: { id: string; campusName: string }[] = [
  { id: 'BIGA', campusName: 'Sisters of Mary Biga' },
  { id: 'MINGLANILLA', campusName: 'Sisters of Mary Minglanilla' },
  { id: 'TALISAY', campusName: 'Sisters of Mary Talisay' },
  { id: 'ADLAS', campusName: 'Sisters of Mary Adlas' },
];

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Setup status from backend (whether initial Admin exists)
  const [hasAdmin, setHasAdmin] = useState<boolean>(true);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [statusLoaded, setStatusLoaded] = useState<boolean>(false);

  // Login State (Empty by default — no pre-filled credentials or shortcuts)
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Safe Account Recovery State (for accounts created before persistent storage upgrade)
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);
  const [recoveryRole, setRecoveryRole] = useState<'ADMIN' | 'CAMPUS_USER'>('ADMIN');
  const [recoveryCampusId, setRecoveryCampusId] = useState<string>('BIGA');
  const [recoveryFullName, setRecoveryFullName] = useState<string>('');

  // Registration State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<'ADMIN' | 'CAMPUS_USER'>('ADMIN');
  const [campusId, setCampusId] = useState<string>('BIGA');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSetupStatus = async () => {
    try {
      const res = await api.getSetupStatus();
      setHasAdmin(res.hasAdmin);
      setCampuses(res.campuses);
      if (res.campuses.length > 0) {
        setCampusId(res.campuses[0].id);
        setRecoveryCampusId(res.campuses[0].id);
      }
    } catch {
      // Fallback to default campuses list
    } finally {
      setStatusLoaded(true);
    }
  };

  useEffect(() => {
    loadSetupStatus();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Support browser autofill / password manager credentials even if synthetic onChange did not fire
    const form = e.currentTarget;
    const usernameInput = form.elements.namedItem('username') as HTMLInputElement | null;
    const passwordInput = form.elements.namedItem('password') as HTMLInputElement | null;
    const domUsername = (usernameInput?.value || '').trim();
    const domPassword = passwordInput?.value || '';

    const effectiveIdentifier = (domUsername || identifier).trim();
    const effectivePassword = domPassword || loginPassword;

    if (effectiveIdentifier && effectiveIdentifier !== identifier) {
      setIdentifier(effectiveIdentifier);
    }
    if (effectivePassword && effectivePassword !== loginPassword) {
      setLoginPassword(effectivePassword);
    }

    if (!effectiveIdentifier) {
      setError('Please enter your Username or Email.');
      return;
    }
    if (!effectivePassword) {
      setError('Please enter your Password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(effectiveIdentifier, effectivePassword);
      onLoginSuccess(res.user);
    } catch (err: any) {
      // Standard authentication error display - never interrupt ordinary login with a restore prompt
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverSavedAccount = async () => {
    setError(null);
    setSuccessMessage(null);

    const effectiveIdentifier = identifier.trim();
    const effectivePassword = loginPassword;

    if (!effectiveIdentifier || !effectivePassword) {
      setError('Please ensure your saved Username/Email and Password are entered above.');
      return;
    }

    const effectiveRole = recoveryRole === 'ADMIN' ? 'ADMIN' : 'CAMPUS_USER';
    if (effectiveRole === 'CAMPUS_USER' && (!recoveryCampusId || recoveryCampusId === 'ALL')) {
      setError('Please select your assigned Sisters of Mary campus to restore your account.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.recoverSavedAccount({
        identifier: effectiveIdentifier,
        password: effectivePassword,
        fullName: recoveryFullName.trim() || undefined,
        role: effectiveRole,
        campusId: effectiveRole === 'ADMIN' ? null : recoveryCampusId,
      });
      await loadSetupStatus();
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Failed to restore account.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!regPassword) {
      setError('Password is required.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!confirmPassword) {
      setError('Please confirm your password.');
      return;
    }
    if (regPassword !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    const effectiveRole = role === 'ADMIN' ? 'ADMIN' : 'CAMPUS_USER';
    if (effectiveRole === 'CAMPUS_USER' && (!campusId || campusId === 'ALL')) {
      setError('Please select your assigned Sisters of Mary campus.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        password: regPassword,
        confirmPassword,
        role: effectiveRole,
        campusId: effectiveRole === 'ADMIN' ? null : campusId,
      });
      await loadSetupStatus();
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Account creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const campusOptions = campuses.length > 0 ? campuses : DEFAULT_CAMPUSES;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Institutional Bar */}
      <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <img
            src="/som-logo.jpg"
            alt="The Sisters of Mary Schools-Philippines Logo"
            className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
          />
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-base block">
              Sisters of Mary of Banneux, Inc.
            </span>
            <span className="text-xs text-slate-500 block">
              The Sisters of Mary Schools — Philippines
            </span>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Biga · Minglanilla · Talisay · Adlas
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Secure Authentication / Registration Form */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-8">
          {mode === 'LOGIN' ? (
            <>
              <div className="mb-6 flex items-start gap-4">
                <img
                  src="/som-logo.jpg"
                  alt="Sisters of Mary Seal"
                  className="w-16 h-16 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                />
                <div>
                  <p className="text-xs font-medium text-blue-700 mb-1">
                    Secure Institutional Authentication
                  </p>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Employment Report Management System
                  </h1>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                    Enter your valid Username or Email and Password to access your assigned campus or administrative workspace.
                  </p>
                </div>
              </div>

              {statusLoaded && !hasAdmin && (
                <div className="mb-5 p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>Initial System Owner Setup Required</span>
                  </div>
                  <p>
                    No Administrator account has been registered yet. Click{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setMode('REGISTER');
                      }}
                      className="font-bold underline text-blue-800 cursor-pointer"
                    >
                      Create an Account
                    </button>{' '}
                    below to register the initial Admin account.
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {showRecoveryPanel && (
                <div className="mb-5 p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 space-y-3">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Safe Account Recovery — Restore Saved Credentials</span>
                  </div>
                  <p className="leading-relaxed text-amber-900">
                    If you created <span className="font-mono font-bold">{identifier}</span> previously, confirm your Role/Campus below and click{' '}
                    <strong>Restore Saved Account &amp; Log In</strong> to permanently save this exact username/email and password into persistent storage.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-amber-900 mb-1">
                        Account Role
                      </label>
                      <select
                        value={recoveryRole}
                        onChange={(e) =>
                          setRecoveryRole(e.target.value as 'ADMIN' | 'CAMPUS_USER')
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-900 font-medium"
                      >
                        <option value="ADMIN">ADMIN (System Administrator)</option>
                        <option value="CAMPUS_USER">CAMPUS USER</option>
                      </select>
                    </div>

                    {recoveryRole === 'CAMPUS_USER' && (
                      <div>
                        <label className="block font-semibold text-amber-900 mb-1">
                          Assigned Campus
                        </label>
                        <select
                          value={recoveryCampusId}
                          onChange={(e) => setRecoveryCampusId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-900 font-medium"
                        >
                          {campusOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.campusName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-amber-900 mb-1">
                      Full Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={recoveryFullName}
                      onChange={(e) => setRecoveryFullName(e.target.value)}
                      placeholder="e.g. System Administrator or Campus Coordinator"
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleRecoverSavedAccount}
                      className="flex-1 py-2 px-3 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {loading ? 'RESTORING ACCOUNT...' : 'RESTORE SAVED ACCOUNT & LOG IN'}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setShowRecoveryPanel(false)}
                      className="py-2 px-3 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Username or Email
                  </label>
                  <input
                    id="login-identifier"
                    name="username"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your username or email"
                    autoComplete="username"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      title={showLoginPassword ? 'Hide Password' : 'Show Password'}
                      aria-label={showLoginPassword ? 'Hide Password' : 'Show Password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{loading ? 'LOGGING IN...' : 'LOGIN'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setSuccessMessage(null);
                      setMode('REGISTER');
                    }}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-blue-700" />
                    <span>CREATE AN ACCOUNT</span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setSuccessMessage(null);
                        setShowRecoveryPanel(true);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Need account recovery? Restore saved account
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('LOGIN');
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 mb-3 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>
                <p className="text-xs font-medium text-blue-700 mb-1">
                  Account Registration
                </p>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Create an Account
                </h1>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Register a System Administrator account (full 4-campus access) or a Campus User account assigned to a specific Sisters of Mary campus.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} noValidate className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sr. Maria Theresa"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. srmaria"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. user@sistersofmary.edu.ph"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full pl-3.5 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((prev) => !prev)}
                        title={showRegPassword ? 'Hide Password' : 'Show Password'}
                        aria-label={showRegPassword ? 'Hide Password' : 'Show Password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                      >
                        {showRegPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-3.5 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        title={showConfirmPassword ? 'Hide Password' : 'Show Password'}
                        aria-label={showConfirmPassword ? 'Hide Password' : 'Show Password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role Selection & Assigned Campus */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'ADMIN' | 'CAMPUS_USER')}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="ADMIN">Admin (System Administrator)</option>
                      <option value="CAMPUS_USER">Campus User</option>
                    </select>
                  </div>

                  {/* Campus Selection (Campus Users strictly assigned to one of the 4 campuses; never All Campuses) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Campus
                    </label>
                    {role === 'ADMIN' ? (
                      <input
                        type="text"
                        value="All 4 Campuses (Admin Scope)"
                        readOnly
                        disabled
                        className="w-full px-3.5 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium cursor-not-allowed"
                      />
                    ) : (
                      <select
                        value={campusId}
                        onChange={(e) => setCampusId(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        {campusOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.campusName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('LOGIN');
                    }}
                    className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Already have an account? Back to Login
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Right Column: Institutional Four-Campus Overview & Security Architecture */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-8 space-y-6">
          <div className="pb-4 border-b border-slate-200 flex items-center gap-4">
            <img
              src="/som-logo.jpg"
              alt="The Sisters of Mary Schools-Philippines"
              className="w-14 h-14 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Centralized Four-Campus Architecture
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Designed for Sisters of Mary of Banneux, Inc. to record employment and TESDA assessment outcomes once and automatically generate multi-year summaries and official reports.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {campusOptions.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                  <span className="font-semibold text-xs text-slate-900">
                    {c.campusName}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-500 pl-6">
                  Scope ID: {c.id}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 block">
                  Role-Based Access & Strict Campus Isolation
                </span>
                <p className="mt-0.5 leading-relaxed">
                  <strong>Administrator:</strong> Full access across all four campuses, combined summaries, qualification management, and user account management.
                </p>
                <p className="mt-1 leading-relaxed">
                  <strong>Campus User:</strong> Bound strictly to their assigned campus (Biga, Minglanilla, Talisay, or Adlas) at both the interface and backend database layers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 px-8 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Sisters of Mary of Banneux, Inc. — Employment Report Management System</span>
        <span>Historical & Future Records Support (Unlimited Years)</span>
      </footer>
    </div>
  );
};
