import { useNavigate } from 'react-router-dom';
import FeedImage from '../FeedImage';

export default function FeedCard({ post, currentUserId, onVote, onDelete, hideDelete = false, topRightElement = null }) {
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-xl hover:border-red-100 transition-all">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-center bg-no-repeat bg-cover rounded-full w-10 h-10 flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-500 text-white font-semibold shadow-sm">
                        {post.author?.avatarUrl ? (
                            <img
                                src={post.author.avatarUrl}
                                alt={post.author?.fullName || post.author?.username}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            <span>{post.author?.fullName?.charAt(0) || post.author?.username?.charAt(0) || 'U'}</span>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span
                            className="text-sm font-semibold text-gray-900 hover:text-red-500 transition-colors cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.author?.userId}`); }}
                        >
                            {post.author?.fullName || post.author?.username || 'User'}
                        </span>
                        <span className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {topRightElement}
                    {!hideDelete && currentUserId === post.author?.id && (
                        <button
                            className="text-gray-400 hover:text-red-500 transition-colors p-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(post.id);
                            }}
                            title="Delete Post"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-3">
                <h4
                    className="text-lg font-semibold text-gray-900 mb-2 hover:text-red-600 transition-colors cursor-pointer"
                    onClick={() => navigate(`/question/${post.id}`)}
                >
                    {post.title}
                </h4>

                {post.imageUrl && (
                    <FeedImage src={post.imageUrl} alt={post.title} />
                )}

                {post.content && (
                    <p className="text-gray-600 text-sm line-clamp-2">{post.content}</p>
                )}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
                {post.tags && post.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-medium">
                        {tag}
                    </span>
                ))}
            </div>

            <div className="flex items-center gap-5 pt-3 border-t border-gray-100">
                <button
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.currentUserVoteStatus === 'UPVOTE' ? 'text-red-600' : 'text-gray-500 hover:text-red-600'}`}
                    onClick={() => onVote(post.id, 'UPVOTE')}
                    title="Upvote"
                >
                    <svg width="20" height="20" fill={post.currentUserVoteStatus === 'UPVOTE' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    <span>{post.upvotes || 0}</span>
                </button>

                <button
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.currentUserVoteStatus === 'DOWNVOTE' ? 'text-red-600' : 'text-gray-500 hover:text-red-600'}`}
                    onClick={() => onVote(post.id, 'DOWNVOTE')}
                    title="Downvote"
                >
                    <svg width="20" height="20" fill={post.currentUserVoteStatus === 'DOWNVOTE' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                    </svg>
                    <span>{post.downvotes || 0}</span>
                </button>
                <button
                    className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 text-sm font-medium transition-colors"
                    onClick={() => navigate(`/question/${post.id}`)}
                >
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{post.commentsCount || 0} Answers</span>
                </button>
                <div className="flex items-center gap-1.5 ml-auto">
                    <button
                        className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 text-sm font-medium transition-colors"
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/question/${post.id}`)}
                    >
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span className="hidden sm:inline">Share</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
