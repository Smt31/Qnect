import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Home/Navbar';
import LeftSidebar from '../components/Home/LeftSidebar';
import MobileNav from '../components/Home/MobileNav';
import {
    useCurrentUser,
    useNotifications,
    useMarkNotificationAsRead,
    useMarkAllNotificationsAsRead,
    useClearAllNotifications
} from '../api/queryHooks';

export default function NotificationsPage() {
    const navigate = useNavigate();

    // Use React Query hooks for data fetching with caching
    const { data: currentUser } = useCurrentUser();
    const { data: notificationsData, isLoading: loading, isError, error } = useNotifications(0, 50);

    // Mutations
    const markAsReadMutation = useMarkNotificationAsRead();
    const markAllAsReadMutation = useMarkAllNotificationsAsRead();
    const clearAllMutation = useClearAllNotifications();

    // Handle both paginated response and direct array
    const notifications = Array.isArray(notificationsData)
        ? notificationsData
        : (notificationsData?.content || notificationsData?.data || []);

    const hasUnreadNotifications = notifications.some(n => !n.isRead);

    const handleNotificationClick = async (notif) => {
        if (!notif.isRead) {
            try {
                await markAsReadMutation.mutateAsync(notif.id);
            } catch (e) {
                console.error('Failed to mark as read', e);
            }
        }

        // Navigate based on type
        if (notif.type === 'FOLLOW') {
            navigate(`/profile/${notif.referenceId}`);
        } else if (notif.type === 'VOTE_QUESTION' || notif.type === 'COMMENT_POST' || notif.type === 'COMMENT_REPLY' || notif.type === 'VOTE_MILESTONE' || notif.type === 'ANSWER_REQUEST') {
            navigate(`/question/${notif.referenceId}`);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsReadMutation.mutateAsync();
        } catch (e) {
            console.error('Failed to mark all as read', e);
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm('Are you sure you want to clear all notifications? This cannot be undone.')) {
            return;
        }
        try {
            await clearAllMutation.mutateAsync();
        } catch (e) {
            console.error('Failed to clear notifications', e);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'FOLLOW':
                return <div className="bg-blue-100 p-2 rounded-full text-blue-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg></div>;
            case 'VOTE_QUESTION':
            case 'VOTE_ANSWER':
            case 'VOTE_MILESTONE':
                return <div className="bg-green-100 p-2 rounded-full text-green-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" /></svg></div>;
            case 'COMMENT_POST':
            case 'COMMENT_REPLY':
                return <div className="bg-purple-100 p-2 rounded-full text-purple-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg></div>;
            case 'ANSWER_REQUEST':
                return <div className="bg-orange-100 p-2 rounded-full text-orange-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
            default:
                return <div className="bg-gray-100 p-2 rounded-full text-gray-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg></div>;
        }
    };

    return (
        <div className="min-h-screen bg-[#FFF5F6]">
            <Navbar user={currentUser} />
            <div className="flex">
                {currentUser && <LeftSidebar user={currentUser} />}

                <main className="flex-1 md:ml-64 p-6 max-w-4xl">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>

                            {/* Action buttons */}
                            {notifications.length > 0 && (
                                <div className="flex items-center gap-2">
                                    {hasUnreadNotifications && (
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            disabled={markAllAsReadMutation.isPending}
                                            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleClearAll}
                                        disabled={clearAllMutation.isPending}
                                        className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {clearAllMutation.isPending ? 'Clearing...' : 'Clear all'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-gray-500">
                                <div className="animate-pulse flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                </div>
                            </div>
                        ) : isError ? (
                            <div className="p-12 text-center">
                                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Notifications</h3>
                                <p className="text-gray-500 mb-4">{error?.message || 'Something went wrong'}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
                                <p>When you get likes, comments, or followers, they'll show up here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-red-50/30' : ''}`}
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900">
                                                {notif.message}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        {!notif.isRead && (
                                            <div className="h-2 w-2 bg-red-500 rounded-full mt-2"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
            <MobileNav />
        </div>
    );
}
