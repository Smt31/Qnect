import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LeftSidebar({ user, onAskQuestion }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [myPostsOpen, setMyPostsOpen] = useState(
        location.pathname.startsWith('/my-questions') || location.pathname.startsWith('/my-posts')
    );

    const isActive = (path) => location.pathname === path;
    const isMyPostsActive = location.pathname.startsWith('/my-questions') || location.pathname.startsWith('/my-posts');

    return (
        <aside className="hidden md:block w-64 bg-white border-r border-gray-200 fixed left-0 top-16 bottom-0 overflow-y-auto">
            <div className="p-4">
                {/* Profile Section */}
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-200">
                    <div className="bg-center bg-no-repeat bg-cover rounded-full w-12 h-12 flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-500 text-white font-bold text-lg shadow-md">
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
                    <div className="min-w-0 flex flex-col">
                        <h3 className="truncate text-sm font-semibold text-gray-900">
                            {user?.fullName || user?.username || 'User'}
                        </h3>
                        <p className="text-xs text-gray-500">{user?.reputation || 0} Rep</p>
                    </div>
                </div>

                {/* New Question Button */}
                <button
                    className="w-full mb-4 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-red-600 hover:to-pink-600 shadow-md hover:shadow-lg"
                    onClick={onAskQuestion}
                >
                    New Post
                </button>

                {/* Navigation */}
                <nav className="space-y-1">
                    <button
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${isActive('/home') ? 'bg-gradient-to-r from-red-50 to-pink-50 text-gray-900' : 'text-gray-900 hover:bg-gray-100'}`}
                        onClick={() => navigate('/home')}
                    >
                        <svg className="w-5 h-5" fill={isActive('/home') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            {isActive('/home') ? (
                                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            )}
                        </svg>
                        <span>Home Feed</span>
                    </button>
                    <button
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${isActive('/chat') ? 'bg-gradient-to-r from-red-50 to-pink-50 text-gray-900' : 'text-gray-900 hover:bg-gray-100'}`}
                        onClick={() => navigate('/chat')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                        </svg>
                        <span>Messages</span>
                    </button>

                    {/* My Posts - Expandable */}
                    <div>
                        <button
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${isMyPostsActive ? 'bg-gradient-to-r from-red-50 to-pink-50 text-gray-900' : 'text-gray-900 hover:bg-gray-100'}`}
                            onClick={() => setMyPostsOpen(!myPostsOpen)}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
                                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" />
                            </svg>
                            <span className="flex-1">My Posts</span>
                            <svg className={`w-4 h-4 transition-transform ${myPostsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Sub-menu */}
                        {myPostsOpen && (
                            <div className="ml-8 mt-1 space-y-1">
                                <button
                                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${isActive('/my-questions') ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                                    onClick={() => navigate('/my-questions')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Questions</span>
                                </button>
                                <button
                                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${isActive('/my-posts') ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                                    onClick={() => navigate('/my-posts')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                    </svg>
                                    <span>Posts</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${isActive('/bookmarks') ? 'bg-gradient-to-r from-red-50 to-pink-50 text-gray-900' : 'text-gray-900 hover:bg-gray-100'}`}
                        onClick={() => navigate('/bookmarks')}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        <span>Bookmarks</span>
                    </button>
                    <button
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${isActive('/settings') ? 'bg-gradient-to-r from-red-50 to-pink-50 text-gray-900' : 'text-gray-900 hover:bg-gray-100'}`}
                        onClick={() => navigate('/settings')}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Security Settings</span>
                    </button>
                </nav>

                {/* Topics */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Topics</h4>
                    <div className="flex flex-col gap-1">
                        {['Technology', 'Science', 'Business', 'Design'].map((topic) => (
                            <button
                                key={topic}
                                className="rounded-lg px-3 py-2 text-left text-sm text-gray-900 font-medium transition-colors hover:bg-gray-100"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    {topic}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );
}

