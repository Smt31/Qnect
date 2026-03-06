import { useNavigate, useLocation } from 'react-router-dom';
import { useMobileSidebar } from '../../context/MobileSidebarContext';
import { useModal } from '../../context/ModalContext';

export default function MobileNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isOpen } = useMobileSidebar();
    const { openPostModal } = useModal();
    const isActive = (path) => location.pathname === path;

    return (
        <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 flex items-center justify-around py-3 px-4 z-50 transition-transform duration-300 ease-out pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] ${isOpen ? 'translate-y-full' : 'translate-y-0'}`}>
            <button
                className={`relative flex flex-col items-center gap-1 w-16 py-1 transition-all duration-300 ${isActive('/home') ? 'text-rose-500 font-medium' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => navigate('/home')}
            >
                {isActive('/home') && (
                    <span className="absolute -top-1 w-8 h-1 bg-rose-500 rounded-full shadow-[0_2px_8px_rgba(244,63,94,0.5)]"></span>
                )}
                <svg width="22" height="22" fill={isActive('/home') ? "currentColor" : "none"} stroke={isActive('/home') ? "none" : "currentColor"} viewBox="0 0 24 24" strokeWidth="2">
                    {isActive('/home') ? (
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    )}
                </svg>
                <span className="text-[10px]">Home</span>
            </button>
            <button
                className={`relative flex flex-col items-center gap-1 w-16 py-1 transition-all duration-300 ${isActive('/search') ? 'text-rose-500 font-medium' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => navigate('/search')}
            >
                {isActive('/search') && (
                    <span className="absolute -top-1 w-8 h-1 bg-rose-500 rounded-full shadow-[0_2px_8px_rgba(244,63,94,0.5)]"></span>
                )}
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={isActive('/search') ? "2.5" : "2"} viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span className="text-[10px]">Search</span>
            </button>
            <button className="flex flex-col items-center justify-center relative w-16 mx-1 group" onClick={openPostModal}>
                <div className="absolute -top-8 w-14 h-14 bg-gradient-to-tr from-rose-600 to-rose-400 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(244,63,94,0.4)] group-hover:-translate-y-1 group-hover:shadow-[0_12px_25px_rgba(244,63,94,0.5)] transition-all duration-300 border-4 border-white">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24" className="text-white transform group-hover:rotate-90 transition-transform duration-300">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </div>
            </button>
            <button
                className={`relative flex flex-col items-center gap-1 w-16 py-1 transition-all duration-300 ${isActive('/chat') ? 'text-rose-500 font-medium' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => navigate('/chat')}
            >
                {isActive('/chat') && (
                    <span className="absolute -top-1 w-8 h-1 bg-rose-500 rounded-full shadow-[0_2px_8px_rgba(244,63,94,0.5)]"></span>
                )}
                <svg width="22" height="22" fill={isActive('/chat') ? "currentColor" : "none"} stroke={isActive('/chat') ? "none" : "currentColor"} strokeWidth="2" viewBox="0 0 24 24">
                    {isActive('/chat') ? (
                        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    )}
                </svg>
                <span className="text-[10px]">Chat</span>
            </button>
            <button
                className={`relative flex flex-col items-center gap-1 w-16 py-1 transition-all duration-300 ${isActive('/bookmarks') ? 'text-rose-500 font-medium' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => navigate('/bookmarks')}
            >
                {isActive('/bookmarks') && (
                    <span className="absolute -top-1 w-8 h-1 bg-rose-500 rounded-full shadow-[0_2px_8px_rgba(244,63,94,0.5)]"></span>
                )}
                <svg width="22" height="22" fill={isActive('/bookmarks') ? "currentColor" : "none"} stroke={isActive('/bookmarks') ? "none" : "currentColor"} viewBox="0 0 24 24" strokeWidth="2">
                    {isActive('/bookmarks') ? (
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    )}
                </svg>
                <span className="text-[10px]">Saved</span>
            </button>
        </div>
    );
}
