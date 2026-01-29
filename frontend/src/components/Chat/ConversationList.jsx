import React, { useState } from 'react';
import ConversationSkeleton from './ConversationSkeleton';

// Format relative time (Just now, 2 min ago, etc.)
const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// Default Avatar component with human icon
const DefaultAvatar = ({ name, isRounded = true, size = 'w-12 h-12' }) => (
    <div className={`${size} ${isRounded ? 'rounded-full' : 'rounded-xl'} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-gray-400">
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
        </svg>
    </div>
);

const ConversationList = ({ conversations, groups = [], selectedUser, selectedGroup, onSelectUser, onSelectGroup, onCreateGroup, currentUser, loading }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'groups', 'direct'

    // Filter conversations and groups based on search
    const filteredConversations = conversations.filter(conv =>
        (conv.otherUserFullName || conv.otherUsername || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const showGroups = activeTab === 'all' || activeTab === 'groups';
    const showDirect = activeTab === 'all' || activeTab === 'direct';

    return (
        <div className="w-full h-full flex flex-col bg-gradient-to-b from-white to-gray-50/50">
            {/* Header */}
            <div className="p-5 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Messages</h2>
                        <p className="text-sm text-gray-400 mt-0.5">@{currentUser?.username}</p>
                    </div>
                    <button
                        onClick={onCreateGroup}
                        className="w-10 h-10 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 flex items-center justify-center shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all duration-200"
                        title="Create Group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100 focus:bg-white rounded-xl text-sm text-gray-900 placeholder-gray-400 border border-transparent focus:border-rose-200 focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all duration-200"
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-4 p-1 bg-gray-100 rounded-xl">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'direct', label: 'Direct' },
                        { id: 'groups', label: 'Groups' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === tab.id
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <ConversationSkeleton />
                ) : (filteredConversations.length === 0 && filteredGroups.length === 0) ? (
                    <div className="p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-rose-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                            </svg>
                        </div>
                        <p className="text-gray-600 font-medium mb-1">No conversations yet</p>
                        <p className="text-sm text-gray-400">Start a chat or create a group!</p>
                    </div>
                ) : (
                    <div className="p-3 space-y-3">
                        {/* Groups Section */}
                        {showGroups && filteredGroups.length > 0 && (
                            <div className="space-y-1">
                                <div className="px-2 py-1.5 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-rose-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Groups</span>
                                    <span className="text-xs text-gray-300">({filteredGroups.length})</span>
                                </div>
                                {filteredGroups.map((group) => (
                                    <div
                                        key={`group-${group.id}`}
                                        onClick={() => onSelectGroup(group)}
                                        className={`flex items-center p-3 cursor-pointer transition-all duration-200 rounded-2xl group ${selectedGroup?.id === group.id
                                            ? 'bg-rose-50 border border-rose-200 shadow-sm'
                                            : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <img
                                                src={group.avatarUrl || `https://ui-avatars.com/api/?name=${group.name}&background=f43f5e&color=fff`}
                                                alt={group.name}
                                                className={`w-12 h-12 rounded-xl object-cover ${selectedGroup?.id === group.id
                                                    ? 'ring-2 ring-rose-300'
                                                    : 'ring-2 ring-gray-100 group-hover:ring-gray-200'
                                                    }`}
                                            />
                                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-rose-100 rounded-lg flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-rose-500">
                                                    <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                            <span className={`font-semibold text-[15px] truncate block text-gray-900
                                                `}>
                                                {group.name}
                                            </span>
                                            <p className={`text-sm truncate text-gray-400
                                                `}>
                                                {group.members?.length || 0} members
                                            </p>
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${selectedGroup?.id === group.id ? 'text-rose-400' : 'text-gray-300'
                                            }`}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                        </svg>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Divider between sections */}
                        {showGroups && showDirect && filteredGroups.length > 0 && filteredConversations.length > 0 && (
                            <div className="py-2">
                                <div className="border-t border-gray-100"></div>
                            </div>
                        )}

                        {/* Direct Messages Section */}
                        {showDirect && filteredConversations.length > 0 && (
                            <div className="space-y-1">
                                <div className="px-2 py-1.5 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-blue-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Direct Messages</span>
                                    <span className="text-xs text-gray-300">({filteredConversations.length})</span>
                                </div>
                                {filteredConversations.map((conv) => (
                                    <div
                                        key={conv.otherUserId}
                                        onClick={() => onSelectUser(conv)}
                                        className={`flex items-center p-3 cursor-pointer transition-all duration-200 rounded-2xl group ${selectedUser?.otherUserId === conv.otherUserId
                                            ? 'bg-rose-50 border border-rose-200 shadow-sm'
                                            : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            {conv.otherUserAvatar ? (
                                                <img
                                                    src={conv.otherUserAvatar}
                                                    alt={conv.otherUsername}
                                                    className={`w-12 h-12 rounded-full object-cover ${selectedUser?.otherUserId === conv.otherUserId
                                                        ? 'ring-2 ring-rose-300'
                                                        : 'ring-2 ring-gray-100 group-hover:ring-gray-200'
                                                        }`}
                                                />
                                            ) : (
                                                <DefaultAvatar name={conv.otherUsername} isRounded={true} />
                                            )}
                                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                                        </div>

                                        {/* Content */}
                                        <div className="ml-3 flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-[15px] truncate block text-gray-900">
                                                    {conv.otherUserFullName || conv.otherUsername}
                                                </span>
                                                {conv.lastMessageTime && (
                                                    <span className={`text-xs flex-shrink-0 text-gray-400
                                                        `}>
                                                        {formatRelativeTime(conv.lastMessageTime)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between gap-2 mt-0.5">
                                                <p className={`text-sm truncate ${conv.unreadCount > 0
                                                    ? 'text-gray-800 font-medium'
                                                    : 'text-gray-500'
                                                    }`}>
                                                    {conv.lastMessagePreview || "Start chatting..."}
                                                </p>
                                                {conv.unreadCount > 0 && selectedUser?.otherUserId !== conv.otherUserId && (
                                                    <span className="flex-shrink-0 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-xs font-bold min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full shadow-sm">
                                                        {conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConversationList;
