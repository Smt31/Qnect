import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { queryClient } from '../../App';
import { useUnreadNotificationCount } from '../../api/queryHooks';
import { useMobileSidebar } from '../../context/MobileSidebarContext';

const Navbar = ({ user }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
    <header className="sticky top-0 z-50 w-full bg-white border-b border-[#EDEDED] h-16">
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
          <div className="flex items-center gap-3 text-[#1A1A1A] cursor-pointer" onClick={handleLogoClick}>
            <div className="size-8 bg-[#FF6B6B] rounded-lg flex items-center justify-center text-white">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 10L20 14H18V20H14V14H12L16 10Z" fill="white" />
                <circle cx="16" cy="22" r="2" fill="white" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">QPOINT</h2>
          </div>
        </div>

        {/* Center (search) */}
        <div className="hidden md:flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-2xl">
            <form onSubmit={handleSearchSubmit} className="w-full">
              <label className="group flex w-full items-center rounded-full bg-gray-100/50 hover:bg-gray-100 px-4 h-11 border border-transparent focus-within:bg-white focus-within:border-rose-100 focus-within:ring-4 focus-within:ring-rose-500/10 transition-all duration-300">
                <svg className="text-gray-400 group-focus-within:text-rose-500 transition-colors" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm px-3 text-gray-800 placeholder:text-gray-400 h-full"
                  placeholder="Search questions, topics, or users…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
            </form>
          </div>
        </div>

        {/* Right (actions) */}
        <div className="flex h-full flex-1 items-center justify-end px-4 md:w-64 md:flex-none md:shrink-0 md:px-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 text-[#555]">
              <button
                className="size-10 flex items-center justify-center hover:bg-[#F6F6F6] rounded-full transition-colors relative"
                onClick={() => navigate('/notifications')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {/* Show notification dot only when there are unread notifications */}
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 size-2 bg-[#FF6B6B] rounded-full border border-white"></span>
                )}
              </button>

              <div className="relative ml-2">
                <button
                  className="rounded-full border-2 border-transparent hover:border-[#FF6B6B]/50 transition-all focus:outline-none"
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
                  className={`absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 transform transition-all duration-200 origin-top-right ${isDropdownOpen
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                    }`}
                >
                  <div className="px-4 py-2 border-b border-gray-50 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate">@{user?.username || 'username'}</p>
                    <p className="text-xs text-gray-600 mt-1">Reputation: {user?.reputation || 0}</p>
                  </div>

                  <button
                    onClick={() => {
                      navigate('/profile');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#FF6B6B] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      navigate('/settings');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#FF6B6B] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Settings
                  </button>

                  <div className="border-t border-gray-50 my-1"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
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
    </header>
  );
};

export default Navbar;