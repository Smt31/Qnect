import React from 'react';
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

const ConversationList = ({ conversations, groups = [], selectedUser, selectedGroup, onSelectUser, onSelectGroup, onCreateGroup, currentUser, loading }) => {
    return (
        <div className="w-full h-full flex flex-col bg-white border-r border-rose-100">
            {/* Header */}
            <div className="p-5 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-white">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
                    <button
                        onClick={onCreateGroup}
                        className="p-2 rounded-full hover:bg-rose-100 transition-colors"
                        title="Create Group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-rose-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                </div>
                <div className="text-sm text-gray-500">@{currentUser?.username}</div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                {loading ? (
                    <ConversationSkeleton />
                ) : (conversations.length === 0 && groups.length === 0) ? (
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-rose-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">
                            No conversations yet.<br />
                            <span className="text-gray-400">Start a chat or create a group!</span>
                        </p>
                    </div>
                ) : (
                    <div className="py-2">
                        {/* Groups Section */}
                        {groups.length > 0 && (
                            <>
                                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Groups
                                </div>
                                {groups.map((group) => (
                                    <div
                                        key={`group-${group.id}`}
                                        onClick={() => onSelectGroup(group)}
                                        className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-200 mx-2 rounded-xl mb-1 ${selectedGroup?.id === group.id
                                            ? 'bg-gradient-to-r from-rose-100 to-rose-50 border border-rose-200 shadow-sm'
                                            : 'hover:bg-rose-50/50'
                                            }`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <img
                                                src={group.avatarUrl || `https://ui-avatars.com/api/?name=${group.name}&background=f43f5e&color=fff`}
                                                alt={group.name}
                                                className="w-12 h-12 rounded-xl object-cover ring-2 ring-rose-100"
                                            />
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-gray-900 text-[15px] truncate block">
                                                    {group.name}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">
                                                {group.members?.length || 0} members
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div className="my-2 border-t border-gray-100 mx-4"></div>
                            </>
                        )}

                        {/* Direct Messages Section */}
                        {conversations.length > 0 && (
                            <>
                                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Direct Messages
                                </div>
                                {conversations.map((conv) => (
                                    <div
                                        key={conv.otherUserId}
                                        onClick={() => onSelectUser(conv)}
                                        className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-200 mx-2 rounded-xl mb-1 ${selectedUser?.otherUserId === conv.otherUserId
                                            ? 'bg-gradient-to-r from-rose-100 to-rose-50 border border-rose-200 shadow-sm'
                                            : 'hover:bg-rose-50/50'
                                            }`}
                                    >
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <img
                                                src={conv.otherUserAvatar || `https://ui-avatars.com/api/?name=${conv.otherUsername}&background=f43f5e&color=fff`}
                                                alt={conv.otherUsername}
                                                className="w-12 h-12 rounded-full object-cover ring-2 ring-rose-100"
                                            />
                                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                                        </div>

                                        {/* Content */}
                                        <div className="ml-3 flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-gray-900 text-[15px] truncate block">
                                                    {conv.otherUserFullName || conv.otherUsername}
                                                </span>
                                                {conv.lastMessageTime && (
                                                    <span className="text-xs text-gray-400 flex-shrink-0">
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
                                                {conv.unreadCount > 0 && (
                                                    <span className="flex-shrink-0 bg-rose-500 text-white text-xs font-bold min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full">
                                                        {conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConversationList;
