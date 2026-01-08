import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { queryClient } from '../App';
import './AuthPages.css';

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
      // Direct login flow: backend returns JWT + user data
      const res = await authApi.login(email.trim(), password);

      if (res && res.accessToken) {
        // CRITICAL: Clear ALL cached data before setting new user
        // This prevents mixing data between different users
        queryClient.clear();

        // Also clear old localStorage data
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('email');
        localStorage.removeItem('username');

        // Clear any session storage
        sessionStorage.clear();

        // Now store new user's data
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
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="8" fill="#ff4757" />
                <path d="M16 10L20 14H18V20H14V14H12L16 10Z" fill="white" />
                <circle cx="16" cy="22" r="2" fill="white" />
              </svg>
              <span className="auth-logo-text">QPoint</span>
            </div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">
              Please enter your details to access your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 5.83333L10 10.8333L17.5 5.83333M3.33333 15H16.6667C17.5871 15 18.3333 14.2538 18.3333 13.3333V6.66667C18.3333 5.74619 17.5871 5 16.6667 5H3.33333C2.41286 5 1.66667 5.74619 1.66667 6.66667V13.3333C1.66667 14.2538 2.41286 15 3.33333 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                <Link to="/forgot-password" className="auth-link" style={{ fontSize: '13px', margin: 0 }}>
                  Forgot Password?
                </Link>
              </div>
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 3.75C6.25 3.75 3.125 6.25 1.25 10C3.125 13.75 6.25 16.25 10 16.25C13.75 16.25 16.875 13.75 18.75 10C16.875 6.25 13.75 3.75 10 3.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.5 2.5L17.5 17.5M8.33333 8.33333C7.89131 8.77536 7.625 9.375 7.625 10C7.625 11.3807 8.74429 12.5 10.125 12.5C10.75 12.5 11.3496 12.2337 11.7917 11.7917M15.2083 15.2083C13.9167 16.0417 12.0417 16.25 10.125 16.25C6.375 16.25 3.25 13.75 1.375 10C2.04167 8.45833 3.04167 7.125 4.29167 6.04167M7.91667 3.75C8.625 3.58333 9.375 3.5 10.125 3.5C13.875 3.5 17 6 18.875 9.5C18.375 10.5417 17.7083 11.4583 16.9167 12.2083" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error">
                <svg className="auth-error-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 6.66667V10M10 13.3333H10.0083" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="auth-links">
            <p className="auth-link">
              New to QPoint?{' '}
              <Link to="/register" className="auth-link-primary">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}