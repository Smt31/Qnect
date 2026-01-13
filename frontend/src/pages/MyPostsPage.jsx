import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken, userApi, questionApi } from '../api';
import Navbar from '../components/Home/Navbar';
import LeftSidebar from '../components/Home/LeftSidebar';
import MobileNav from '../components/Home/MobileNav';
import CompactFeedCard from '../components/Feed/CompactFeedCard';

export default function MyPostsPage() {
    const navigate = useNavigate();
    const [me, setMe] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            navigate('/login', { replace: true });
            return;
        }

        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const load = async () => {
        try {
            setLoading(true);
            setError('');
            const meRes = await userApi.getCurrentUser();
            setMe(meRes);

            // Get posts filtered by type POST
            const res = await userApi.getUserPostsByType(meRes.userId, 'POST', 0, 30);
            const items = Array.isArray(res) ? res : (res.content || []);
            setPosts(items);
        } catch (e) {
            setError(e?.message || 'Failed to load your posts');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Delete this post?')) return;
        try {
            await questionApi.deleteQuestion(postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
        } catch (e) {
            console.error(e);
            alert('Failed to delete post');
        }
    };

    return (
        <div className="min-h-screen bg-[#FFF1F2]">
            <Navbar user={me} />

            <div className="flex">
                <LeftSidebar user={me} onAskQuestion={() => navigate('/home')} />

                <main className="flex-1 md:ml-64 p-6 max-w-5xl">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
                        <h1 className="text-xl font-bold text-gray-900">My Posts</h1>
                        <p className="text-sm text-gray-500 mt-1">Posts you've shared (not questions)</p>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-gray-500">Loading...</div>
                    ) : error ? (
                        <div className="bg-white p-6 rounded-lg border border-red-200 text-center">
                            <div className="text-red-600 mb-2">{error}</div>
                            <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200" onClick={load}>Retry</button>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">No posts yet</h3>
                            <p className="text-gray-500 mb-4">You haven't created any posts (non-question content).</p>
                            <button
                                className="px-6 py-2 bg-[#FF6B6B] hover:bg-[#FF5252] text-white font-medium rounded-lg"
                                onClick={() => navigate('/home')}
                            >
                                Create Post
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {posts.map((p) => (
                                <CompactFeedCard
                                    key={p.id}
                                    post={p}
                                    actionElement={
                                        <button
                                            className="text-gray-400 hover:text-red-500 transition-colors p-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeletePost(p.id);
                                            }}
                                            title="Delete Post"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            <MobileNav onAskQuestion={() => navigate('/home')} />
        </div>
    );
}
