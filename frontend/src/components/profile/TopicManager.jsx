
import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchTopics, useFollowTopic, useUnfollowTopic } from '../../api/queryHooks';
import { Link } from 'react-router-dom';

export default function TopicManager({ user, isMe }) {
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const wrapperRef = useRef(null);

    const queryClient = useQueryClient();
    const followMutation = useFollowTopic();
    const unfollowMutation = useUnfollowTopic();

    // Use the topics from the user object (falling back to skills if topics not yet populated)
    // We prefer 'topics' (objects) but support 'skills' (strings) for display if backend hasn't populated objects yet
    // Use the topics from the user object (falling back to skills if topics not yet populated)
    const rawTopics = (user?.topics && user.topics.length > 0) ? user.topics : (user?.skills || []);

    // Deduplicate topics to avoid key collisions
    const userTopics = React.useMemo(() => {
        const seen = new Set();
        return rawTopics.filter(topic => {
            const key = typeof topic === 'string' ? topic : topic.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [rawTopics]);

    const { data: searchData, isLoading: isSearching } = useSearchTopics(searchQuery, 0, 5, isEditing && searchQuery.length > 1);

    useEffect(() => {
        if (searchData?.content) {
            setSearchResults(searchData.content);
            setShowResults(true);
        } else {
            setSearchResults([]);
        }
    }, [searchData]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleFollow = (topic) => {
        followMutation.mutate(topic.id, {
            onSuccess: () => {
                setSearchQuery('');
                setShowResults(false);
            }
        });
    };

    const handleUnfollow = (topicId) => {
        unfollowMutation.mutate(topicId);
    };

    // Helper to check if topic is already followed
    const isFollowed = (topicId) => {
        return userTopics.some(t => t.id === topicId);
    };

    if (!user) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Interests & Topics</h3>
                {isMe && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-rose-500 font-medium hover:text-rose-600 transition-colors"
                    >
                        Edit
                    </button>
                )}
                {isMe && isEditing && (
                    <button
                        onClick={() => setIsEditing(false)}
                        className="text-xs text-gray-500 font-medium hover:text-gray-700 transition-colors"
                    >
                        Done
                    </button>
                )}
            </div>

            {/* Edit Mode Search */}
            {isEditing && (
                <div className="mb-4 relative" ref={wrapperRef}>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchQuery.length > 1 && setShowResults(true)}
                            placeholder="Search topics to follow..."
                            className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pl-10 outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all placeholder:text-gray-400"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 absolute left-3 top-2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>

                    {/* Search Results Dropdown */}
                    {showResults && searchQuery.length > 1 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {isSearching ? (
                                <div className="p-3 text-center text-xs text-gray-500">Searching...</div>
                            ) : searchResults.length > 0 ? (
                                <div className="py-1">
                                    {searchResults.map(topic => (
                                        <button
                                            key={topic.id}
                                            onClick={() => handleFollow(topic)}
                                            disabled={isFollowed(topic.id) || followMutation.isLoading}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-rose-50 flex items-center justify-between group"
                                        >
                                            <div>
                                                <span className="font-medium text-gray-800">#{topic.name}</span>
                                                <span className="text-xs text-gray-400 ml-2">{topic.postCount} posts</span>
                                            </div>
                                            {isFollowed(topic.id) ? (
                                                <span className="text-xs text-green-600 font-medium">Following</span>
                                            ) : (
                                                <span className="text-xs text-rose-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Follow</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-3 text-center text-xs text-gray-500">No topics found.</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Topics List */}
            <div className="flex flex-wrap gap-2">
                {userTopics.length > 0 ? (
                    userTopics.map((topic) => (
                        // Handle both object (Topic) and string (legacy skills)
                        typeof topic === 'string' ? (
                            <span key={topic} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200">
                                #{topic}
                                {/* We can't easily unfollow string-only topics without ID in the new API, unless we assume name lookup. 
                      Display them as readonly or legacy. Ideally backend migrates them. */}
                            </span>
                        ) : (
                            <span
                                key={topic.id}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1 transition-all ${isEditing
                                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-600'
                                    }`}
                            >
                                <Link to={`/topic/${topic.id}`} className={isEditing ? 'pointer-events-none' : ''}>
                                    #{topic.name}
                                </Link>
                                {isEditing && (
                                    <button
                                        onClick={() => handleUnfollow(topic.id)}
                                        disabled={unfollowMutation.isLoading}
                                        className="ml-1 text-rose-400 hover:text-rose-600 focus:outline-none p-0.5 rounded-full hover:bg-rose-100"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                        </svg>
                                    </button>
                                )}
                            </span>
                        )
                    ))
                ) : (
                    <div className="text-center py-6 w-full">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                            </svg>
                        </div>
                        <p className="text-gray-400 text-sm">
                            {isMe ? "Follow topics to personalize your feed." : "No topics followed yet."}
                        </p>
                        {isMe && !isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="mt-2 text-rose-500 text-xs font-medium hover:text-rose-600"
                            >
                                Find Topics
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
