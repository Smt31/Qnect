import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuthToken, userApi, questionApi, aiApi } from '../api';
import { useQuestion, useCurrentUser, useQuestionVoteCounts, useQuestionVoteStatus, useVoteQuestion, useBookmarkPost, useUnbookmarkPost, useBookmarkStatus } from '../api/queryHooks';
import Navbar from '../components/Home/Navbar';
import FeedImage from '../components/FeedImage';
import CommentList from '../components/Question/CommentList';
import RequestAnswerModal from '../components/RequestAnswerModal';
import ShareModal from '../components/ShareModal';

export default function QuestionPage() {
  const navigate = useNavigate();
  const params = useParams();
  const questionId = useMemo(() => Number(params.id), [params.id]);

  const { data: question, isLoading: questionLoading, isError: questionError, refetch } = useQuestion(questionId);
  const { data: me } = useCurrentUser();
  const { data: voteCounts, isLoading: votesLoading } = useQuestionVoteCounts(questionId);
  const { data: voteStatus = 'NONE', isLoading: voteStatusLoading } = useQuestionVoteStatus(questionId);
  const { data: bookmarked = false, isLoading: bookmarkLoading } = useBookmarkStatus(questionId);

  const [error, setError] = useState('');
  const [followingAuthor, setFollowingAuthor] = useState(false);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [hasAiAnswer, setHasAiAnswer] = useState(false);
  const commentListRef = useRef();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load follow status separately
  useEffect(() => {
    const loadFollowStatus = async () => {
      if (question?.author?.id && me?.userId && question.author.id !== me.userId) {
        try {
          const followStatus = await userApi.getFollowStatus(question.author.id);
          setFollowingAuthor(Boolean(followStatus));
        } catch (e) {
          console.error('Failed to fetch follow status', e);
          setFollowingAuthor(false);
        }
      }
    };
    if (question && me) {
      loadFollowStatus();
    }
  }, [question, me]);

  // Check if AI answer already exists
  useEffect(() => {
    const checkAiAnswer = async () => {
      if (questionId) {
        try {
          const result = await aiApi.hasAnswer(questionId);
          setHasAiAnswer(result.hasAiAnswer);
        } catch (e) {
          // Silently fail - assume no AI answer
          setHasAiAnswer(false);
        }
      }
    };
    checkAiAnswer();
  }, [questionId]);



  const voteMutation = useVoteQuestion();

  // Vote Handler - optimistic updates are handled by the hook
  const handleVote = async (type) => {
    try {
      await voteMutation.mutateAsync({ postId: questionId, voteType: type });
    } catch (e) {
      console.error('Vote failed', e);
    }
  };

  const bookmarkMutation = useBookmarkPost();
  const unbookmarkMutation = useUnbookmarkPost();

  const handleBookmarkToggle = async () => {
    // Capture current bookmark status BEFORE optimistic update
    const wasBookmarked = bookmarked;

    try {
      if (wasBookmarked) {
        await unbookmarkMutation.mutateAsync(questionId);
      } else {
        await bookmarkMutation.mutateAsync(questionId);
      }
    } catch (e) {
      console.error('Bookmark toggle failed:', e);
      // Revert to original state on error - handled by React Query automatically
    }
  };

  const handleFollowToggle = async () => {
    const authorId = question?.author?.id;
    if (!authorId) return;

    const previousState = followingAuthor;
    const newState = !previousState;

    // Optimistic Update
    setFollowingAuthor(newState);

    try {
      if (previousState) {
        await userApi.unfollowUser(authorId);
      } else {
        await userApi.followUser(authorId);
      }
    } catch (e) {
      console.error('Follow toggle failed', e);
      setFollowingAuthor(previousState);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await questionApi.deleteQuestion(questionId);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert('Failed to delete question');
    }
  };

  const handleAskAi = async () => {
    if (aiGenerating || hasAiAnswer) return;

    setAiGenerating(true);
    try {
      await aiApi.generateAnswer(questionId);
      setHasAiAnswer(true);
      // Refresh comments to show the new AI answer
      if (commentListRef.current?.refreshComments) {
        commentListRef.current.refreshComments();
      }
    } catch (e) {
      console.error('Failed to generate AI answer:', e);
      alert(e.message || 'Failed to generate AI answer');
    } finally {
      setAiGenerating(false);
    }
  };

  if (questionLoading || votesLoading || voteStatusLoading || bookmarkLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5F6]">
        <Navbar user={me} />
        <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-8">
          <div className="bg-white border border-gray-200 p-6 rounded-xl animate-pulse">
            <div className="h-8 bg-gray-200 w-3/4 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 w-1/2 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (questionError || error) {
    return (
      <div className="min-h-screen bg-[#FFF5F6]">
        <Navbar user={me} />
        <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-8">
          <div className="bg-white border border-red-200 p-8 rounded-xl text-center">
            <div className="text-red-600 font-medium mb-4">{error || 'Failed to load question'}</div>
            <button
              className="px-6 py-2 bg-[#FF6B6B] text-white rounded-full hover:bg-[#FF5252] transition-colors"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const score = (voteCounts.upvotes || 0) - (voteCounts.downvotes || 0);

  return (
    <div className="min-h-screen bg-[#FFF5F6] pb-20">
      <Navbar user={me} />

      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-8">
        {/* Question Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="p-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-4">
                  {question.title}
                </h1>

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center text-white font-bold text-xs uppercase">
                      {question.author?.avatarUrl ? (
                        <img src={question.author.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        question.author?.fullName?.[0] || 'U'
                      )}
                    </div>
                    <span className="font-medium text-gray-900">{question.author?.fullName || 'User'}</span>
                  </div>
                  <span>•</span>
                  <span>{question.createdAt ? new Date(question.createdAt).toLocaleDateString() : ''}</span>

                  {question.author?.id && me?.userId && question.author.id !== me.userId && (
                    <button
                      className={`ml-2 text-xs font-semibold px-3 py-1 rounded-full border transition-all ${followingAuthor
                        ? 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}
                      onClick={handleFollowToggle}
                    >
                      {followingAuthor ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {me?.userId === question.author?.id && (
                  <button
                    className="flex flex-col items-center justify-center w-12 h-12 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-200 transition-all"
                    onClick={handleDeleteQuestion}
                    title="Delete Post"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                <button
                  className={`flex flex-col items-center justify-center w-12 h-12 rounded-full border transition-all ${bookmarked
                    ? 'bg-yellow-50 text-yellow-500 border-yellow-200'
                    : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600'}`}
                  onClick={handleBookmarkToggle}
                  title={bookmarked ? "Remove Bookmark" : "Bookmark"}
                >
                  <svg className="w-5 h-5" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>

                {me?.userId === question.author?.id && (
                  <button
                    className="flex flex-col items-center justify-center w-12 h-12 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-blue-500 hover:border-blue-200 transition-all font-bold"
                    onClick={() => setIsRequestModalOpen(true)}
                    title="Request Answer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  </button>
                )}

                {/* Ask Cue Button - only visible to post owner and when no AI answer exists */}
                {me?.userId === question.author?.id && !hasAiAnswer && (
                  <button
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-full border transition-all ${aiGenerating
                      ? 'bg-purple-100 text-purple-600 border-purple-300 cursor-wait'
                      : 'border-gray-200 bg-white text-gray-400 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    onClick={handleAskAi}
                    disabled={aiGenerating}
                    title={aiGenerating ? "Asking Cue..." : "Ask Cue for an answer"}
                  >
                    {aiGenerating ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Question Content / Quote */}
            <div className="relative pl-6 border-l-4 border-red-500 bg-gray-50/50 py-4 pr-4 rounded-r-lg mb-6">
              {question.imageUrl && (
                <FeedImage src={question.imageUrl} alt={question.title} />
              )}
              {question.content && (
                <p className="text-lg text-gray-800 leading-relaxed whitespace-pre-wrap font-serif italic">
                  {question.content}
                </p>
              )}
            </div>

            {!!question.tags?.length && (
              <div className="flex flex-wrap gap-2 mb-8">
                {question.tags.map((t) => (
                  <span key={t} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Voting Bar */}
            {/* Voting Bar - Feed Style */}
            <div className="flex items-center gap-5 pt-6 border-t border-gray-100">
              <button
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${voteStatus === 'UPVOTE' ? 'text-red-600' : 'text-gray-500 hover:text-red-600'}`}
                onClick={() => handleVote('UPVOTE')}
                title="Upvote"
              >
                <svg width="20" height="20" fill={voteStatus === 'UPVOTE' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                <span>{voteCounts.upvotes || 0}</span>
              </button>

              <button
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${voteStatus === 'DOWNVOTE' ? 'text-red-600' : 'text-gray-500 hover:text-red-600'}`}
                onClick={() => handleVote('DOWNVOTE')}
                title="Downvote"
              >
                <svg width="20" height="20" fill={voteStatus === 'DOWNVOTE' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v9a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2" />
                </svg>
                <span>{voteCounts.downvotes || 0}</span>
              </button>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span className="text-sm">{question.commentsCount || 0} Answers</span>
                </div>
                <div className="text-gray-400 text-sm">
                  {question.viewsCount || 0} views
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 text-sm font-medium transition-colors"
                    onClick={() => setShowShareModal(true)}
                    title="Share post"
                  >
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span className="hidden sm:inline">Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section (Acting as Answers) */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <CommentList ref={commentListRef} postId={question.id} me={me} postAuthorId={question.author?.id} />
        </div>
      </div>

      <RequestAnswerModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        questionId={questionId}
        currentUserId={me?.userId}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={question}
      />
    </div>
  );
}
