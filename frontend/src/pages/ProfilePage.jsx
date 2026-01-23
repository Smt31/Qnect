import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getAuthToken, userApi } from '../api';
import { useCurrentUser, useUserProfile, useUserStats, useFollowUser, useUnfollowUser, useUserFollowers, useUserFollowing } from '../api/queryHooks';
import Navbar from '../components/Home/Navbar';
import LeftSidebar from '../components/Home/LeftSidebar';
import MobileNav from '../components/Home/MobileNav';
import CompactFeedCard from '../components/Feed/CompactFeedCard';
import Skeleton from '../components/common/Skeleton';

export default function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const { data: me } = useCurrentUser();

  // Determine the profile user ID (if no id param, use current user)
  const profileUserId = id && id !== String(me?.userId) ? Number(id) : me?.userId;

  const { data: profileUser, isLoading: profileLoading, isError: profileError } = useUserProfile(profileUserId);
  const { data: stats } = useUserStats(profileUserId);

  const [postType, setPostType] = useState('ALL');
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Reset state when profile changes to prevent stale data
  useEffect(() => {
    setPosts([]);
    setFollowers([]);
    setFollowing([]);
    setPendingRequests([]);
    setFollowedUsersMap({});
    setActiveTab('overview');
  }, [profileUserId]);

  // Fetch posts when profile or postType changes
  useEffect(() => {
    const fetchPosts = async () => {
      if (!profileUserId) return;
      setPostsLoading(true);
      try {
        let res;
        if (postType === 'ALL') {
          res = await userApi.getUserQuestions(profileUserId, 0, 30);
        } else {
          res = await userApi.getUserPostsByType(profileUserId, postType, 0, 30);
        }
        const data = res?.content || res || [];
        setPosts(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to fetch posts:', e);
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    };
    fetchPosts();
  }, [profileUserId, postType]);

  // Check if current user is following the profile user
  const isMe = useMemo(() => me && profileUser && me.userId === profileUser.userId, [me, profileUser]);

  const { data: isFollowingProfile = false } = useQuery({
    queryKey: ['follow-status', profileUserId],
    queryFn: () => userApi.getFollowStatus(profileUserId),
    enabled: !!profileUserId && !isMe,
    staleTime: 30 * 1000, // 30 seconds
  });

  const [activeTab, setActiveTab] = useState('overview');

  // State for tabs that are loaded on demand
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Topics Edit State
  const [topics, setTopics] = useState([]);
  const [isEditingTopics, setIsEditingTopics] = useState(false);
  const [newTopic, setNewTopic] = useState('');

  const [error, setError] = useState('');

  // Follow mutation
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();



  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to initialize topics when profile user data is loaded
  useEffect(() => {
    if (profileUser && profileUser.skills) {
      setTopics(profileUser.skills);
    }
  }, [profileUser]);

  // Dedicated effects to fetch tab specific data if needed,
  // but for now let's just fetch Followers/Following when tab changes to them if they are empty
  useEffect(() => {
    if (!profileUser) return;

    if (activeTab === 'followers' && followers.length === 0) {
      setFollowersLoading(true);
      userApi.getUserFollowers(profileUser.userId)
        .then(res => {
          const list = res || [];
          setFollowers(list);
          // Initialize local follow map from backend data
          const map = {};
          list.forEach(u => {
            if (u.isFollowing) map[u.userId] = true;
          });
          setFollowedUsersMap(prev => ({ ...prev, ...map }));
        })
        .catch(console.error)
        .finally(() => setFollowersLoading(false));
    }
    if (activeTab === 'following' && following.length === 0) {
      setFollowingLoading(true);
      userApi.getUserFollowing(profileUser.userId)
        .then(res => {
          const list = res || [];
          setFollowing(list);
          // Initialize local follow map from backend data
          const map = {};
          list.forEach(u => {
            if (u.isFollowing) map[u.userId] = true;
          });
          setFollowedUsersMap(prev => ({ ...prev, ...map }));
        })
        .catch(console.error)
        .finally(() => setFollowingLoading(false));
    }
    // Fetch pending requests only if it is ME and tab is 'requests'
    if (activeTab === 'requests' && isMe && pendingRequests.length === 0) {
      import('../api').then(({ requestApi }) => {
        requestApi.getMyPendingRequests()
          .then(res => setPendingRequests(res || []))
          .catch(console.error);
      });
    }
  }, [activeTab, profileUser, followers.length, following.length, isMe, pendingRequests.length]);


  // Actions
  const handleFollowProfile = async () => {
    if (!profileUser || !me) return;
    try {
      if (followMutation.status === 'idle' && unfollowMutation.status === 'idle') {
        if (isFollowingProfile) {
          await unfollowMutation.mutateAsync(profileUser.userId);
        } else {
          await followMutation.mutateAsync(profileUser.userId);
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleFollowUserInList = async (targetId, isCurrentlyFollowing, listType) => {
    // Toggle follow for a user in the Followers/Following list
    try {
      if (isCurrentlyFollowing) {
        await userApi.unfollowUser(targetId);
      } else {
        await userApi.followUser(targetId);
      }

      // Update local state to reflect change immediately
      // We need a way to track "am I following this user" for every user in the list.
      // The API for getUserFollowers returns User objects. Does it include 'isFollowing'?
      // Usually not. We might need a separate 'followedUsers' set like in HomePage.
      // For simplicity in this "manage" view, let's assume we can toggle locally.

      // However, we don't know the initial state for random users in the list easily without checking.
      // BUT, if I am looking at MY OWN following list, I am following all of them obviously.
      // If I am looking at MY OWN followers, I might or might not be following them.

      // FOR THIS ITERATION: Let's assume generic "Follow/Unfollow" toggle logic
      // and we track it via a local set of followed IDs if the list doesn't provide it.
      // Or, better, we just toggle and trigger a refresh? No, that flickers.

      // Let's simply update the specific list item if we can.
      // Since the backend might not return 'isBookmarked' or 'isFollowing' on list items,
      // we might just implement the button to toggle and stay in that state.

      // Actually, `activeTab === 'following'` on `me` profile => All are TRUE.
      // `activeTab === 'followers'` on `me` profile => Unknown.

      // Simplified Approach:
      // We'll maintain a `localFollowStatus` map for the list items that the user interacts with.
    } catch (e) { console.error(e); }
  };

  // We need a better way to handle "Follow/Following" button state in lists.
  // In `HomePage`, we mainted a `followedUsers` map. We should do the same here.
  const handleAddTopic = () => {
    if (!newTopic.trim()) return;
    if (topics.includes(newTopic.trim())) return;
    const updated = [...topics, newTopic.trim()];
    setTopics(updated);
    setNewTopic('');
  };

  const handleRemoveTopic = (topic) => {
    setTopics(topics.filter(t => t !== topic));
  };

  const handleSaveTopics = async () => {
    try {
      await userApi.updateTopics(topics);
      setIsEditingTopics(false);
    } catch (e) {
      console.error(e);
      alert('Failed to save topics');
    }
  };

  const [followedUsersMap, setFollowedUsersMap] = useState({});

  const toggleFollowMap = async (targetId) => {
    const isFollowing = followedUsersMap[targetId];

    // Optimistic UI update locally
    setFollowedUsersMap(prev => ({
      ...prev,
      [targetId]: !isFollowing
    }));

    try {
      if (isFollowing) {
        unfollowMutation.mutate(targetId);
      } else {
        followMutation.mutate(targetId);
      }
    } catch (e) {
      console.error(e);
      // Revert on error
      setFollowedUsersMap(prev => ({
        ...prev,
        [targetId]: isFollowing
      }));
    }
  };

  // When loading lists, we should ideally know who we follow.
  // Since we don't want to blast the API, we will just trust the button click for now,
  // OR assume 'Following' tab implies we follow them (if it's our profile).
  // For 'Followers', we default to 'Follow' unless we know otherwise.
  // This is a limitation of the current simple API.
  // Improvements: The backend DTO should return `followedByCurrentUser`.
  // For now, we will handle it gracefully: Button says "Follow" initially? Or check `following` list?

  // No longer need the hack to initialize map based on "Me" profile
  // useEffect(() => {
  //   if (activeTab === 'following' && profileUser?.userId === me?.userId && following.length > 0) {
  //     const map = {};
  //     following.forEach(u => map[u.userId] = true);
  //     setFollowedUsersMap(prev => ({ ...prev, ...map }));
  //   }
  // }, [activeTab, following, profileUser, me]);





  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#FFF1F2]">
        <Navbar user={me} />
        <div className="flex">
          <LeftSidebar user={me} onAskQuestion={() => navigate('/home')} />
          <main className="flex-1 md:ml-64 p-4 md:p-6 bg-[#FFF1F2] min-h-screen">
            <div className="max-w-6xl mx-auto space-y-6">
              <Skeleton height="200px" className="w-full rounded-xl" variant="rect" />
              <div className="flex gap-4">
                <Skeleton width="100px" height="100px" className="rounded-full -mt-12 ml-6 border-4 border-white" variant="circle" />
                <div className="space-y-2 mt-2">
                  <Skeleton width="200px" height="24px" />
                  <Skeleton width="100px" height="16px" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (profileError || error || !profileUser) {
    return (
      <div className="min-h-screen bg-[#FFF1F2]">
        <Navbar user={me} />
        <div className="flex justify-center p-10">
          <div className="bg-white p-8 rounded-lg shadow-sm text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h3>
            <button className="text-red-600 hover:underline" onClick={() => navigate('/home')}>Go Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF1F2]">
      <Navbar user={me} />

      <div className="flex">
        <LeftSidebar user={me} onAskQuestion={() => navigate('/home')} />

        <main className="flex-1 md:ml-64 p-4 md:p-6 bg-[#FFF1F2] min-h-screen">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

            {/* Left Column (Profile & Feed) */}
            <div className="lg:col-span-2 space-y-4">

              {/* Header Card with Integrated Tabs */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Cover */}
                <div className="h-28 bg-gradient-to-r from-rose-400 to-pink-500"></div>

                {/* Profile Info */}
                <div className="px-5 pb-4">
                  <div className="flex flex-col md:flex-row items-start md:items-end -mt-8 gap-3">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex-shrink-0">
                      {profileUser.avatarUrl ? (
                        <img src={profileUser.avatarUrl} alt={profileUser.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center text-2xl font-bold text-white">
                          {profileUser.fullName?.[0]}
                        </div>
                      )}
                    </div>

                    {/* Name & Actions */}
                    <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2">
                      <div>
                        <h1 className="text-xl font-bold text-gray-900">{profileUser.fullName}</h1>
                        <p className="text-gray-500 text-sm">@{profileUser.username}</p>
                      </div>
                      <div className="flex gap-2">
                        {isMe ? (
                          <button
                            className="px-4 py-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
                            onClick={() => navigate('/settings')}
                          >
                            Edit Profile
                          </button>
                        ) : (
                          <>
                            <button
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${isFollowingProfile
                                ? 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100'
                                : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-sm'
                                }`}
                              onClick={handleFollowProfile}
                            >
                              {isFollowingProfile ? 'Following' : 'Follow'}
                            </button>
                            {profileUser.allowPublicMessages && (
                              <button
                                className="px-4 py-2 text-sm bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
                                onClick={() => navigate('/chat')}
                              >
                                Message
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {profileUser.bio && (
                    <p className="text-gray-600 text-sm mt-3 max-w-xl">{profileUser.bio}</p>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center gap-5 mt-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-900">{stats?.questionsCount ?? 0}</span>
                      <span className="text-gray-500 ml-1">Posts</span>
                    </div>
                    <div className="cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setActiveTab('followers')}>
                      <span className="font-semibold text-gray-900">{stats?.followersCount ?? 0}</span>
                      <span className="text-gray-500 ml-1">Followers</span>
                    </div>
                    <div className="cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setActiveTab('following')}>
                      <span className="font-semibold text-gray-900">{stats?.followingCount ?? 0}</span>
                      <span className="text-gray-500 ml-1">Following</span>
                    </div>
                    <div className="ml-auto">
                      <span className="font-semibold text-gray-900">{stats?.reputation ?? 0}</span>
                      <span className="text-gray-500 ml-1">Rep</span>
                    </div>
                  </div>
                </div>

                {/* Tabs - Inside the card */}
                <div className="flex border-t border-gray-100 px-5">
                  {['overview', 'posts', 'followers', 'following'].concat(isMe ? ['requests'] : []).map((tab) => (
                    <button
                      key={tab}
                      className={`py-3 mr-6 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
                        ? 'border-rose-500 text-rose-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>


              {/* Content Area */}
              <div>
                {activeTab === 'overview' && (
                  <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                    <p className="text-gray-500">Overview stats and highlights coming soon.</p>
                    <button className="text-rose-500 font-medium mt-2 text-sm" onClick={() => setActiveTab('posts')}>View Posts</button>
                  </div>
                )}

                {activeTab === 'posts' && (
                  <div className="space-y-3">
                    {/* Post Type Tabs - Clean button design */}
                    <div className="flex gap-2">
                      {[{ label: 'All', value: 'ALL' }, { label: 'Questions', value: 'QUESTION' }, { label: 'Posts', value: 'POST' }].map(tab => (
                        <button
                          key={tab.value}
                          onClick={() => setPostType(tab.value)}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${postType === tab.value
                            ? 'bg-rose-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {postsLoading ? (
                      <div className="text-center py-10 text-gray-500 bg-white rounded-xl shadow-sm">
                        Loading...
                      </div>
                    ) : posts.length > 0 ? posts.map(q => (
                      <CompactFeedCard key={q.id} post={q} />
                    )) : (
                      <div className="text-center py-10 text-gray-500 bg-white rounded-xl shadow-sm">
                        No {postType === 'ALL' ? 'posts' : postType === 'QUESTION' ? 'questions' : 'posts'} yet.
                      </div>
                    )}
                  </div>
                )}

                {(activeTab === 'followers' || activeTab === 'following') && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {(activeTab === 'followers' ? followersLoading : followingLoading) ? (
                      <div className="p-4 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Skeleton width="40px" height="40px" variant="circle" />
                              <div className="space-y-1">
                                <Skeleton width="120px" height="16px" />
                                <Skeleton width="80px" height="12px" />
                              </div>
                            </div>
                            <Skeleton width="80px" height="32px" className="rounded-lg" />
                          </div>
                        ))}
                      </div>
                    ) : (activeTab === 'followers' ? followers : following).length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {(activeTab === 'followers' ? followers : following).map(u => (
                          <div
                            key={u.userId}
                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div
                              className="flex items-center gap-3 cursor-pointer"
                              onClick={() => navigate(`/profile/${u.userId}`)}
                            >
                              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                                {u.avatarUrl ? (
                                  <img
                                    src={u.avatarUrl}
                                    alt={u.fullName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                                    {u.fullName?.[0]}
                                  </div>
                                )}
                              </div>

                              <div>
                                <h4 className="font-semibold text-gray-900 text-sm">
                                  {u.fullName}
                                </h4>
                                <p className="text-xs text-gray-500">@{u.username}</p>
                              </div>
                            </div>

                            {me.userId !== u.userId && (
                              <>
                                {isMe ? (
                                  activeTab === 'followers' ? (
                                    <button
                                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-100 hover:text-red-600 transition-colors"
                                      onClick={async () => {
                                        if (!window.confirm("Remove this follower?")) return;
                                        try {
                                          await userApi.removeFollower(u.userId);
                                          setFollowers(prev =>
                                            prev.filter(f => f.userId !== u.userId)
                                          );
                                          // Invalidate stats to refetch updated counts
                                          queryClient.invalidateQueries({ queryKey: ['user-stats', profileUserId] });
                                        } catch (e) {
                                          console.error(e);
                                        }
                                      }}
                                    >
                                      Remove
                                    </button>
                                  ) : (
                                    <button
                                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-100 hover:text-red-600 transition-colors"
                                      onClick={async () => {
                                        try {
                                          await userApi.unfollowUser(u.userId);
                                          setFollowing(prev =>
                                            prev.filter(f => f.userId !== u.userId)
                                          );
                                          // Invalidate stats to refetch updated counts
                                          queryClient.invalidateQueries({ queryKey: ['user-stats', profileUserId] });
                                        } catch (e) {
                                          console.error(e);
                                        }
                                      }}
                                    >
                                      Unfollow
                                    </button>
                                  )
                                ) : (
                                  <button
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${followedUsersMap[u.userId]
                                      ? 'border-gray-300 text-gray-600 bg-white hover:bg-gray-50'
                                      : 'border-red-500 text-white bg-red-500 hover:bg-red-600'
                                      }`}
                                    onClick={() => toggleFollowMap(u.userId)}
                                  >
                                    {followedUsersMap[u.userId] ? 'Following' : 'Follow'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        {activeTab === 'followers'
                          ? 'No followers yet.'
                          : 'Not following anyone yet.'}
                      </div>
                    )}
                  </div>
                )}


                {activeTab === 'requests' && isMe && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {pendingRequests.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {pendingRequests.map(req => (
                          <div key={req.id} className="p-4 hover:bg-gray-50 flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                              {req.requesterAvatar ? <img src={req.requesterAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-500">{req.requesterName?.[0]}</div>}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">
                                <span className="font-semibold">{req.requesterName}</span> requested you to answer:
                              </p>
                              <span onClick={() => navigate(`/question/${req.questionId}`)} className="text-base font-medium text-red-600 hover:underline block mt-1 leading-snug cursor-pointer">
                                {req.questionTitle}
                              </span>
                              <p className="text-xs text-gray-400 mt-2">{new Date(req.createdAt).toLocaleDateString()}</p>
                            </div>
                            <button
                              onClick={() => navigate(`/question/${req.questionId}`)}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Answer
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        No pending answer requests.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div> {/* Close Left Column */}

            {/* Right Column (Sidebar) */}
            <div className="hidden lg:block space-y-6">

              {/* Topics / Expertise Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Expertise / Interests</h3>
                  {isMe && !isEditingTopics && (
                    <button onClick={() => setIsEditingTopics(true)} className="text-xs text-rose-500 font-medium hover:text-rose-600 transition-colors">Edit</button>
                  )}
                </div>

                {isEditingTopics ? (
                  <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {topics.map(t => (
                        <span key={t} className="bg-white border border-rose-200 text-gray-700 px-3 py-1.5 rounded-full text-xs flex items-center gap-1 shadow-sm">
                          {t}
                          <button onClick={() => handleRemoveTopic(t)} className="text-gray-400 hover:text-rose-500 font-bold ml-1 transition-colors">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                        placeholder="Add topic..."
                        className="flex-1 text-sm border-rose-200 rounded-lg focus:ring-rose-500 focus:border-rose-500"
                      />
                      <button onClick={handleAddTopic} className="px-4 py-2 bg-white border border-rose-200 text-gray-700 rounded-lg text-sm hover:bg-rose-50 transition-colors">Add</button>
                    </div>
                    <div className="mt-4 flex gap-2 justify-end">
                      <button onClick={() => { setIsEditingTopics(false); setTopics(profileUser.skills || []); }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                      <button onClick={handleSaveTopics} className="px-4 py-1.5 text-xs bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg hover:shadow-md transition-all">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {topics.length > 0 ? topics.map(t => (
                      <span key={t} className="bg-gradient-to-r from-rose-50 to-rose-100 text-rose-600 px-3 py-1.5 rounded-full text-xs font-medium cursor-default border border-rose-200">
                        #{t}
                      </span>
                    )) : (
                      <div className="text-center py-6 w-full">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-rose-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                          </svg>
                        </div>
                        <span className="text-gray-400 text-sm">No topics added yet.</span>
                        {isMe && <button onClick={() => setIsEditingTopics(true)} className="block mx-auto mt-2 text-rose-500 text-xs font-medium hover:text-rose-600 transition-colors">Add Topics</button>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stats Card (Optional, maybe move detailed stats here?) */}
              {/* Fore now just the topics as requested */}

            </div>
          </div>
        </main>
      </div >
      <MobileNav onAskQuestion={() => navigate('/home')} />
    </div >
  );
}