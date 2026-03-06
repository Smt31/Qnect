import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  get, post, put, del,
  authApi, feedApi, questionApi, answerApi, commentApi,
  voteApi, bookmarkApi, userApi, topicApi, requestApi, notificationApi, chatApi
} from '../api';

// Authentication Queries
export const useLogin = () => {
  return useMutation({
    mutationFn: ({ email, password }) => authApi.login(email, password),
  });
};

export const useSearchTopics = (query, page = 0, size = 10, enabled = true) => {
  return useQuery({
    queryKey: ['topics', 'search', query, page, size],
    queryFn: () => topicApi.searchTopics(query, page, size),
    enabled: enabled && !!query,
    staleTime: 5 * 60 * 1000,
  });
};

export const useTopic = (id) => {
  return useQuery({
    queryKey: ['topic', id],
    queryFn: () => topicApi.getTopic(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useTopicPosts = (topicId, page = 0, size = 10) => {
  return useQuery({
    queryKey: ['topic-posts', topicId, page, size],
    queryFn: () => questionApi.getQuestionsByTopic(topicId, page, size),
    enabled: !!topicId,
    staleTime: 2 * 60 * 1000,
  });
};

// Moving follow/unfollow topic hooks here for consistency, though API is in userApi
export const useFollowTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (topicId) => userApi.followTopic(topicId),
    onMutate: async (topicId) => {
      await queryClient.cancelQueries({ queryKey: ['topic', topicId] });
      await queryClient.cancelQueries({ queryKey: ['current-user'] });

      const previousTopic = queryClient.getQueryData(['topic', topicId]);
      const previousUser = queryClient.getQueryData(['current-user']);

      // Optimistically update topic followers count
      queryClient.setQueryData(['topic', topicId], (old) => {
        if (!old) return old;
        return {
          ...old,
          followersCount: (old.followersCount || 0) + 1,
        };
      });

      // Optimistically update current user's topics list
      queryClient.setQueryData(['current-user'], (old) => {
        if (!old) return old;
        const newTopic = previousTopic || { id: topicId, name: '...' }; // Placeholder if not in cache
        return {
          ...old,
          topics: [...(old.topics || []), newTopic]
        };
      });

      return { previousTopic, previousUser };
    },
    onError: (err, topicId, context) => {
      if (context?.previousTopic) {
        queryClient.setQueryData(['topic', topicId], context.previousTopic);
      }
      if (context?.previousUser) {
        queryClient.setQueryData(['current-user'], context.previousUser);
      }
    },
    onSettled: (data, error, topicId) => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['topic', topicId] });
      // Invalidate feed to show new items
      queryClient.invalidateQueries({ queryKey: ['feed', 'FOR_YOU'] });
    }
  });
};

export const useUnfollowTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (topicId) => userApi.unfollowTopic(topicId),
    onMutate: async (topicId) => {
      await queryClient.cancelQueries({ queryKey: ['topic', topicId] });
      await queryClient.cancelQueries({ queryKey: ['current-user'] });

      const previousTopic = queryClient.getQueryData(['topic', topicId]);
      const previousUser = queryClient.getQueryData(['current-user']);

      // Optimistically update topic followers count
      queryClient.setQueryData(['topic', topicId], (old) => {
        if (!old) return old;
        return {
          ...old,
          followersCount: Math.max(0, (old.followersCount || 0) - 1),
        };
      });

      // Optimistically update current user's topics list
      queryClient.setQueryData(['current-user'], (old) => {
        if (!old) return old;
        return {
          ...old,
          topics: (old.topics || []).filter(t => t.id != topicId)
        };
      });

      return { previousTopic, previousUser };
    },
    onError: (err, topicId, context) => {
      if (context?.previousTopic) {
        queryClient.setQueryData(['topic', topicId], context.previousTopic);
      }
      if (context?.previousUser) {
        queryClient.setQueryData(['current-user'], context.previousUser);
      }
    },
    onSettled: (data, error, topicId) => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['topic', topicId] });
      queryClient.invalidateQueries({ queryKey: ['feed', 'FOR_YOU'] });
    }
  });
};

export const useSendOtp = () => {
  return useMutation({
    mutationFn: ({ email, purpose }) => authApi.sendOtp(email, purpose),
  });
};

export const useVerifyOtp = () => {
  return useMutation({
    mutationFn: (payload) => authApi.verifyOtp(payload),
  });
};

// Feed Queries
export const useFeed = (tab = 'FOR_YOU', size = 10) => {
  return useInfiniteQuery({
    queryKey: ['feed', tab, size],
    queryFn: ({ pageParam = null }) => feedApi.getFeed(tab, pageParam, size),
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useTrending = (page = 0, size = 5) => {
  return useQuery({
    queryKey: ['trending', page, size],
    queryFn: () => feedApi.getTrending(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

// Question Queries
export const useQuestion = (id) => {
  return useQuery({
    queryKey: ['question', id],
    queryFn: () => questionApi.getQuestion(id),
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useAllQuestions = (page = 0, size = 10) => {
  return useQuery({
    queryKey: ['questions', page, size],
    queryFn: () => questionApi.getAllQuestions(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useCreateQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionData) => questionApi.createQuestion(questionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['user-questions'] });
    },
  });
};

export const useUpdateQuestion = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionData) => questionApi.updateQuestion(id, questionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question', id] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-questions'] });
    },
  });
};

export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => questionApi.deleteQuestion(id),
    onMutate: async (deletedId) => {
      // Cancel queries
      await Promise.all([
        queryClient.cancelQueries(['feed']),
        queryClient.cancelQueries(['questions']),
        queryClient.cancelQueries(['topic-posts']),
        queryClient.cancelQueries(['user-questions'])
      ]);

      const previousFeeds = queryClient.getQueriesData(['feed']);
      const previousQuestions = queryClient.getQueriesData(['questions']);
      const previousTopicPosts = queryClient.getQueriesData(['topic-posts']);
      const previousUserQuestions = queryClient.getQueriesData(['user-questions']);

      // Optimistically update
      const updateData = (oldData) => {
        if (!oldData) return oldData;
        if (oldData.content) {
          return {
            ...oldData,
            content: oldData.content.filter(post => post.id !== deletedId)
          };
        }
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map(page => {
              if (!page.feed) return page;
              return {
                ...page,
                feed: page.feed.filter(post => post.id !== deletedId)
              }
            })
          };
        }
        return oldData;
      };

      queryClient.setQueriesData({ queryKey: ['feed'] }, updateData);
      queryClient.setQueriesData({ queryKey: ['questions'] }, updateData);
      queryClient.setQueriesData({ queryKey: ['topic-posts'] }, updateData);
      queryClient.setQueriesData({ queryKey: ['user-questions'] }, updateData);

      return { previousFeeds, previousQuestions, previousTopicPosts, previousUserQuestions };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousFeeds) {
        context.previousFeeds.forEach(([key, val]) => queryClient.setQueryData(key, val));
      }
      if (context?.previousQuestions) {
        context.previousQuestions.forEach(([key, val]) => queryClient.setQueryData(key, val));
      }
      if (context?.previousTopicPosts) {
        context.previousTopicPosts.forEach(([key, val]) => queryClient.setQueryData(key, val));
      }
      if (context?.previousUserQuestions) {
        context.previousUserQuestions.forEach(([key, val]) => queryClient.setQueryData(key, val));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['topic-posts'] });
      queryClient.invalidateQueries({ queryKey: ['user-questions'] });
    },
  });
};

// Answer Queries
export const useAnswers = (questionId, page = 0, size = 10) => {
  return useQuery({
    queryKey: ['answers', questionId, page, size],
    queryFn: () => answerApi.getAnswers(questionId, page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useCreateAnswer = (questionId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (answerData) => answerApi.answerQuestion(questionId, answerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answers', questionId] });
      queryClient.invalidateQueries({ queryKey: ['question', questionId] });
    },
  });
};

export const useUpdateAnswer = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (answerData) => answerApi.updateAnswer(id, answerData),
    onSuccess: () => {
      // Find questionId from cached answer data or invalidate all answers
      queryClient.invalidateQueries({ queryKey: ['answers'] });
    },
  });
};

export const useDeleteAnswer = (questionId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => answerApi.deleteAnswer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answers', questionId] });
      queryClient.removeQueries({ queryKey: ['answer', id] });
    },
  });
};

// Comment Queries
export const useComments = (postId, page = 0, size = 10) => {
  return useQuery({
    queryKey: ['comments', postId, page, size],
    queryFn: () => commentApi.getCommentsForPost(postId, page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useCreateComment = (postId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentData) => commentApi.createComment(postId, commentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });
};

export const useUpdateComment = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentData) => commentApi.updateComment(id, commentData),
    onSuccess: () => {
      // Find postId from cached comment data or invalidate all comments
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
};

export const useDeleteComment = (postId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => commentApi.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.removeQueries({ queryKey: ['comment', id] });
    },
  });
};

// Vote Queries
export const useQuestionVoteCounts = (questionId) => {
  return useQuery({
    queryKey: ['vote-counts', 'question', questionId],
    queryFn: () => voteApi.getQuestionVoteCounts(questionId),
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useQuestionVoteStatus = (questionId) => {
  return useQuery({
    queryKey: ['vote-status', 'question', questionId],
    queryFn: () => voteApi.getQuestionVoteStatus(questionId),
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useVoteQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, voteType }) => voteApi.voteQuestion(postId, voteType),

    // Optimistic update - update cache immediately before API call
    onMutate: async ({ postId, voteType }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['topic-posts'] });
      await queryClient.cancelQueries({ queryKey: ['vote-counts', 'question', postId] });
      await queryClient.cancelQueries({ queryKey: ['vote-status', 'question', postId] });
      await queryClient.cancelQueries({ queryKey: ['question', postId] });

      // Snapshot previous values for rollback - capture ALL relevant caches
      const previousFeedQueries = queryClient.getQueriesData({ queryKey: ['feed'] });
      const previousTopicPosts = queryClient.getQueriesData({ queryKey: ['topic-posts'] });
      const previousVoteCounts = queryClient.getQueryData(['vote-counts', 'question', postId]);
      const previousVoteStatus = queryClient.getQueryData(['vote-status', 'question', postId]);
      const previousQuestion = queryClient.getQueryData(['question', postId]);

      // Get current vote status and counts from ANY available source
      let currentStatus = 'NONE';
      let currentUpvotes = 0;
      let currentDownvotes = 0;

      // Try to get from individual vote queries first
      if (previousVoteStatus) {
        currentStatus = previousVoteStatus;
      }
      if (previousVoteCounts) {
        currentUpvotes = previousVoteCounts.upvotes || 0;
        currentDownvotes = previousVoteCounts.downvotes || 0;
      }

      // If not found, try to get from question cache
      if (previousQuestion) {
        currentStatus = previousQuestion.currentUserVoteStatus || currentStatus;
        currentUpvotes = previousQuestion.upvotes ?? currentUpvotes;
        currentDownvotes = previousQuestion.downvotes ?? currentDownvotes;
      }

      // If still not found, try to find in feed cache
      if (previousFeedQueries && previousFeedQueries.length > 0) {
        for (const [queryKey, queryData] of previousFeedQueries) {
          if (queryData && queryData.pages) {
            for (const page of queryData.pages) {
              if (page && page.feed) {
                const post = page.feed.find(p => p.id === postId);
                if (post) {
                  currentStatus = post.currentUserVoteStatus || currentStatus;
                  currentUpvotes = post.upvotes ?? currentUpvotes;
                  currentDownvotes = post.downvotes ?? currentDownvotes;
                  break;
                }
              }
            }
          }
        }
      }

      // If still not found, try to find in topic posts cache
      if (previousTopicPosts && previousTopicPosts.length > 0) {
        for (const [queryKey, queryData] of previousTopicPosts) {
          if (queryData && queryData.content) {
            const post = queryData.content.find(p => p.id === postId);
            if (post) {
              currentStatus = post.currentUserVoteStatus || currentStatus;
              currentUpvotes = post.upvotes ?? currentUpvotes;
              currentDownvotes = post.downvotes ?? currentDownvotes;
              break;
            }
          }
        }
      }

      // Calculate new values based on action
      let newStatus = voteType;
      let newUpvotes = currentUpvotes;
      let newDownvotes = currentDownvotes;
      const isUpvote = voteType === 'UPVOTE';

      if (currentStatus === voteType) {
        // Toggle off - user is clicking same vote again
        newStatus = 'NONE';
        if (isUpvote) newUpvotes = Math.max(0, newUpvotes - 1);
        else newDownvotes = Math.max(0, newDownvotes - 1);
      } else if (currentStatus === 'NONE') {
        // New vote - user hasn't voted before
        if (isUpvote) newUpvotes++;
        else newDownvotes++;
      } else {
        // Switch vote - user is changing from up to down or vice versa
        if (isUpvote) {
          newUpvotes++;
          newDownvotes = Math.max(0, newDownvotes - 1);
        } else {
          newDownvotes++;
          newUpvotes = Math.max(0, newUpvotes - 1);
        }
      }

      const newCounts = { upvotes: newUpvotes, downvotes: newDownvotes };

      // Update vote status cache
      queryClient.setQueryData(['vote-status', 'question', postId], newStatus);

      // Update vote counts cache
      queryClient.setQueryData(['vote-counts', 'question', postId], newCounts);

      // Update ALL feed caches (for different tabs like FOR_YOU, RECENT, etc.)
      queryClient.setQueriesData({ queryKey: ['feed'] }, (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map(page => {
            if (!page.feed) return page;
            return {
              ...page,
              feed: page.feed.map(post => {
                if (post.id !== postId) return post;
                return {
                  ...post,
                  currentUserVoteStatus: newStatus,
                  upvotes: newUpvotes,
                  downvotes: newDownvotes,
                };
              }),
            }
          })
        };
      });

      // Update ALL topic-posts caches
      queryClient.setQueriesData({ queryKey: ['topic-posts'] }, (oldData) => {
        if (!oldData || !oldData.content) return oldData;
        return {
          ...oldData,
          content: oldData.content.map(post => {
            if (post.id !== postId) return post;
            return {
              ...post,
              currentUserVoteStatus: newStatus,
              upvotes: newUpvotes,
              downvotes: newDownvotes,
            };
          }),
        };
      });

      // Update individual question cache
      queryClient.setQueryData(['question', postId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          currentUserVoteStatus: newStatus,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
        };
      });

      // Return context for rollback
      return { previousFeedQueries, previousTopicPosts, previousVoteCounts, previousVoteStatus, previousQuestion, postId };
    },

    // Rollback on error
    onError: (err, { postId }, context) => {
      // Restore all feed caches
      if (context?.previousFeedQueries) {
        for (const [queryKey, queryData] of context.previousFeedQueries) {
          queryClient.setQueryData(queryKey, queryData);
        }
      }
      // Restore all topic-posts caches
      if (context?.previousTopicPosts) {
        for (const [queryKey, queryData] of context.previousTopicPosts) {
          queryClient.setQueryData(queryKey, queryData);
        }
      }
      if (context?.previousVoteCounts) {
        queryClient.setQueryData(['vote-counts', 'question', postId], context.previousVoteCounts);
      }
      if (context?.previousVoteStatus !== undefined) {
        queryClient.setQueryData(['vote-status', 'question', postId], context.previousVoteStatus);
      }
      if (context?.previousQuestion) {
        queryClient.setQueryData(['question', postId], context.previousQuestion);
      }
    },

    // Always refetch after error or success to ensure data consistency
    onSettled: (_, __, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['vote-counts', 'question', postId] });
      queryClient.invalidateQueries({ queryKey: ['vote-status', 'question', postId] });
      queryClient.invalidateQueries({ queryKey: ['question', postId] });
      // Also invalidate feed to sync state across pages
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['topic-questions'] });
    },
  });
};

// Bookmark Queries
export const useBookmarkStatus = (postId) => {
  return useQuery({
    queryKey: ['bookmark-status', postId],
    queryFn: () => bookmarkApi.isBookmarked(postId),
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useBookmarkPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId) => bookmarkApi.bookmarkPost(postId),

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['bookmark-status', postId] });
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['topic-questions'] });
      await queryClient.cancelQueries({ queryKey: ['question', postId] });

      const previousStatus = queryClient.getQueryData(['bookmark-status', postId]);
      const previousFeedQueries = queryClient.getQueriesData({ queryKey: ['feed'] });
      const previousTopicQuestions = queryClient.getQueriesData({ queryKey: ['topic-questions'] });
      const previousQuestion = queryClient.getQueryData(['question', postId]);

      // Optimistically update bookmark status
      queryClient.setQueryData(['bookmark-status', postId], true);

      // Update ALL feed caches
      queryClient.setQueriesData({ queryKey: ['feed'] }, (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map(page => {
            if (!page.feed) return page;
            return {
              ...page,
              feed: page.feed.map(post =>
                post.id === postId ? { ...post, isBookmarked: true } : post
              )
            }
          })
        };
      });

      // Update ALL topic-questions caches
      queryClient.setQueriesData({ queryKey: ['topic-questions'] }, (oldData) => {
        if (!oldData || !oldData.content) return oldData;
        return {
          ...oldData,
          content: oldData.content.map(post =>
            post.id === postId ? { ...post, isBookmarked: true } : post
          ),
        };
      });

      // Update question cache
      queryClient.setQueryData(['question', postId], (oldData) => {
        if (!oldData) return oldData;
        return { ...oldData, isBookmarked: true };
      });

      return { previousStatus, previousFeedQueries, previousTopicQuestions, previousQuestion, postId };
    },

    onError: (err, postId, context) => {
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(['bookmark-status', postId], context.previousStatus);
      }
      if (context?.previousFeedQueries) {
        for (const [queryKey, queryData] of context.previousFeedQueries) {
          queryClient.setQueryData(queryKey, queryData);
        }
      }
      if (context?.previousTopicQuestions) {
        for (const [queryKey, queryData] of context.previousTopicQuestions) {
          queryClient.setQueryData(queryKey, queryData);
        }
      }
      if (context?.previousQuestion) {
        queryClient.setQueryData(['question', postId], context.previousQuestion);
      }
    },

    onSettled: (_, __, postId) => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-status', postId] });
      queryClient.invalidateQueries({ queryKey: ['question', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['topic-questions'] });
    },
  });
};

export const useUnbookmarkPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId) => bookmarkApi.unbookmarkPost(postId),

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['bookmark-status', postId] });
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['topic-questions'] });
      await queryClient.cancelQueries({ queryKey: ['question', postId] });

      const previousStatus = queryClient.getQueryData(['bookmark-status', postId]);
      const previousFeedQueries = queryClient.getQueriesData({ queryKey: ['feed'] });
      const previousTopicQuestions = queryClient.getQueriesData({ queryKey: ['topic-questions'] });
      const previousQuestion = queryClient.getQueryData(['question', postId]);

      // Optimistically update bookmark status
      queryClient.setQueryData(['bookmark-status', postId], false);

      // Update ALL feed caches
      queryClient.setQueriesData({ queryKey: ['feed'] }, (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map(page => {
            if (!page.feed) return page;
            return {
              ...page,
              feed: page.feed.map(post =>
                post.id === postId ? { ...post, isBookmarked: false } : post
              )
            }
          })
        };
      });

      // Update ALL topic-questions caches
      queryClient.setQueriesData({ queryKey: ['topic-questions'] }, (oldData) => {
        if (!oldData || !oldData.content) return oldData;
        return {
          ...oldData,
          content: oldData.content.map(post =>
            post.id === postId ? { ...post, isBookmarked: false } : post
          ),
        };
      });

      // Update question cache
      queryClient.setQueryData(['question', postId], (oldData) => {
        if (!oldData) return oldData;
        return { ...oldData, isBookmarked: false };
      });

      return { previousStatus, previousFeedQueries, previousTopicQuestions, previousQuestion, postId };
    },

    onError: (err, postId, context) => {
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(['bookmark-status', postId], context.previousStatus);
      }
      if (context?.previousFeedQueries) {
        for (const [queryKey, queryData] of context.previousFeedQueries) {
          queryClient.setQueryData(queryKey, queryData);
        }
      }
      if (context?.previousTopicQuestions) {
        for (const [queryKey, queryData] of context.previousTopicQuestions) {
          queryClient.setQueryData(queryKey, queryData);
        }
      }
      if (context?.previousQuestion) {
        queryClient.setQueryData(['question', postId], context.previousQuestion);
      }
    },

    onSettled: (_, __, postId) => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-status', postId] });
      queryClient.invalidateQueries({ queryKey: ['question', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['topic-questions'] });
    },
  });
};

export const useMyBookmarks = (page = 0, size = 10) => {
  return useQuery({
    queryKey: ['bookmarks', page, size],
    queryFn: () => bookmarkApi.getMyBookmarks(page, size),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

// User Queries
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: () => userApi.getCurrentUser(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useUserProfile = (id) => {
  return useQuery({
    queryKey: ['user-profile', id],
    queryFn: () => userApi.getUserProfile(id),
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!id,
  });
};

export const useUserStats = (id) => {
  return useQuery({
    queryKey: ['user-stats', id],
    queryFn: () => userApi.getUserStats(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!id,
  });
};

export const useUserSuggestions = () => {
  return useQuery({
    queryKey: ['user-suggestions'],
    queryFn: () => userApi.getUserSuggestions(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useFollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) => userApi.followUser(userId),
    onMutate: async (userId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['follow-status', userId] });
      await queryClient.cancelQueries({ queryKey: ['user-profile', userId] });
      await queryClient.cancelQueries({ queryKey: ['user-followers'] });
      await queryClient.cancelQueries({ queryKey: ['user-following'] });

      // Snapshot previous values
      const previousFollowStatus = queryClient.getQueryData(['follow-status', userId]);
      const previousUserProfile = queryClient.getQueryData(['user-profile', userId]);

      // 1. Optimistically update Follow Status
      queryClient.setQueryData(['follow-status', userId], true);

      // 2. Optimistically update User Profile (increment followers count)
      queryClient.setQueryData(['user-profile', userId], (old) => {
        if (!old) return old;
        return {
          ...old,
          followersCount: (old.followersCount || 0) + 1,
          isFollowing: true
        };
      });

      // 3. Optimistically update "My Following" list (optional, but good for consistency)
      // We can't easily add the full user object since we only have userId, 
      // but if we had the user object passed to the mutation it would be better.
      // For now, we mainly care about the button state on the profile page.

      return { previousFollowStatus, previousUserProfile };
    },
    onError: (err, userId, context) => {
      if (context?.previousFollowStatus !== undefined) {
        queryClient.setQueryData(['follow-status', userId], context.previousFollowStatus);
      }
      if (context?.previousUserProfile) {
        queryClient.setQueryData(['user-profile', userId], context.previousUserProfile);
      }
    },
    onSettled: (data, error, userId) => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-stats', userId] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      // Also invalidate lists to ensure they are correct
      queryClient.invalidateQueries({ queryKey: ['user-following'] });
      queryClient.invalidateQueries({ queryKey: ['user-followers', userId] });
    },
  });
};

export const useUnfollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) => userApi.unfollowUser(userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['follow-status', userId] });
      await queryClient.cancelQueries({ queryKey: ['user-profile', userId] });

      const previousFollowStatus = queryClient.getQueryData(['follow-status', userId]);
      const previousUserProfile = queryClient.getQueryData(['user-profile', userId]);

      // 1. Optimistically update Follow Status
      queryClient.setQueryData(['follow-status', userId], false);

      // 2. Optimistically update User Profile
      queryClient.setQueryData(['user-profile', userId], (old) => {
        if (!old) return old;
        return {
          ...old,
          followersCount: Math.max(0, (old.followersCount || 0) - 1),
          isFollowing: false
        };
      });

      return { previousFollowStatus, previousUserProfile };
    },
    onError: (err, userId, context) => {
      if (context?.previousFollowStatus !== undefined) {
        queryClient.setQueryData(['follow-status', userId], context.previousFollowStatus);
      }
      if (context?.previousUserProfile) {
        queryClient.setQueryData(['user-profile', userId], context.previousUserProfile);
      }
    },
    onSettled: (data, error, userId) => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-stats', userId] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['user-following'] });
      queryClient.invalidateQueries({ queryKey: ['user-followers', userId] });
    },
  });
};

export const useFollowStatus = (userId) => {
  return useQuery({
    queryKey: ['follow-status', userId],
    queryFn: () => userApi.getFollowStatus(userId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!userId,
  });
};

export const useUserQuestions = (id, page = 0, size = 10) => {
  return useQuery({
    queryKey: ['user-questions', id, page, size],
    queryFn: () => userApi.getUserQuestions(id, page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!id,
  });
};

export const useUserAnswers = (id, page = 0, size = 10) => {
  return useQuery({
    queryKey: ['user-answers', id, page, size],
    queryFn: () => userApi.getUserAnswers(id, page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!id,
  });
};

export const useUserFollowers = (id) => {
  return useQuery({
    queryKey: ['user-followers', id],
    queryFn: () => userApi.getUserFollowers(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!id,
  });
};

export const useUserFollowing = (id) => {
  return useQuery({
    queryKey: ['user-following', id],
    queryFn: () => userApi.getUserFollowing(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!id,
  });
};


// Notification Queries
export const useNotifications = (page = 0, size = 10) => {
  return useQuery({
    queryKey: ['notifications', page, size],
    queryFn: () => notificationApi.getNotifications(page, size),
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Notifications should refresh when window gets focus
    retry: 1,
  });
};

export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: ['unread-notification-count'],
    queryFn: () => notificationApi.getUnreadCount(),
    staleTime: 30 * 1000, // 30 seconds - check frequently for new notifications
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Refetch every 60 seconds for real-time feel
    retry: 1,
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['unread-notification-count'] });

      // Snapshot previous values
      const previousNotifications = queryClient.getQueriesData({ queryKey: ['notifications'] });
      const previousCount = queryClient.getQueryData(['unread-notification-count']);

      // Optimistically update unread count to 0
      queryClient.setQueryData(['unread-notification-count'], 0);

      // Optimistically mark all as read
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (oldData) => {
        if (!oldData) return oldData;
        const content = oldData.content || oldData;
        if (Array.isArray(content)) {
          const updated = content.map(n => ({ ...n, isRead: true }));
          return oldData.content ? { ...oldData, content: updated } : updated;
        }
        return oldData;
      });

      return { previousNotifications, previousCount };
    },
    onError: (err, _, context) => {
      // Rollback
      if (context?.previousNotifications) {
        for (const [queryKey, queryData] of context.previousNotifications) {
          queryClient.setQueryData(queryKey, queryData);
        }
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['unread-notification-count'], context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });
};

export const useClearAllNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.clearAll(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['unread-notification-count'] });

      const previousNotifications = queryClient.getQueriesData({ queryKey: ['notifications'] });
      const previousCount = queryClient.getQueryData(['unread-notification-count']);

      // Optimistically clear all
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (oldData) => {
        if (!oldData) return oldData;
        return oldData.content ? { ...oldData, content: [] } : [];
      });
      queryClient.setQueryData(['unread-notification-count'], 0);

      return { previousNotifications, previousCount };
    },
    onError: (err, _, context) => {
      if (context?.previousNotifications) {
        for (const [queryKey, queryData] of context.previousNotifications) {
          queryClient.setQueryData(queryKey, queryData);
        }
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['unread-notification-count'], context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });
};


export const useConversations = () => {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.getConversations(),
    staleTime: 30 * 1000, // 30 seconds - chats need to be fresher
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refresh when coming back to app
    retry: 1,
  });
};

export const useMessages = (userId) => {
  return useQuery({
    queryKey: ['messages', userId],
    queryFn: () => chatApi.getMessages(userId),
    staleTime: 10 * 1000, // 10 seconds - messages should be very fresh
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!userId, // Only fetch if userId is provided
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => chatApi.sendMessageHttp(payload),

    // Optimistic update - add message immediately before API call
    onMutate: async (payload) => {
      const { receiverId, content, type, senderId } = payload;

      await queryClient.cancelQueries({ queryKey: ['messages', receiverId] });

      const previousMessages = queryClient.getQueryData(['messages', receiverId]);

      // Create optimistic message
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        senderId: senderId,
        receiverId: receiverId,
        content: content,
        type: type || 'TEXT',
        createdAt: new Date().toISOString(),
        pending: true,
      };

      // Add to messages cache
      queryClient.setQueryData(['messages', receiverId], (old) => {
        if (!old) return [optimisticMessage];
        return [...old, optimisticMessage];
      });

      return { previousMessages, optimisticMessage, receiverId };
    },

    onError: (err, payload, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', context.receiverId], context.previousMessages);
      }
    },

    onSuccess: (data, payload, context) => {
      // Replace optimistic message with real one
      queryClient.setQueryData(['messages', context.receiverId], (old) => {
        if (!old) return [data];
        return old.map(msg =>
          msg.id === context.optimisticMessage.id ? { ...data, pending: false } : msg
        );
      });
    },

    onSettled: (_, __, payload) => {
      // Invalidate conversations to update last message preview
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};
