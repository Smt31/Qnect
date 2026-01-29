import React, { useState, useEffect, useRef } from 'react';
import { chatApi, groupApi } from '../../api';
import { useQueryClient } from '@tanstack/react-query';
import webSocketService from '../../services/WebSocketService';
import MessageSkeleton from './MessageSkeleton';
import MessageContextMenu from './MessageContextMenu';

const ChatWindow = ({ currentUser, selectedUser, selectedGroup, messages, onSendMessage, onRefetch, loading }) => {
    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const queryClient = useQueryClient();

    const prevMessagesLength = useRef(0);

    const scrollToBottom = (behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        const currentLength = messages.length;
        const prevLength = prevMessagesLength.current;
        const isInitialLoad = prevLength === 0;
        const hasNewMessages = currentLength > prevLength;

        if (hasNewMessages) {
            setTimeout(() => {
                scrollToBottom(isInitialLoad ? 'auto' : 'smooth');
            }, 100);
        }

        prevMessagesLength.current = currentLength;
    }, [messages]);

    // WebSocket listener for message deletions (Global + Group handling done in ChatPage, but we might need local re-fetch trigger?)
    // Actually ChatPage handles the message array update. We rely on that.

    // Determine target name/avatar
    const targetName = selectedGroup ? selectedGroup.name : (selectedUser?.otherUserFullName || selectedUser?.otherUsername);
    const targetAvatar = selectedGroup
        ? (selectedGroup.avatarUrl || `https://ui-avatars.com/api/?name=${selectedGroup.name}&background=f43f5e&color=fff`)
        : (selectedUser?.otherUserAvatar || `https://ui-avatars.com/api/?name=${selectedUser?.otherUsername}&background=f43f5e&color=fff`);

    const isGroup = !!selectedGroup;

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messageText = newMessage.trim();
        setNewMessage('');

        onSendMessage(messageText, 'TEXT').catch(error => {
            console.error("Failed to send", error);
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        e.target.value = null;

        if (file.size > 5 * 1024 * 1024) {
            alert("File size too large (max 5MB)");
            return;
        }

        try {
            setIsUploading(true);
            const data = await chatApi.uploadImage(file); // Reusing chatApi upload generic
            await onSendMessage(data.url, 'IMAGE');
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleContextMenu = (e, message) => {
        e.preventDefault();
        if (contextMenu) {
            setContextMenu(null);
            return;
        }
        setContextMenu({
            message,
            position: { x: e.clientX, y: e.clientY }
        });
    };

    const handleDeleteMessage = async (deleteType, messageId) => {
        try {
            if (isGroup) {
                if (deleteType === 'FOR_ME') {
                    await groupApi.deleteMessageForMe(messageId);
                } else if (deleteType === 'FOR_EVERYONE') {
                    await groupApi.deleteMessageForEveryone(messageId);
                }
            } else {
                if (deleteType === 'FOR_ME') {
                    await chatApi.deleteMessageForMe(messageId);
                } else if (deleteType === 'FOR_EVERYONE') {
                    await chatApi.deleteMessageForEveryone(messageId);
                }
            }

            if (onRefetch) await onRefetch();

            // Invalidate queries
            if (isGroup) {
                // Maybe invalidate group details?
            } else {
                queryClient.invalidateQueries({ queryKey: ['conversations', currentUser.userId] });
            }
        } catch (error) {
            console.error('Failed to delete message:', error);
            alert(error.message || 'Failed to delete message');
        }
    };

    const handleClearConversation = async () => {
        if (!window.confirm('Are you sure you want to clear this entire conversation?')) return;
        try {
            if (isGroup) {
                // Not supported for groups yet? Or maybe 'Leave Group'?
                // Check requirements: "Clear conversation" for groups is not explicitly in API, but "Leave Group" is.
                // Or maybe clear local history? For now, disable clear for groups or map to Leave?
                // I'll disable for Groups.
                alert("Clear conversation not available for groups yet.");
                return;
            }
            await chatApi.clearConversation(selectedUser.otherUserId);
            if (onRefetch) await onRefetch();
            queryClient.invalidateQueries({ queryKey: ['conversations', currentUser.userId] });
        } catch (error) {
            alert(error.message || 'Failed to clear conversation');
        }
    };

    if (!selectedUser && !selectedGroup) {
        return (
            <div className="hidden md:flex flex-1 items-center justify-center flex-col h-full bg-white">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center mb-6 border border-rose-200">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-rose-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                </div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-2">Your Messages</h3>
                <p className="text-gray-500 text-center max-w-xs">Select a conversation or group to start chatting.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            {/* Header */}
            <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-white z-10">
                <div className="flex items-center">
                    <button className="md:hidden mr-3 text-gray-600 hover:text-rose-500 transition-colors" onClick={() => window.history.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <div className="relative">
                        <img
                            src={targetAvatar}
                            alt={targetName}
                            className={`w-10 h-10 ${isGroup ? 'rounded-xl' : 'rounded-full'} object-cover ring-2 ring-rose-100`}
                        />
                        {!isGroup && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${webSocketService.isConnected ? 'bg-blue-500' : 'bg-red-500'}`} title={`WebSocket: ${webSocketService.isConnected ? 'Connected' : 'Disconnected'}`}></div>
                    </div>
                    <div className="ml-3">
                        <span className="font-semibold text-gray-900 text-base block">{targetName}</span>
                        <div className="flex items-center gap-1">
                            {isGroup ? (
                                <span className="text-xs text-gray-500">{selectedGroup.members?.length || 0} members</span>
                            ) : (
                                <React.Fragment>
                                    <span className="text-xs text-green-500">Active now</span>
                                    <span className="text-[10px] text-gray-400">{webSocketService.isConnected ? '(Live)' : '(Connecting...)'}</span>
                                </React.Fragment>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isGroup && (
                        <button
                            onClick={handleClearConversation}
                            className="p-2 rounded-full hover:bg-rose-100 transition-colors group"
                            title="Clear conversation"
                        >
                            <svg className="w-5 h-5 text-gray-500 group-hover:text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <MessageContextMenu
                    message={contextMenu.message}
                    position={contextMenu.position}
                    currentUser={currentUser}
                    onDelete={handleDeleteMessage}
                    onClose={() => setContextMenu(null)}
                    isGroup={isGroup}
                    isAdmin={isGroup && (selectedGroup.isAdmin || selectedGroup.createdBy === currentUser.userId)} // Pass isAdmin check if needed for 'delete for everyone' logic in UI
                />
            )}
            {contextMenu && <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />}

            {/* Messages Area */}
            {loading ? (
                <MessageSkeleton />
            ) : (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                    {messages.map((msg, index) => {
                        const isOwn = msg.senderId === currentUser.userId;
                        const isPending = msg.pending;
                        const isFailed = msg.failed;

                        // For Groups, backend adds sender info in msg.sender (DTO) or msg.senderUsername
                        // In DM, msg.senderId works. But for Group UI, we want to show sender name if not own
                        const senderName = isGroup && !isOwn ? (msg.senderUsername || msg.sender?.username) : null;
                        const senderAvi = isGroup && !isOwn ? (msg.senderAvatar || msg.sender?.avatarUrl) : (selectedUser?.otherUserAvatar);

                        // Date Separator Logic (Same as before)
                        // ... omitted for brevity but keeping original logic structure ...
                        const formatDateSeparator = (dateStr) => {
                            if (!dateStr) return '';
                            const date = new Date(dateStr);
                            const today = new Date();
                            if (date.toDateString() === today.toDateString()) return 'Today';
                            return date.toLocaleDateString();
                        };
                        const showDateSeparator = index === 0 || (messages[index - 1] && new Date(messages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString());

                        return (
                            <React.Fragment key={`${msg.id || index}_${(msg.deleted || msg.content === "This message was deleted") ? 'del' : 'act'}`}>
                                {showDateSeparator && (
                                    <div className="flex items-center justify-center my-4">
                                        <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                                            {formatDateSeparator(msg.createdAt)}
                                        </div>
                                    </div>
                                )}

                                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group`}>
                                    {!isOwn && (
                                        <div className="flex flex-col items-center mr-2 self-end">
                                            <img
                                                src={senderAvi || `https://ui-avatars.com/api/?name=${senderName || 'User'}`}
                                                className="w-8 h-8 rounded-full ring-1 ring-rose-100"
                                                alt=""
                                            />
                                        </div>
                                    )}
                                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                        {/* Show Sender Name in Group Chat */}
                                        {isGroup && !isOwn && (
                                            <span className="text-[10px] text-gray-500 mb-0.5 ml-1">{senderName}</span>
                                        )}

                                        <div
                                            onContextMenu={(e) => handleContextMenu(e, msg)}
                                            className={`px-4 py-2.5 break-words text-sm md:text-base ${(msg.deleted || msg.content === "This message was deleted")
                                                ? 'animate-delete bg-gray-50 text-gray-400 italic border border-gray-200 rounded-2xl shadow-sm'
                                                : isOwn
                                                    ? `bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl rounded-br-md shadow-sm ${isPending ? 'opacity-70' : ''}`
                                                    : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                                                }`}
                                        >
                                            {msg.type === 'IMAGE' ? (
                                                <img src={msg.attachmentUrl || msg.content} className="rounded-lg max-h-40" onClick={() => setSelectedImage(msg.attachmentUrl || msg.content)} />
                                            ) : (
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                            )}
                                        </div>
                                        {/* Time */}
                                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                                            {isPending && <span>Sending...</span>}
                                            {!isPending && !isFailed && <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                        </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-rose-100 bg-gradient-to-r from-rose-50/50 to-white">
                <form onSubmit={handleSend} className="flex items-center bg-white border border-rose-100 rounded-full px-4 py-2.5 shadow-sm">
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-gray-500 mr-3 hover:text-rose-500">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    <input
                        type="text"
                        placeholder={isGroup ? `Message ${targetName}...` : "Type a message..."}
                        className="flex-1 bg-transparent border-none text-gray-900 focus:ring-0 placeholder-gray-400 text-sm"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" disabled={!newMessage.trim()} className="text-rose-500 hover:text-rose-600 disabled:text-gray-300">
                        <svg className="w-6 h-6 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                    </button>
                </form>
            </div>
            {/* Lightbox omitted for brevity but assumes present */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setSelectedImage(null)}>
                    <img src={selectedImage} className="max-h-[90vh] max-w-[90vw] object-contain" />
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
