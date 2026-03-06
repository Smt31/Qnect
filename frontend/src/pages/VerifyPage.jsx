import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api';
import { queryClient } from '../App';
import './AuthPages.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  const email = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const purpose = useMemo(() => searchParams.get('purpose') || 'LOGIN', [searchParams]);

  useEffect(() => {
    if (!emailRegex.test(email)) {
      setError('Missing or invalid email. Please restart the flow.');
    } else {
      setError('');
    }
  }, [email]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
        const newOtp = [...otp];
        digits.split('').forEach((digit, i) => {
          if (index + i < OTP_LENGTH) {
            newOtp[index + i] = digit;
          }
        });
        setOtp(newOtp);
        const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
      });
    }
  };

  const handleResend = async () => {
    if (!canResend || !emailRegex.test(email)) return;

    try {
      setLoading(true);
      setError('');
      await authApi.sendOtp(email.trim(), purpose);
      setResendCooldown(30);
      setCanResend(false);
    } catch (err) {
      setError(err.message || 'Could not resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailRegex.test(email)) {
      setError('Email is required.');
      return;
    }

    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      let payload;

      if (purpose === 'REGISTER') {
        // Load pending registration data from sessionStorage
        const pendingDataStr = sessionStorage.getItem('qnect_pending_registration');
        if (!pendingDataStr) {
          setError('Registration data not found. Please start over.');
          return;
        }

        const pendingData = JSON.parse(pendingDataStr);
        const { email: regEmail, password, firstName, lastName, username: regUsername } = pendingData;

        // Build full name
        const fullName = `${firstName} ${lastName}`;

        payload = {
          email: regEmail,
          code: code,
          password,
          firstName,
          lastName,
          username: regUsername, // Add username to payload
          fullName
        };
      } else {
        // LOGIN flow
        payload = {
          email: email.trim(),
          code: code
        };
      }

      const res = await authApi.verifyOtp(payload);
      if (res.success && res.accessToken) {
        // CRITICAL: Clear ALL cached data before setting new user
        queryClient.clear();

        // Clear old localStorage data
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('email');
        localStorage.removeItem('username');

        // Save token and basic user info to localStorage
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

        // Remove pending registration data if it exists
        if (purpose === 'REGISTER') {
          sessionStorage.removeItem('qnect_pending_registration');
        }

        navigate('/home');
      } else {
        setError(res.message || 'Verification failed. Please check your code and try again.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, (_, start, middle, end) => {
    return start + '*'.repeat(Math.min(middle.length, 4)) + end;
  }) : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-pink-50 to-white px-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-rose-50 text-rose-500 mb-8 mx-auto relative animate-pulse shadow-sm border border-rose-100/50">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <div className="absolute inset-0 rounded-3xl border-2 border-rose-200/50 animate-ping"></div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2 font-['Outfit'] bg-gradient-to-br from-rose-500 via-rose-600 to-pink-700 bg-clip-text text-transparent">Verify Account</h1>
          <p className="text-gray-500 mt-2 text-sm font-medium leading-relaxed">
            Enter the code sent to <br />
            <span className="font-bold text-gray-900">{maskedEmail}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex justify-center gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                className="w-12 h-16 text-center text-2xl font-black bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 focus:bg-white transition-all text-gray-900 shadow-sm"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                autoComplete="off"
              />
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 text-white font-bold rounded-2xl hover:from-rose-600 hover:to-pink-700 focus:ring-4 focus:ring-rose-500/20 transition-all shadow-[0_8px_20px_-6px_rgba(244,63,94,0.4)] hover:shadow-[0_12px_24px_-6px_rgba(244,63,94,0.5)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed group"
            disabled={loading || otp.join('').length !== OTP_LENGTH}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Verify Account
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <p className="text-gray-500 mb-4">Didn't receive the code?</p>
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="font-semibold text-gray-900 hover:text-red-500 transition-colors"
              disabled={loading}
            >
              Click to Resend
            </button>
          ) : (
            <span className="text-gray-300 cursor-not-allowed font-medium">
              Resend in {String(Math.floor(resendCooldown / 60)).padStart(2, '0')}:{String(resendCooldown % 60).padStart(2, '0')}
            </span>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <Link to="/login" className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">
            ← Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}
