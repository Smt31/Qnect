import { useState } from 'react';
import { newsApi, voteApi } from '../../api';

export default function NewsCard({ article, onOpenDiscussion }) {
    const [showContext, setShowContext] = useState(false);
    const [context, setContext] = useState(null);
    const [loadingContext, setLoadingContext] = useState(false);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const handleGetContext = async (e) => {
        e.stopPropagation();

        if (context) {
            setShowContext(!showContext);
            return;
        }

        setLoadingContext(true);
        try {
            const result = await newsApi.getContext(
                article.title,
                article.description,
                article.content
            );
            setContext(result.context);
            setShowContext(true);
        } catch (error) {
            console.error('Failed to get AI context:', error);
            setContext('Unable to generate AI context. Please try again later.');
            setShowContext(true);
        } finally {
            setLoadingContext(false);
        }
    };

    const handleDiscuss = (e) => {
        e.stopPropagation();
        onOpenDiscussion(article);
    };

    const handleOpenArticle = () => {
        window.open(article.url, '_blank', 'noopener,noreferrer');
    };

    const categoryColors = {
        technology: 'bg-blue-500',
        business: 'bg-green-500',
        science: 'bg-purple-500',
        health: 'bg-red-500',
        sports: 'bg-orange-500',
        entertainment: 'bg-pink-500',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            {/* Image */}
            {article.imageUrl && (
                <div
                    className="h-48 bg-gray-100 cursor-pointer overflow-hidden"
                    onClick={handleOpenArticle}
                >
                    <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                </div>
            )}

            <div className="p-4">
                {/* Category & Source */}
                <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${categoryColors[article.category] || 'bg-gray-500'}`}>
                        {article.category?.charAt(0).toUpperCase() + article.category?.slice(1)}
                    </span>
                    <span className="text-xs text-gray-500">
                        {article.sourceName}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                        {formatDate(article.publishedAt)}
                    </span>
                </div>

                {/* Title */}
                <h3
                    className="font-semibold text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:text-[#FF6B6B] transition-colors"
                    onClick={handleOpenArticle}
                >
                    {article.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {article.description}
                </p>

                {/* AI Context Section */}
                {showContext && context && (
                    <div className="mb-3 p-3 bg-violet-50 rounded-lg border border-violet-100">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            <span className="text-xs font-semibold text-violet-700">AI Context</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{context}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <button
                        onClick={handleGetContext}
                        disabled={loadingContext}
                        className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors disabled:opacity-50"
                    >
                        {loadingContext ? (
                            <span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                        )}
                        {showContext ? 'Hide Context' : 'AI Context'}
                    </button>

                    <button
                        onClick={handleDiscuss}
                        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#FF6B6B] font-medium transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Discuss
                        {article.commentCount > 0 && (
                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                                {article.commentCount}
                            </span>
                        )}
                    </button>

                    <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Read
                    </a>
                </div>
            </div>
        </div>
    );
}
