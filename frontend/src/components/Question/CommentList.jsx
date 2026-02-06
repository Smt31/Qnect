import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { commentApi } from '../../api';
import CommentItem from './CommentItem';

const CommentList = forwardRef(function CommentList({ postId, me, postAuthorId }, ref) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchComments = async () => {
        try {
            // Assuming getCommentsForPost returns top-level comments with nested replies
            const res = await commentApi.getCommentsForPost(postId);
            let items = Array.isArray(res) ? res : (res.content || []);

            // Sort comments: AI-generated first, then by date (newest first)
            items = items.sort((a, b) => {
                // AI comments always come first
                if (a.isAiGenerated && !b.isAiGenerated) return -1;
                if (!a.isAiGenerated && b.isAiGenerated) return 1;
                // Otherwise sort by date (newest first)
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            setComments(items);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Expose refreshComments to parent via ref
    useImperativeHandle(ref, () => ({
        refreshComments: fetchComments
    }));

    useEffect(() => {
        fetchComments();
    }, [postId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            setSubmitting(true);
            await commentApi.createComment(postId, { content: newComment.trim() });
            setNewComment('');
            fetchComments();
        } catch (err) {
            console.error(err);
            alert('Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-gray-400 text-sm">Loading comments...</div>;

    return (
        <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Comments</h3>

            {/* Add Comment Form - at top for easy access */}
            <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
                <input
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 transition-colors"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                />
                <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                    Add Comment
                </button>
            </form>

            {comments.length > 0 ? (
                <div className="space-y-2">
                    {comments.map(comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            postId={postId}
                            refreshComments={fetchComments}
                            me={me}
                            postAuthorId={postAuthorId}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
            )}
        </div>
    );
});

export default CommentList;
