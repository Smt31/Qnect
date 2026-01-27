import React, { useState, useEffect, useRef } from 'react';
import { chatApi } from '../../api';

const ChatWindow = ({ currentUser, selectedUser, messages, onSendMessage }) => {
    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null); // For lightbox
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Track previous message length to determine if this is an initial load or new message
    const prevMessagesLength = useRef(0);

    const scrollToBottom = (behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        const currentLength = messages.length;
        const prevLength = prevMessagesLength.current;

        // If loading messages for the first time (prev=0), use 'auto' (instant)
        // If adding messages (prev > 0), use 'smooth'
        const isInitialLoad = prevLength === 0;
        const hasNewMessages = currentLength > prevLength;

        if (hasNewMessages) {
            // Use timeout to ensure DOM layout is complete
            setTimeout(() => {
                scrollToBottom(isInitialLoad ? 'auto' : 'smooth');
            }, 100);
        }

        prevMessagesLength.current = currentLength;
    }, [messages]);

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

        // Reset input so same file can be selected again
        e.target.value = null;

        if (file.size > 5 * 1024 * 1024) {
            alert("File size too large (max 5MB)");
            return;
        }

        try {
            setIsUploading(true);
            const data = await chatApi.uploadImage(file);
            // Send message with type IMAGE and attachmentUrl
            // Content can be empty or a description
            await onSendMessage(data.url, 'IMAGE');
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    if (!selectedUser) {
        return (
            <div className="hidden md:flex flex-1 items-center justify-center flex-col h-full bg-white">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center mb-6 border border-rose-200">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-rose-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                </div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-2">Your Messages</h3>
                <p className="text-gray-500 text-center max-w-xs">Select a conversation to start chatting or send private photos and messages to a friend.</p>
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
                            src={selectedUser.otherUserAvatar || `https://ui-avatars.com/api/?name=${selectedUser.otherUsername}&background=f43f5e&color=fff`}
                            alt={selectedUser.otherUsername}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-rose-100"
                        />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="ml-3">
                        <span className="font-semibold text-gray-900 text-base block">{selectedUser.otherUserFullName || selectedUser.otherUsername}</span>
                        <span className="text-xs text-green-500">Active now</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-full hover:bg-rose-100 transition-colors text-gray-500 hover:text-rose-500">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                        </svg>
                    </button>
                    <button className="p-2 rounded-full hover:bg-rose-100 transition-colors text-gray-500 hover:text-rose-500">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                {messages.map((msg, index) => {
                    const isOwn = msg.senderId === currentUser.userId;
                    const isPending = msg.pending;
                    const isFailed = msg.failed;
                    const isSharedPost = msg.type === 'POST_SHARE' || msg.type === 'QUESTION_SHARE';

                    // Format timestamp
                    const formatTime = (dateStr) => {
                        if (!dateStr) return '';
                        const date = new Date(dateStr);
                        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    };

                    // Render shared post card
                    const renderSharedPost = () => {
                        const post = msg.sharedPost;
                        if (!post) return <p className="whitespace-pre-wrap">{msg.content}</p>;

                        return (
                            <a
                                href={`/question/${post.id}`}
                                className="block"
                                onClick={(e) => {
                                    e.preventDefault();
                                    window.location.href = `/question/${post.id}`;
                                }}
                            >
                                <div className={`rounded-xl overflow-hidden border ${isOwn ? 'border-white/20 bg-white/10' : 'border-gray-200 bg-white'} max-w-xs`}>
                                    {/* Post Image */}
                                    {post.imageUrl && (
                                        <img
                                            src={post.imageUrl}
                                            alt=""
                                            className="w-full h-32 object-cover"
                                        />
                                    )}
                                    {/* Post Content */}
                                    <div className="p-3">
                                        <p className={`text-sm font-medium line-clamp-2 ${isOwn ? 'text-white' : 'text-gray-900'}`}>
                                            {post.title}
                                        </p>
                                        {post.content && (
                                            <p className={`text-xs mt-1 line-clamp-2 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                                                {post.content}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            {post.authorAvatar && (
                                                <img
                                                    src={post.authorAvatar}
                                                    alt=""
                                                    className="w-5 h-5 rounded-full object-cover"
                                                />
                                            )}
                                            <span className={`text-xs ${isOwn ? 'text-white/60' : 'text-gray-400'}`}>
                                                {post.authorName || 'User'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </a>
                        );
                    };

                    return (
                        <div key={msg.id || index} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
                            {!isOwn && (
                                <img
                                    src={msg.senderAvatar || selectedUser.otherUserAvatar || `https://ui-avatars.com/api/?name=${selectedUser.otherUsername}&background=f43f5e&color=fff`}
                                    className="w-8 h-8 rounded-full mr-2 self-end mb-5 ring-1 ring-rose-100 flex-shrink-0"
                                    alt=""
                                />
                            )}
                            <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                <div
                                    className={`px-4 py-2.5 break-words text-sm md:text-base ${isOwn
                                        ? `bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl rounded-br-md shadow-sm ${isPending ? 'opacity-70' : ''} ${isFailed ? 'from-red-400 to-red-500' : ''}`
                                        : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                                        } ${isSharedPost ? 'p-2' : ''}`}
                                >
                                    {msg.type === 'IMAGE' ? (
                                        <div className="group relative cursor-pointer" onClick={() => setSelectedImage(msg.attachmentUrl || msg.content)}>
                                            <img
                                                src={msg.attachmentUrl || msg.content}
                                                alt="Attachment"
                                                className="rounded-lg max-h-40 max-w-[200px] object-cover transition-transform hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                                                <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                </svg>
                                            </div>
                                        </div>
                                    ) : isSharedPost ? (
                                        renderSharedPost()
                                    ) : (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                                {/* Time and status indicators */}
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                                    {isPending && (
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sending...
                                        </span>
                                    )}
                                    {isFailed && (
                                        <span className="text-red-500 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                            Failed
                                        </span>
                                    )}
                                    {!isPending && !isFailed && (
                                        <span>{formatTime(msg.createdAt)}</span>
                                    )}
                                    {/* Read receipt for own messages */}
                                    {isOwn && !isPending && !isFailed && (
                                        <svg className="w-3 h-3 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-rose-100 bg-gradient-to-r from-rose-50/50 to-white">
                <form onSubmit={handleSend} className="flex items-center bg-white border border-rose-100 rounded-full px-4 py-2.5 shadow-sm">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`text-gray-500 mr-3 hover:text-rose-500 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isUploading ? (
                            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                            </svg>
                        )}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                    />
                    <input
                        type="text"
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none text-gray-900 focus:ring-0 placeholder-gray-400 text-sm"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="button" className="text-gray-500 hover:text-rose-500 transition-colors mx-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                    </button>
                    {newMessage.trim() ? (
                        <button type="submit" className="bg-gradient-to-r from-rose-500 to-rose-600 text-white p-2 rounded-full hover:shadow-md transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>
                    ) : (
                        <button type="button" className="text-gray-500 hover:text-rose-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                            </svg>
                        </button>
                    )}
                </form>
            </div>

            {/* Lightbox Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white/50 hover:text-white p-2"
                        onClick={() => setSelectedImage(null)}
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <img
                        src={selectedImage}
                        alt="Full size"
                        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                    />
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
