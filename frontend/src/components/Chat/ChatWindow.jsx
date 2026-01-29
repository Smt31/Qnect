import React, { useState, useEffect, useRef } from 'react';
import { chatApi, groupApi } from '../../api';
import { useQueryClient } from '@tanstack/react-query';
import webSocketService from '../../services/WebSocketService';
import MessageSkeleton from './MessageSkeleton';
import MessageContextMenu from './MessageContextMenu';

import GroupDetailsModal from './GroupDetailsModal';

// Default Avatar component with human icon
const DefaultAvatar = ({ size = 'w-10 h-10', className = '' }) => (
    <div className={`${size} rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400">
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
        </svg>
    </div>
);

const ChatWindow = ({ currentUser, selectedUser, selectedGroup, messages, onSendMessage, onUpdateMessages, loading }) => {
    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [showGroupDetails, setShowGroupDetails] = useState(false);
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
        ? (selectedGroup.avatarUrl || null)
        : (selectedUser?.otherUserAvatar || null);

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
            // Optimistic update - mark message as deleting for animation
            onUpdateMessages(prev => prev.map(msg =>
                String(msg.id) === String(messageId)
                    ? { ...msg, isDeleting: true }
                    : msg
            ));

            // Wait for animation to play
            await new Promise(resolve => setTimeout(resolve, 300));

            if (isGroup) {
                if (deleteType === 'FOR_ME') {
                    await groupApi.deleteMessageForMe(messageId);
                    // Remove message locally for "delete for me"
                    onUpdateMessages(prev => prev.filter(msg => String(msg.id) !== String(messageId)));
                } else if (deleteType === 'FOR_EVERYONE') {
                    await groupApi.deleteMessageForEveryone(messageId);
                    // Mark as deleted for everyone (will also be updated via WebSocket)
                    onUpdateMessages(prev => prev.map(msg =>
                        String(msg.id) === String(messageId)
                            ? { ...msg, content: "This message was deleted", type: 'TEXT', deleted: true, isDeleting: false }
                            : msg
                    ));
                }
            } else {
                if (deleteType === 'FOR_ME') {
                    await chatApi.deleteMessageForMe(messageId);
                    // Remove message locally
                    onUpdateMessages(prev => prev.filter(msg => String(msg.id) !== String(messageId)));
                } else if (deleteType === 'FOR_EVERYONE') {
                    await chatApi.deleteMessageForEveryone(messageId);
                    // Mark as deleted
                    onUpdateMessages(prev => prev.map(msg =>
                        String(msg.id) === String(messageId)
                            ? { ...msg, content: "This message was deleted", type: 'TEXT', deleted: true, isDeleting: false }
                            : msg
                    ));
                }
            }

            // Invalidate conversations for unread count updates
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        } catch (error) {
            console.error('Failed to delete message:', error);
            // Revert optimistic update
            onUpdateMessages(prev => prev.map(msg =>
                String(msg.id) === String(messageId)
                    ? { ...msg, isDeleting: false }
                    : msg
            ));
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
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Your Messages</h3>
                <p className="text-gray-500 text-center max-w-xs">Select a conversation or group to start chatting.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-white z-10">
                <div className="flex items-center">
                    <button className="md:hidden mr-3 text-gray-600 hover:text-rose-500 transition-colors" onClick={() => window.history.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    {/* Interactive Group Header */}
                    <div
                        className={`flex items-center relative ${isGroup ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                        onClick={() => isGroup && setShowGroupDetails(true)}
                    >
                        <div className="relative">
                            {targetAvatar ? (
                                <img
                                    src={targetAvatar}
                                    alt={targetName}
                                    className={`w-10 h-10 ${isGroup ? 'rounded-xl' : 'rounded-full'} object-cover ring-2 ring-rose-100`}
                                />
                            ) : (
                                <DefaultAvatar size="w-10 h-10" className={isGroup ? 'rounded-xl' : ''} />
                            )}
                            {!isGroup && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
                        </div>
                        <div className="ml-3">
                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-gray-900 text-base block">{targetName}</span>
                                {isGroup && (
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {isGroup ? (
                                    <span className="text-xs text-gray-500">{selectedGroup.members?.length || 0} members • Tap for info</span>
                                ) : (
                                    <React.Fragment>
                                        <span className="text-xs text-green-500">Active now</span>
                                        <span className="text-[10px] text-gray-400">{webSocketService.isConnected ? '(Live)' : '(Connecting...)'}</span>
                                    </React.Fragment>
                                )}
                            </div>
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
                <div
                    className="flex-1 overflow-y-auto p-4 custom-scrollbar"
                    style={{
                        background: 'linear-gradient(135deg, #fef7f8 0%, #fff1f2 50%, #fce7e9 100%)',
                        backgroundAttachment: 'fixed',
                        backgroundImage: `
                            linear-gradient(135deg, #fef7f8 0%, #fff1f2 50%, #fce7e9 100%),
                            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23f43f5e' fill-opacity='0.03'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
                        `
                    }}
                >
                    {messages.map((msg, index) => {
                        // Normalize senderId: DM has msg.senderId, Group has msg.sender.id
                        const msgSenderId = msg.senderId || msg.sender?.id;
                        const isOwn = String(msgSenderId) === String(currentUser.userId);

                        const isPending = msg.pending;
                        const isFailed = msg.failed;

                        // For Groups, backend adds sender info in msg.sender (DTO) or msg.senderUsername
                        // In DM, msg.senderId works. But for Group UI, we want to show sender name if not own
                        const senderName = isGroup && !isOwn ? (msg.senderUsername || msg.sender?.username) : null;
                        const senderAvi = isGroup && !isOwn ? (msg.senderAvatar || msg.sender?.avatarUrl) : (selectedUser?.otherUserAvatar);

                        // Determine if this is the last message from this side (to show time)
                        const nextMsg = messages[index + 1];
                        const nextMsgSenderId = nextMsg ? (nextMsg.senderId || nextMsg.sender?.id) : null;
                        const isLastFromThisSide = !nextMsg || String(nextMsgSenderId) !== String(msgSenderId);

                        // Date Separator Logic
                        const formatDateSeparator = (dateStr) => {
                            if (!dateStr) return '';
                            const date = new Date(dateStr);
                            const today = new Date();
                            if (date.toDateString() === today.toDateString()) return 'Today';
                            return date.toLocaleDateString();
                        };
                        const showDateSeparator = index === 0 || (messages[index - 1] && new Date(messages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString());

                        // Determine if this is the first message from this sender in consecutive group (to show name)
                        const prevMsg = messages[index - 1];
                        const prevMsgSenderId = prevMsg ? (prevMsg.senderId || prevMsg.sender?.id) : null;
                        const isFirstFromThisSender = !prevMsg || String(prevMsgSenderId) !== String(msgSenderId) || showDateSeparator;

                        return (
                            <React.Fragment key={`${msg.id || index}_${(msg.deleted || msg.content === "This message was deleted") ? 'del' : 'act'}`}>
                                {showDateSeparator && (
                                    <div className="flex items-center justify-center my-4">
                                        <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                                            {formatDateSeparator(msg.createdAt)}
                                        </div>
                                    </div>
                                )}

                                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isLastFromThisSide ? 'mb-2' : 'mb-px'}`}>
                                    {!isOwn && (
                                        <div className="flex flex-col items-center mr-2 self-end" style={{ width: '32px' }}>
                                            {isLastFromThisSide ? (
                                                senderAvi ? (
                                                    <img
                                                        src={senderAvi}
                                                        className="w-8 h-8 rounded-full ring-1 ring-rose-100"
                                                        alt=""
                                                    />
                                                ) : (
                                                    <DefaultAvatar size="w-8 h-8" />
                                                )
                                            ) : (
                                                <div className="w-8 h-8" /> /* Spacer for alignment */
                                            )}
                                        </div>
                                    )}
                                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                        {/* Show Sender Name in Group Chat - only for first message from this sender */}
                                        {isGroup && !isOwn && isFirstFromThisSender && (
                                            <span className="text-[10px] text-gray-500 mb-0.5 ml-1">{senderName}</span>
                                        )}

                                        {/* Message bubble with hover group for time */}
                                        <div className={`group/msg transition-all duration-300 ${msg.isDeleting ? 'opacity-0 scale-90 -translate-y-2' : ''}`}>
                                            <div
                                                onContextMenu={(e) => handleContextMenu(e, msg)}
                                                className={`px-4 py-2 break-words text-sm md:text-base transition-all duration-300 ${(msg.deleted || msg.content === "This message was deleted")
                                                    ? 'bg-gray-100 text-gray-400 italic rounded-2xl opacity-60 scale-95'
                                                    : isOwn
                                                        ? `bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl rounded-br-md shadow-sm ${isPending ? 'opacity-70' : ''}`
                                                        : 'bg-white text-gray-900 rounded-2xl rounded-bl-md shadow-sm'
                                                    }`}
                                            >
                                                {msg.type === 'IMAGE' ? (
                                                    <img src={msg.attachmentUrl || msg.content} className="rounded-lg max-h-40" onClick={() => setSelectedImage(msg.attachmentUrl || msg.content)} />
                                                ) : (
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                )}
                                            </div>
                                            {/* Time - slides down on hover of THIS message only */}
                                            <div
                                                className="overflow-hidden transition-all duration-0 ease-out max-h-0 group-hover/msg:max-h-6 opacity-0 group-hover/msg:opacity-100"
                                            >
                                                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-400">
                                                    {isPending && <span>Sending...</span>}
                                                    {!isPending && !isFailed && <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                                </div>
                                            </div>
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
            <div className="p-4 border-t border-rose-100/50 bg-white/80 backdrop-blur-sm">
                <form onSubmit={handleSend} className="flex items-center gap-3">
                    {/* Attachment Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500 hover:text-rose-600 transition-all duration-200 disabled:opacity-50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

                    {/* Input Container */}
                    <div className="flex-1 flex items-center bg-gray-50 hover:bg-gray-100/80 rounded-full px-4 py-3 transition-colors duration-200 border border-gray-100">
                        <input
                            type="text"
                            placeholder={isGroup ? `Message ${targetName}...` : "Type a message..."}
                            className="flex-1 bg-transparent border-none text-gray-900 focus:ring-0 focus:outline-none placeholder-gray-400 text-sm"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        {/* Emoji Button */}
                        <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors mr-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                            </svg>
                        </button>
                    </div>

                    {/* Send Button */}
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 flex items-center justify-center text-white shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 transition-all duration-200 disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5 transform rotate-90 -translate-x-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </form>
            </div>
            {/* Lightbox omitted for brevity but assumes present */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setSelectedImage(null)}>
                    <img src={selectedImage} className="max-h-[90vh] max-w-[90vw] object-contain" />
                </div>
            )}

            {/* Group Details Modal */}
            <GroupDetailsModal
                isOpen={showGroupDetails}
                onClose={() => setShowGroupDetails(false)}
                group={selectedGroup}
                currentUser={currentUser}
                onUpdate={() => queryClient.invalidateQueries(['groups'])}
            />
        </div>
    );
};

export default ChatWindow;
