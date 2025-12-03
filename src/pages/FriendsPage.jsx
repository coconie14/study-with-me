import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Search, UserPlus, Check, X, Clock, Users } from 'lucide-react';
import friendService from '../services/friendService';
import useAuthStore from '../store/authStore';
import { useToast } from '../contexts/ToastProvider';
import { useFriendRequests } from '../hooks/Usefriendrequests';

function FriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'search'
  const [friends, setFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // 💡 실시간 친구 요청 알림
  const { requestCount, refresh: refreshRequestCount, markAsRead } = useFriendRequests();

  // 💡 요청 탭으로 이동 시 알림 읽음 처리
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'requests') {
      markAsRead();
    }
  };

  // 친구 목록 로드
  useEffect(() => {
    if (user && activeTab === 'friends') {
      loadFriends();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]); // loadFriends는 의도적으로 제외 (무한 루프 방지)

  // 친구 요청 로드
  useEffect(() => {
    if (user && activeTab === 'requests') {
      loadRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]); // loadRequests는 의도적으로 제외 (무한 루프 방지)

  const loadFriends = async () => {
    setLoading(true);
    try {
      const data = await friendService.getFriends(user.id);
      setFriends(data);
    } catch (error) {
      console.error('친구 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const [received, sent] = await Promise.all([
        friendService.getReceivedRequests(user.id),
        friendService.getSentRequests(user.id),
      ]);
      setReceivedRequests(received);
      setSentRequests(sent);
    } catch (error) {
      console.error('요청 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 사용자 검색
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      showToast('2글자 이상 입력해주세요', 'warning');
      return;
    }

    setLoading(true);
    try {
      const results = await friendService.searchUsers(searchQuery, user.id);
      setSearchResults(results);
    } catch (error) {
      console.error('검색 실패:', error);
      showToast('검색에 실패했습니다', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 친구 요청 보내기
  const handleSendRequest = async (friendId) => {
    try {
      await friendService.sendFriendRequest(user.id, friendId);
      showToast('친구 요청을 보냈습니다', 'success');
      handleSearch(); // 검색 결과 새로고침
    } catch (error) {
      showToast(error.message || '친구 요청 실패', 'error');
    }
  };

  // 친구 요청 수락
  const handleAcceptRequest = async (requestId) => {
    try {
      await friendService.acceptFriendRequest(requestId, user.id);
      showToast('친구 요청을 수락했습니다', 'success');
      loadRequests();
      refreshRequestCount(); // 💡 알림 카운트 새로고침
    } catch (err) {
      console.error('요청 수락 실패:', err);
      showToast('요청 수락 실패', 'error');
    }
  };

  // 친구 요청 거절
  const handleRejectRequest = async (requestId) => {
    try {
      await friendService.rejectFriendRequest(requestId, user.id);
      showToast('친구 요청을 거절했습니다', 'info');
      loadRequests();
      refreshRequestCount(); // 💡 알림 카운트 새로고침
    } catch (err) {
      console.error('요청 거절 실패:', err);
      showToast('요청 거절 실패', 'error');
    }
  };

  // 친구 삭제
  const handleRemoveFriend = async (friendId) => {
    if (!confirm('정말로 친구를 삭제하시겠습니까?')) return;

    try {
      await friendService.removeFriend(user.id, friendId);
      showToast('친구를 삭제했습니다', 'info');
      loadFriends();
    } catch (err) {
      console.error('친구 삭제 실패:', err);
      showToast('친구 삭제 실패', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">친구</h1>
          </div>

          {/* 탭 */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => handleTabChange('friends')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'friends'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              친구 목록 ({friends.length})
            </button>
            <button
              onClick={() => handleTabChange('requests')}
              className={`relative px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              요청 ({requestCount})
              {requestCount > 0 && activeTab !== 'requests' && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {requestCount > 9 ? '9+' : requestCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('search')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'search'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              친구 찾기
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 친구 목록 탭 */}
        {activeTab === 'friends' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">아직 친구가 없습니다</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  친구 찾기
                </button>
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">{friend.nickname?.[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{friend.nickname}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        총 {Math.floor((friend.total_study_time || 0) / 60)}시간 공부
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFriend(friend.id)}
                    className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    삭제
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* 요청 탭 */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* 받은 요청 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                받은 요청 ({receivedRequests.length})
              </h3>
              {receivedRequests.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">받은 요청이 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {receivedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                          {request.sender?.avatar_url ? (
                            <img src={request.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-bold">{request.sender?.nickname?.[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{request.sender?.nickname}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(request.created_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 보낸 요청 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                보낸 요청 ({sentRequests.length})
              </h3>
              {sentRequests.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">보낸 요청이 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {sentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                          {request.receiver?.avatar_url ? (
                            <img src={request.receiver.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-bold">{request.receiver?.nickname?.[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{request.receiver?.nickname}</p>
                          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>대기 중</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 검색 탭 */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* 검색창 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="닉네임으로 검색 (2글자 이상)"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  검색
                </button>
              </div>
            </div>

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold">{user.nickname?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.nickname}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          총 {Math.floor((user.total_study_time || 0) / 60)}시간 공부
                        </p>
                      </div>
                    </div>
                    {user.friendshipStatus === 'accepted' ? (
                      <span className="px-3 py-1 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        친구
                      </span>
                    ) : user.friendshipStatus === 'pending' ? (
                      <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        대기 중
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(user.id)}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>친구 추가</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default FriendsPage;