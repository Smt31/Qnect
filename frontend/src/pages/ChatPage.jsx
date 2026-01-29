import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ConversationList from '../components/Chat/ConversationList';
import ChatWindow from '../components/Chat/ChatWindow';
import CreateGroupModal from '../components/Chat/CreateGroupModal';
import LeftSidebar from '../components/Home/LeftSidebar';
import Navbar from '../components/Home/Navbar';
import { chatApi, userApi, groupApi } from '../api';
import webSocketService from '../services/WebSocketService';

const ChatPage = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);

    const queryClient = useQueryClient();
    const location = useLocation();

    // Fetch conversations (DMs)
    const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
        queryKey: ['conversations'],
        queryFn: chatApi.getConversations,
        enabled: !!currentUser,
        staleTime: 5 * 60 * 1000,
    });

    // Fetch Groups
    const { data: groups = [], isLoading: groupsLoading } = useQuery({
        queryKey: ['groups'],
        queryFn: async () => {
            // Basic fetch, assume getMyGroups exists
            const myGroups = await groupApi.getMyGroups().catch(() => []);
            return myGroups;
        },
        enabled: !!currentUser,
        staleTime: 5 * 60 * 1000,
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
                () => console.log("Connected to WebSocket"),
                (err) => console.error("Socket error", err)
            );
        }
        return () => webSocketService.disconnect();
    }, [currentUser]);

    // Refs for WebSocket callbacks
    const selectedUserRef = useRef(selectedUser);
    const selectedGroupRef = useRef(selectedGroup);
    useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
    useEffect(() => { selectedGroupRef.current = selectedGroup; }, [selectedGroup]);

    // 3. WebSocket subscriptions
    useEffect(() => {
        if (!currentUser) return;

        // Subscription for Private Messages
        const subPrivate = webSocketService.subscribeToPrivateMessages(currentUser.username, (newMessage) => {
            console.log('[WS] Private msg:', newMessage);
            queryClient.invalidateQueries(['conversations']);

            // If chat open with sender
            if (selectedUserRef.current) {
                const currentOtherId = String(selectedUserRef.current.otherUserId);
                const msgSenderId = String(newMessage.senderId || newMessage.sender?.id || '');
                const msgReceiverId = String(newMessage.receiverId || newMessage.receiver?.id || '');

                // Check match
                if (msgSenderId === currentOtherId || msgReceiverId === currentOtherId) {
                    setMessages(prev => {
                        // Check for duplicate ID
                        if (prev.some(m => String(m.id) === String(newMessage.id))) return prev;

                        // Check for Optimistic Match (from me)
                        if (String(msgSenderId) === String(currentUser.userId)) {
                            // Find the first pending message with same content & type
                            const pendingIdx = prev.findIndex(m =>
                                m.pending &&
                                m.content === newMessage.content &&
                                m.type === newMessage.type
                            );

                            if (pendingIdx !== -1) {
                                // Replace optimistic with real
                                const newArr = [...prev];
                                newArr[pendingIdx] = newMessage;
                                return newArr;
                            }
                        }

                        return [...prev, newMessage];
                    });
                }
            }
        });

        // Subscription for Deletions (Global User Queue)
        const subDelete = webSocketService.subscribeToMessageDeleted((event) => {
            if (event.deletionType === 'FOR_EVERYONE') {
                setMessages(prev => prev.map(msg =>
                    String(msg.id) === String(event.messageId)
                        ? { ...msg, content: "This message was deleted", type: 'TEXT', deleted: true }
                        : msg
                ));
            }
        });

        return () => {
            if (subPrivate) subPrivate.unsubscribe();
            if (subDelete) subDelete.unsubscribe();
        };
    }, [currentUser, queryClient]);

    // 4. Group Specific Subscription (Dynamic based on selectedGroup)
    useEffect(() => {
        if (!currentUser || !selectedGroup) return;

        console.log(`[WS] Subscribing to Group ${selectedGroup.id}`);
        const subGroup = webSocketService.subscribeToGroupChat(selectedGroup.id, (messageOrEvent) => {
            console.log('[WS] Group msg/event:', messageOrEvent);

            // Handle valid message
            if (messageOrEvent.content !== undefined) {
                setMessages(prev => {
                    if (prev.some(m => String(m.id) === String(messageOrEvent.id))) {
                        // If it's an update (e.g. deletion masked content), replace it
                        if (messageOrEvent.deleted) {
                            return prev.map(m => String(m.id) === String(messageOrEvent.id) ? messageOrEvent : m);
                        }
                        return prev;
                    }

                    // Deduplication for Group Messages (from me)
                    // Group messages usually nest sender info: messageOrEvent.sender.id
                    const msgSenderId = String(messageOrEvent.sender?.id || messageOrEvent.senderId);
                    if (msgSenderId === String(currentUser.userId)) {
                        const pendingIdx = prev.findIndex(m =>
                            m.pending &&
                            m.content === messageOrEvent.content &&
                            m.type === messageOrEvent.type
                        );
                        if (pendingIdx !== -1) {
                            // Replace
                            const newArr = [...prev];
                            newArr[pendingIdx] = messageOrEvent;
                            return newArr;
                        }
                    }

                    return [...prev, messageOrEvent];
                });
            }
        });

        return () => {
            if (subGroup) subGroup.unsubscribe();
        };
    }, [currentUser, selectedGroup]);

    // Handlers
    const handleSelectUser = async (conv) => {
        setSelectedGroup(null);
        setSelectedUser(conv);
        setMessages([]);
        setMessagesLoading(true);
        try {
            const msgs = await chatApi.getMessages(conv.otherUserId);
            setMessages(msgs);
            if (conv.unreadCount > 0) {
                await chatApi.markAsRead(conv.otherUserId);
                queryClient.invalidateQueries(['conversations']);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setMessagesLoading(false);
        }
    };

    const handleSelectGroup = async (group) => {
        setSelectedUser(null);
        setSelectedGroup(group);
        setMessages([]);
        setMessagesLoading(true);
        try {
            const msgs = await groupApi.getMessages(group.id);
            setMessages(msgs);
        } catch (err) {
            console.error(err);
        } finally {
            setMessagesLoading(false);
        }
    };

    const handleSendMessage = async (text, type) => {
        if (!currentUser) return;

        // Optimistic Update
        const tempId = `temp-${Date.now()}`;
        const optimisticMsg = {
            id: tempId,
            senderId: currentUser.userId, // for DM
            sender: { id: currentUser.userId, username: currentUser.username, avatarUrl: currentUser.avatarUrl }, // for Group (DTO diff)
            content: text,
            type: type,
            createdAt: new Date().toISOString(),
            pending: true,
            attachmentUrl: type === 'IMAGE' ? text : null,
            // DM fields
            receiverId: selectedUser?.otherUserId,
            // Group fields
            groupId: selectedGroup?.id
        };

        setMessages(prev => [...prev, optimisticMsg]);

        try {
            let resp;
            if (selectedGroup) {
                // Group Send via WebSocket
                webSocketService.send(`/app/group.chat/${selectedGroup.id}`, {
                    content: text,
                    type: type
                });

                // Since we rely on WebSocket to broadcast the message back,
                // we won't get an immediate HTTP response to update the ID.
                // The subscription listener will handle the incoming real message.
                // We can mark the optimistic message as "sent" or let the listener deduplicate/replace it.
                // For now, we'll keep the pending state until the real one arrives.
                // Note: To cleanly replace, we'd need a correlation ID, but for now we'll rely on content matching or just list updates.
                setMessages(prev => prev.map(msg =>
                    msg.id === tempId ? { ...msg, pending: false } : msg
                ));

            } else if (selectedUser) {
                // DM Send (HTTP)
                const payload = {
                    receiverId: selectedUser.otherUserId,
                    content: text,
                    type: type,
                    attachmentUrl: type === 'IMAGE' ? text : null
                };
                resp = await chatApi.sendMessageHttp(payload);
                setMessages(prev => prev.map(msg =>
                    msg.id === tempId ? { ...resp, pending: false } : msg
                ));
            }

        } catch (err) {
            console.error("Send failed", err);
            setMessages(prev => prev.map(msg =>
                msg.id === tempId ? { ...msg, failed: true, pending: false } : msg
            ));
        }
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#FFF1F2' }}>
            <Navbar user={currentUser} />
            <div className="flex">
                <LeftSidebar user={currentUser} />
                <div className="flex-1 md:ml-64 flex h-[calc(100vh-64px)]">
                    <div className={`${(selectedUser || selectedGroup) ? 'hidden md:flex' : 'flex'} w-full md:w-80 md:flex-none h-full`}>
                        <ConversationList
                            conversations={conversations}
                            groups={groups}
                            selectedUser={selectedUser}
                            selectedGroup={selectedGroup}
                            onSelectUser={handleSelectUser}
                            onSelectGroup={handleSelectGroup}
                            onCreateGroup={() => setShowCreateGroup(true)}
                            currentUser={currentUser}
                            loading={conversationsLoading || groupsLoading}
                        />
                    </div>
                    <div className={`${!(selectedUser || selectedGroup) ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
                        <ChatWindow
                            key={selectedGroup ? `group-${selectedGroup.id}` : (selectedUser ? `user-${selectedUser.otherUserId}` : 'empty')}
                            currentUser={currentUser}
                            selectedUser={selectedUser}
                            selectedGroup={selectedGroup}
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            onRefetch={selectedGroup ? () => handleSelectGroup(selectedGroup) : () => selectedUser && handleSelectUser(selectedUser)}
                            loading={messagesLoading}
                        />
                    </div>
                </div>
            </div>

            <CreateGroupModal
                isOpen={showCreateGroup}
                onClose={() => setShowCreateGroup(false)}
                onSuccess={() => queryClient.invalidateQueries(['groups'])}
            />
        </div>
    );
};
export default ChatPage;
