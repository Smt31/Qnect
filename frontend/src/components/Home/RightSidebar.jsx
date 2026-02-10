import { useNavigate } from 'react-router-dom';

export default function RightSidebar({ trending, suggestions, followedUsers, onFollow }) {
    const navigate = useNavigate();

    return (
        <aside className="hidden lg:block w-80 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-6 space-y-6 self-start border-l border-gray-100 bg-[#FFF5F6]/50">
            {/* Trending Today */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-pink-500 to-red-500"></div>
                <div className="flex items-center justify-between mb-4 mt-2">
                    <h3 className="font-bold text-lg text-gray-900">🔥 Trending Today</h3>
                </div>
                <div className="space-y-3">
                    {trending && trending.length > 0 ? (
                        trending.slice(0, 3).map((post, index) => (
                            <div
                                key={post.id}
                                className="group flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                                onClick={() => navigate(`/question/${post.id}`)}
                            >
                                <span className="text-red-500 font-bold text-sm mt-0.5">#{index + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 text-sm group-hover:text-red-600 transition-colors line-clamp-2">{post.title}</h4>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-xs text-gray-500">{post.viewsCount || 0} views</span>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-xs text-gray-500">{post.answerCount || 0} answers</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-sm">No trending questions yet.</p>
                    )}
                </div>
            </div>

            {/* Who to Follow */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-pink-500 to-red-500"></div>
                <h3 className="font-bold text-lg mb-4 text-gray-900 mt-2">👥 Who to Follow</h3>
                <div className="space-y-4">
                    {suggestions && suggestions.users && suggestions.users.length > 0 ? (
                        suggestions.users.slice(0, 3).map((user) => (
                            <div
                                key={user.userId}
                                className="flex items-center justify-between group hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors cursor-pointer"
                                onClick={() => navigate(`/profile/${user.userId}`)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-center bg-no-repeat bg-cover rounded-full w-10 h-10 flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-500 text-white font-bold shadow-sm">
                                        {user.avatarUrl ? (
                                            <img
                                                src={user.avatarUrl}
                                                alt={user?.fullName || user?.username}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <span>{user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <h4 className="font-semibold text-gray-900 text-sm">{user.fullName}</h4>
                                        <p className="text-xs text-gray-500">@{user.username}</p>
                                    </div>
                                </div>
                                <button
                                    className={`text-sm font-medium transition-colors ${followedUsers[user.userId] ? 'text-gray-500' : 'text-red-600 hover:text-red-700'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onFollow(user.userId);
                                    }}
                                >
                                    {followedUsers[user.userId] ? 'Following' : 'Follow'}
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-sm">No suggestions available.</p>
                    )}
                </div>
            </div>
        </aside>
    );
}
