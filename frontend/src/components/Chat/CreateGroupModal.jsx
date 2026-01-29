import React, { useState, useEffect } from 'react';
import { userApi, groupApi, questionApi } from '../../api';

const CreateGroupModal = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    // Member selection
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setName('');
            setDescription('');
            setIsPrivate(true);
            setImageFile(null);
            setImagePreview(null);
            setAvatarUrl('');
            setSelectedUsers([]);
            setSearchQuery('');
        }
    }, [isOpen]);

    // Search Users
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                userApi.searchUsers(searchQuery).then(data => {
                    setSearchResults(data.content || []);
                });
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Load suggestions when on step 2
    useEffect(() => {
        if (step === 2) {
            userApi.getUserSuggestions().then(data => {
                const users = data.users || [];
                // Filter out already selected users
                const selectedIds = new Set(selectedUsers.map(u => u.userId));
                setSuggestions(users.filter(u => !selectedIds.has(u.userId)));
            }).catch(err => console.error('Failed to load suggestions:', err));
        }
    }, [step]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const toggleUser = (user) => {
        if (selectedUsers.find(u => u.userId === user.userId)) {
            setSelectedUsers(prev => prev.filter(u => u.userId !== user.userId));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
    };

    const handleSubmit = async () => {
        setUploading(true);
        try {
            let finalAvatarUrl = avatarUrl.trim() || null;
            if (imageFile) {
                const uploadRes = await questionApi.uploadImage(imageFile);
                finalAvatarUrl = uploadRes.url;
            }

            const payload = {
                name,
                description,
                avatarUrl: finalAvatarUrl,
                memberIds: selectedUsers.map(u => u.userId),
                isPrivate
            };

            await groupApi.createGroup(payload);
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to create group");
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">
                        {step === 1 ? 'New Group' : 'Add Members'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {step === 1 ? (
                    <div className="space-y-4">
                        <div className="flex justify-center mb-4">
                            <label className="cursor-pointer relative group">
                                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 hover:border-rose-500 transition-colors">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>
                        </div>

                        {/* Avatar URL Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Or paste image URL</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-200 focus:border-rose-500 outline-none text-sm"
                                value={avatarUrl}
                                onChange={(e) => {
                                    setAvatarUrl(e.target.value);
                                    if (e.target.value) setImagePreview(e.target.value);
                                }}
                                placeholder="https://example.com/image.png"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-200 focus:border-rose-500 outline-none"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Weekend Hike"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                            <textarea
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-200 focus:border-rose-500 outline-none resize-none"
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What's this group about?"
                            />
                        </div>

                        {/* Public/Private Toggle */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                                <p className="font-medium text-gray-800">Public Group</p>
                                <p className="text-sm text-gray-500">Anyone can discover and join this group</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPrivate(!isPrivate)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${!isPrivate ? 'bg-rose-500' : 'bg-gray-300'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${!isPrivate ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        {/* Selected Pills */}
                        {selectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                {selectedUsers.map(u => (
                                    <span key={u.userId} className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-1 rounded-full text-xs font-medium">
                                        {u.username}
                                        <button onClick={() => toggleUser(u)} className="hover:text-rose-800">×</button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="h-60 overflow-y-auto custom-scrollbar border-t border-gray-100 pt-2 space-y-2">
                            {/* Header for list */}
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
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
                    </div>
                )}

                <div className="mt-8 flex justify-end gap-3">
                    {step === 2 && (
                        <button
                            onClick={() => setStep(1)}
                            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (step === 1) {
                                if (name.trim()) setStep(2);
                            } else {
                                handleSubmit();
                            }
                        }}
                        disabled={step === 1 && !name.trim() || uploading}
                        className={`px-6 py-2 rounded-lg font-medium text-white transition-all ${(step === 1 && !name.trim()) || uploading
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30'
                            }`}
                    >
                        {uploading ? 'Creating...' : step === 1 ? 'Next: Add Members' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateGroupModal;
