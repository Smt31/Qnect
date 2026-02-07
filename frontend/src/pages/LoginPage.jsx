import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { queryClient } from '../App';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.login(email.trim(), password);

      if (res && res.accessToken) {
        queryClient.clear();
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('email');
        localStorage.removeItem('username');
        sessionStorage.clear();

        localStorage.setItem('token', res.accessToken);
        if (res.userId != null) {
          localStorage.setItem('userId', String(res.userId));
        }
        if (res.email) {
          localStorage.setItem('email', res.email);
        }
        if (res.username) {
          localStorage.setItem('username', res.username);
        }

        navigate('/home', { replace: true });
      } else {
        setError(res?.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #fdf2f5 0%, #f8fafc 60%, #ffffff 100%)' }}
    >
      {/* Radial glow behind card */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ background: 'radial-gradient(circle at center, rgba(251,113,133,0.08), transparent 50%)' }}
      />

      {/* Main Card with deeper shadow */}
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden flex flex-col md:flex-row"
        style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04)' }}
      >

        {/* Left Side - Illustration with floating animation */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-rose-50 via-pink-50 to-white relative p-8 items-center justify-center">
          {/* Network Illustration - with float animation */}
          <div
            className="relative w-full h-full"
            style={{ animation: 'float 6s ease-in-out infinite' }}
          >
            {/* Keyframes injected via style tag */}
            <style>{`
              @keyframes float {
                0% { transform: translateY(0); }
                50% { transform: translateY(-6px); }
                100% { transform: translateY(0); }
              }
            `}</style>
            {/* Connection lines - SVG network */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300">
              {/* Connection lines */}
              <line x1="150" y1="150" x2="80" y2="80" stroke="#fda4af" strokeWidth="1.5" opacity="0.7" />
              <line x1="150" y1="150" x2="220" y2="80" stroke="#fda4af" strokeWidth="1.5" opacity="0.7" />
              <line x1="150" y1="150" x2="250" y2="150" stroke="#fda4af" strokeWidth="1.5" opacity="0.7" />
              <line x1="150" y1="150" x2="220" y2="220" stroke="#fda4af" strokeWidth="1.5" opacity="0.7" />
              <line x1="150" y1="150" x2="80" y2="220" stroke="#fda4af" strokeWidth="1.5" opacity="0.7" />
              <line x1="150" y1="150" x2="50" y2="150" stroke="#fda4af" strokeWidth="1.5" opacity="0.7" />
              <line x1="80" y1="80" x2="150" y2="50" stroke="#fda4af" strokeWidth="1" opacity="0.6" />
              <line x1="220" y1="80" x2="150" y2="50" stroke="#fda4af" strokeWidth="1" opacity="0.6" />
              <line x1="220" y1="80" x2="270" y2="100" stroke="#fda4af" strokeWidth="1" opacity="0.6" />
              <line x1="80" y1="80" x2="30" y2="100" stroke="#fda4af" strokeWidth="1" opacity="0.6" />
              <line x1="80" y1="220" x2="30" y2="200" stroke="#fda4af" strokeWidth="1" opacity="0.6" />
              <line x1="220" y1="220" x2="270" y2="200" stroke="#fda4af" strokeWidth="1" opacity="0.6" />

              {/* Nodes */}
              <circle cx="80" cy="80" r="8" fill="#fb7185" opacity="0.9" />
              <circle cx="220" cy="80" r="6" fill="#fda4af" opacity="0.8" />
              <circle cx="250" cy="150" r="5" fill="#fecdd3" opacity="0.85" />
              <circle cx="220" cy="220" r="7" fill="#fb7185" opacity="0.8" />
              <circle cx="80" cy="220" r="5" fill="#fda4af" opacity="0.9" />
              <circle cx="50" cy="150" r="6" fill="#fecdd3" opacity="0.8" />
              <circle cx="150" cy="50" r="4" fill="#fda4af" opacity="0.7" />
              <circle cx="270" cy="100" r="4" fill="#fecdd3" opacity="0.65" />
              <circle cx="30" cy="100" r="5" fill="#fb7185" opacity="0.65" />
              <circle cx="30" cy="200" r="4" fill="#fda4af" opacity="0.7" />
              <circle cx="270" cy="200" r="5" fill="#fecdd3" opacity="0.7" />

              {/* Animated floating question marks */}
              <g className="animate-bounce" style={{ animationDuration: '2s' }}>
                <text x="75" y="65" fontSize="14" fill="#fb7185" opacity="0.7" fontWeight="bold">?</text>
              </g>
              <g className="animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }}>
                <text x="225" y="95" fontSize="12" fill="#e11d48" opacity="0.6" fontWeight="bold">?</text>
              </g>
              <g className="animate-bounce" style={{ animationDuration: '3s', animationDelay: '0.6s' }}>
                <text x="65" y="235" fontSize="11" fill="#fb7185" opacity="0.5" fontWeight="bold">?</text>
              </g>
              <g className="animate-bounce" style={{ animationDuration: '2.2s', animationDelay: '0.9s' }}>
                <text x="25" y="115" fontSize="12" fill="#e11d48" opacity="0.6" fontWeight="bold">?</text>
              </g>
              <g className="animate-bounce" style={{ animationDuration: '2.8s', animationDelay: '0.4s' }}>
                <text x="145" y="38" fontSize="10" fill="#fda4af" opacity="0.5" fontWeight="bold">?</text>
              </g>
              <g className="animate-bounce" style={{ animationDuration: '2.4s', animationDelay: '0.7s' }}>
                <text x="265" y="210" fontSize="11" fill="#fb7185" opacity="0.5" fontWeight="bold">?</text>
              </g>
              <g className="animate-bounce" style={{ animationDuration: '3.2s', animationDelay: '1s' }}>
                <text x="35" y="215" fontSize="10" fill="#e11d48" opacity="0.4" fontWeight="bold">?</text>
              </g>

              {/* Small decorative cubes */}
              <rect x="215" y="210" width="15" height="15" rx="3" fill="#fecdd3" opacity="0.5" transform="rotate(15 222 217)" />
              <rect x="70" y="210" width="12" height="12" rx="2" fill="#fda4af" opacity="0.4" transform="rotate(-10 76 216)" />
              <rect x="245" y="140" width="10" height="10" rx="2" fill="#fb7185" opacity="0.3" />
            </svg>

            {/* Center Q Logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center border border-rose-100">
                <span className="text-3xl font-black text-rose-500">Q</span>
              </div>
            </div>

            {/* Branding at bottom */}
            <div className="absolute bottom-0 left-0 right-0 text-center">
              <h1 className="text-2xl font-bold text-rose-500 mb-2">QPoint</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Your community for questions, answers,<br />and meaningful discussions
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
          {/* Mobile Logo */}
          <div className="md:hidden text-center mb-6">
            <div className="inline-flex w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl items-center justify-center shadow-lg">
              <span className="text-2xl font-black text-white">Q</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back to QPoint</h2>
            <p className="text-gray-400 text-sm">Ask questions. Share knowledge. Learn together.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all placeholder-gray-400 text-gray-900"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all placeholder-gray-400 text-gray-900"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="text-right mt-2">
                <Link to="/forgot-password" className="text-xs text-rose-500 hover:text-rose-600 font-medium transition-colors">
                  Forgot Password?
                </Link>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-rose-400 to-rose-500 text-white font-semibold rounded-lg hover:from-rose-500 hover:to-rose-600 focus:ring-4 focus:ring-rose-500/20 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : 'LOGIN'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">OR</span>
            </div>
          </div>

          {/* Social Icons */}
          <div className="flex justify-center gap-4">
            <button type="button" className="w-11 h-11 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </button>
            <button type="button" className="w-11 h-11 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </button>
          </div>

          {/* Register Link */}
          <p className="text-center mt-6 text-sm text-gray-500">
            Don't have account?{' '}
            <Link to="/register" className="font-semibold text-rose-500 hover:text-rose-600 transition-colors">
              Register Now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}