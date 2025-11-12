import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import IntroPage from './pages/IntroPage';
import LoginPage from './pages/LoginPage';
import GalleryPage from './pages/GalleryPage';
import RoomPage from './pages/RoomPage';
import ProfilePage from './pages/ProfilePage';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';
import { auth } from './lib/supabase';
import notificationService from './services/notificationService';
import { ToastProvider } from './contexts/ToastProvider';

// 보호된 라우트 컴포넌트
function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const { setUser, setSession, setLoading, initialize } = useAuthStore();
  const { initializeTheme } = useThemeStore();

  useEffect(() => {
    // 테마 초기화
    initializeTheme();
    
    // 초기 인증 상태 확인
    initialize();

    // 인증 상태 변경 리스너
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [setUser, setSession, setLoading, initialize, initializeTheme]);

  // 🔔 알림 권한 요청 (로그인 후 2초 뒤)
  useEffect(() => {
    const timer = setTimeout(() => {
      notificationService.requestPermission();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // 🔔 창 포커스 시 깜빡임 중지
  useEffect(() => {
    const handleFocus = () => {
      notificationService.stopBlinkTitle();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return (
    <ToastProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Routes>
            {/* 공개 라우트 */}
            <Route path="/" element={<IntroPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* 보호된 라우트 */}
            <Route 
              path="/gallery" 
              element={
                <ProtectedRoute>
                  <GalleryPage />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/room/:roomId" 
              element={
                <ProtectedRoute>
                  <RoomPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;