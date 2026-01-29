import React, { useState, useEffect } from 'react';
import { groupApi, userApi, questionApi, chatApi } from '../../api';

const GroupDetailsModal = ({ isOpen, onClose, group, currentUser, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('members'); // members, add, edit
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState([]);

    // Edit state
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editAvatarUrl, setEditAvatarUrl] = useState('');
    const [editIsPrivate, setEditIsPrivate] = useState(true);

    const [suggestions, setSuggestions] = useState([]);

    // Refresh members when modal opens or group changes
    useEffect(() => {
        if (isOpen && group) {
            loadGroupDetails();
            setActiveTab('members');
            setSearchQuery('');
            setSelectedUsers([]);
            // Initialize edit fields
            setEditName(group.name || '');
            setEditDescription(group.description || '');
            setEditAvatarUrl(group.avatarUrl || '');
            setEditIsPrivate(group.private !== undefined ? group.private : true);
        }
    }, [isOpen, group]);

    // Load suggestions when switching to 'add' tab
    useEffect(() => {
        if (activeTab === 'add') {
            userApi.getUserSuggestions().then(data => {
                // Determine which user list to filter
                // suggestions API returns { users: [] }
                const users = data.users || [];
                // Filter out self and existing members
                const existingIds = new Set(members.map(m => m.userId));
                existingIds.add(currentUser.userId);

                const filtered = users.filter(u => !existingIds.has(u.userId));
                setSuggestions(filtered);
            }).catch(err => console.error("Failed to load suggestions", err));
        }
    }, [activeTab, members, currentUser]);

    const loadGroupDetails = async () => {
        try {
            const details = await groupApi.getGroupDetails(group.id);
            // Sort members: admins first, then by username
            const sortedMembers = (details.members || []).sort((a, b) => {
                if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
                if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
                return (a.username || '').localeCompare(b.username || '');
            });
            setMembers(sortedMembers);
        } catch (err) {
            console.error("Failed to load group details", err);
        }
    };

    // Search Users for "Add"
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                userApi.searchUsers(searchQuery).then(data => {
                    // Filter out existing members and self
                    const existingIds = new Set(members.map(m => m.userId));
                    existingIds.add(currentUser.userId);

                    const filtered = (data.content || []).filter(u => !existingIds.has(u.userId));
                    setSearchResults(filtered);
                });
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, members, currentUser]);

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

    const handlePromoteToAdmin = async (userId, username) => {
        if (!window.confirm(`Make ${username} an admin? They will have full control over the group.`)) return;
        try {
            await groupApi.promoteToAdmin(group.id, userId);
            // Update local state to reflect new admin
            setMembers(prev => prev.map(m =>
                m.userId === userId ? { ...m, role: 'ADMIN' } : m
            ));
            if (onUpdate) onUpdate();
            await loadGroupDetails(); // Refresh to get updated data
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to promote member");
        }
    };

    const handleDemoteFromAdmin = async (userId, username) => {
        if (!window.confirm(`Remove admin privileges from ${username}?`)) return;
        try {
            await groupApi.demoteFromAdmin(group.id, userId);
            // Update local state
            setMembers(prev => prev.map(m =>
                m.userId === userId ? { ...m, role: 'MEMBER' } : m
            ));
            if (onUpdate) onUpdate();
            await loadGroupDetails();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to demote admin");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size exceeds 5MB limit');
            return;
        }

        try {
            // Show loading state/text if needed
            e.target.disabled = true;

            // Upload
            const response = await chatApi.uploadImage(file);
            setEditAvatarUrl(response.url || response);

            // Re-enable
            e.target.disabled = false;
        } catch (err) {
            console.error(err);
            alert('Failed to upload image');
            e.target.disabled = false;
        }
    };

    const handleUpdateGroup = async () => {
        if (!editName.trim()) return alert("Group name cannot be empty");
        setLoading(true);
        try {
            await groupApi.updateGroup(group.id, {
                name: editName,
                description: editDescription,
                avatarUrl: editAvatarUrl,
                isPrivate: editIsPrivate
            });
            if (onUpdate) onUpdate();
            alert("Group updated successfully!");
            setActiveTab('members');
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to update group");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm("Are you sure you want to DELETE this group? This action cannot be undone.")) return;

        try {
            await groupApi.deleteGroup(group.id);
            if (onUpdate) onUpdate();
            onClose();
            window.location.reload(); // Force reload to clear state
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to delete group");
        }
    };

    const handleLeaveGroup = async () => {
        // Calculate admin count
        const adminCount = members.filter(m => m.role === 'ADMIN').length;
        const isCurrentAdmin = members.find(m => m.userId === currentUser.userId)?.role === 'ADMIN';

        // Check if user is the only admin
        if (isCurrentAdmin && adminCount === 1 && members.length > 1) {
            alert("You are the only admin of this group. Please promote someone else to admin before leaving.");
            return; // Block leaving
        }

        if (!window.confirm("Are you sure you want to leave this group?")) return;
        try {
            await groupApi.leaveGroup(group.id);
            if (onUpdate) onUpdate();
            onClose();
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to leave group");
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

    // Determine admin status from members list if available, otherwise fallback
    const currentMember = members.find(m => m.userId === currentUser.userId);
    const isAdmin = currentMember?.role === 'ADMIN' || group.createdBy === currentUser.userId;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[100]">
            <div className="bg-white rounded-2xl w-full max-w-md h-[500px] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-50 to-white p-4 border-b border-rose-100 flex justify-between items-center px-6 py-4">
                    <h2 className="text-lg font-bold text-gray-800">
                        {activeTab === 'add' ? 'Add Members' : activeTab === 'edit' ? 'Edit Group' : 'Group Info'}
                    </h2>
                    <div className="flex items-center gap-2">
                        {activeTab === 'members' && isAdmin && (
                            <button
                                onClick={() => setActiveTab('edit')}
                                className="text-rose-500 hover:text-rose-600 text-sm font-medium px-3 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                            >
                                Edit
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {activeTab === 'edit' && (
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none"
                                    placeholder="Enter group name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows="3"
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                                    placeholder="Enter group description"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Avatar</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative group/avatar">
                                        <img
                                            src={editAvatarUrl || `https://ui-avatars.com/api/?name=${editName || 'Group'}`}
                                            className="w-16 h-16 rounded-full object-cover bg-gray-200"
                                            alt="Preview"
                                        />
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-medium rounded-full opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity">
                                            Change
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                        </label>
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={editAvatarUrl}
                                            onChange={(e) => setEditAvatarUrl(e.target.value)}
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                                            placeholder="Or enter image URL..."
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Upload an image or paste a URL</p>
                                    </div>
                                </div>
                            </div>

                            {/* Visibility Toggle */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-medium text-gray-800 text-sm">Public Group</p>
                                    <p className="text-xs text-gray-500">Anyone can discover and join</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditIsPrivate(!editIsPrivate)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${!editIsPrivate ? 'bg-rose-500' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${!editIsPrivate ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setActiveTab('members')}
                                    className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateGroup}
                                    disabled={loading}
                                    className={`flex-1 py-2 font-medium rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 ${loading
                                        ? 'bg-rose-400 cursor-wait text-white/80'
                                        : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30'}`}
                                >
                                    {loading && (
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>

                            {/* Delete Group (Creator Only) */}
                            {group.createdBy === currentUser.userId && (
                                <div className="pt-6 border-t border-gray-100 mt-2">
                                    <h4 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h4>
                                    <button
                                        onClick={handleDeleteGroup}
                                        className="w-full py-2 border border-red-200 text-red-500 font-medium rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        Delete Group
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

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
                                                    <p className="font-medium text-gray-900 text-sm flex items-center gap-1">
                                                        {member.username}
                                                        {member.userId === currentUser.userId && <span className="text-gray-400 ml-1">(You)</span>}
                                                        {member.role === 'ADMIN' && (
                                                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">
                                                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 0h14v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2z" />
                                                                </svg>
                                                                Admin
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{member.fullName}</p>
                                                </div>
                                            </div>
                                            {/* Action buttons for admin */}
                                            {isAdmin && member.userId !== currentUser.userId && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {/* Make Admin button - only show if member is not already admin */}
                                                    {/* Make Admin button - only show if member is not already admin */}
                                                    {member.role !== 'ADMIN' && (
                                                        <button
                                                            onClick={() => handlePromoteToAdmin(member.userId, member.username)}
                                                            className="text-amber-500 hover:text-amber-600 p-1 hover:bg-amber-50 rounded"
                                                            title="Make Admin"
                                                        >
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 0h14v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2z" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Dismiss Admin button - only show if member IS admin and NOT creator */}
                                                    {member.role === 'ADMIN' && group.createdBy !== member.userId && (
                                                        <button
                                                            onClick={() => handleDemoteFromAdmin(member.userId, member.username)}
                                                            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded"
                                                            title="Dismiss as Admin"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {/* Remove button */}
                                                    <button
                                                        onClick={() => handleRemoveMember(member.userId)}
                                                        className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                                        title="Remove member"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
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
                                {/* Header for list */}
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    {searchQuery ? 'Search Results' : 'Suggested'}
                                </h4>

                                {(searchQuery ? searchResults : suggestions).map(user => {
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

                                {searchQuery && searchResults.length === 0 && (
                                    <p className="text-center text-gray-400 text-sm py-4">No users found</p>
                                )}
                                {!searchQuery && suggestions.length === 0 && (
                                    <p className="text-center text-gray-400 text-sm py-4">No suggestions available</p>
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
