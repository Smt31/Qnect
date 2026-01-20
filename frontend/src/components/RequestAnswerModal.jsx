import { useEffect, useState, useRef } from 'react';
import { requestApi } from '../api';

export default function RequestAnswerModal({ isOpen, onClose, questionId, currentUserId }) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sentRequests, setSentRequests] = useState({}); // map userId -> boolean
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimeout = useRef(null);

    useEffect(() => {
        if (isOpen && questionId) {
            loadSuggestions();
        }
        // Clear search when modal closes
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isOpen, questionId]);

    // Cleanup debounce timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, []);

    // Filter suggestions based on search query
    const filteredSuggestions = searchQuery
        ? searchResults
        : suggestions;

    const loadSuggestions = async () => {
        try {
            setLoading(true);
            setError('');

            // Fetch both suggestions and already-requested user IDs in parallel
            const [suggestionsData, alreadyRequestedIds] = await Promise.all([
                requestApi.getSuggestions(questionId),
                requestApi.getAlreadyRequestedUserIds(questionId)
            ]);

            setSuggestions(suggestionsData || []);

            // Initialize sentRequests map with already-requested user IDs
            if (alreadyRequestedIds && alreadyRequestedIds.length > 0) {
                const requestedMap = {};
                alreadyRequestedIds.forEach(userId => {
                    requestedMap[userId] = true;
                });
                setSentRequests(requestedMap);
            }
        } catch (err) {
            setError('Failed to load suggestions');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchInputChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        // Clear previous timeout
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        // If query is empty, reset immediately
        if (!query.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        // Show searching state
        setIsSearching(true);

        // Debounce the API call by 500ms
        debounceTimeout.current = setTimeout(async () => {
            try {
                setError('');
                const data = await requestApi.searchExperts(query.trim());
                setSearchResults(data || []);
            } catch (err) {
                setError('Failed to search experts');
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 500);
    };

    const handleRequest = async (userId) => {
        try {
            await requestApi.createRequest(questionId, userId);
            setSentRequests(prev => ({ ...prev, [userId]: true }));
        } catch (err) {
            alert('Failed to send request');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h3 className="font-bold text-lg text-gray-800">Request Answer</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Search Input */}
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search experts by name, username, or tags..."
                            value={searchQuery}
                            onChange={handleSearchInputChange}
                            className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all"
                        />
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-gray-200 w-3/4 mb-2 rounded"></div>
                                        <div className="h-3 bg-gray-200 w-1/2 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : isSearching ? (
                        <div className="text-center text-gray-500 py-8">Searching experts...</div>
                    ) : error ? (
                        <div className="text-center text-red-500 py-8">{error}</div>
                    ) : filteredSuggestions.length === 0 ? (
                        <div className="text-center text-gray-500 py-12 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-3xl">Experts</div>
                            <p>No experts found {searchQuery ? `for "${searchQuery}"` : 'for this topic'}.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                                {searchQuery ? `Search Results for "${searchQuery}"` : 'Suggested Experts'}
                            </p>
                            {filteredSuggestions.map(user => (
                                <div key={user.userId} className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full border border-gray-100 overflow-hidden bg-gray-200">
                                                {user.avatarUrl ? (
                                                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">{user.fullName?.[0]}</div>
                                                )}
                                            </div>
                                            {/* Online indicator could go here */}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900 leading-tight">{user.fullName}</h4>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">{user.reputation} Rep</span>
                                                {/* <span>• Active now</span> */}
                                            </div>
                                            {user.skills && user.skills.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {user.skills.slice(0, 2).map((s, i) => (
                                                        <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 rounded">{s}</span>
                                                    ))}
                                                    {user.skills.length > 2 && <span className="text-[10px] text-gray-400">+{user.skills.length - 2}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleRequest(user.userId)}
                                        disabled={sentRequests[user.userId]}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm
                      ${sentRequests[user.userId]
                                                ? 'bg-gray-100 text-gray-400 cursor-default'
                                                : 'bg-white border border-gray-200 text-gray-700 hover:border-red-500 hover:text-red-500 active:bg-red-50'}`}
                                    >
                                        {sentRequests[user.userId] ? 'Requested' : 'Request'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-50 bg-gray-50/50 text-center text-xs text-gray-400">
                    Requests expire after 7 days if not answered.
                </div>
            </div>
        </div>
    );
}
