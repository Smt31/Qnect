import { useParams, useNavigate } from 'react-router-dom';
import { useTopic, useTopicQuestions, useCurrentUser, useFollowTopic, useUnfollowTopic } from '../api/queryHooks';
import Navbar from '../components/Home/Navbar';
import LeftSidebar from '../components/Home/LeftSidebar';
import MobileNav from '../components/Home/MobileNav';
import CompactFeedCard from '../components/Feed/CompactFeedCard';
import Skeleton from '../components/common/Skeleton';

export default function TopicPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: me } = useCurrentUser();

    // Fetch topic details
    const { data: topic, isLoading: topicLoading, isError: topicError } = useTopic(id);

    // Fetch questions for this topic
    const { data: questions, isLoading: questionsLoading } = useTopicQuestions(id);

    const followMutation = useFollowTopic();
    const unfollowMutation = useUnfollowTopic();

    // Check if current user follows this topic
    // Note: simpler check compatible with existing user object structure
    const isFollowed = me?.topics?.some(t => t.id === Number(id)) ||
        (topic?.name && me?.skills?.includes(topic.name));

    const handleToggleFollow = () => {
        if (isFollowed) {
            unfollowMutation.mutate(id);
        } else {
            followMutation.mutate(id);
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
                                        <span>{topic.followersCount || 0} followers</span>
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
                            <h2 className="text-lg font-bold text-gray-900 mb-4 px-1">Top Questions in #{topic.name}</h2>

                            {questionsLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <Skeleton key={i} height="200px" className="w-full rounded-xl" />)}
                                </div>
                            ) : questions?.content && questions.content.length > 0 ? (
                                <div className="space-y-4">
                                    {questions.content.map(q => (
                                        <CompactFeedCard key={q.id} post={q} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-500">
                                    <p>No questions found for this topic yet.</p>
                                    <p className="text-sm mt-2">Be the first to ask about #{topic.name}!</p>
                                </div>
                            )}
                        </div>

                    </div>
                </main>
            </div>
            <MobileNav />
        </div>
    );
}
