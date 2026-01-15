import { useState, useEffect } from 'react';
import { newsApi, voteApi } from '../../api';

export default function NewsDiscussionModal({ article, isOpen, onClose }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && article) {
            fetchComments();
        }
    }, [isOpen, article]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const data = await newsApi.getComments(article.url);
            setComments(data);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || submitting) return;

        setSubmitting(true);
        try {
            const result = await newsApi.addComment(
                article.url,
                article.title,
                article.imageUrl,
                newComment.trim()
            );

            // Add the new comment to the list
            setComments(prev => [{
                id: result.commentId,
                content: result.content,
                author: result.author,
                createdAt: result.createdAt,
                upvotes: 0,
                downvotes: 0,
                isAuthor: true
            }, ...prev]);

            setNewComment('');
        } catch (error) {
            console.error('Failed to add comment:', error);
            alert('Failed to add comment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVote = async (commentId, voteType) => {
        try {
            // Find the answer ID - comments on news are stored as answers
            await voteApi.voteAnswer(commentId, voteType);

            // Update local state
            setComments(prev => prev.map(c => {
                if (c.id === commentId) {
                    if (voteType === 'UP') {
                        return { ...c, upvotes: c.upvotes + 1 };
                    } else {
                        return { ...c, downvotes: c.downvotes + 1 };
                    }
                }
                return c;
            }));
        } catch (error) {
            console.error('Failed to vote:', error);
        }
    };

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

    if (!isOpen || !article) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-start justify-between">
                    <div className="flex-1 pr-4">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">
                            {article.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {article.sourceName} • {formatDate(article.publishedAt)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Article Preview */}
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex gap-4">
                        {article.imageUrl && (
                            <img
                                src={article.imageUrl}
                                alt=""
                                className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-600 line-clamp-3">
                                {article.description}
                            </p>
                            <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#FF6B6B] hover:underline mt-2 inline-flex items-center gap-1"
                            >
                                Read full article
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Comment Form */}
                <form onSubmit={handleSubmitComment} className="p-4 border-b border-gray-100">
                    <div className="flex gap-3">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Share your thoughts on this news..."
                            className="flex-1 resize-none border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20 focus:border-[#FF6B6B]"
                            rows={2}
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || submitting}
                            className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium rounded-lg hover:from-red-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all self-end"
                        >
                            {submitting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <h4 className="font-semibold text-gray-900 mb-4">
                        Discussion ({comments.length})
                    </h4>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#FF6B6B] rounded-full animate-spin" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p>No comments yet. Be the first to share your thoughts!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {comments.map(comment => (
                                <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                                    {/* Comment Author */}
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                                            {comment.author?.avatarUrl ? (
                                                <img
                                                    src={comment.author.avatarUrl}
                                                    alt=""
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                comment.author?.fullName?.charAt(0) || 'U'
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {comment.author?.fullName || comment.author?.username || 'User'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatDate(comment.createdAt)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Comment Content */}
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                                        {comment.content}
                                    </p>

                                    {/* Vote Buttons */}
                                    <div className="flex items-center gap-4 text-sm">
                                        <button
                                            onClick={() => handleVote(comment.id, 'UP')}
                                            className="flex items-center gap-1 text-gray-500 hover:text-green-600 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                            </svg>
                                            <span>{comment.upvotes}</span>
                                        </button>
                                        <button
                                            onClick={() => handleVote(comment.id, 'DOWN')}
                                            className="flex items-center gap-1 text-gray-500 hover:text-red-600 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                            <span>{comment.downvotes}</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
