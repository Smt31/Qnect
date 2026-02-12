import { useNavigate } from 'react-router-dom';
import { useCurrentUser, useVoteQuestion } from '../../api/queryHooks';
import FeedImage from '../FeedImage';

export default function CompactFeedCard({ post, onClick, actionElement, showStats = true }) {
    const navigate = useNavigate();
    const { data: currentUser } = useCurrentUser();
    const voteMutation = useVoteQuestion();

    const handleVote = (e, type) => {
        e.stopPropagation();
        if (!currentUser) return;
        voteMutation.mutate({ postId: post.id, voteType: type });
    };

    return (
        <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-xl hover:border-red-100 transition-all duration-300 cursor-pointer group relative overflow-hidden"
            onClick={onClick || (() => navigate(`/question/${post.id}`))}
        >
            {/* Header: Always visible, but adapts on hover */}
            <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex-1 min-w-0">
                    {/* Author Info - Visible on Hover only */}
                    <div className="flex items-center gap-2 mb-2 opacity-0 h-0 group-hover:opacity-100 group-hover:h-auto transition-all duration-300 transform -translate-y-2 group-hover:translate-y-0">
                        <div className="bg-gradient-to-br from-red-500 to-pink-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {post.author?.fullName?.charAt(0) || 'U'}
                        </div>
                        <span className="text-xs font-medium text-gray-900">
                            {post.author?.username || 'User'}
                        </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1 group-hover:line-clamp-none mb-2">
                        {post.title}
                    </h3>

                    <div className="group-hover:hidden transition-opacity duration-200">
                        {showStats && (
                            <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                                {/* Upvotes */}
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                    </svg>
                                    {post.upvotes || 0}
                                </span>

                                {/* Comments */}
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    {post.commentsCount || 0}
                                </span>

                                {/* Views with Eye Icon */}
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    {post.viewsCount || 0}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* EXPANDABLE SECTION */}
            <div className="max-h-0 opacity-0 group-hover:max-h-[500px] group-hover:opacity-100 transition-all duration-500 ease-in-out bg-white">
                <div className="pt-2 pb-1 space-y-3">
                    {/* Content Preview */}
                    {post.content && (
                        <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                            {post.content}
                        </p>
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {post.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Actions Bar */}
                    <div className="flex items-center gap-6 pt-3 border-t border-gray-100 mt-2">
                        <button
                            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.currentUserVoteStatus === 'UPVOTE' ? 'text-red-600' : 'text-gray-500 hover:text-red-600'}`}
                            onClick={(e) => handleVote(e, 'UPVOTE')}
                        >
                            <svg width="18" height="18" fill={post.currentUserVoteStatus === 'UPVOTE' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            {post.upvotes || 0}
                        </button>

                        <button
                            className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 text-sm font-medium"
                            onClick={(e) => { e.stopPropagation(); navigate(`/question/${post.id}`); }}
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {post.commentsCount || 0}
                        </button>

                        <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {post.viewsCount || 0}
                        </div>

                        {/* Date with Clock Icon - Moved to right */}
                        <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium ml-auto">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
