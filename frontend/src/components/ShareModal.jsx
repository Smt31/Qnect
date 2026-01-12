import { useState, useEffect } from 'react';
import { chatApi, userApi } from '../api';

export default function ShareModal({ isOpen, onClose, post }) {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sendingTo, setSendingTo] = useState(null); // userId being sent to
    const [sentTo, setSentTo] = useState(new Set()); // userIds already sent

    useEffect(() => {
        if (isOpen) {
            loadConversations();
            // Reset state when modal opens
            setSearchQuery('');
            setSearchResults([]);
            setSentTo(new Set());
        }
    }, [isOpen]);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const data = await chatApi.getConversations();
            setConversations(data || []);
        } catch (err) {
            console.error('Failed to load conversations', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setIsSearching(true);
            const data = await userApi.searchUsers(query.trim());
            setSearchResults(data || []);
        } catch (err) {
            console.error('Failed to search users', err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleShare = async (userId) => {
        if (sendingTo || sentTo.has(userId)) return;

        try {
            setSendingTo(userId);
            await chatApi.sendMessageHttp({
                receiverId: userId,
                content: '',
                type: 'POST_SHARE',
                sharedPostId: post.id
            });
            setSentTo(prev => new Set([...prev, userId]));
        } catch (err) {
            console.error('Failed to share post', err);
            alert('Failed to share post');
        } finally {
            setSendingTo(null);
        }
    };

    // Determine which list to show - search results or conversations
    const displayUsers = searchQuery.trim()
        ? searchResults.map(u => ({
            otherUserId: u.userId,
            otherUsername: u.username,
            otherUserFullName: u.fullName,
            otherUserAvatar: u.avatarUrl
        }))
        : conversations;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Share Post</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Post Preview */}
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex gap-3">
                        {post.imageUrl && (
                            <img
                                src={post.imageUrl}
                                alt=""
                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 line-clamp-2">{post.title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                by {post.author?.fullName || post.author?.username || 'User'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-rose-500/20 focus:bg-white transition-all"
                        />
                        {isSearching && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* User List */}
                <div className="max-h-80 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-sm">Loading conversations...</p>
                        </div>
                    ) : displayUsers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className="text-sm">{searchQuery ? 'No users found' : 'No conversations yet'}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {displayUsers.map((user) => {
                                const userId = user.otherUserId;
                                const isSending = sendingTo === userId;
                                const isSent = sentTo.has(userId);

                                return (
                                    <div
                                        key={userId}
                                        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={user.otherUserAvatar || `https://ui-avatars.com/api/?name=${user.otherUsername}&background=f43f5e&color=fff`}
                                                alt={user.otherUsername}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {user.otherUserFullName || user.otherUsername}
                                                </p>
                                                <p className="text-xs text-gray-500">@{user.otherUsername}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleShare(userId)}
                                            disabled={isSending || isSent}
                                            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${isSent
                                                    ? 'bg-green-100 text-green-600 cursor-default'
                                                    : isSending
                                                        ? 'bg-gray-100 text-gray-400 cursor-wait'
                                                        : 'bg-rose-500 text-white hover:bg-rose-600 hover:shadow-md'
                                                }`}
                                        >
                                            {isSent ? (
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                    Sent
                                                </span>
                                            ) : isSending ? (
                                                <span className="flex items-center gap-1">
                                                    <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                                    Sending
                                                </span>
                                            ) : (
                                                'Send'
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
