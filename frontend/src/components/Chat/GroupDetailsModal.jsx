import React, { useState, useEffect } from 'react';
import { groupApi, userApi } from '../../api';

const GroupDetailsModal = ({ isOpen, onClose, group, currentUser, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('members'); // members, add
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState([]);

    // Refresh members when modal opens or group changes
    useEffect(() => {
        if (isOpen && group) {
            loadGroupDetails();
            setActiveTab('members');
            setSearchQuery('');
            setSelectedUsers([]);
        }
    }, [isOpen, group]);

    const loadGroupDetails = async () => {
        try {
            const details = await groupApi.getGroupDetails(group.id);
            setMembers(details.members || []);
        } catch (err) {
            console.error("Failed to load group details", err);
        }
    };

    // Search Users for "Add"
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                userApi.searchUsers(searchQuery).then(data => {
                    // Filter out existing members
                    const existingIds = new Set(members.map(m => m.userId));
                    const filtered = (data.content || []).filter(u => !existingIds.has(u.userId));
                    setSearchResults(filtered);
                });
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, members]);

    const handleAddMembers = async () => {
        if (selectedUsers.length === 0) return;
        setLoading(true);
        try {
            await groupApi.addMembers(group.id, selectedUsers.map(u => u.userId));
            await loadGroupDetails();
            if (onUpdate) onUpdate();
            setActiveTab('members');
            setSelectedUsers([]);
            setSearchQuery('');
        } catch (err) {
            console.error(err);
            alert("Failed to add members");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm("Remove this member?")) return;
        try {
            await groupApi.removeMember(group.id, userId);
            setMembers(prev => prev.filter(m => m.userId !== userId));
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error(err);
            alert("Failed to remove member");
        }
    };

    const handleLeaveGroup = async () => {
        if (!window.confirm("Are you sure you want to leave this group?")) return;
        try {
            await groupApi.leaveGroup(group.id);
            if (onUpdate) onUpdate(); // Should probably trigger parent to clear selection
            onClose();
            // Parent needs to handle "group left" -> maybe redirect or clear selectedGroup
            window.location.reload(); // Simple way to reset state for now, or parent callback
        } catch (err) {
            console.error(err);
            alert("Failed to leave group");
        }
    };

    const toggleUser = (user) => {
        if (selectedUsers.find(u => u.userId === user.userId)) {
            setSelectedUsers(prev => prev.filter(u => u.userId !== user.userId));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
    };

    if (!isOpen || !group) return null;

    const isAdmin = group.createdBy === currentUser.userId || group.isAdmin; // Assuming backend might provide isAdmin flag or check creator

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[100]">
            <div className="bg-white rounded-2xl w-full max-w-md h-[500px] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-50 to-white p-4 border-b border-rose-100 flex justify-between items-center px-6 py-4">
                    <h2 className="text-lg font-bold text-gray-800">
                        {activeTab === 'add' ? 'Add Members' : 'Group Info'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {activeTab === 'members' && (
                        <div className="flex flex-col h-full">
                            {/* Group Header Info */}
                            <div className="flex flex-col items-center py-6 border-b border-gray-100">
                                <img
                                    src={group.avatarUrl || `https://ui-avatars.com/api/?name=${group.name}&background=f43f5e&color=fff`}
                                    className="w-20 h-20 rounded-full mb-3 object-cover shadow-sm"
                                    alt=""
                                />
                                <h3 className="text-xl font-bold text-gray-900">{group.name}</h3>
                                <p className="text-gray-500 text-sm px-8 text-center mt-1">{group.description || 'No description'}</p>
                            </div>

                            {/* Actions List */}
                            <div className="p-4 space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-gray-700">Members ({members.length})</h4>
                                    <button
                                        onClick={() => setActiveTab('add')}
                                        className="text-sm text-rose-500 font-medium hover:text-rose-600 flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Add
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {members.map(member => (
                                        <div key={member.userId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group">
                                            <div className="flex items-center gap-3">
                                                <img src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.username}`} className="w-10 h-10 rounded-full bg-gray-200 object-cover" alt="" />
                                                <div>
                                                    <p className="font-medium text-gray-900 text-sm">
                                                        {member.username}
                                                        {member.userId === currentUser.userId && <span className="text-gray-400 ml-1">(You)</span>}
                                                        {(member.userId === group.createdBy) && <span className="ml-2 text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">Admin</span>}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{member.fullName}</p>
                                                </div>
                                            </div>
                                            {isAdmin && member.userId !== currentUser.userId && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.userId)}
                                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 transition-opacity"
                                                    title="Remove member"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-auto p-4 border-t border-gray-100 text-center">
                                <button
                                    onClick={handleLeaveGroup}
                                    className="text-red-500 font-medium hover:text-red-600 text-sm py-2 px-4 rounded-lg hover:bg-red-50 transition-colors w-full"
                                >
                                    Leave Group
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'add' && (
                        <div className="flex flex-col h-full p-4">
                            <input
                                type="text"
                                placeholder="Search users to add..."
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none mb-3"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />

                            {/* Selected Pills */}
                            {selectedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {selectedUsers.map(u => (
                                        <span key={u.userId} className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-1 rounded-full text-xs font-medium">
                                            {u.username}
                                            <button onClick={() => toggleUser(u)} className="hover:text-rose-800">×</button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                {searchResults.map(user => {
                                    const isSelected = selectedUsers.find(u => u.userId === user.userId);
                                    return (
                                        <div key={user.userId}
                                            onClick={() => toggleUser(user)}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-rose-50' : 'hover:bg-gray-50'}`}>
                                            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}`} className="w-10 h-10 rounded-full bg-gray-200 object-cover" alt="" />
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{user.username}</p>
                                                <p className="text-xs text-gray-500">{user.fullName}</p>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-rose-500 border-rose-500' : 'border-gray-300'}`}>
                                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {searchResults.length === 0 && searchQuery && (
                                    <p className="text-center text-gray-400 text-sm py-4">No users found</p>
                                )}
                            </div>

                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={() => setActiveTab('members')}
                                    className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddMembers}
                                    disabled={selectedUsers.length === 0 || loading}
                                    className={`flex-1 py-2 rounded-lg font-medium text-white transition-all ${(selectedUsers.length === 0 || loading)
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30'
                                        }`}
                                >
                                    {loading ? 'Adding...' : 'Add Users'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupDetailsModal;
