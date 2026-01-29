// Vite env variable (create .env file to set this)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const getAuthToken = () => {
  try {
    return localStorage.getItem("token");
  } catch (err) {
    return null;
  }
};

const buildHeaders = (includeAuth = false) => {
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();

  if (includeAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  // For successful responses with content
  if (res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    return data;
  }

  // For successful responses without content (like DELETE)
  if (res.ok && res.status === 204) {
    return {};
  }

  // For error responses
  const errorData = await res.json().catch(() => ({}));
  throw new Error(errorData?.message || errorData?.error || "Request failed");
};

export const post = async (path, body, includeAuth = false) => {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: buildHeaders(includeAuth),
      body: JSON.stringify(body || {}),
    });

    return handleResponse(res);
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error("Backend not reachable. Start Spring Boot server!");
    }
    throw err;
  }
};

export const put = async (path, body, includeAuth = false) => {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "PUT",
      headers: buildHeaders(includeAuth),
      body: JSON.stringify(body || {}),
    });

    return handleResponse(res);
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error("Backend not reachable. Start Spring Boot server!");
    }
    throw err;
  }
};

export const del = async (path, includeAuth = false) => {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: buildHeaders(includeAuth),
    });

    return handleResponse(res);
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error("Backend not reachable. Start Spring Boot server!");
    }
    throw err;
  }
};

export const get = async (path, includeAuth = false) => {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "GET",
      headers: buildHeaders(includeAuth),
    });

    return handleResponse(res);
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error("Backend not reachable. Start Spring Boot server!");
    }
    throw err;
  }
};

export const authApi = {
  login: (email, password) =>
    post("/auth/login", { email, password }),

  sendOtp: (email, purpose) =>
    post("/auth/send-otp", { email, purpose }),

  verifyOtp: (payload) =>
    post("/auth/verify-otp", payload),

  checkUsername: (username) =>
    get(`/auth/check-username/${encodeURIComponent(username)}`),
};

export const feedApi = {
  getFeed: (tab = 'FOR_YOU', page = 0, size = 10) => {
    const params = new URLSearchParams();
    params.append('tab', tab);
    params.append('page', page);
    params.append('size', size);
    return get(`/api/feed?${params.toString()}`, true);
  },
};

export const questionApi = {
  createQuestion: (questionData) => post("/api/questions", questionData, true),
  getQuestion: (id) => get(`/api/questions/${id}`, true),
  updateQuestion: (id, questionData) => put(`/api/questions/${id}`, questionData, true),
  deleteQuestion: (id) => del(`/api/questions/${id}`, true),
  getAllQuestions: (page = 0, size = 10) => get(`/api/questions?page=${page}&size=${size}`, true),
  searchQuestions: (query, tag, userId, page = 0, size = 10) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (tag) params.append('tag', tag);
    if (userId) params.append('userId', userId);
    params.append('page', page);
    params.append('size', size);
    return get(`/api/questions/search?${params.toString()}`, true);
  },
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getAuthToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // Note: Do NOT set Content-Type to multipart/form-data manually, let browser set boundary

    const res = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      headers: headers,
      body: formData,
    });

    if (res.ok) {
      return await res.json();
    }
    throw new Error("Failed to upload image");
  },
};

export const answerApi = {
  answerQuestion: (questionId, answerData) => post(`/api/answers/question/${questionId}`, answerData, true),
  getAnswers: (questionId, page = 0, size = 10) => get(`/api/answers/question/${questionId}?page=${page}&size=${size}`, true),
  updateAnswer: (id, answerData) => put(`/api/answers/${id}`, answerData, true),
  deleteAnswer: (id) => del(`/api/answers/${id}`, true),
};

export const commentApi = {
  createComment: (postId, commentData) => post(`/api/comments/post/${postId}`, commentData, true),
  updateComment: (id, commentData) => put(`/api/comments/${id}`, commentData, true),
  deleteComment: (id) => del(`/api/comments/${id}`, true),
  getCommentsForPost: (postId, page = 0, size = 10) => get(`/api/comments/post/${postId}?page=${page}&size=${size}`, true),
};

export const voteApi = {
  voteQuestion: (questionId, voteType) => post(`/api/votes/questions/${questionId}?voteType=${voteType}`, {}, true),
  voteAnswer: (answerId, voteType) => post(`/api/votes/answers/${answerId}?voteType=${voteType}`, {}, true),
  voteComment: (commentId, voteType) => post(`/api/votes/comments/${commentId}?voteType=${voteType}`, {}, true),
  getQuestionVoteStatus: (questionId) => get(`/api/votes/questions/${questionId}/status`, true),
  getAnswerVoteStatus: (answerId) => get(`/api/votes/answers/${answerId}/status`, true),
  getCommentVoteStatus: (commentId) => get(`/api/votes/comments/${commentId}/status`, true),
  getQuestionVoteCounts: (questionId) => get(`/api/votes/questions/${questionId}/counts`, true),
  getAnswerVoteCounts: (answerId) => get(`/api/votes/answers/${answerId}/counts`, true),
  getCommentVoteCounts: (commentId) => get(`/api/votes/comments/${commentId}/counts`, true),
};

export const bookmarkApi = {
  bookmarkPost: (postId) => post(`/api/bookmarks/${postId}`, {}, true),
  unbookmarkPost: (postId) => del(`/api/bookmarks/${postId}`, true),
  getMyBookmarks: (page = 0, size = 10) => get(`/api/bookmarks/me?page=${page}&size=${size}`, true),
  isBookmarked: (postId) => get(`/api/bookmarks/${postId}/status`, true),
};

export const userApi = {
  getCurrentUser: () => get('/api/users/me', true),
  getUserProfile: (id) => get(`/api/users/${id}`, true),
  updateUserProfile: (userData) => put('/api/users/me', userData, true),
  getUserStats: (id) => get(`/api/users/${id}/stats`, true),
  getUserSuggestions: () => get('/api/users/suggestions', true),
  getUsersToFollow: () => get('/api/users/suggestions', true),
  followUser: (id) => post(`/api/users/${id}/follow`, {}, true),
  unfollowUser: (id) => del(`/api/users/${id}/follow`, true),
  getFollowStatus: (id) => get(`/api/users/${id}/follow/status`, true),
  getUserFollowers: (id) => get(`/api/users/${id}/followers`, true),
  getUserFollowing: (id) => get(`/api/users/${id}/following`, true),
  removeFollower: (id) => del(`/api/users/me/followers/${id}`, true),
  getUserQuestions: (id, page = 0, size = 10) => get(`/api/users/${id}/questions?page=${page}&size=${size}`, true),
  getUserPostsByType: (id, type, page = 0, size = 10) => get(`/api/users/${id}/posts-by-type?type=${type}&page=${page}&size=${size}`, true),
  getUserAnswers: (id, page = 0, size = 10) => get(`/api/users/${id}/answers?page=${page}&size=${size}`, true),
  searchUsers: (query, page = 0, size = 10) => get(`/api/users/search?query=${query}&page=${page}&size=${size}`, true),
  updateTopics: (topics) => put('/api/users/me/topics', { topics }, true),
};

export const requestApi = {
  createRequest: (questionId, expertId) => post('/api/requests', { questionId, expertId }, true),

  getSuggestions: (questionId) => get(`/api/requests/suggestions?questionId=${questionId}`, true),
  getMyPendingRequests: () => get('/api/requests/me/pending', true),
  searchExperts: (query) => get(`/api/requests/search?query=${encodeURIComponent(query)}`, true),
  getAlreadyRequestedUserIds: (questionId) => get(`/api/requests/already-requested?questionId=${questionId}`, true),
};

export const notificationApi = {
  getNotifications: (page = 0, size = 10) => get(`/api/notifications?page=${page}&size=${size}`, true),
  markAsRead: (id) => post(`/api/notifications/${id}/read`, {}, true),
  getUnreadCount: () => get('/api/notifications/unread-count', true),
  markAllAsRead: () => post('/api/notifications/mark-all-read', {}, true),
  clearAll: () => del('/api/notifications/clear-all', true),
};

export const chatApi = {
  getConversations: () => get('/api/chat/conversations', true),
  getMessages: (otherUserId) => get(`/api/chat/messages/${otherUserId}`, true),
  sendMessageHttp: (payload) => post('/api/chat/send', payload, true),
  markAsRead: (otherUserId) => put(`/api/chat/read/${otherUserId}`, {}, true),
  deleteMessageForMe: (messageId) => del(`/api/chat/messages/${messageId}/delete-for-me`, true),
  deleteMessageForEveryone: (messageId) => del(`/api/chat/messages/${messageId}/delete-for-everyone`, true),
  clearConversation: (otherUserId) => del(`/api/chat/conversations/${otherUserId}/clear`, true),
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getAuthToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      headers: headers,
      body: formData,
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error("Failed to upload image");
  },
};

export const aiApi = {
  generateAnswer: (postId) => post(`/api/ai/generate-answer/${postId}`, {}, true),
  regenerateAnswer: (postId) => post(`/api/ai/regenerate-answer/${postId}`, {}, true),
  hasAnswer: (postId) => get(`/api/ai/has-answer/${postId}`, true),
  refinePost: (title, description) => post('/api/ai/refine', { title, description }, true),
};

export const newsApi = {
  // Get all news or by category
  getNews: (category) => {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    return get(`/api/news${params}`, true);
  },

  // Get available categories
  getCategories: () => get('/api/news/categories', true),

  // Get AI context for an article
  getContext: (title, description, content) =>
    post('/api/news/context', { title, description, content }, true),

  // Get or create discussion post for an article
  getDiscussion: (url, title, imageUrl) =>
    post('/api/news/discussion', { url, title, imageUrl }, true),

  // Add a comment to news discussion
  addComment: (url, title, imageUrl, content) =>
    post('/api/news/comment', { url, title, imageUrl, content }, true),

  // Get comments for a news article
  getComments: (url) => get(`/api/news/comments?url=${encodeURIComponent(url)}`, true),
};

export const groupApi = {
  createGroup: (groupData) => post('/api/groups', groupData, true),
  getGroupDetails: (groupId) => get(`/api/groups/${groupId}`, true),
  getMyGroups: () => get('/api/groups/my', true),
  addMembers: (groupId, userIds) => post(`/api/groups/${groupId}/members`, { userIds }, true),
  removeMember: (groupId, targetUserId) => del(`/api/groups/${groupId}/members/${targetUserId}`, true),
  leaveGroup: (groupId) => post(`/api/groups/${groupId}/leave`, {}, true),
  promoteToAdmin: (groupId, targetUserId) => post(`/api/groups/${groupId}/promote/${targetUserId}`, {}, true),
  demoteFromAdmin: (groupId, targetUserId) => post(`/api/groups/${groupId}/demote/${targetUserId}`, {}, true),
  updateGroup: (groupId, data) => put(`/api/groups/${groupId}`, data, true),
  deleteGroup: (groupId) => del(`/api/groups/${groupId}`, true),
  getMessages: (groupId, page = 0, size = 50) => get(`/api/groups/${groupId}/messages?page=${page}&size=${size}`, true),
  deleteMessageForMe: (messageId) => del(`/api/groups/messages/${messageId}/me`, true),
  deleteMessageForEveryone: (messageId) => del(`/api/groups/messages/${messageId}/everyone`, true),
};

export { API_URL };

