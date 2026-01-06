import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken, feedApi, voteApi, userApi, questionApi, bookmarkApi, API_URL } from '../api';
import Navbar from '../components/Home/Navbar';
import FeedImage from '../components/FeedImage';
import LeftSidebar from '../components/Home/LeftSidebar';
import RightSidebar from '../components/Home/RightSidebar';
import MobileNav from '../components/Home/MobileNav';
import FeedCard from '../components/Feed/FeedCard';

export default function HomePage() {
  const navigate = useNavigate();
  // Helper to read saved state synchronously
  const getSavedState = () => {
    try {
      const saved = sessionStorage.getItem('homeFeedState');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };
  const savedState = useMemo(() => getSavedState(), []);

  const [feedData, setFeedData] = useState(savedState?.feedData || null);
  const [loading, setLoading] = useState(!savedState?.feedData);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState(savedState?.activeTab || 'FOR_YOU');

  /* 
     We can now rely on `post.currentUserVoteStatus` for initial state.
     But we still need local state to track changes optimistically *on top* of the feed data.
     Or we can mutate the feedData directly?
     Mutating feedData is cleaner for lists.
     Let's try updating feedData state.
  */
  const [followedUsers, setFollowedUsers] = useState({});

  const [askOpen, setAskOpen] = useState(false);
  const [activeCreateTab, setActiveCreateTab] = useState('QUESTION'); // 'QUESTION' or 'POST'
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionContent, setQuestionContent] = useState('');
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(0);
  // Restore scroll position only once on mount
  useEffect(() => {
    if (savedState?.scrollY) {
      setTimeout(() => window.scrollTo(0, savedState.scrollY), 0);
    }
  }, [savedState]);

  // Save state to session storage before unmount or navigation
  useEffect(() => {
    return () => {
      // Save state
      if (feedData) {
        sessionStorage.setItem('homeFeedState', JSON.stringify({
          feedData,
          scrollY: window.scrollY,
          activeTab
        }));
      }
    };
  }, [feedData, activeTab]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login', { replace: true });
    } else {
      // Only fetch if no data (i.e. not restored from session)
      // Or if activeTab changed explicitly (which we can detect by savedTab !== activeTab, but initial render is complicated)
      // Simplified: If feedData is null, fetch.
      if (!feedData) {
        fetchFeedData(activeTab);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    // If activeTab changed and we have data for a DIFFERENT tab, we fetch.
    // Logic: If we just restored data for 'FOR_YOU', and user clicks 'RECENT', we need to fetch.
    // We can rely on feedData being reset or check if current feed matches tab? 
    // Simply: When activeTab changes, we WANT to fetch new data usually.
    // BUT checking against restored state is tricky.
    // Let's just say: if we triggered this effect because activeTab changed, verify if we already have data for it.
    // For simplicity: If not initial load (loading is false), fetch.
    if (!loading) {
      fetchFeedData(activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchFeedData = async (tab = 'FOR_YOU') => {
    try {
      setLoading(true);
      const data = await feedApi.getFeed(tab, 0, 10);
      setFeedData(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load feed data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setImageUrl(data.url);
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVote = async (postId, type) => {
    // Optimistic update on feedData
    setFeedData(prevData => {
      if (!prevData) return prevData;

      const newFeed = prevData.feed.map(post => {
        if (post.id !== postId) return post;

        const currentStatus = post.currentUserVoteStatus || 'NONE';
        const isUpvote = type === 'UPVOTE';

        let nextStatus = type;
        let nextUp = post.upvotes || 0;
        let nextDown = post.downvotes || 0;

        // If toggling off
        if (currentStatus === type) {
          nextStatus = 'NONE';
          if (isUpvote) nextUp--; else nextDown--;
        }
        // If switching
        else if (currentStatus !== 'NONE') {
          if (isUpvote) { nextUp++; nextDown--; }
          else { nextDown++; nextUp--; }
        }
        // If new vote
        else {
          if (isUpvote) nextUp++; else nextDown++;
        }

        return {
          ...post,
          currentUserVoteStatus: nextStatus,
          upvotes: nextUp,
          downvotes: nextDown
        };
      });

      return { ...prevData, feed: newFeed };
    });

    try {
      await voteApi.voteQuestion(postId, type);
    } catch (e) {
      console.error(e);
      // Revert if needed (fetching feed again is easiest or complex revert logic)
    }
  };

  const handleFollow = async (userId) => {
    try {
      const isCurrentlyFollowing = followedUsers[userId];

      if (isCurrentlyFollowing) {
        await userApi.unfollowUser(userId);
      } else {
        await userApi.followUser(userId);
      }

      setFollowedUsers(prev => ({
        ...prev,
        [userId]: !prev[userId]
      }));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleBookmark = async (postId) => {
    // Capture current bookmark status BEFORE optimistic update
    const post = feedData?.feed?.find(p => p.id === postId);
    const wasBookmarked = post?.isBookmarked || false;

    console.log('Bookmark clicked for post:', postId);
    console.log('Current bookmark status:', wasBookmarked);
    console.log('Will toggle to:', !wasBookmarked);

    // Optimistic update on feedData - toggle bookmark
    setFeedData(prevData => {
      if (!prevData) return prevData;

      const newFeed = prevData.feed.map(post => {
        if (post.id !== postId) return post;

        return {
          ...post,
          isBookmarked: !wasBookmarked
        };
      });

      return { ...prevData, feed: newFeed };
    });

    try {
      // Make API call based on captured status
      if (wasBookmarked) {
        console.log('Calling unbookmarkPost API');
        await bookmarkApi.unbookmarkPost(postId);
      } else {
        console.log('Calling bookmarkPost API');
        await bookmarkApi.bookmarkPost(postId);
      }
      console.log('Bookmark API call successful');
    } catch (e) {
      console.error('Bookmark toggle failed:', e);
      // Revert to original state on error
      setFeedData(prevData => {
        if (!prevData) return prevData;

        const newFeed = prevData.feed.map(post => {
          if (post.id !== postId) return post;

          return {
            ...post,
            isBookmarked: wasBookmarked
          };
        });

        return { ...prevData, feed: newFeed };
      });
    }
  };

  const featuredPost = useMemo(() => {
    const posts = feedData?.feed || [];
    if (!posts.length) return null;
    const firstWithImage = posts.find(p => p.imageUrl);
    return firstWithImage || null;
  }, [feedData]);

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!questionTitle.trim()) return;

    try {
      setCreateLoading(true);
      const parsedTags = tags
        .split(',')
        .map(t => t.trim())
        .map(t => t.trim())
        .filter(Boolean);

      if (parsedTags.length === 0) {
        alert('Please add at least one topic (tag) to your question.');
        setCreateLoading(false);
        return;
      }

      const payload = {
        title: questionTitle.trim(),
        content: questionContent.trim(),
        tags: parsedTags,
        imageUrl: imageUrl.trim() || null,
        type: activeCreateTab
      };

      await questionApi.createQuestion(payload);

      // Reset
      setQuestionTitle('');
      setQuestionContent('');
      setTags('');
      setImageUrl('');
      setAskOpen(false);

      // Refresh
      fetchFeedData(activeTab);
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Failed to post question');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await questionApi.deleteQuestion(postId);
      // Remove from feed locally
      setFeedData(prev => ({
        ...prev,
        feed: prev.feed.filter(p => p.id !== postId)
      }));
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF5F6]">
        <Navbar user={null} />
        <div className="w-full pt-6 pb-24 md:pb-6">
          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-x-0 lg:grid-cols-[16rem_minmax(0,1fr)_16rem] lg:gap-y-0">
            {/* Left Sidebar Skeleton */}
            <aside className="bg-white text-gray-900 px-4 py-5 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:overflow-y-auto md:border-r md:border-gray-200">
              <div className="animate-pulse flex flex-col gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-gray-200 rounded-full size-12"></div>
                    <div className="flex flex-col gap-2">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-3 bg-gray-100 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-gray-200 pt-3">
                    <div className="flex flex-col gap-1">
                      <div className="h-3 bg-gray-100 rounded w-8"></div>
                      <div className="h-4 bg-gray-200 rounded w-6"></div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="h-3 bg-gray-100 rounded w-12"></div>
                      <div className="h-4 bg-gray-200 rounded w-4"></div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="h-3 bg-gray-100 rounded w-16"></div>
                      <div className="h-4 bg-gray-200 rounded w-8"></div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-md"></div>
                  ))}
                </div>
                <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 bg-gray-100 rounded w-3/4"></div>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main Feed Skeleton */}
            <main className="min-w-0 md:px-6">
              <div className="flex flex-col gap-4">
                {/* Ask Question Composer Skeleton */}
                <div className="bg-white p-4">
                  <div className="animate-pulse flex items-center gap-3">
                    <div className="bg-gray-200 rounded-full size-10"></div>
                    <div className="flex-1 h-10 bg-gray-100 rounded-full"></div>
                    <div className="h-10 w-20 bg-gray-200 rounded-lg"></div>
                  </div>
                </div>

                {/* Question Feed Skeleton */}
                <div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="py-3 border-b border-gray-100">
                      <div className="animate-pulse">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-gray-200 rounded-full size-10"></div>
                            <div className="flex flex-col gap-2">
                              <div className="h-4 bg-gray-200 rounded w-24"></div>
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                            </div>
                          </div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                        <div className="mb-3">
                          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
                          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <div className="h-6 bg-gray-100 rounded-full w-16"></div>
                          <div className="h-6 bg-gray-100 rounded-full w-20"></div>
                          <div className="h-6 bg-gray-100 rounded-full w-12"></div>
                        </div>
                        <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            <div className="h-5 w-5 bg-gray-100 rounded"></div>
                            <div className="h-4 bg-gray-100 rounded w-4"></div>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-5 w-5 bg-gray-100 rounded"></div>
                            <div className="h-4 bg-gray-100 rounded w-4"></div>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-5 w-5 bg-gray-100 rounded"></div>
                            <div className="h-4 bg-gray-100 rounded w-6"></div>
                          </div>
                          <div className="flex items-center gap-1 ml-auto">
                            <div className="h-5 w-5 bg-gray-100 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </main>

            {/* Right Column Skeleton */}
            <aside className="md:col-span-2 lg:col-span-1 self-start px-4 md:px-6 lg:px-0 lg:pl-6 lg:pr-4">
              <div className="flex flex-col gap-6 lg:sticky lg:top-16">
                {/* Trending Today Skeleton */}
                <div className="bg-white p-4">
                  <div className="animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-start gap-3 py-3 border-b border-gray-100">
                        <div className="h-4 bg-gray-100 rounded w-6 mt-1"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-4/5 mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                        </div>
                      </div>
                    ))}
                    <div className="h-4 bg-gray-200 rounded w-20 mt-2 ml-auto"></div>
                  </div>
                </div>

                {/* Who to Follow Skeleton */}
                <div className="bg-white p-4">
                  <div className="animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-200 rounded-full size-9"></div>
                          <div className="flex flex-col gap-1">
                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                          </div>
                        </div>
                        <div className="h-8 bg-gray-100 rounded-full w-20"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Release Notes Skeleton */}
                <div className="bg-white p-4">
                  <div className="animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-24 mb-3"></div>
                    <div className="flex flex-col gap-2">
                      <div className="h-3 bg-gray-100 rounded w-full"></div>
                      <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                      <div className="h-3 bg-gray-100 rounded w-4/5"></div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFF5F6]">
        <Navbar user={feedData?.user} />
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 flex items-center justify-center">
          <div className="max-w-md w-full bg-white p-8 text-center border border-gray-100">
            <div className="mx-auto size-16 bg-[#FFECEC] rounded-full flex items-center justify-center mb-4">
              <svg className="text-[#FF6B6B]" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Feed</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              className="px-4 py-2 bg-[#FF6B6B] hover:bg-[#FF5252] text-white font-medium rounded-lg transition-colors"
              onClick={() => fetchFeedData(activeTab)}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!feedData) {
    return (
      <div className="min-h-screen bg-[#FFF5F6]">
        <Navbar user={feedData?.user} />
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 flex items-center justify-center">
          <div className="max-w-md w-full bg-white p-8 text-center border border-gray-100">
            <div className="mx-auto size-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="text-gray-400" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-500 mb-6">Unable to load feed data.</p>
            <button
              className="px-4 py-2 bg-[#FF6B6B] hover:bg-[#FF5252] text-white font-medium rounded-lg transition-colors"
              onClick={() => fetchFeedData(activeTab)}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF1F2' }}>
      <Navbar user={feedData.user} />

      {/* Create Post / Ask Question Modal */}
      {askOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header with Tabs */}
            <div className="flex border-b border-gray-100 relative">
              <button
                className={`flex-1 py-4 text-center font-semibold text-sm transition-colors relative ${activeCreateTab === 'QUESTION' ? 'text-gray-900 bg-gray-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setActiveCreateTab('QUESTION')}
              >
                Add Question
                {activeCreateTab === 'QUESTION' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
              </button>
              <button
                className={`flex-1 py-4 text-center font-semibold text-sm transition-colors relative ${activeCreateTab === 'POST' ? 'text-gray-900 bg-gray-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setActiveCreateTab('POST')}
              >
                Create Post
                {activeCreateTab === 'POST' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
              </button>
              <button
                onClick={() => setAskOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Question Tips - Only for Question Tab */}
              {activeCreateTab === 'QUESTION' && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
                  <h4 className="text-red-800 font-bold text-sm mb-2">Tips on getting good answers quickly</h4>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    <li>Make sure your question has not been asked already</li>
                    <li>Keep your question short and to the point</li>
                    <li>Double-check grammar and spelling</li>
                  </ul>
                </div>
              )}

              {/* User Context */}
              {/* User Context */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-sm">
                  {feedData.user?.avatarUrl ? (
                    <img src={feedData.user.avatarUrl} alt="Me" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{feedData.user?.fullName?.charAt(0) || 'M'}</span>
                  )}
                </div>
                <span className="font-semibold text-gray-700">{feedData.user?.fullName || 'Me'}</span>
              </div>

              <form onSubmit={handleSubmitQuestion} className="flex flex-col gap-4">
                <div>
                  <input
                    type="text"
                    value={questionTitle}
                    onChange={(e) => setQuestionTitle(e.target.value)}
                    placeholder={activeCreateTab === 'QUESTION' ? 'Start your question with "What", "How", "Why", etc.' : "Post title"}
                    className="w-full text-lg font-semibold placeholder-gray-400 border-b border-gray-200 pb-2 focus:outline-none focus:border-blue-500 transition-colors bg-transparent"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <textarea
                    value={questionContent}
                    onChange={(e) => setQuestionContent(e.target.value)}
                    placeholder={activeCreateTab === 'QUESTION' ? "Add context to your question (optional)" : "What do you want to share?"}
                    className="w-full h-32 resize-none placeholder-gray-400 focus:outline-none text-gray-600 bg-transparent"
                  />
                </div>

                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex items-center gap-3">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Image URL (optional)"
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 text-gray-600 text-sm font-medium px-3 py-1 bg-white rounded border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    {isUploading ? (
                      <span className="w-4 h-4 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin"></span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Tags (comma separated)"
                    className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setAskOpen(false)}
                    className="px-5 py-2 text-gray-600 hover:bg-gray-100 font-medium rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-2 text-white font-medium rounded-full shadow-md hover:shadow-lg transition-all transform active:scale-95 ${activeCreateTab === 'QUESTION' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'}`}
                    disabled={createLoading}
                  >
                    {createLoading ? 'Publishing...' : (activeCreateTab === 'QUESTION' ? 'Add question' : 'Post')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Left Sidebar */}
        <LeftSidebar user={feedData.user} onAskQuestion={() => setAskOpen(true)} />

        {/* Main Content - Offset for fixed sidebar (Left only now) */}
        <main className="flex-1 md:ml-64 p-6 max-w-5xl">
          {/* Header with Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Top Posts for You</h2>
              <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-6 border-b border-gray-200">
              <button
                className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'FOR_YOU' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => setActiveTab('FOR_YOU')}
              >
                For You
              </button>
              <button
                className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'RECENT' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => setActiveTab('RECENT')}
              >
                Recent
              </button>
              <button
                className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'UNANSWERED' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => setActiveTab('UNANSWERED')}
              >
                Unanswered
              </button>
            </div>
          </div>

          {/* Featured card */}
          {featuredPost && (
            <div
              className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/question/${featuredPost.id}`)}
            >
              <div className="relative">
                <img src={featuredPost.imageUrl} alt={featuredPost.title} className="w-full h-[220px] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />
                <div className="absolute left-5 bottom-5 right-5">
                  <div className="inline-flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-md mb-2">
                    FEATURED
                  </div>
                  <div className="text-white text-xl font-bold leading-snug">
                    {featuredPost.title}
                  </div>
                </div>
              </div>
              <div className="p-4 text-sm text-gray-600">
                Posted by {featuredPost.author?.fullName || 'User'} • {new Date(featuredPost.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}

          {/* Question Feed */}
          <div className="space-y-4">
            {feedData.feed && feedData.feed.length > 0 ? (
              feedData.feed
                .filter(p => !featuredPost || p.id !== featuredPost.id)
                .map((post) => (
                  <FeedCard
                    key={post.id}
                    post={post}
                    currentUserId={feedData.user?.userId}
                    onVote={handleVote}
                    onDelete={handleDeletePost}
                    topRightElement={
                      <button
                        className={`flex flex-col items-center justify-center w-10 h-10 rounded-full border transition-all ${post.isBookmarked
                          ? 'bg-yellow-50 text-yellow-500 border-yellow-200'
                          : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookmark(post.id);
                        }}
                        title={post.isBookmarked ? "Remove Bookmark" : "Bookmark"}
                      >
                        <svg className="w-5 h-5" fill={post.isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    }
                  />
                ))
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Posts Yet</h3>
                <p className="text-gray-500 mb-6">Be the first to create a post!</p>
                <button
                  className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
                  onClick={() => setAskOpen(true)}
                >
                  Create Post
                </button>
              </div>
            )}
          </div>
        </main>

        <RightSidebar
          trending={feedData.trending}
          suggestions={feedData.suggestions}
          followedUsers={followedUsers}
          onFollow={handleFollow}
        />

      </div >

      <MobileNav onAskQuestion={() => setAskOpen(true)} />
    </div >
  );
}