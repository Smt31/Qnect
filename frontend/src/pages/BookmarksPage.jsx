import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookmarkApi, getAuthToken, userApi, voteApi, questionApi } from '../api';
import Navbar from '../components/Home/Navbar';
import LeftSidebar from '../components/Home/LeftSidebar';
import MobileNav from '../components/Home/MobileNav';
import CompactFeedCard from '../components/Feed/CompactFeedCard';

export default function BookmarksPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // const [askOpen, setAskOpen] = useState(false); // Removed

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const meRes = await userApi.getCurrentUser();
      setMe(meRes);

      const res = await bookmarkApi.getMyBookmarks(0, 30);
      const list = Array.isArray(res) ? res : (res.content || []);
      setItems(list);
    } catch (e) {
      setError(e?.message || 'Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (postId) => {
    try {
      if (!window.confirm('Remove this bookmark?')) return;
      await bookmarkApi.unbookmarkPost(postId);
      setItems((prev) => prev.filter((x) => x.post?.id !== postId));
    } catch (e) {
      console.error(e);
      alert('Failed to remove bookmark');
    }
  };

  const handleVote = async (postId, type) => {
    // Optimistic update tricky without full post structure, 
    // but we can try to update the 'post' inside the bookmark item
    try {
      await voteApi.voteQuestion(postId, type);
      // We won't update UI counts here purely because we don't have the sophisticated state management of HomePage
      // But the action executes.
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePost = async (postId) => {
    // Users shouldn't delete posts from bookmarks page usually, but if it is THEIR post, they can.
    // Logic same as HomePage
    if (!window.confirm('Delete this question?')) return;
    try {
      await questionApi.deleteQuestion(postId);
      setItems(prev => prev.filter(x => x.post?.id !== postId));
    } catch (e) {
      console.error(e);
      alert('Failed to delete post');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF1F2]">
      <Navbar user={me} />

      <div className="flex">
        <LeftSidebar user={me} />
        {/* Redirect to home for asking question for simplicity, or we duplicate modal logic */}

        <main className="flex-1 md:ml-64 p-6 max-w-5xl">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
            <h1 className="text-xl font-bold text-gray-900">Saved Posts</h1>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : error ? (
            <div className="bg-white p-6 rounded-lg border border-red-200 text-center">
              <div className="text-red-600 mb-2">{error}</div>
              <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200" onClick={load}>Retry</button>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">No saved posts</h3>
              <p className="text-gray-500 mb-4">Posts you bookmark will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((b) => (
                <CompactFeedCard
                  key={b.bookmarkId}
                  post={b.post}
                  actionElement={
                    <button
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(b.post?.id);
                      }}
                    >
                      Unbookmark
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
