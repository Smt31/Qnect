import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthToken } from '../api';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/home');
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white">
      {/* Header / Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">QPoint</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <Link to="/support" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Support</Link>
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSignIn}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
              >
                Sign In
              </button>
              <button
                onClick={handleGetStarted}
                className="text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 px-5 py-2 rounded-lg shadow-lg shadow-red-500/20 transition-all"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-600 text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                AI-Powered Q&A Platform
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Ask Better Questions,
                <span className="block bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                  Get Smarter Answers
                </span>
              </h1>

              <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0">
                QPoint helps you ask, answer, and discover knowledge with AI-powered insights
                and a trusted community of experts.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-3 text-white font-medium bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl shadow-lg shadow-red-500/25 transition-all transform hover:scale-105"
                >
                  Start for Free
                </button>
                <button
                  onClick={handleSignIn}
                  className="px-8 py-3 text-gray-700 font-medium bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all"
                >
                  Sign In →
                </button>
              </div>


            </div>

            {/* Right - Original Floating Illustration */}
            <div className="hidden lg:block">
              <div className="hero-illustration-card">
                <div className="illustration-content">
                  {/* Question Mark Icon */}
                  <div className="illustration-question">
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="40" cy="40" r="35" fill="#ff4757" opacity="0.1" />
                      <path d="M40 25C35.5817 25 32 28.5817 32 33C32 33.5523 32.4477 34 33 34C33.5523 34 34 33.5523 34 33C34 29.6863 36.6863 27 40 27C43.3137 27 46 29.6863 46 33C46 36.3137 43.3137 39 40 39C39.4477 39 39 39.4477 39 40V45C39 45.5523 39.4477 46 40 46C40.5523 46 41 45.5523 41 45V41.5C44.5899 41.5 47.5 38.5899 47.5 35C47.5 31.4101 44.5899 28.5 41 28.5C37.4101 28.5 34.5 31.4101 34.5 35C34.5 35.5523 34.0523 36 33.5 36C32.9477 36 32.5 35.5523 32.5 35C32.5 30.5817 36.0817 27 40.5 27C44.9183 27 48.5 30.5817 48.5 35C48.5 39.4183 44.9183 43 40.5 43C40.2239 43 40 43.2239 40 43.5V45.5C40 45.7761 40.2239 46 40.5 46C40.7761 46 41 45.7761 41 45.5V43.5C41 43.2239 40.7761 43 40.5 43Z" fill="#ff4757" />
                      <circle cx="40" cy="52" r="3" fill="#ff4757" />
                    </svg>
                  </div>
                  {/* Chat Bubbles */}
                  <div className="illustration-bubble bubble-1">
                    <div className="bubble-content">
                      <div className="bubble-dot"></div>
                      <div className="bubble-dot"></div>
                      <div className="bubble-dot"></div>
                    </div>
                  </div>
                  <div className="illustration-bubble bubble-2">
                    <div className="bubble-content">
                      <div className="bubble-line"></div>
                      <div className="bubble-line short"></div>
                    </div>
                  </div>
                  {/* Abstract Cards */}
                  <div className="illustration-card card-1">
                    <div className="card-lines">
                      <div className="card-line"></div>
                      <div className="card-line"></div>
                      <div className="card-line short"></div>
                    </div>
                  </div>
                  <div className="illustration-card card-2">
                    <div className="card-lines">
                      <div className="card-line"></div>
                      <div className="card-line short"></div>
                    </div>
                  </div>
                  {/* AI Sparkle */}
                  <div className="illustration-sparkle sparkle-1">✨</div>
                  <div className="illustration-sparkle sparkle-2">💡</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-medium mb-4">
              FEATURES
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose QPoint?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built for meaningful discussions, fast answers, and trusted knowledge sharing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mb-6 shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Powered Answers</h3>
              <p className="text-gray-600">
                Get instant, intelligent answers powered by advanced AI. Ask Cue for help anytime.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Expert Community</h3>
              <p className="text-gray-600">
                Connect with experts, upvote the best answers, and build your reputation.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Trusted & Secure</h3>
              <p className="text-gray-600">
                Enterprise-grade security with verified answers and moderated content.
              </p>
            </div>
          </div>
        </div>
      </section>


      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900">QPoint</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link to="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
              <Link to="/support" className="hover:text-gray-900 transition-colors">Support</Link>
            </div>

            <div className="text-sm text-gray-400">
              © 2026 QPoint. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}