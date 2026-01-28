// Add this code to ChatWindow.jsx

// 1. Add after all other useEffect hooks (around line 41):

    // WebSocket listener for message deletions
    useEffect(() => {
        if (!currentUser || !selectedUser) return;
        
        const subscription = webSocketService.subscribeToMessageDeleted((event) => {
            if (event.deletionType === 'FOR_EVERYONE') {
                // Invalidate messages cache to refetch
                queryClient.invalidateQueries({
                    queryKey: ['messages', selectedUser.otherUserId]
                });
            }
        });

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, [currentUser, selectedUser, queryClient]);

// 2. Add these handler functions after handleImageUpload (around line 79):

    const handleContextMenu = (e, message) => {
        e.preventDefault();
        
        // Close existing menu
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
            if (deleteType === 'FOR_ME') {
                await chatApi.deleteMessageForMe(messageId);
            } else if (deleteType === 'FOR_EVERYONE') {
                await chatApi.deleteMessageForEveryone(messageId);
            }
            
            // Invalidate cache to refetch messages
            queryClient.invalidateQueries({
                queryKey: ['messages', selectedUser.otherUserId]
            });
            
            // Also invalidate conversations to update last message
            queryClient.invalidateQueries({
                queryKey: ['conversations', currentUser.userId]
            });
        } catch (error) {
            console.error('Failed to delete message:', error);
            alert(error.message || 'Failed to delete message');
        }
    };

// 3. In the message rendering section, update the message div to include onContextMenu:
// Find the div with className that starts with "flex" around line 225
// Add onContextMenu handler:

    <div 
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
        onContextMenu={(e) => handleContextMenu(e, msg)}
    >
        {/* ...existing message content... */}
    </div>

// 4. Add deleted message placeholder rendering
// Inside the message content rendering, add this check at the beginning:

    {msg.deleted ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-gray-500 text-sm italic">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            This message was deleted
        </div>
    ) : (
        // ...existing message rendering...
    )}

// 5. Before the closing </div> of the main component (before the input section), add:

            {/* Context Menu */}
            {contextMenu && (
                <MessageContextMenu
                    message={contextMenu.message}
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                    currentUser={currentUser}
                    onDelete={handleDeleteMessage}
                />
            )}
