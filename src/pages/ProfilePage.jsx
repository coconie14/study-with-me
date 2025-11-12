import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Calendar, Clock, TrendingUp } from 'lucide-react';
import profileService from '../services/profileService';
import useAuthStore from '../store/authStore';
import EditProfileModal from '../components/profile/EditProfileModal';

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  // 프로필 및 통계 불러오기
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // 프로필 정보
        const profileData = await profileService.getProfile(user.id);
        setProfile(profileData);

        // 공부 통계
        const statsData = await profileService.getStudyStats(user.id);
        setStats(statsData);
      } catch (error) {
        console.error('프로필 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [user]);

  // 프로필 업데이트 후 재로딩
  const handleProfileUpdate = async () => {
    const profileData = await profileService.getProfile(user.id);
    setProfile(profileData);
    setShowEditModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/gallery')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">마이페이지</h1>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* 프로필 카드 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                {/* 아바타 */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold">
                  {profile?.nickname?.[0]?.toUpperCase() || 'U'}
                </div>
                
                {/* 기본 정보 */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {profile?.nickname || '사용자'}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {user?.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      가입일: {new Date(profile?.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 편집 버튼 */}
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span>편집</span>
              </button>
            </div>

            {/* 자기소개 */}
            {profile?.bio && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300">{profile.bio}</p>
              </div>
            )}
          </div>

          {/* 공부 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 총 공부 시간 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">총 공부 시간</h3>
              </div>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {Math.floor((profile?.total_study_time || 0) / 60)}h {(profile?.total_study_time || 0) % 60}m
              </p>
            </div>

            {/* 완료한 세션 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">완료한 세션</h3>
              </div>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats?.recentSessions?.length || 0}개
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">최근 7일</p>
            </div>

            {/* 평균 집중 시간 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">평균 집중 시간</h3>
              </div>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats?.recentSessions?.length > 0
                  ? Math.round(
                      stats.recentSessions.reduce((sum, s) => sum + s.duration_minutes, 0) /
                      stats.recentSessions.length
                    )
                  : 0}분
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">세션당</p>
            </div>
          </div>

          {/* 최근 활동 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              최근 7일 활동
            </h3>
            
            {stats?.recentSessions?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          공부 세션 완료
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(session.created_at).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      {session.duration_minutes}분
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>아직 공부 기록이 없습니다</p>
                <p className="text-sm mt-1">타이머를 완료하면 기록이 저장됩니다</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 프로필 편집 모달 */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
}

export default ProfilePage;