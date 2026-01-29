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
    const [wsConnected, setWsConnected] = useState(false);

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

    // Sync selectedGroup with groups data (for member count updates, etc.)
    useEffect(() => {
        if (selectedGroup && groups.length > 0) {
            const updatedGroup = groups.find(g => g.id === selectedGroup.id);
            if (updatedGroup && JSON.stringify(updatedGroup) !== JSON.stringify(selectedGroup)) {
                console.log('Syncing selectedGroup with updated data', updatedGroup);
                setSelectedGroup(updatedGroup);
            }
        }
    }, [groups, selectedGroup]);

    // Handle navigation state (e.g., from sidebar "Open" button)
    useEffect(() => {
        if (location.state?.selectedGroupId && groups.length > 0) {
            const targetGroup = groups.find(g => g.id === location.state.selectedGroupId);
            if (targetGroup) {
                setSelectedUser(null);
                setSelectedGroup(targetGroup);
                // Clear the state to prevent re-selection on subsequent renders
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, groups]);

    // Handle selectGroup event from sidebar (when already on chat page)
    useEffect(() => {
        const handleSelectGroup = (e) => {
            const groupId = e.detail?.groupId;
            if (groupId && groups.length > 0) {
                const targetGroup = groups.find(g => g.id === groupId);
                if (targetGroup) {
                    setSelectedUser(null);
                    setSelectedGroup(targetGroup);
                }
            }
        };
        window.addEventListener('selectGroup', handleSelectGroup);
        return () => window.removeEventListener('selectGroup', handleSelectGroup);
    }, [groups]);

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

    // 2. Connect WebSocket and track connection status
    useEffect(() => {
        if (currentUser) {
            webSocketService.connect(
                () => {
                    console.log("Connected to WebSocket");
                    setWsConnected(true);
                },
                (err) => {
                    console.error("Socket error", err);
                    setWsConnected(false);
                }
            );
        }
        return () => {
            webSocketService.disconnect();
            setWsConnected(false);
        };
    }, [currentUser]);

    // Refs for WebSocket callbacks
    const selectedUserRef = useRef(selectedUser);
    const selectedGroupRef = useRef(selectedGroup);
    useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
    useEffect(() => { selectedGroupRef.current = selectedGroup; }, [selectedGroup]);

    // 3. WebSocket subscriptions - now depends on wsConnected to ensure connection is ready
    useEffect(() => {
        if (!currentUser || !wsConnected) return;

        console.log('[WS] Setting up subscriptions for user:', currentUser.username);

        // Subscription for Private Messages
        const subPrivate = webSocketService.subscribeToPrivateMessages(currentUser.username, (newMessage) => {
            console.log('[WS] Private msg received:', newMessage);
            queryClient.invalidateQueries(['conversations']);

            // If chat open with sender/receiver
            if (selectedUserRef.current) {
                const currentOtherId = String(selectedUserRef.current.otherUserId);
                const msgSenderId = String(newMessage.senderId || newMessage.sender?.id || '');
                const msgReceiverId = String(newMessage.receiverId || newMessage.receiver?.id || '');

                console.log('[WS] Checking match - currentOtherId:', currentOtherId, 'msgSenderId:', msgSenderId, 'msgReceiverId:', msgReceiverId);

                // Check match - message belongs to the open conversation
                if (msgSenderId === currentOtherId || msgReceiverId === currentOtherId) {
                    console.log('[WS] Match found! Adding message to state');
                    setMessages(prev => {
                        // Check for duplicate ID
                        if (prev.some(m => String(m.id) === String(newMessage.id))) {
                            console.log('[WS] Duplicate message detected, skipping');
                            return prev;
                        }

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
                                console.log('[WS] Replacing optimistic message at index:', pendingIdx);
                                const newArr = [...prev];
                                newArr[pendingIdx] = newMessage;
                                return newArr;
                            }
                        }

                        console.log('[WS] Appending new message to state');
                        return [...prev, newMessage];
                    });
                } else {
                    console.log('[WS] No match - message is for a different conversation');
                }
            } else {
                console.log('[WS] No chat selected, message will be visible when chat is opened');
            }
        });

        // Subscription for Deletions (Global User Queue)
        const subDelete = webSocketService.subscribeToMessageDeleted((event) => {
            console.log('[WS] Message deleted event:', event);
            if (event.deletionType === 'FOR_EVERYONE') {
                setMessages(prev => prev.map(msg =>
                    String(msg.id) === String(event.messageId)
                        ? { ...msg, content: "This message was deleted", type: 'TEXT', deleted: true }
                        : msg
                ));
            }
        });

        return () => {
            console.log('[WS] Cleaning up subscriptions');
            if (subPrivate) subPrivate.unsubscribe();
            if (subDelete) subDelete.unsubscribe();
        };
    }, [currentUser, wsConnected, queryClient]);

    // 4. Group Specific Subscription (Dynamic based on selectedGroup)
    useEffect(() => {
        const groupId = selectedGroup?.id;
        if (!currentUser || !groupId || !wsConnected) return;

        console.log(`[WS] Subscribing to Group ${groupId}`);
        const subGroup = webSocketService.subscribeToGroupChat(groupId, (messageOrEvent) => {
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
                        console.log('[WS] Reconciling own message:', msgSenderId, messageOrEvent.content);
                        const pendingIdx = prev.findIndex(m =>
                            m.pending &&
                            m.content === messageOrEvent.content &&
                            m.type === messageOrEvent.type
                        );
                        console.log('[WS] Pending match index:', pendingIdx);
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
    }, [currentUser, selectedGroup?.id, wsConnected]);

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
            console.log('[ChatPage] Fetched messages for group:', group.id, msgs);
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
                // We leave the optimistic message as "pending" so the listener can find and replace it.

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
                            onUpdateMessages={setMessages}
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
