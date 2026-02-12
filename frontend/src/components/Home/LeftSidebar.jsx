import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMobileSidebar } from '../../context/MobileSidebarContext';
import { useModal } from '../../context/ModalContext';
import { groupApi } from '../../api';

export default function LeftSidebar({ user }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isOpen, close } = useMobileSidebar();
    const { openPostModal } = useModal();
    const [myPostsOpen, setMyPostsOpen] = useState(
        location.pathname.startsWith('/my-questions') || location.pathname.startsWith('/my-posts')
    );
    const [publicGroups, setPublicGroups] = useState([]);
    const [joiningGroupId, setJoiningGroupId] = useState(null);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        close();
    }, [location.pathname, close]);

    // Prevent body scroll when sidebar is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Fetch public groups (show all as topic channels)
    useEffect(() => {
        groupApi.getPublicGroups().then(data => {
            setPublicGroups((data || []).slice(0, 3));
        }).catch(err => console.error('Failed to load public groups:', err));
    }, []);

    const isActive = (path) => location.pathname === path;
    const isMyPostsActive = location.pathname.startsWith('/my-questions') || location.pathname.startsWith('/my-posts');

    const handleNavigate = (path) => {
        navigate(path);
        close();
    };

    const handleJoinGroup = async (groupId) => {
        setJoiningGroupId(groupId);
        try {
            await groupApi.joinGroup(groupId);
            // Update local state to show as member
            setPublicGroups(prev => prev.map(g =>
                g.id === groupId ? { ...g, member: true } : g
            ));
            // Navigate to chat page
            navigate('/chat');
        } catch (err) {
            console.error('Failed to join group:', err);
            alert(err.message || 'Failed to join group');
        } finally {
            setJoiningGroupId(null);
        }
    };

    const handleOpenGroup = (groupId) => {
        // If already on chat page, dispatch event to select group without navigation
        if (location.pathname === '/chat') {
            window.dispatchEvent(new CustomEvent('selectGroup', { detail: { groupId } }));
        } else {
            // Navigate to chat and the specific group will be selected
            navigate('/chat', { state: { selectedGroupId: groupId } });
        }
    };

    const sidebarContent = (
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
                onClick={() => { openPostModal(); close(); }}
            >
                New Post
            </button>

            {/* Navigation */}
            <nav className="space-y-1">
                <button
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${isActive('/home') ? 'bg-gradient-to-r from-red-50 to-pink-50 text-gray-900' : 'text-gray-900 hover:bg-gray-100'}`}
                    onClick={() => handleNavigate('/home')}
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
                    onClick={() => handleNavigate('/chat')}
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
                                onClick={() => handleNavigate('/my-questions')}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Questions</span>
                            </button>
                            <button
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${isActive('/my-posts') ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                                onClick={() => handleNavigate('/my-posts')}
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
                    onClick={() => handleNavigate('/bookmarks')}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span>Bookmarks</span>
                </button>
                <button
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${isActive('/settings') ? 'bg-gradient-to-r from-red-50 to-pink-50 text-gray-900' : 'text-gray-900 hover:bg-gray-100'}`}
                    onClick={() => handleNavigate('/settings')}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Security Settings</span>
                </button>
            </nav>

            {/* Live News Section */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Explore</h4>
                <button
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${isActive('/news') ? 'bg-gradient-to-r from-orange-50 to-red-50 text-orange-600' : 'text-gray-900 hover:bg-gray-100'}`}
                    onClick={() => handleNavigate('/news')}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    <span>Live News</span>
                    <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">New</span>
                </button>
            </div>

            {/* Public Groups Section */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Public Groups</h4>
                {publicGroups.length > 0 ? (
                    <div className="space-y-2">
                        {publicGroups.map(group => (
                            <div key={group.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <img
                                    src={group.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=f43f5e&color=fff`}
                                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                    alt=""
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{group.name}</p>
                                    <p className="text-xs text-gray-500">{group.members?.length || 0} members</p>
                                </div>
                                <button
                                    onClick={() => group.member ? handleOpenGroup(group.id) : handleJoinGroup(group.id)}
                                    disabled={joiningGroupId === group.id}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors disabled:opacity-50 ${group.member
                                        ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                                        : 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                                        }`}
                                >
                                    {joiningGroupId === group.id ? '...' : (group.member ? 'Open' : 'Join')}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="px-3 text-xs text-gray-400">No public groups to join</p>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar - Fixed on left */}
            <aside className="hidden md:block w-64 bg-white border-r border-gray-200 fixed left-0 top-16 bottom-0 overflow-y-auto">
                {sidebarContent}
            </aside>

            {/* Mobile Sidebar - Slide-in drawer */}
            <div className="md:hidden">
                {/* Backdrop */}
                <div
                    className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={close}
                />

                {/* Drawer */}
                <aside
                    className={`fixed left-0 top-0 bottom-0 w-72 bg-white z-50 flex flex-col transform transition-transform duration-300 ease-out shadow-xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    {/* Close button - Fixed header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <div className="size-8 bg-[#FF6B6B] rounded-lg flex items-center justify-center text-white">
                                <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                                    <path d="M16 10L20 14H18V20H14V14H12L16 10Z" fill="white" />
                                    <circle cx="16" cy="22" r="2" fill="white" />
                                </svg>
                            </div>
                            <span className="font-bold text-lg bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">QPOINT</span>
                        </div>
                        <button
                            onClick={close}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {/* Scrollable content area */}
                    <div
                        className="flex-1 overflow-y-auto overflow-x-hidden"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                        {sidebarContent}
                    </div>
                </aside>
            </div>
        </>
    );
}

