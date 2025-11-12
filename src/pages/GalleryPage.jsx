import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Clock, LogOut, User } from 'lucide-react';
import socketService from '../services/socket';
import roomService from '../services/roomService';
import profileService from '../services/profileService';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import ThemeToggle from '../components/common/ThemeToggle';

function GalleryPage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomTitle, setRoomTitle] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { rooms, setRooms, setCurrentRoom } = useRoomStore();
  const { user, signOut } = useAuthStore();
  
  // 사용자 닉네임
  const userNickname = user?.user_metadata?.nickname || user?.email?.split('@')[0] || 'User';

  // 프로필 확인 및 생성
  useEffect(() => {
    const initProfile = async () => {
      if (user) {
        try {
          const profile = await profileService.getProfile(user.id);
          if (!profile) {
            await profileService.createProfile(user.id, userNickname);
          }
        } catch (error) {
          if (error.code === 'PGRST116') {
            await profileService.createProfile(user.id, userNickname);
          }
        }
      }
    };

    initProfile();
  }, [user, userNickname]);

  // 방 목록 불러오기
  const loadRooms = async () => {
    try {
      const roomList = await roomService.getActiveRooms();
      setRooms(roomList);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  };

  // 초기화
  useEffect(() => {
    socketService.connect();
    loadRooms();
    const interval = setInterval(loadRooms, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 방 생성
  const handleCreateRoom = async () => {
    if (!roomTitle.trim()) {
      alert('방 제목을 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      // 1️⃣ DB에 영구적인 방 정보 생성
      const room = await roomService.createRoom({
        name: roomTitle,
        description: '',
        ownerId: user.id,
        ownerNickname: userNickname,
        maxParticipants: 6,
      });

      // 2️⃣ Socket 서버에 실시간 방 생성 (DB UUID 전달)
      const socketResponse = await socketService.createRoom({
        title: roomTitle,
        nickname: userNickname,
        roomId: room.id,
      });

      console.log('✅ 방 생성 완료:', { dbRoomId: room.id, socketRoomId: socketResponse.roomId });

      // 3️⃣ 현재 방 정보 저장
      setCurrentRoom({
        ...room,
        id: room.id,
        title: room.name,
        participants: socketResponse.room?.participants || [],
        isOwner: true,
      });

      setShowCreateModal(false);
      setRoomTitle('');
      navigate(`/room/${room.id}`);
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('방 생성에 실패했습니다: ' + (error.message || error.error || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  };

  // 방 입장
  const handleJoinRoom = async (roomId) => {
    setLoading(true);
    try {
      // 1️⃣ DB에서 방 정보 확인
      const room = await roomService.getRoom(roomId);
      
      if (!room) {
        alert('존재하지 않는 방입니다');
        return;
      }

      if (!room.is_active) {
        alert('비활성화된 방입니다');
        return;
      }

      // 2️⃣ Socket으로 방 입장 시도
      try {
        const socketResponse = await socketService.joinRoom(roomId, userNickname);
        
        // 3️⃣ DB에 참여자 추가
        try {
          await roomService.addParticipant(roomId, user.id, userNickname, false);
        } catch {
          console.log('이미 참여 중이거나 참여 기록이 있습니다');
        }

        // 4️⃣ 현재 방 정보 저장
        setCurrentRoom({
          ...room,
          id: room.id,
          title: room.name,
          participants: socketResponse.room?.participants || [],
          isOwner: room.owner_id === user.id,
        });

        navigate(`/room/${roomId}`);
        
      } catch {
        // Socket 서버에 방이 없으면 재생성
        console.log('Socket 서버에 방이 없어서 재생성합니다');
        
        const socketResponse = await socketService.createRoom({
          title: room.name,
          nickname: userNickname,
          roomId: room.id,
        });

        try {
          await roomService.addParticipant(roomId, user.id, userNickname, false);
        } catch {
          console.log('이미 참여 중이거나 참여 기록이 있습니다');
        }

        setCurrentRoom({
          ...room,
          id: room.id,
          title: room.name,
          participants: socketResponse.room?.participants || [],
          isOwner: room.owner_id === user.id,
        });

        navigate(`/room/${roomId}`);
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('방 입장에 실패했습니다: ' + (error.message || '실시간 서버 연결 실패'));
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Study Rooms</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                안녕하세요, <span className="font-semibold text-purple-600 dark:text-purple-400">{userNickname}</span>님
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => navigate('/profile')}
                className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="마이페이지"
              >
                <User className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={loading}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                방 만들기
              </button>
              <button
                onClick={handleLogout}
                className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">로딩 중...</p>
          </div>
        )}
        
        {!loading && rooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <RoomCard 
                key={room.id} 
                room={room} 
                onClick={() => handleJoinRoom(room.id)}
                disabled={loading}
              />
            ))}
          </div>
        ) : !loading ? (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">현재 활성화된 공부방이 없습니다</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold"
            >
              첫 번째 방을 만들어보세요!
            </button>
          </div>
        ) : null}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">새 공부방 만들기</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  방 제목
                </label>
                <input
                  type="text"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && handleCreateRoom()}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="예: 조용히 같이 공부해요"
                  autoFocus
                  disabled={loading}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setRoomTitle('');
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={loading || !roomTitle.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '생성 중...' : '만들기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomCard({ room, onClick, disabled }) {
  const emojis = ['🔥', '📚', '🌙', '☕', '🎯', '✨', '🚀', '💪'];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden group ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="h-40 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-6xl group-hover:scale-105 transition-transform duration-200">
        {emoji}
      </div>

      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{room.name}</h3>
        
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{room.participantCount || 0}명</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>활성</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            방장: {room.ownerNickname || room.profiles?.nickname || 'Unknown'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default GalleryPage;