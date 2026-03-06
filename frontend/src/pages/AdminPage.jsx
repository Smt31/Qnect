import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
import { useCurrentUser } from '../api/queryHooks';
import Navbar from '../components/Home/Navbar';
import LeftSidebar from '../components/Home/LeftSidebar';
import MobileNav from '../components/Home/MobileNav';

const requestCache = {
    users: {},
    posts: {},
    comments: {},
    groups: {}
};

export default function AdminPage() {
    const navigate = useNavigate();
    const { data: me } = useCurrentUser();
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [usersPage, setUsersPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [posts, setPosts] = useState([]);
    const [postsPage, setPostsPage] = useState(0);
    const [totalPostsPages, setTotalPostsPages] = useState(0);

    const [comments, setComments] = useState([]);
    const [commentsPage, setCommentsPage] = useState(0);
    const [totalCommentsPages, setTotalCommentsPages] = useState(0);

    const [groups, setGroups] = useState([]);
    const [groupsPage, setGroupsPage] = useState(0);
    const [totalGroupsPages, setTotalGroupsPages] = useState(0);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('stats');

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        loadStats();
    }, []);

    // Reset pagination when active tab or search query changes
    useEffect(() => {
        if (activeTab === 'users') setUsersPage(0);
        if (activeTab === 'posts') setPostsPage(0);
        if (activeTab === 'comments') setCommentsPage(0);
        if (activeTab === 'groups') setGroupsPage(0);
    }, [activeTab, debouncedQuery]);

    useEffect(() => {
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'posts') loadPosts();
        if (activeTab === 'comments') loadComments();
        if (activeTab === 'groups') loadGroups();
    }, [activeTab, usersPage, postsPage, commentsPage, groupsPage, debouncedQuery]);

    const loadStats = async () => {
        try {
            const data = await adminApi.getStats();
            setStats(data);
        } catch (e) {
            console.error('Failed to load stats:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const cacheKey = `${debouncedQuery}-${usersPage}`;
            if (requestCache.users[cacheKey]) {
                const data = requestCache.users[cacheKey];
                setUsers(data.content || []);
                setTotalPages(data.totalPages || 0);
            } else {
                const data = await adminApi.getUsers(debouncedQuery, usersPage, 20);
                requestCache.users[cacheKey] = data;
                setUsers(data.content || []);
                setTotalPages(data.totalPages || 0);
            }

            // Preload next page
            const nextCacheKey = `${debouncedQuery}-${usersPage + 1}`;
            if (!requestCache.users[nextCacheKey]) {
                adminApi.getUsers(debouncedQuery, usersPage + 1, 20).then(nextData => {
                    requestCache.users[nextCacheKey] = nextData;
                }).catch(e => console.error(e));
            }
        } catch (e) {
            console.error('Failed to load users:', e);
        }
    };

    const loadPosts = async () => {
        try {
            const cacheKey = `${debouncedQuery}-${postsPage}`;
            if (requestCache.posts[cacheKey]) {
                const data = requestCache.posts[cacheKey];
                setPosts(data.content || []);
                setTotalPostsPages(data.totalPages || 0);
            } else {
                const data = await adminApi.getPosts(debouncedQuery, postsPage, 20);
                requestCache.posts[cacheKey] = data;
                setPosts(data.content || []);
                setTotalPostsPages(data.totalPages || 0);
            }

            // Preload next page
            const nextCacheKey = `${debouncedQuery}-${postsPage + 1}`;
            if (!requestCache.posts[nextCacheKey]) {
                adminApi.getPosts(debouncedQuery, postsPage + 1, 20).then(nextData => {
                    requestCache.posts[nextCacheKey] = nextData;
                }).catch(e => console.error(e));
            }
        } catch (e) {
            console.error('Failed to load posts:', e);
        }
    };

    const loadComments = async () => {
        try {
            const cacheKey = `${debouncedQuery}-${commentsPage}`;
            if (requestCache.comments[cacheKey]) {
                const data = requestCache.comments[cacheKey];
                setComments(data.content || []);
                setTotalCommentsPages(data.totalPages || 0);
            } else {
                const data = await adminApi.getComments(debouncedQuery, commentsPage, 20);
                requestCache.comments[cacheKey] = data;
                setComments(data.content || []);
                setTotalCommentsPages(data.totalPages || 0);
            }

            // Preload next page
            const nextCacheKey = `${debouncedQuery}-${commentsPage + 1}`;
            if (!requestCache.comments[nextCacheKey]) {
                adminApi.getComments(debouncedQuery, commentsPage + 1, 20).then(nextData => {
                    requestCache.comments[nextCacheKey] = nextData;
                }).catch(e => console.error(e));
            }
        } catch (e) {
            console.error('Failed to load comments:', e);
        }
    };

    const loadGroups = async () => {
        try {
            const cacheKey = `${debouncedQuery}-${groupsPage}`;
            if (requestCache.groups[cacheKey]) {
                const data = requestCache.groups[cacheKey];
                setGroups(data.content || []);
                setTotalGroupsPages(data.totalPages || 0);
            } else {
                const data = await adminApi.getGroups(debouncedQuery, groupsPage, 20);
                requestCache.groups[cacheKey] = data;
                setGroups(data.content || []);
                setTotalGroupsPages(data.totalPages || 0);
            }

            // Preload next page
            const nextCacheKey = `${debouncedQuery}-${groupsPage + 1}`;
            if (!requestCache.groups[nextCacheKey]) {
                adminApi.getGroups(debouncedQuery, groupsPage + 1, 20).then(nextData => {
                    requestCache.groups[nextCacheKey] = nextData;
                }).catch(e => console.error(e));
            }
        } catch (e) {
            console.error('Failed to load groups:', e);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (!window.confirm(`Are you sure you want to delete user @${username}? This cannot be undone.`)) return;
        try {
            await adminApi.deleteUser(userId);
            requestCache.users = {}; // Invalidate cache
            setUsers(prev => prev.filter(u => u.userId !== userId));
            loadStats(); // refresh counts
        } catch (e) {
            alert(e.message || 'Failed to delete user');
        }
    };

    const handleDeletePost = async (postId, title) => {
        if (!window.confirm(`Are you sure you want to delete the post "${title}"? This cannot be undone.`)) return;
        try {
            await adminApi.deletePost(postId);
            requestCache.posts = {}; // Invalidate cache
            setPosts(prev => prev.filter(p => p.id !== postId));
            loadStats(); // refresh counts
        } catch (e) {
            alert(e.message || 'Failed to delete post');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment? This cannot be undone.')) return;
        try {
            await adminApi.deleteComment(commentId);
            requestCache.comments = {}; // Invalidate cache
            setComments(prev => prev.filter(c => c.id !== commentId));
            loadStats(); // refresh counts
        } catch (e) {
            alert(e.message || 'Failed to delete comment');
        }
    };

    const handleDeleteGroup = async (groupId, name) => {
        if (!window.confirm(`Are you sure you want to delete the group "${name}"? This cannot be undone.`)) return;
        try {
            await adminApi.deleteGroup(groupId);
            requestCache.groups = {}; // Invalidate cache
            setGroups(prev => prev.filter(g => g.id !== groupId));
            loadStats(); // refresh counts
        } catch (e) {
            alert(e.message || 'Failed to delete group');
        }
    };

    const handleToggleRole = async (userId, currentRole) => {
        const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        if (!window.confirm(`Change role to ${newRole}?`)) return;
        try {
            await adminApi.updateRole(userId, newRole);
            requestCache.users = {}; // Invalidate cache
            setUsers(prev => prev.map(u => u.userId === userId ? { ...u, role: newRole } : u));
        } catch (e) {
            alert(e.message || 'Failed to update role');
        }
    };

    const statCards = stats ? [
        { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'from-blue-500 to-blue-600' },
        { label: 'Total Posts', value: stats.totalPosts, icon: '📝', color: 'from-rose-500 to-pink-600' },
        { label: 'Total Comments', value: stats.totalComments, icon: '💬', color: 'from-amber-500 to-orange-600' },
        { label: 'Total Groups', value: stats.totalGroups, icon: '👥', color: 'from-emerald-500 to-green-600' },
    ] : [];

    return (
        <div className="min-h-screen bg-[#FFF1F2]">
            <Navbar user={me} />
            <div className="flex">
                <LeftSidebar user={me} />
                <main className="flex-1 md:ml-64 p-4 md:p-6 bg-[#FFF1F2] min-h-screen">
                    <div className="max-w-5xl mx-auto">

                        {/* Header */}
                        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center text-white text-lg">
                                    ⚙️
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                                    <p className="text-sm text-gray-500">Platform management and moderation</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="bg-white rounded-xl shadow-sm mb-6 border border-gray-100 overflow-hidden flex flex-col md:flex-row md:items-center justify-between">
                            <div className="flex overflow-x-auto w-full md:w-auto scrollbar-hide">
                                {['stats', 'users', 'posts', 'comments', 'groups'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => {
                                            setActiveTab(tab);
                                            setSearchQuery(''); // Clear search on tab change
                                        }}
                                        className={`flex-1 md:flex-none px-6 py-3 text-sm font-medium capitalize transition-colors whitespace-nowrap ${activeTab === tab
                                            ? 'border-b-2 border-rose-500 text-rose-600 bg-rose-50/50'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-b-2 border-transparent'
                                            }`}
                                    >
                                        {tab === 'stats' && '📊 Statistics'}
                                        {tab === 'users' && '👤 Users'}
                                        {tab === 'posts' && '📝 Posts'}
                                        {tab === 'comments' && '💬 Comments'}
                                        {tab === 'groups' && '🏢 Groups'}
                                    </button>
                                ))}
                            </div>

                            {/* Search Bar - Hidden on Stats tab */}
                            {activeTab !== 'stats' && (
                                <div className="p-3 md:p-0 md:pr-4 md:w-64 border-t border-gray-100 md:border-t-0">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder={`Search ${activeTab}...`}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                        />
                                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stats Tab */}
                        {activeTab === 'stats' && (
                            <div>
                                {loading ? (
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                                                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                                                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        {statCards.map(card => (
                                            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-2xl">{card.icon}</span>
                                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} opacity-20`}></div>
                                                </div>
                                                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                                                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value?.toLocaleString() || 0}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Users Tab */}
                        {activeTab === 'users' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">User</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Email</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Role</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Joined</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {users.map(user => (
                                                <tr key={user.userId} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                                                                {user.avatarUrl ? (
                                                                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    user.fullName?.[0] || '?'
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
                                                                <p className="text-xs text-gray-500">@{user.username}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-600 hidden md:table-cell">{user.email}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.role === 'ADMIN'
                                                            ? 'bg-purple-100 text-purple-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-500 hidden sm:table-cell">
                                                        {new Date(user.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleToggleRole(user.userId, user.role)}
                                                                className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                                                                title={user.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                                                            >
                                                                {user.role === 'ADMIN' ? 'Demote' : 'Promote'}
                                                            </button>
                                                            {me?.userId !== user.userId && (
                                                                <button
                                                                    onClick={() => handleDeleteUser(user.userId, user.username)}
                                                                    className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                                        <button
                                            onClick={() => setUsersPage(p => Math.max(0, p - 1))}
                                            disabled={usersPage === 0}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-sm text-gray-500">Page {usersPage + 1} of {totalPages}</span>
                                        <button
                                            onClick={() => setUsersPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={usersPage >= totalPages - 1}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Posts Tab */}
                        {activeTab === 'posts' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Post Title</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Author</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Comments</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Date</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {posts.map(post => (
                                                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{post.title}</p>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm hidden md:table-cell">
                                                        <p className="text-gray-900">{post.authorName}</p>
                                                        <p className="text-xs text-gray-500">@{post.authorUsername}</p>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-600">
                                                        {post.commentsCount}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-500 hidden sm:table-cell">
                                                        {new Date(post.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button
                                                            onClick={() => handleDeletePost(post.id, post.title)}
                                                            className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {posts.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="py-8 text-center text-sm text-gray-500">
                                                        No posts found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalPostsPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                                        <button
                                            onClick={() => setPostsPage(p => Math.max(0, p - 1))}
                                            disabled={postsPage === 0}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-sm text-gray-500">Page {postsPage + 1} of {totalPostsPages}</span>
                                        <button
                                            onClick={() => setPostsPage(p => Math.min(totalPostsPages - 1, p + 1))}
                                            disabled={postsPage >= totalPostsPages - 1}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Comments Tab */}
                        {activeTab === 'comments' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Content</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Author</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Date</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {comments.map(comment => (
                                                <tr key={comment.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-3 px-4 max-w-xs md:max-w-md">
                                                        <p className="text-sm text-gray-900 truncate">{comment.content}</p>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm hidden md:table-cell">
                                                        <p className="text-gray-900">{comment.authorName}</p>
                                                        <p className="text-xs text-gray-500">@{comment.authorUsername}</p>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-500 hidden sm:table-cell">
                                                        {new Date(comment.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {comments.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="py-8 text-center text-sm text-gray-500">
                                                        No comments found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalCommentsPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                                        <button
                                            onClick={() => setCommentsPage(p => Math.max(0, p - 1))}
                                            disabled={commentsPage === 0}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-sm text-gray-500">Page {commentsPage + 1} of {totalCommentsPages}</span>
                                        <button
                                            onClick={() => setCommentsPage(p => Math.min(totalCommentsPages - 1, p + 1))}
                                            disabled={commentsPage >= totalCommentsPages - 1}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Groups Tab */}
                        {activeTab === 'groups' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Group Name</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Creator</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Members</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Created</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {groups.map(group => (
                                                <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <p className="text-sm font-semibold text-gray-900">{group.name}</p>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm hidden md:table-cell">
                                                        <p className="text-gray-900">{group.creatorName}</p>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-600">
                                                        {group.membersCount}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-500 hidden sm:table-cell">
                                                        {new Date(group.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button
                                                            onClick={() => handleDeleteGroup(group.id, group.name)}
                                                            className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {groups.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="py-8 text-center text-sm text-gray-500">
                                                        No groups found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalGroupsPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                                        <button
                                            onClick={() => setGroupsPage(p => Math.max(0, p - 1))}
                                            disabled={groupsPage === 0}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-sm text-gray-500">Page {groupsPage + 1} of {totalGroupsPages}</span>
                                        <button
                                            onClick={() => setGroupsPage(p => Math.min(totalGroupsPages - 1, p + 1))}
                                            disabled={groupsPage >= totalGroupsPages - 1}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
            <MobileNav />
        </div>
    );
}
