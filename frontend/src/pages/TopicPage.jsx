// TopicPage.jsx (partial replacement)
import { useParams, useNavigate } from 'react-router-dom';
import { useTopic, useTopicPosts, useCurrentUser, useFollowTopic, useUnfollowTopic, useVoteQuestion, useDeleteQuestion, useBookmarkPost, useUnbookmarkPost } from '../api/queryHooks';
import Navbar from '../components/Home/Navbar';
import LeftSidebar from '../components/Home/LeftSidebar';
import MobileNav from '../components/Home/MobileNav';
import FeedCard from '../components/Feed/FeedCard';
import Skeleton from '../components/common/Skeleton';
import ShareModal from '../components/ShareModal';
import { useState } from 'react';

export default function TopicPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: me } = useCurrentUser();

    // Fetch topic details
    const { data: topic, isLoading: topicLoading, isError: topicError } = useTopic(id);

    // Fetch questions for this topic
    const { data: questions, isLoading: questionsLoading } = useTopicPosts(id);

    const followMutation = useFollowTopic();
    const unfollowMutation = useUnfollowTopic();
    const voteMutation = useVoteQuestion();
    const deleteQuestionMutation = useDeleteQuestion();
    const bookmarkMutation = useBookmarkPost();
    const unbookmarkMutation = useUnbookmarkPost();

    // Check if current user follows this topic
    const isFollowed = me?.topics?.some(t => t.id === Number(id)) ||
        (topic?.name && me?.skills?.includes(topic.name));

    // Share modal state
    const [showShareModal, setShowShareModal] = useState(false);
    const [sharePost, setSharePost] = useState(null);

    const handleToggleFollow = () => {
        if (isFollowed) {
            unfollowMutation.mutate(id);
        } else {
            followMutation.mutate(id);
        }
    };

    const handleVote = async (postId, type) => {
        try {
            await voteMutation.mutateAsync({ voteType: type, postId });
        } catch (e) {
            console.error('Vote failed:', e);
        }
    };

    const handleDeletePost = async (postId) => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            try {
                await deleteQuestionMutation.mutateAsync(postId);
            } catch (error) {
                console.error('Failed to delete post:', error);
                alert('Failed to delete post');
            }
        }
    };

    const handleShare = (post) => {
        setSharePost(post);
        setShowShareModal(true);
    };

    const handleBookmark = async (postId) => {
        const post = questions?.content?.find(p => p.id === postId);
        const wasBookmarked = post?.isBookmarked || false;

        try {
            if (wasBookmarked) {
                await unbookmarkMutation.mutateAsync(postId);
            } else {
                await bookmarkMutation.mutateAsync(postId);
            }
        } catch (e) {
            console.error('Bookmark toggle failed:', e);
        }
    };

    if (topicLoading) {
        return (
            <div className="min-h-screen bg-[#FFF1F2]">
                <Navbar user={me} />
                <div className="flex">
                    <LeftSidebar user={me} />
                    <main className="flex-1 md:ml-64 p-4 md:p-6 bg-[#FFF1F2] min-h-screen">
                        <div className="max-w-4xl mx-auto space-y-6">
                            <Skeleton height="150px" className="w-full rounded-xl" variant="rect" />
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <Skeleton key={i} height="200px" className="w-full rounded-xl" />)}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (topicError || !topic) {
        return (
            <div className="min-h-screen bg-[#FFF1F2]">
                <Navbar user={me} />
                <div className="flex justify-center p-10">
                    <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Topic Not Found</h3>
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
                <LeftSidebar user={me} />

                <main className="flex-1 md:ml-64 p-4 md:p-6 bg-[#FFF1F2] min-h-screen">
                    <div className="max-w-4xl mx-auto space-y-6">

                        {/* Topic Header Card */}
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-rose-100">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                        <span className="text-rose-500">#</span>{topic.name}
                                    </h1>
                                    {topic.description && (
                                        <p className="text-gray-600 mt-2">{topic.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                        <span>{topic.postCount || 0} posts</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleToggleFollow}
                                        disabled={followMutation.isLoading || unfollowMutation.isLoading}
                                        className={`px-6 py-2 rounded-full font-medium transition-all ${isFollowed
                                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                            : 'bg-rose-500 text-white hover:bg-rose-600 shadow-md hover:shadow-lg'
                                            }`}
                                    >
                                        {isFollowed ? 'Following' : 'Follow Topic'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Questions Feed */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 mb-4 px-1">Top Posts in #{topic.name}</h2>

                            {questionsLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <Skeleton key={i} height="200px" className="w-full rounded-xl" />)}
                                </div>
                            ) : questions?.content && questions.content.length > 0 ? (
                                <div className="space-y-4">
                                    {questions.content.map(q => (
                                        <FeedCard
                                            key={q.id}
                                            post={q}
                                            currentUserId={me?.userId}
                                            onVote={handleVote}
                                            onDelete={handleDeletePost}
                                            onShare={handleShare}
                                            topRightElement={
                                                <button
                                                    className={`flex flex-col items-center justify-center w-10 h-10 rounded-full border transition-all ${q.isBookmarked
                                                        ? 'bg-yellow-50 text-yellow-500 border-yellow-200'
                                                        : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleBookmark(q.id);
                                                    }}
                                                    title={q.isBookmarked ? "Remove Bookmark" : "Bookmark"}
                                                >
                                                    <svg className="w-5 h-5" fill={q.isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                    </svg>
                                                </button>
                                            }
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-500">
                                    <p>No posts found for this topic yet.</p>
                                    <p className="text-sm mt-2">Be the first to post about #{topic.name}!</p>
                                </div>
                            )}
                        </div>

                    </div>
                </main>
            </div>

            <MobileNav />

            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                post={sharePost}
            />
        </div>
    );
}
