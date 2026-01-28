import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ConversationList from '../components/Chat/ConversationList';
import ChatWindow from '../components/Chat/ChatWindow';
import LeftSidebar from '../components/Home/LeftSidebar';
import Navbar from '../components/Home/Navbar';
import { chatApi, userApi } from '../api';
import webSocketService from '../services/WebSocketService';

const ChatPage = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [messagesLoading, setMessagesLoading] = useState(false);

    const queryClient = useQueryClient();
    const location = useLocation();

    // Fetch conversations with React Query
    const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
        queryKey: ['conversations'],
        queryFn: chatApi.getConversations,
        enabled: !!currentUser,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // 1. Fetch Current User
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await userApi.getCurrentUser();
                setCurrentUser(user);
            } catch (err) {
                console.error("Failed to load user", err);
            }
        };
        fetchUser();
    }, []);

    // 2. Connect WebSocket
    useEffect(() => {
        if (currentUser) {
            webSocketService.connect(
                () => {
                    console.log("Connected to WebSocket");
                },
                (err) => console.error("Socket error", err)
            );
        }
        return () => webSocketService.disconnect();
    }, [currentUser]);

    // Use Ref to access current selectedUser in WebSocket callback
    const selectedUserRef = useRef(selectedUser);
    useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

    // 3. WebSocket subscription for incoming messages
    useEffect(() => {
        if (currentUser) {
            const sub = webSocketService.subscribeToPrivateMessages(currentUser.username, (newMessage) => {
                // Invalidate conversations cache to update list
                queryClient.invalidateQueries(['conversations']);

                // If chat is open with this sender, append message
                if (selectedUserRef.current &&
                    (newMessage.senderId === selectedUserRef.current.otherUserId ||
                        newMessage.receiverId === selectedUserRef.current.otherUserId)) {
                    setMessages(prev => [...prev, newMessage]);
                }
            });
            return () => { if (sub) sub.unsubscribe(); }
        }
    }, [currentUser, queryClient]);

    // 4. Select User / Load Messages
    const handleSelectUser = async (conv) => {
        setSelectedUser(conv);
        setMessages([]); // Clear messages immediately
        setMessagesLoading(true);
        try {
            const msgs = await chatApi.getMessages(conv.otherUserId);
            setMessages(msgs);

            // Mark as read if unread count > 0
            if (conv.unreadCount > 0) {
                await chatApi.markAsRead(conv.otherUserId);
                // Invalidate conversations to update unread count
                queryClient.invalidateQueries(['conversations']);
            }
        } catch (err) {
            console.error("Failed to load messages", err);
        } finally {
            setMessagesLoading(false);
        }
    };

    // 5. Send Message - with OPTIMISTIC UPDATE for instant UI feedback
    const handleSendMessage = async (text, type) => {
        if (!selectedUser || !currentUser) return;

        // Create an optimistic message to show immediately
        const optimisticMessage = {
            id: `temp-${Date.now()}`, // Temporary ID
            senderId: currentUser.userId,
            receiverId: selectedUser.otherUserId,
            content: text,
            type: type,
            // For IMAGE type, the 'text' argument contains the URL
            attachmentUrl: type === 'IMAGE' ? text : null,
            createdAt: new Date().toISOString(),
            pending: true, // Mark as pending for potential UI styling
        };

        // IMMEDIATELY add to messages (optimistic update)
        setMessages(prev => [...prev, optimisticMessage]);

        const payload = {
            receiverId: selectedUser.otherUserId,
            content: text,
            type: type
        };

        // If sending image, move URL to attachmentUrl field
        if (type === 'IMAGE') {
            payload.attachmentUrl = text;
            // Optional: set content to "Sent an image" or keep URL as fallback
            payload.content = "Sent an image";
        }

        try {
            const resp = await chatApi.sendMessageHttp(payload);

            // Replace the optimistic message with the real one from server
            setMessages(prev => prev.map(msg =>
                msg.id === optimisticMessage.id
                    ? { ...resp, pending: false }
                    : msg
            ));

            // Invalidate conversations to update last message preview
            queryClient.invalidateQueries(['conversations']);
        } catch (err) {
            console.error("Failed to send", err);
            // Mark the message as failed (optionally remove or show error state)
            setMessages(prev => prev.map(msg =>
                msg.id === optimisticMessage.id
                    ? { ...msg, pending: false, failed: true }
                    : msg
            ));
        }
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#FFF1F2' }}>
            <Navbar user={currentUser} />

            <div className="flex">
                {/* Left Sidebar */}
                <LeftSidebar user={currentUser} />

                {/* Chat Layout */}
                <div className="flex-1 md:ml-64 flex h-[calc(100vh-64px)]">
                    <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-80 md:flex-none h-full`}>
                        <ConversationList
                            conversations={conversations}
                            selectedUser={selectedUser}
                            onSelectUser={handleSelectUser}
                            currentUser={currentUser}
                            loading={conversationsLoading}
                        />
                    </div>

                    <div className={`${!selectedUser ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
                        <ChatWindow
                            key={selectedUser ? selectedUser.otherUserId : 'empty'}
                            currentUser={currentUser}
                            selectedUser={selectedUser}
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            loading={messagesLoading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
