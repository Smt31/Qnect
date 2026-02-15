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
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Message cache — persists across chat switches
    const messageCacheRef = useRef(new Map());

    // Helper: get current chat cache key
    const getCacheKey = (user, group) => {
        if (group) return `group-${group.id}`;
        if (user) return `dm-${user.otherUserId}`;
        return null;
    };

    // Helper: save current messages to cache before switching
    const saveCurrentToCache = () => {
        const key = getCacheKey(selectedUser, selectedGroup);
        if (key && messages.length > 0) {
            messageCacheRef.current.set(key, { messages: [...messages], hasMore });
        }
    };

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
                    console.log('[WS] Match found! Adding message to state. ID:', newMessage.id, 'TempID:', newMessage.tempId);
                    setMessages(prev => {
                        // 1. Check for duplicate ID (if confirmed ID)
                        if (newMessage.id && prev.some(m => String(m.id) === String(newMessage.id))) {
                            // It could be an update? Assuming immutable for now besides replace
                            return prev;
                        }

                        // 2. Check for TempId Match (Optimistic or Immediate vs Confirmed)
                        if (newMessage.tempId) {
                            const tempIdx = prev.findIndex(m => m.tempId === newMessage.tempId || m.id === newMessage.tempId);
                            if (tempIdx !== -1) {
                                console.log('[WS] Reconciling via tempId:', newMessage.tempId);
                                const existing = prev[tempIdx];

                                // RACE CONDITION FIX:
                                // If incoming message is "Immediate" (id=null) but we already have a Confirmed message (id!=null) 
                                // with the same tempId, IGNORE the immediate message.
                                if (!newMessage.id && existing.id) {
                                    console.log('[WS] Ignoring immediate message because confirmed message already exists');
                                    return prev;
                                }

                                const newArr = [...prev];
                                // Replace with new message, keeping it visible
                                newArr[tempIdx] = newMessage;
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

        // Subscription for Errors
        const subErrors = webSocketService.subscribe('/user/queue/errors', (errorMessage) => {
            console.error('[WS] Error received:', errorMessage);
            // Show toast or alert?
            // Mark last pending message as failed?
            setMessages(prev => {
                // Find latest pending message
                const newArr = [...prev];
                const pendingIdx = newArr.findIndex(m => m.pending); // logic might need to be more specific if possible
                if (pendingIdx !== -1) {
                    newArr[pendingIdx] = { ...newArr[pendingIdx], failed: true, pending: false };
                }
                return newArr;
            });
            alert("Message failed to send: " + errorMessage);
        });

        return () => {
            console.log('[WS] Cleaning up subscriptions');
            if (subPrivate) subPrivate.unsubscribe();
            if (subDelete) subDelete.unsubscribe();
            if (subErrors) subErrors.unsubscribe();
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
                    const msgId = String(messageOrEvent.id || '');

                    // 1. Dedup by tempId (most reliable — matches optimistic message)
                    if (messageOrEvent.tempId) {
                        const tempIdx = prev.findIndex(m =>
                            m.tempId === messageOrEvent.tempId || m.id === messageOrEvent.tempId
                        );
                        if (tempIdx !== -1) {
                            // Replace optimistic message with server response
                            const newArr = [...prev];
                            newArr[tempIdx] = messageOrEvent;
                            return newArr;
                        }
                    }

                    // 2. Update existing message by ID (e.g. deletion)
                    if (msgId && prev.some(m => String(m.id) === msgId)) {
                        if (messageOrEvent.deleted) {
                            return prev.map(m => String(m.id) === msgId ? messageOrEvent : m);
                        }
                        return prev; // Already have this message
                    }

                    // 3. Dedup for sender's own messages (fallback by content match)
                    const msgSenderId = String(messageOrEvent.sender?.id || messageOrEvent.senderId);
                    if (msgSenderId === String(currentUser.userId)) {
                        const dupeIdx = prev.findIndex(m =>
                            (m.tempId && m.tempId.startsWith('temp-')) &&
                            m.content === messageOrEvent.content &&
                            m.type === messageOrEvent.type
                        );
                        if (dupeIdx !== -1) {
                            const newArr = [...prev];
                            newArr[dupeIdx] = messageOrEvent;
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
        // Save current chat messages to cache before switching
        saveCurrentToCache();

        setSelectedGroup(null);
        setSelectedUser(conv);

        // Check cache first
        const cacheKey = `dm-${conv.otherUserId}`;
        const cached = messageCacheRef.current.get(cacheKey);
        if (cached) {
            setMessages(cached.messages);
            setHasMore(cached.hasMore);
            setMessagesLoading(false);
            // Mark as read in background if needed
            if (conv.unreadCount > 0) {
                chatApi.markAsRead(conv.otherUserId).then(() => {
                    queryClient.invalidateQueries(['conversations']);
                });
            }
            return;
        }

        // No cache — fetch from API
        setMessages([]);
        setHasMore(false);
        setMessagesLoading(true);
        try {
            const data = await chatApi.getMessages(conv.otherUserId);
            const msgs = data.messages || [];
            const more = data.hasMore || false;
            setMessages(msgs);
            setHasMore(more);
            // Save to cache
            messageCacheRef.current.set(cacheKey, { messages: msgs, hasMore: more });
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

    const loadOlderMessages = async () => {
        if (loadingMore || !hasMore || messages.length === 0) return;
        if (!selectedUser && !selectedGroup) return;
        setLoadingMore(true);
        try {
            const oldestId = messages[0]?.id;
            if (!oldestId) return;

            let data;
            if (selectedGroup) {
                data = await groupApi.getMessages(selectedGroup.id, oldestId);
            } else {
                data = await chatApi.getMessages(selectedUser.otherUserId, oldestId);
            }

            const olderMsgs = data.messages || [];
            setHasMore(data.hasMore || false);
            if (olderMsgs.length > 0) {
                setMessages(prev => [...olderMsgs, ...prev]);
            }
        } catch (err) {
            console.error('Failed to load older messages:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSelectGroup = async (group) => {
        // Save current chat messages to cache before switching
        saveCurrentToCache();

        setSelectedUser(null);
        setSelectedGroup(group);

        // Check cache first
        const cacheKey = `group-${group.id}`;
        const cached = messageCacheRef.current.get(cacheKey);
        if (cached) {
            setMessages(cached.messages);
            setHasMore(cached.hasMore);
            setMessagesLoading(false);
            return;
        }

        // No cache — fetch from API
        setMessages([]);
        setHasMore(false);
        setMessagesLoading(true);
        try {
            const data = await groupApi.getMessages(group.id);
            const msgs = data.messages || [];
            const more = data.hasMore || false;
            setMessages(msgs);
            setHasMore(more);
            // Save to cache
            messageCacheRef.current.set(cacheKey, { messages: msgs, hasMore: more });
        } catch (err) {
            console.error(err);
        } finally {
            setMessagesLoading(false);
        }
    };

    const handleSendMessage = async (text, type) => {
        if (!currentUser) return;

        // Optimistic Update - show message instantly
        const tempId = `temp-${Date.now()}`;
        const optimisticMsg = {
            id: tempId,
            tempId: tempId,
            senderId: currentUser.userId,
            sender: { id: currentUser.userId, username: currentUser.username, avatarUrl: currentUser.avatarUrl },
            content: text,
            type: type,
            createdAt: new Date().toISOString(),
            pending: false, // Show as sent immediately
            failed: false,
            attachmentUrl: type === 'IMAGE' ? text : null,
            receiverId: selectedUser?.otherUserId,
            groupId: selectedGroup?.id
        };

        setMessages(prev => [...prev, optimisticMsg]);

        try {
            if (selectedGroup) {
                // Group Send via WebSocket — include sender info for zero-DB broadcast
                webSocketService.send(`/app/group.chat/${selectedGroup.id}`, {
                    tempId: tempId,
                    senderId: currentUser.userId,
                    senderUsername: currentUser.username,
                    senderAvatar: currentUser.avatarUrl,
                    content: text,
                    type: type,
                });
            } else if (selectedUser) {
                // DM: Try WebSocket first, fall back to HTTP
                const payload = {
                    senderId: currentUser.userId,
                    senderAvatar: currentUser.avatarUrl,
                    receiverId: selectedUser.otherUserId,
                    receiverUsername: selectedUser.otherUsername,
                    content: text,
                    type: type,
                    attachmentUrl: type === 'IMAGE' ? text : null,
                    tempId: tempId
                };

                try {
                    webSocketService.send('/app/chat.send', payload);
                } catch (wsErr) {
                    console.warn('[ChatPage] WebSocket send failed, falling back to HTTP:', wsErr.message);
                    // HTTP Fallback - message still reaches the server
                    await chatApi.sendMessageHttp(payload);
                }
            }
        } catch (err) {
            console.error("Send failed completely", err);
            setMessages(prev => prev.map(msg =>
                msg.tempId === tempId ? { ...msg, failed: true } : msg
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
                            hasMore={hasMore}
                            loadingMore={loadingMore}
                            onLoadMore={loadOlderMessages}
                            onBack={() => {
                                setSelectedUser(null);
                                setSelectedGroup(null);
                            }}
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
