import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { queryClient } from '../../App';
import { useUnreadNotificationCount } from '../../api/queryHooks';
import { useMobileSidebar } from '../../context/MobileSidebarContext';
import FeedbackModal from '../FeedbackModal';
import Logo from '../Logo';

const Navbar = ({ user }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const { toggle: toggleSidebar } = useMobileSidebar();

  // Fetch unread notification count
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  const handleLogout = () => {
    // CRITICAL: Clear ALL cached data to prevent mixing user data
    queryClient.clear();

    // Clear all localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    localStorage.removeItem('username');

    // Clear session storage
    sessionStorage.clear();

    // Navigate to landing to reset app state
    navigate('/', { replace: true });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogoClick = () => {
    navigate('/home');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
      <div className="flex h-full w-full items-center">
        {/* Hamburger menu for mobile */}
        <button
          className="md:hidden ml-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={toggleSidebar}
          aria-label="Open menu"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Left (logo) */}
        <div className="flex h-full w-auto items-center px-4 md:w-64 md:shrink-0 md:px-6">
          <Logo onClick={handleLogoClick} />
        </div>

        {/* Center (search) */}
        <div className="hidden md:flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-2xl">
            <form onSubmit={handleSearchSubmit} className="w-full">
              <label className="group flex w-full items-center rounded-3xl bg-gray-50 hover:bg-gray-100/80 px-4 h-11 border border-transparent focus-within:bg-white focus-within:border-rose-200 focus-within:ring-4 focus-within:ring-rose-500/10 transition-all duration-300 shadow-inner">
                <svg className="text-gray-400 group-focus-within:text-rose-500 transition-colors" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm px-3 text-gray-800 placeholder:text-gray-400 h-full font-medium"
                  placeholder="Search questions, topics, or users…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-md shadow-sm ml-2">
                  <span className="text-[10px] font-bold text-gray-400">/</span>
                </div>
              </label>
            </form>
          </div>
        </div>

        {/* Right (actions) */}
        <div className="flex h-full flex-1 items-center justify-end px-4 md:w-64 md:flex-none md:shrink-0 md:px-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 text-[#555]">
              <button
                className="size-10 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 rounded-full transition-all duration-300 relative group"
                onClick={() => navigate('/notifications')}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="group-hover:rotate-12 transition-transform duration-300">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {/* Show notification dot only when there are unread notifications */}
                {unreadCount > 0 && (
                  <div className="absolute top-2 right-2 flex items-center justify-center">
                    <span className="absolute size-3 bg-rose-400 rounded-full animate-ping opacity-75"></span>
                    <span className="relative size-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                  </div>
                )}
              </button>

              <div className="relative ml-2">
                <button
                  className="rounded-full border-2 border-transparent hover:border-rose-300 hover:shadow-md hover:shadow-rose-500/20 transition-all duration-300 focus:outline-none"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                >
                  <div className="bg-center bg-no-repeat bg-cover rounded-full size-9 flex items-center justify-center bg-[#FF6B6B] text-white font-bold">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user?.fullName || user?.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                </button>

                {/* Dropdown Menu */}
                <div
                  className={`absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100/50 py-2 z-50 transform transition-all duration-300 origin-top-right ${isDropdownOpen
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'
                    }`}
                >
                  <div className="px-5 py-3 border-b border-gray-50 mb-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">@{user?.username || 'username'}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="size-4 rounded-full bg-rose-100 flex items-center justify-center">
                        <svg className="size-2.5 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">{user?.reputation || 0} pts</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigate('/profile');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-rose-50/50 hover:text-rose-500 transition-colors flex items-center gap-3 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      navigate('/settings');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-rose-50/50 hover:text-rose-500 transition-colors flex items-center gap-3 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Settings
                  </button>

                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        navigate('/admin');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-5 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors flex items-center gap-3 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      Admin Dashboard
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsFeedbackOpen(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-rose-50/50 hover:text-rose-500 transition-colors flex items-center gap-3 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    Feedback
                  </button>

                  <div className="border-t border-gray-100 my-2"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-5 py-2.5 text-sm text-red-600 hover:bg-red-50/80 transition-colors flex items-center gap-3 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </header>
  );
};

export default Navbar;