import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { newsApi } from '../api';
import { useCurrentUser } from '../api/queryHooks';
import Navbar from '../components/Home/Navbar';
import LeftSidebar from '../components/Home/LeftSidebar';
import MobileNav from '../components/Home/MobileNav';
import NewsCard from '../components/News/NewsCard';
import NewsDiscussionModal from '../components/News/NewsDiscussionModal';

export default function NewsPage() {
    const navigate = useNavigate();
    const { data: user } = useCurrentUser();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [categories] = useState([
        { id: null, name: 'All', icon: '🌐' },
        { id: 'technology', name: 'Technology', icon: '💻' },
        { id: 'business', name: 'Business', icon: '📈' },
        { id: 'science', name: 'Science', icon: '🔬' },
        { id: 'health', name: 'Health', icon: '🏥' },
        { id: 'sports', name: 'Sports', icon: '⚽' },
        { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
    ]);

    const [discussionArticle, setDiscussionArticle] = useState(null);

    useEffect(() => {
        fetchNews();
    }, [selectedCategory]);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const data = await newsApi.getNews(selectedCategory);
            setNews(data);
        } catch (error) {
            console.error('Failed to fetch news:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDiscussion = (article) => {
        setDiscussionArticle(article);
    };

    const handleCloseDiscussion = () => {
        setDiscussionArticle(null);
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#FFF1F2' }}>
            <Navbar user={user} />

            <div className="flex">
                <LeftSidebar user={user} onAskQuestion={() => navigate('/home')} />

                <main className="flex-1 md:ml-64 p-6">
                    {/* Header */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Live News</h1>
                                <p className="text-sm text-gray-500">Stay informed and discuss the latest news</p>
                            </div>
                        </div>

                        {/* Category Tabs */}
                        <div className="flex flex-wrap gap-2">
                            {categories.map(category => (
                                <button
                                    key={category.id || 'all'}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === category.id
                                            ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    <span className="mr-1.5">{category.icon}</span>
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* News Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                                    <div className="h-48 bg-gray-200" />
                                    <div className="p-4">
                                        <div className="flex gap-2 mb-2">
                                            <div className="w-16 h-5 bg-gray-200 rounded-full" />
                                            <div className="w-20 h-5 bg-gray-200 rounded" />
                                        </div>
                                        <div className="h-5 bg-gray-200 rounded w-full mb-2" />
                                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                                        <div className="h-4 bg-gray-100 rounded w-full mb-1" />
                                        <div className="h-4 bg-gray-100 rounded w-2/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : news.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                            </svg>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No News Available</h3>
                            <p className="text-gray-500">
                                {selectedCategory
                                    ? `No news found for ${selectedCategory}. Try another category.`
                                    : 'Unable to load news. Please check your NewsAPI configuration.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {news.map((article, index) => (
                                <NewsCard
                                    key={article.id || index}
                                    article={article}
                                    onOpenDiscussion={handleOpenDiscussion}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            <MobileNav onAskQuestion={() => navigate('/home')} />

            {/* Discussion Modal */}
            <NewsDiscussionModal
                article={discussionArticle}
                isOpen={!!discussionArticle}
                onClose={handleCloseDiscussion}
            />
        </div>
    );
}
