import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Clock, LogOut } from 'lucide-react';
import socketService from '../services/socket';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';

function GalleryPage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomTitle, setRoomTitle] = useState('');
  
  const { rooms, setRooms, setCurrentRoom } = useRoomStore();
  const { user, signOut } = useAuthStore();
  
  // 사용자 닉네임 (Supabase에서 가져온 것 또는 이메일)
  const userNickname = user?.user_metadata?.nickname || user?.email?.split('@')[0] || 'User';

  // 방 목록 불러오기 함수
  const loadRooms = async () => {
    try {
      const roomList = await socketService.getRooms();
      setRooms(roomList);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  };

  // 초기화
  useEffect(() => {
    // Socket 연결
    socketService.connect();

    // 방 목록 불러오기
    loadRooms();

    // 5초마다 방 목록 갱신
    const interval = setInterval(loadRooms, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [setRooms]);

  const handleCreateRoom = async () => {
    if (!roomTitle.trim()) {
      alert('방 제목을 입력해주세요');
      return;
    }

    try {
      const response = await socketService.createRoom({
        title: roomTitle,
        nickname: userNickname
      });

      setCurrentRoom(response.room);
      setShowCreateModal(false);
      navigate(`/room/${response.roomId}`);
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('방 생성에 실패했습니다');
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      const response = await socketService.joinRoom(roomId, userNickname);
      setCurrentRoom(response.room);
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('방 입장에 실패했습니다');
    }
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      socketService.disconnect();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Study Rooms</h1>
              <p className="text-sm text-gray-500 mt-1">
                안녕하세요, <span className="font-semibold text-purple-600">{userNickname}</span>님
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                방 만들기
              </button>
              <button
                onClick={handleLogout}
                className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 방 갤러리 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {rooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onClick={() => handleJoinRoom(room.id)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-4">현재 활성화된 공부방이 없습니다</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-purple-600 hover:text-purple-700 font-semibold"
            >
              첫 번째 방을 만들어보세요!
            </button>
          </div>
        )}
      </main>

      {/* 방 만들기 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">새 공부방 만들기</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  방 제목
                </label>
                <input
                  type="text"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="예: 조용히 같이 공부해요"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setRoomTitle('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateRoom}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  만들기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomCard({ room, onClick }) {
  // 랜덤 이모지 생성
  const emojis = ['🔥', '📚', '🌙', '☕', '🎯', '✨', '🚀', '💪'];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden group"
    >
      {/* 썸네일 영역 */}
      <div className="h-40 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-6xl group-hover:scale-105 transition-transform duration-200">
        {emoji}
      </div>

      {/* 정보 영역 */}
      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-900 mb-3">{room.title}</h3>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{room.participants}명</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>활성</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">방장: {room.owner}</p>
        </div>
      </div>
    </div>
  );
}

export default GalleryPage;