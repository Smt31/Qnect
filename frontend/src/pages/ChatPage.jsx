import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import ConversationList from '../components/Chat/ConversationList';
import ChatWindow from '../components/Chat/ChatWindow';
import LeftSidebar from '../components/Home/LeftSidebar';
import Navbar from '../components/Home/Navbar';
import { chatApi, userApi } from '../api';
import webSocketService from '../services/WebSocketService';

const ChatPage = () => {
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const location = useLocation();

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
                    webSocketService.subscribeToPrivateMessages(currentUser.username, (newMessage) => {
                        handleIncomingMessage(newMessage);
                    });
                },
                (err) => console.error("Socket error", err)
            );
        }
        return () => webSocketService.disconnect();
    }, [currentUser]);

    // 3. Fetch Conversations
    const fetchConversations = useCallback(async () => {
        if (!currentUser) return;
        try {
            const data = await chatApi.getConversations();
            setConversations(data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to load conversations", err);
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // 4. Handle Incoming Message
    const handleIncomingMessage = (newMessage) => {
        // If chat is open with sender, append message
        setMessages((prev) => {
            // Check if this message belongs to current open chat
            // newMessage.senderId === selectedUser.otherUserId?
            // Actually 'selectedUser' state might be stale in callback if not handled carefully, 
            // but setState functional update is safe for 'messages'.
            // The tricky part is knowing *which* chat it belongs to for the UI update if we had multiple lists.
            // But here we just append to 'messages' if it matches the current selected user.

            // Note: In a real app we'd need to check if the message matches the open conversation.
            // We can check this inside the functional update? No, selectedUser is not available there easily without Ref.
            // Simplified: We will update the conversation list always.
            return prev; // We'll rely on effect dependencies or a ref for selectedUser if needed, or simple reload.
        });

        // Re-fetch conversations to update preview and unread count
        fetchConversations();

        // If we are looking at this conversation, append it
        // Since we can't easily access 'selectedUser' inside this callback closure created at mount,
        // we might need to use a Ref for selectedUser.
    };

    // Use Ref to access current selectedUser in WebSocket callback if we wanted to avoid re-subscription
    // But simpler: just append if the sender matches.
    // Actually, let's just trigger a re-fetch of messages if the ID matches.

    // Better approach for Real-time in this simple functional component:
    // Listen to changes in 'conversations' (for list update) 
    // AND update 'messages' state directly if it matches.

    // Let's refine the socket subscription to depend on selectedUser? No, global subscription is better.

    // We will just do a hack for now:
    // If incoming message senderId == selectedUser?.otherUserId, append to messages.
    // WE need to use a ref for selectedUser to access it in the closure.
    const selectedUserRef = React.useRef(selectedUser);
    useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

    useEffect(() => {
        if (currentUser) {
            const sub = webSocketService.subscribeToPrivateMessages(currentUser.username, (newMessage) => {
                fetchConversations(); // Always update list

                if (selectedUserRef.current &&
                    (newMessage.senderId === selectedUserRef.current.otherUserId ||
                        newMessage.receiverId === selectedUserRef.current.otherUserId)) { // receiver check if we echoed it back?
                    setMessages(prev => [...prev, newMessage]);
                }
            });
            return () => { if (sub) sub.unsubscribe(); }
        }
    }, [currentUser]);


    // 5. Select User / Load Messages
    const handleSelectUser = async (conv) => {
        setSelectedUser(conv);
        try {
            const msgs = await chatApi.getMessages(conv.otherUserId);
            setMessages(msgs);

            // Mark as read if unread count > 0
            if (conv.unreadCount > 0) {
                await chatApi.markAsRead(conv.otherUserId);
                // Update local conversation unread count
                setConversations(prev => prev.map(c =>
                    c.otherUserId === conv.otherUserId ? { ...c, unreadCount: 0 } : c
                ));
            }
        } catch (err) {
            console.error("Failed to load messages", err);
        }
    };

    // 6. Send Message - with OPTIMISTIC UPDATE for instant UI feedback
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

            // Update conversation list (last message preview)
            fetchConversations();
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
                        />
                    </div>

                    <div className={`${!selectedUser ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
                        <ChatWindow
                            currentUser={currentUser}
                            selectedUser={selectedUser}
                            messages={messages}
                            onSendMessage={handleSendMessage}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
