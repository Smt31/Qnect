import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { voteApi, commentApi, userApi } from '../../api';

// Helper to flatten nested replies into a single list
const flattenReplies = (replies) => {
    if (!replies || replies.length === 0) return [];
    let acc = [];
    replies.forEach(reply => {
        acc.push(reply);
        if (reply.replies) {
            acc = acc.concat(flattenReplies(reply.replies));
        }
    });
    // Sort flattened replies by date (Oldest first for readability, or Newest?)
    // Usually linear threads are easier if chronological.
    // Backend returns newest first. Let's reverse them for chronological flow if desired, 
    // or keep generic. User asked for "sequence".
    // Let's keep backend order to avoid confusion.
    return acc;
};

export default function CommentItem({ comment, postId, refreshComments, me, depth = 0, postAuthorId }) {
    const [voteStatus, setVoteStatus] = useState('NONE');
    const [upvotes, setUpvotes] = useState(comment.upvotes || 0);
    const [downvotes, setDownvotes] = useState(comment.downvotes || 0);

    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // @mention autocomplete
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionSuggestions, setMentionSuggestions] = useState([]);
    const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Determine children: If root, flatten all descendants. If not root, ignore nested (handled by root).
    const isRoot = depth === 0;
    const flatChildren = isRoot ? flattenReplies(comment.replies) : [];

    useEffect(() => {
        if (me) {
            voteApi.getCommentVoteStatus(comment.id)
                .then(status => setVoteStatus(status || 'NONE'))
                .catch(err => console.error(err));
        }
    }, [comment.id, me]);

    // Search for users when mentionQuery changes
    useEffect(() => {
        if (mentionQuery.length > 0) {
            userApi.searchUsers(mentionQuery, 0, 5)
                .then(response => {
                    const users = response.content || [];
                    setMentionSuggestions(users);
                    setSelectedSuggestionIndex(0);
                })
                .catch(err => {
                    console.error('Failed to search users:', err);
                    setMentionSuggestions([]);
                });
        } else {
            setMentionSuggestions([]);
        }
    }, [mentionQuery]);

    const handleVote = async (type) => {
        if (!me) return;

        const previousStatus = voteStatus;
        const previousCounts = { upvotes, downvotes };

        let nextStatus = type;
        let nextUp = upvotes;
        let nextDown = downvotes;

        const isUpvote = type === 'UPVOTE';

        if (voteStatus === type) {
            nextStatus = 'NONE';
            if (isUpvote) nextUp--; else nextDown--;
        } else if (voteStatus === 'NONE') {
            if (isUpvote) nextUp++; else nextDown++;
        } else {
            if (isUpvote) { nextUp++; nextDown--; } else { nextDown++; nextUp--; }
        }

        setVoteStatus(nextStatus);
        setUpvotes(nextUp);
        setDownvotes(nextDown);

        try {
            await voteApi.voteComment(comment.id, type);
        } catch (err) {
            console.error(err);
            setVoteStatus(previousStatus);
            setUpvotes(previousCounts.upvotes);
            setDownvotes(previousCounts.downvotes);
        }
    };

    const handleReplyClick = () => {
        setIsReplying(!isReplying);
        if (!isReplying) {
            // Fixed: Use actual username from comment.author
            const username = comment.author?.username;
            if (username) {
                setReplyContent(`@${username} `);
            }
        }
    };

    const handleReplyContentChange = (e) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;

        setReplyContent(value);
        setMentionCursorPosition(cursorPos);

        // Check if we're typing an @mention
        const beforeCursor = value.substring(0, cursorPos);
        const lastAtIndex = beforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const afterAt = beforeCursor.substring(lastAtIndex + 1);
            // Check if there's a space after @ (which would end the mention)
            if (!afterAt.includes(' ')) {
                setMentionQuery(afterAt);
                setShowMentionDropdown(true);
            } else {
                setShowMentionDropdown(false);
                setMentionQuery('');
            }
        } else {
            setShowMentionDropdown(false);
            setMentionQuery('');
        }
    };

    const handleMentionSelect = (user) => {
        const beforeCursor = replyContent.substring(0, mentionCursorPosition);
        const afterCursor = replyContent.substring(mentionCursorPosition);
        const lastAtIndex = beforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const newContent =
                replyContent.substring(0, lastAtIndex) +
                `@${user.username} ` +
                afterCursor;

            setReplyContent(newContent);
            setShowMentionDropdown(false);
            setMentionQuery('');

            // Focus back on input
            setTimeout(() => {
                if (inputRef.current) {
                    const newCursorPos = lastAtIndex + user.username.length + 2; // +2 for @ and space
                    inputRef.current.focus();
                    inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 0);
        }
    };

    const handleKeyDown = (e) => {
        if (showMentionDropdown && mentionSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev =>
                    prev < mentionSuggestions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev =>
                    prev > 0 ? prev - 1 : mentionSuggestions.length - 1
                );
            } else if (e.key === 'Enter' && mentionSuggestions[selectedSuggestionIndex]) {
                e.preventDefault();
                handleMentionSelect(mentionSuggestions[selectedSuggestionIndex]);
            } else if (e.key === 'Escape') {
                setShowMentionDropdown(false);
                setMentionQuery('');
            }
        }
    };

    const handleSubmitReply = async (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        try {
            setSubmitting(true);
            await commentApi.createComment(postId, {
                content: replyContent.trim(),
                parentId: comment.id
            });
            setIsReplying(false);
            setReplyContent('');
            setShowMentionDropdown(false);
            setMentionQuery('');
            refreshComments();
        } catch (err) {
            console.error(err);
            alert('Failed to reply');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;
        try {
            await commentApi.deleteComment(comment.id);
            refreshComments();
        } catch (err) {
            console.error(err);
            alert('Failed to delete comment');
        }
    };

    const renderContent = (text) => {
        if (!text) return null;
        // Split by @username pattern
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const username = part.substring(1);
                return (
                    <Link
                        key={i}
                        to={`/profile/${username}`}
                        className="text-blue-600 font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </Link>
                );
            }
            return part;
        });
    };

    const score = upvotes - downvotes;

    // AI comment styling
    const isAiComment = comment.isAiGenerated;

    // Styling: Root comments have borders/spacing. Replies are simpler.
    // Replies (depth > 0) get standard left indent.
    // AI comments get special gradient styling
    const baseClasses = depth === 0
        ? 'border-b border-gray-100 py-4'
        : 'ml-8 mt-3 pl-3 border-l-2 border-gray-100';

    const aiClasses = isAiComment && depth === 0
        ? 'relative bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-transparent bg-clip-padding shadow-sm before:absolute before:inset-0 before:-z-10 before:rounded-xl before:p-[2px] before:bg-gradient-to-r before:from-purple-400 before:via-blue-400 before:to-indigo-400'
        : '';

    return (
        <div className={`text-sm ${baseClasses} ${aiClasses}`}>
            <div className="flex gap-3">
                <Link to={`/profile/${comment.author?.userId}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0 ${isAiComment
                        ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                        : comment.author?.userId === me?.userId
                            ? 'bg-indigo-500'
                            : 'bg-gray-400'
                        }`}>
                        {isAiComment ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        ) : comment.author?.avatarUrl ? (
                            <img src={comment.author.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            comment.author?.fullName?.[0] || 'U'
                        )}
                    </div>
                </Link>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Link to={`/profile/${comment.author?.userId}`} className="font-semibold text-gray-900 hover:text-red-500">
                            {comment.author?.fullName || 'User'}
                        </Link>

                        {/* Cue Badge */}
                        {isAiComment && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-semibold shadow-sm">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Cue
                            </span>
                        )}

                        {/* Pinned indicator for AI comments */}
                        {isAiComment && depth === 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                Pinned
                            </span>
                        )}

                        <span className="text-gray-400 text-xs">
                            • {new Date(comment.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                    </div>

                    <div className="text-gray-800 break-words mb-2 leading-relaxed">
                        {renderContent(comment.content)}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleVote('UPVOTE')}
                                className={`flex items-center gap-1 hover:text-red-500 transition-colors ${voteStatus === 'UPVOTE' ? 'text-red-600' : 'text-gray-500'}`}
                                title="Upvote"
                            >
                                <svg className="w-4 h-4" fill={voteStatus === 'UPVOTE' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                <span className="text-xs font-semibold">{upvotes}</span>
                            </button>

                            <button
                                onClick={() => handleVote('DOWNVOTE')}
                                className={`flex items-center gap-1 hover:text-red-500 transition-colors ${voteStatus === 'DOWNVOTE' ? 'text-red-600' : 'text-gray-500'}`}
                                title="Downvote"
                            >
                                <svg className="w-4 h-4" fill={voteStatus === 'DOWNVOTE' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v9a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2" />
                                </svg>
                                <span className="text-xs font-semibold">{downvotes}</span>
                            </button>
                        </div>

                        <button
                            onClick={handleReplyClick}
                            className="font-medium hover:text-red-500 transition-colors"
                        >
                            Reply
                        </button>

                        {(me?.userId === (comment.author?.id || comment.author?.userId) || me?.userId === postAuthorId) && (
                            <button
                                onClick={handleDelete}
                                className="font-medium text-gray-400 hover:text-red-600 transition-colors"
                            >
                                Delete
                            </button>
                        )}
                    </div>

                    {isReplying && (
                        <div className="mt-3 relative">
                            <form onSubmit={handleSubmitReply} className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 transition-all"
                                    placeholder={`Reply to ${comment.author?.fullName}...`}
                                    value={replyContent}
                                    onChange={handleReplyContentChange}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="text-white bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 font-medium transition-colors"
                                    disabled={submitting}
                                >
                                    Send
                                </button>
                            </form>

                            {/* Mention Suggestions Dropdown */}
                            {showMentionDropdown && mentionSuggestions.length > 0 && (
                                <div
                                    ref={dropdownRef}
                                    className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                                    style={{ top: '100%', left: 0 }}
                                >
                                    {mentionSuggestions.map((user, index) => (
                                        <div
                                            key={user.userId}
                                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${index === selectedSuggestionIndex
                                                ? 'bg-red-50'
                                                : 'hover:bg-gray-50'
                                                }`}
                                            onClick={() => handleMentionSelect(user)}
                                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                                        >
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0 bg-gray-400">
                                                {user.avatarUrl ? (
                                                    <img
                                                        src={user.avatarUrl}
                                                        alt=""
                                                        className="w-full h-full rounded-full object-cover"
                                                    />
                                                ) : (
                                                    user.fullName?.[0] || 'U'
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm text-gray-900 truncate">
                                                    {user.fullName}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">
                                                    @{user.username}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Render Flattened Children (Only if Root) */}
            {isRoot && flatChildren.length > 0 && (
                <div className="mt-1">
                    {flatChildren.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            postId={postId}
                            refreshComments={refreshComments}
                            me={me}
                            depth={depth + 1}
                            postAuthorId={postAuthorId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
