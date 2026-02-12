import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../api';
import { useFeed, useTrending, useUserSuggestions, useCurrentUser, useVoteQuestion, useBookmarkPost, useUnbookmarkPost, useDeleteQuestion, useFollowUser, useUnfollowUser } from '../api/queryHooks';
import Navbar from '../components/Home/Navbar';
import LeftSidebar from '../components/Home/LeftSidebar';
import RightSidebar from '../components/Home/RightSidebar';
import MobileNav from '../components/Home/MobileNav';
import FeedCard from '../components/Feed/FeedCard';
import ShareModal from '../components/ShareModal';
import { useModal } from '../context/ModalContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { openPostModal } = useModal();
  // Helper to read saved state synchronously
  const getSavedState = () => {
    try {
      const saved = sessionStorage.getItem('homeFeedState');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };
  const savedState = useMemo(() => getSavedState(), []);

  const [activeTab, setActiveTab] = useState(savedState?.activeTab || 'FOR_YOU');

  const { data: currentUser } = useCurrentUser();
  const { data: feedData, isLoading: loading, isError, refetch, isRefetching } = useFeed(activeTab, 0, 10);
  const { data: trendingData } = useTrending();
  const { data: suggestionsData } = useUserSuggestions();

  // Fallback to currentUser if feedData isn't loaded yet
  const user = feedData?.user || currentUser;

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [followedUsers, setFollowedUsers] = useState({});

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePost, setSharePost] = useState(null);

  const handleShare = (post) => {
    setSharePost(post);
    setShowShareModal(true);
  };
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

  const voteMutation = useVoteQuestion();

  const handleVote = async (postId, type) => {
    // Optimistic updates are now handled by the useVoteQuestion hook
    try {
      await voteMutation.mutateAsync({ voteType: type, postId });
    } catch (e) {
      console.error('Vote failed:', e);
      // Error rollback is handled by the hook
    }
  };

  const handleFollow = async (userId) => {
    const isCurrentlyFollowing = followedUsers[userId];

    // Optimistic update
    setFollowedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));

    try {
      if (isCurrentlyFollowing) {
        await unfollowMutation.mutateAsync(userId);
      } else {
        await followMutation.mutateAsync(userId);
      }
    } catch (error) {
      console.error('Error following user:', error);
      // Revert the optimistic update
      setFollowedUsers(prev => ({
        ...prev,
        [userId]: prev[userId]
      }));
    }
  };

  const bookmarkMutation = useBookmarkPost();
  const unbookmarkMutation = useUnbookmarkPost();

  const handleBookmark = async (postId) => {
    // Optimistic updates are now handled by the bookmark hooks
    const post = feedData?.feed?.find(p => p.id === postId);
    const wasBookmarked = post?.isBookmarked || false;

    try {
      if (wasBookmarked) {
        await unbookmarkMutation.mutateAsync(postId);
      } else {
        await bookmarkMutation.mutateAsync(postId);
      }
    } catch (e) {
      console.error('Bookmark toggle failed:', e);
      // Error rollback is handled by the hook
    }
  };

  const featuredPost = useMemo(() => {
    const posts = feedData?.feed || [];
    if (!posts.length) return null;
    const firstWithImage = posts.find(p => p.imageUrl);
    return firstWithImage || null;
  }, [feedData]);

  const deleteQuestionMutation = useDeleteQuestion();

  const handleDeletePost = async (postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deleteQuestionMutation.mutateAsync(postId);
        // The feed will be invalidated by the mutation's onSuccess handler
      } catch (error) {
        console.error('Failed to delete post:', error);
        alert('Failed to delete post');
      }
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF1F2' }}>
      <Navbar user={user} />

      <div className="flex">
        {/* Left Sidebar */}
        <LeftSidebar user={user} />

        {/* Main Content - Offset for fixed sidebar (Left only now) */}
        <main className="flex-1 md:ml-64 p-6 max-w-5xl">
          {/* Header with Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Top Posts for You</h2>
              <button
                onClick={() => refetch()}
                className={`p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-all ${isRefetching ? 'animate-spin text-red-500 bg-red-50' : ''}`}
                style={{ animationDirection: 'reverse' }}
                title="Refresh Feed"
                disabled={isRefetching}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
            {loading ? (
              <FeedSkeleton />
            ) : isError ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <div className="mx-auto size-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="text-red-500" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Error Loading Feed</h3>
                <p className="text-gray-500 mb-4">Something went wrong while loading the posts.</p>
                <button
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-lg transition-colors"
                  onClick={() => refetch()}
                >
                  Try Again
                </button>
              </div>
            ) : feedData?.feed && feedData.feed.length > 0 ? (
              feedData.feed
                .filter(p => !featuredPost || p.id !== featuredPost.id)
                .map((post) => (
                  <FeedCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.userId}
                    onVote={handleVote}
                    onDelete={handleDeletePost}
                    onShare={handleShare}
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
                  onClick={openPostModal}
                >
                  Create Post
                </button>
              </div>
            )}
          </div>
        </main>

        {trendingData && suggestionsData ? (
          <RightSidebar
            trending={trendingData.content || []}
            suggestions={suggestionsData}
            followedUsers={followedUsers}
            onFollow={handleFollow}
          />
        ) : (
          <RightSidebarSkeleton />
        )}

      </div >

      <MobileNav />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={sharePost}
      />
    </div >
  );
}

const FeedSkeleton = () => (
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
                  <div className="h-3 bg-gray-100 rounded w-16"></div>
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
);

const RightSidebarSkeleton = () => (
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
                <div className="h-3 bg-gray-100 rounded w-16"></div>
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
);
