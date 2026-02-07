import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api';
import './AuthPages.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, message: '' });
  const navigate = useNavigate();
  const debounceTimeout = useRef(null);

  // Pre-fill email from query parameter if available
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Check username availability with debouncing
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (!username.trim() || !usernameRegex.test(username)) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: 'Checking...' });

    debounceTimeout.current = setTimeout(async () => {
      try {
        const result = await authApi.checkUsername(username.trim());
        if (result.available) {
          setUsernameStatus({ checking: false, available: true, message: 'Username is available' });
        } else {
          setUsernameStatus({ checking: false, available: false, message: 'Username is already taken' });
        }
      } catch (err) {
        setUsernameStatus({ checking: false, available: null, message: '' });
      }
    }, 500);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!usernameRegex.test(username)) {
      setError('Username must be 3-30 chars, alphanumeric or underscores.');
      return;
    }
    if (usernameStatus.available === false) {
      setError('Username is already taken. Please choose a different one.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      setLoading(true);
      await authApi.sendOtp(email.trim(), 'REGISTER');

      const registrationData = {
        email: email.trim(),
        password: password,
        firstName: firstName,
        lastName: lastName,
        username: username.trim()
      };
      sessionStorage.setItem('qpoint_pending_registration', JSON.stringify(registrationData));

      navigate(`/verify?email=${encodeURIComponent(email.trim())}&purpose=REGISTER`);
    } catch (err) {
      setError(err.message || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #fdf2f5 0%, #f8fafc 60%, #ffffff 100%)' }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ background: 'radial-gradient(circle at center, rgba(251,113,133,0.08), transparent 50%)' }}
      />

      <div
        className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden flex flex-col md:flex-row"
        style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04)' }}
      >
        {/* Left Side - Illustration */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-rose-50 via-pink-50 to-white relative p-8 items-center justify-center">
          <div
            className="relative w-full h-full"
            style={{ animation: 'float 6s ease-in-out infinite' }}
          >
            <style>{`
              @keyframes float {
                0% { transform: translateY(0); }
                50% { transform: translateY(-6px); }
                100% { transform: translateY(0); }
              }
            `}</style>

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

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center border border-rose-100">
                <span className="text-3xl font-black text-rose-500">Q</span>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 text-center">
              <h1 className="text-2xl font-bold text-rose-500 mb-2">QPoint</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Your community for questions, answers,<br />and meaningful discussions
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
          <div className="md:hidden text-center mb-6">
            <div className="inline-flex w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl items-center justify-center shadow-lg">
              <span className="text-2xl font-black text-white">Q</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Create Account</h2>
            <p className="text-gray-500 text-sm">Join our community today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all placeholder-gray-400 text-gray-900"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Username */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <input
                type="text"
                className={`w-full pl-12 pr-10 py-3 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all placeholder-gray-400 text-gray-900 ${usernameStatus.available === true
                  ? 'border-green-400 focus:ring-green-500/20 focus:border-green-500'
                  : usernameStatus.available === false
                    ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-gray-200 focus:ring-rose-500/20 focus:border-rose-400'
                  }`}
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus.checking && (
                  <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {!usernameStatus.checking && usernameStatus.available === true && (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {!usernameStatus.checking && usernameStatus.available === false && (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            {/* Username availability message */}
            {username.trim() && usernameStatus.message && (
              <p className={`text-xs mt-1 ${usernameStatus.available === true ? 'text-green-600' :
                usernameStatus.available === false ? 'text-red-600' : 'text-gray-500'
                }`}>
                {usernameStatus.message}
              </p>
            )}

            {/* Email */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all placeholder-gray-400 text-gray-900"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-12 pr-12 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all placeholder-gray-400 text-gray-900"
                placeholder="Password (8+ chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
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

            {/* Confirm Password */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-12 pr-12 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all placeholder-gray-400 text-gray-900"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
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

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-rose-400 to-rose-500 text-white font-semibold rounded-lg hover:from-rose-500 hover:to-rose-600 focus:ring-4 focus:ring-rose-500/20 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={
                loading ||
                !name.trim() ||
                !username.trim() ||
                !email.trim() ||
                !password.trim() ||
                !confirmPassword.trim() ||
                usernameStatus.available !== true
              }
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : 'Continue & Verify'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-rose-500 hover:text-rose-600 transition-colors">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
