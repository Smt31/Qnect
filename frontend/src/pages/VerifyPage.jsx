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
        const pendingDataStr = sessionStorage.getItem('qpoint_pending_registration');
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
          sessionStorage.removeItem('qpoint_pending_registration');
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

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-500 mb-6 mx-auto relative animate-pulse">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <div className="absolute inset-0 rounded-full border-2 border-red-100 animate-ping"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Account</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Enter the code sent to <span className="font-semibold text-gray-900">{maskedEmail}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex justify-center gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                className="w-12 h-14 text-center text-xl font-bold bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-900 shadow-sm"
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
            className="w-full py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium rounded-lg hover:from-red-600 hover:to-pink-600 focus:ring-4 focus:ring-red-500/20 transition-all shadow-lg shadow-red-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={loading || otp.join('').length !== OTP_LENGTH}
          >
            {loading ? 'Verifying...' : 'Verify Account'}
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
