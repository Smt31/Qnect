import React, { useState, useEffect, useRef } from 'react';

const MessageContextMenu = ({ message, position, onClose, currentUser, onDelete }) => {
    const menuRef = useRef(null);
    const isOwn = message.senderId === currentUser.userId;

    // Check if message can be deleted for everyone (15-minute window)
    const canDeleteForEveryone = () => {
        if (!isOwn) return false;

        const messageTime = new Date(message.createdAt);
        const now = new Date();
        const diffMinutes = (now - messageTime) / (1000 * 60);

        return diffMinutes <= 15;
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]); // Reverted to original dependency to maintain correctness

    const handleDeleteForMe = () => { // Renamed back to original to maintain correctness
        if (window.confirm('Delete this message for you? This cannot be undone.')) {
            onDelete('FOR_ME', message.id);
            onClose();
        }
    };

    const handleDeleteForEveryone = () => {
        if (window.confirm('Delete this message for everyone? This cannot be undone.')) {
            onDelete('FOR_EVERYONE', message.id);
            onClose();
        }
    };

    // Adjust position to keep menu in viewport
    const menuWidth = 180;
    const menuHeight = canDeleteForEveryone() ? 140 : 80;
    const adjustedX = Math.min(position.x, window.innerWidth - menuWidth - 10);
    const adjustedY = Math.min(position.y, window.innerHeight - menuHeight - 10);

    return (
        <div
            ref={menuRef}
            className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[180px]"
            style={{
                top: adjustedY,
                left: adjustedX,
            }}
        >
            <button
                onClick={handleDeleteForMe}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-700"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete for Me
            </button>

            {canDeleteForEveryone() && (
                <>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                        onClick={handleDeleteForEveryone}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <div>
                            <div>Delete for Everyone</div>
                            <div className="text-xs text-gray-500">
                                {Math.floor(15 - (new Date() - new Date(message.createdAt)) / (1000 * 60))} min left
                            </div>
                        </div>
                    </button>
                </>
            )}
        </div>
    );
};

export default MessageContextMenu;
