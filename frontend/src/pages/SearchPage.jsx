import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuthToken, questionApi, userApi, topicApi } from '../api';
import { useCurrentUser, useFollowTopic, useUnfollowTopic } from '../api/queryHooks';

const SearchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'users', or 'topics'
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract query from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const query = urlParams.get('q');
    const tab = urlParams.get('tab') || 'posts';

    if (query) {
      setSearchQuery(query);
      setActiveTab(tab);
      performSearch(query, tab);
    }
  }, [location.search]);

  const performSearch = async (query, tab = activeTab) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      let results;
      if (tab === 'posts') {
        const response = await questionApi.searchQuestions(query);
        results = Array.isArray(response) ? response : (response.content || []);
      } else if (tab === 'users') {
        const response = await userApi.searchUsers(query);
        results = Array.isArray(response) ? response : (response.content || []);
      } else if (tab === 'topics') {
        const response = await topicApi.searchTopics(query);
        results = Array.isArray(response) ? response : (response.content || []);
      }

      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to perform search');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateUrl(searchQuery, activeTab);
    performSearch(searchQuery, activeTab);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (searchQuery) {
      updateUrl(searchQuery, tab);
      performSearch(searchQuery, tab);
    }
  };

  const updateUrl = (query, tab) => {
    navigate(`/search?q=${encodeURIComponent(query)}&tab=${tab}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="search-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="search-layout">
        <main className="search-main">
          {/* Search Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
            <h1 className="text-2xl font-bold mb-4">Search Results</h1>
            <form onSubmit={handleSearchSubmit} className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab}...`}
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <button
                  type="submit"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-blue-600 hover:text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </button>
              </div>
            </form>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'posts'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
                onClick={() => handleTabChange('posts')}
              >
                Posts
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'users'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
                onClick={() => handleTabChange('users')}
              >
                Users
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'topics'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
                onClick={() => handleTabChange('topics')}
              >
                Topics
              </button>
            </div>
          </div>

          {/* Search Results */}
          {loading && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 className="mt-4 text-xl font-medium text-gray-900">Search Error</h3>
                <p className="mt-2 text-gray-500">{error}</p>
                <button
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  onClick={() => performSearch(searchQuery)}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {!loading && !error && searchResults.length === 0 && searchQuery && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 className="mt-4 text-xl font-medium text-gray-900">No {activeTab} Found</h3>
                <p className="mt-2 text-gray-500">Try different search terms.</p>
              </div>
            </div>
          )}

          {!loading && !error && searchResults.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold mb-4">
                {searchResults.length} {activeTab === 'posts' ? 'post' : activeTab === 'topics' ? 'topic' : 'user'}{searchResults.length !== 1 ? 's' : ''} found
              </h2>

              <div className="space-y-6">
                {activeTab === 'posts' && (
                  // Posts List
                  searchResults.map((question) => (
                    <div key={question.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                      <h3 className="text-lg font-semibold mb-2">
                        <span
                          onClick={() => navigate(`/question/${question.id}`)}
                          className="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          {question.title}
                        </span>
                      </h3>
                      <p className="text-gray-600 mb-3">
                        {question.content?.substring(0, 150)}{question.content?.length > 150 ? '...' : ''}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {question.tags && question.tags.map((tag, index) => (
                          <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
                          </svg>
                          {(question.upvotes || 0) - (question.downvotes || 0)}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                          </svg>
                          {question.answerCount || 0} answers
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                          {question.viewsCount || 0} views
                        </span>
                        <span>{formatDate(question.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}

                {activeTab === 'users' && (
                  // Users List
                  searchResults.map((user) => (
                    <div key={user.userId} className="flex items-center justify-between border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                      <div className="flex items-center space-x-4">
                        <img
                          src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                          alt={user.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <h3 className="text-lg font-semibold">
                            <span onClick={() => navigate(`/profile/${user.userId}`)} className="text-gray-900 hover:text-blue-600 cursor-pointer">
                              {user.fullName || user.username}
                            </span>
                          </h3>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                          {user.bio && <p className="text-sm text-gray-600 mt-1">{user.bio}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/profile/${user.userId}`)}
                        className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
                      >
                        View Profile
                      </button>
                    </div>
                  ))
                )}

                {activeTab === 'topics' && (
                  searchResults.map(topic => (
                    <div key={topic.id} className="w-full">
                      <TopicResultItem topic={topic} />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const TopicResultItem = ({ topic }) => {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const followMutation = useFollowTopic();
  const unfollowMutation = useUnfollowTopic();

  const isFollowed = user?.topics?.some(t => t.id === topic.id) || (user?.skills?.includes(topic.name)); // simplified check

  const handleToggle = () => {
    if (isFollowed) {
      unfollowMutation.mutate(topic.id);
    } else {
      followMutation.mutate(topic.id);
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-6 last:border-0 last:pb-0">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span
            className="cursor-pointer hover:text-rose-500 transition-colors"
            onClick={() => navigate(`/topic/${topic.id}`)}
          >
            #{topic.name}
          </span>
        </h3>
        <p className="text-sm text-gray-500">{topic.postCount} posts</p>
        <p className="text-sm text-gray-600 mt-1">{topic.description || "No description"}</p>
      </div>
      <button
        onClick={handleToggle}
        disabled={followMutation.isLoading || unfollowMutation.isLoading}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isFollowed
          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          : 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100'
          }`}
      >
        {isFollowed ? 'Following' : 'Follow'}
      </button>
    </div>
  );
};

export default SearchPage;