import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Clock, LogOut, User, UserPlus } from 'lucide-react';
import socketService from '../services/socket';
import roomService from '../services/roomService';
import profileService from '../services/profileService';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import ThemeToggle from '../components/common/ThemeToggle';
import CreateRoomModal from '../components/room/CreateRoomModal';
import { useToast } from '../contexts/ToastProvider';
import BouncingLoader from '../components/common/BouncingLoader';
// 💡 친구 요청 알림 훅 추가 (유일한 새 import)
import { useFriendRequests } from '../hooks/useFriendRequests';

function GalleryPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const { rooms, setRooms, setCurrentRoom } = useRoomStore();
  const { user, signOut } = useAuthStore();

  // 💡 친구 요청 알림 (새로 추가)
  const { requestCount, markAsRead } = useFriendRequests();

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
          console.error('Profile initialization failed:', error);
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
      showToast('방 목록을 불러오는 데 실패했습니다.', 'error');
    }
  };

  // 초기화
  useEffect(() => {
    socketService.connect();
    loadRooms();
    const interval = setInterval(loadRooms, 5000);

    return () => clearInterval(interval);
  }, [showToast]);

  // 방 생성
  const handleCreateRoom = async (roomData) => {
    setLoading(true);
    try {
      const room = await roomService.createRoom({
        ...roomData,
        ownerId: user.id,
        ownerNickname: userNickname,
        maxParticipants: 6,
      });

      const socketResponse = await socketService.createRoom({
        title: room.name,
        nickname: userNickname,
        roomId: room.id,
        coverImageUrl: roomData.coverImageUrl || null,
        emoji: roomData.emoji || '📚',
      });

      setCurrentRoom({
        ...room,
        id: room.id,
        title: room.name,
        participants: socketResponse.room?.participants || [],
        isOwner: true,
      });

      showToast(`'${room.name}' 방이 생성되었습니다.`, 'success');
      setShowCreateModal(false);
      navigate(`/room/${room.id}`);
    } catch (error) {
      console.error('Failed to create room:', error);
      showToast('방 생성에 실패했습니다: ' + (error.message || error.error || '알 수 없는 오류'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // 방 입장
  const handleJoinRoom = async (roomId) => {
    setLoading(true);
    try {
      const room = await roomService.getRoom(roomId);
      if (!room) return showToast('존재하지 않는 방입니다.', 'error');
      if (!room.is_active) return showToast('비활성화된 방입니다.', 'error');

      try {
        const socketResponse = await socketService.joinRoom(roomId, userNickname);
        await roomService.addParticipant(roomId, user.id, userNickname, false);

        setCurrentRoom({
          ...room,
          id: room.id,
          title: room.name,
          participants: socketResponse.room?.participants || [],
          isOwner: room.owner_id === user.id,
        });

        navigate(`/room/${roomId}`);
      } catch (socketError) {
        console.warn('Socket room not found. Recreating room.', socketError);
        const socketResponse = await socketService.createRoom({
          title: room.name,
          nickname: userNickname,
          roomId: room.id,
          coverImageUrl: room.cover_image_url || null,
          emoji: room.emoji || '📚',
        });
        await roomService.addParticipant(roomId, user.id, userNickname, false);

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
      showToast('방 입장에 실패했습니다. 실시간 서버 연결을 확인해주세요.', 'error');
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

  // 💡 친구 페이지로 이동 (새로 추가)
  const handleGoToFriends = () => {
    markAsRead();
    navigate('/friends');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Study Rooms</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                안녕하세요, <span className="font-semibold text-blue-600 dark:text-blue-400">{userNickname}</span>님
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              
              {/* 💡 친구 버튼 추가 (새로운 버튼) */}
              <button
                onClick={handleGoToFriends}
                className="relative p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="친구"
              >
                <UserPlus className="w-5 h-5" />
                {requestCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {requestCount > 9 ? '9+' : requestCount}
                  </span>
                )}
              </button>

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
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <BouncingLoader /> 
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
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold"
            >
              첫 번째 방을 만들어보세요!
            </button>
          </div>
        ) : null}
      </main>

      {showCreateModal && (
        <CreateRoomModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRoom}
          ownerId={user?.id}
          ownerNickname={user?.user_metadata?.nickname || '익명'}
        />
      )}
    </div>
  );
}

function RoomCard({ room, onClick, disabled }) {
  const displayContent = room.coverImageUrl ? (
    <img src={room.coverImageUrl} alt={`${room.title} cover`} className="w-full h-full object-cover" />
  ) : (
    <span className="text-6xl">{room.emoji || '📚'}</span>
  );

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden group ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="h-40 bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center transition-transform duration-200">
        {displayContent}
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