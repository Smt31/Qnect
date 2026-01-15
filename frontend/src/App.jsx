import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobileSidebarProvider } from './context/MobileSidebarContext';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import VerifyPage from './pages/VerifyPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import QuestionPage from './pages/QuestionPage';
import MyQuestionsPage from './pages/MyQuestionsPage';
import MyPostsPage from './pages/MyPostsPage';
import BookmarksPage from './pages/BookmarksPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import ChatPage from './pages/ChatPage';
import NewsPage from './pages/NewsPage';

// Export queryClient so it can be used to clear cache on login/logout
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MobileSidebarProvider>
          <div className="app">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/home" element={<HomePage />} />
              {/* /ask route shows the same authenticated home/feed + ask UI */}
              <Route path="/ask" element={<HomePage />} />
              <Route path="/question/:id" element={<QuestionPage />} />
              <Route path="/my-questions" element={<MyQuestionsPage />} />
              <Route path="/my-posts" element={<MyPostsPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </MobileSidebarProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
