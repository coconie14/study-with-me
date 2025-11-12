import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Users, Settings, Trash2 } from 'lucide-react';
import Timer from '../components/room/Timer';
import MediaPlayer from '../components/room/MediaPlayer';
import Chat from '../components/room/Chat';
import ParticipantList from '../components/room/ParticipantList';
import socketService from '../services/socket';
import roomService from '../services/roomService';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import ThemeToggle from '../components/common/ThemeToggle';
// 💡 useToast 임포트 경로 수정 (../contexts/ToastProvider.jsx)
import { useToast } from '../contexts/ToastProvider'; 
import BouncingLoader from '../components/common/BouncingLoader';


function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentRoom, addParticipant, removeParticipant, updateOwner, leaveRoom } = useRoomStore();
  const { showToast } = useToast(); // 💡 useToast 사용
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // 💡 1. 집중 모드 상태 추가
  const [isFocusMode, setIsFocusMode] = useState(false); 

  // 현재 사용자가 방장인지 확인
  const isOwner = currentRoom?.isOwner || currentRoom?.owner_id === user?.id;

  // 💡 2. 집중 모드 토글 함수
  const toggleFocusMode = () => {
    setIsFocusMode(prev => !prev);
  };
  
  useEffect(() => {
    // 방 정보가 없으면 갤러리로 리다이렉트
    if (!currentRoom) {
      navigate('/gallery');
      return;
    }

    // Socket 이벤트 리스너 설정
    socketService.onUserJoined((participant) => {
      addParticipant(participant);
      console.log('User joined:', participant);
      showToast(`${participant.nickname} 님이 입장했습니다.`, 'info', 2000);
    });

    socketService.onUserLeft((participant) => {
      removeParticipant(participant.id);
      console.log('User left:', participant);
      showToast(`${participant.nickname} 님이 퇴장했습니다.`, 'info', 2000);
    });

    socketService.onNewOwner((newOwner) => {
      updateOwner(newOwner);
      console.log('New owner:', newOwner);
      showToast(`${newOwner.nickname} 님이 새로운 방장이 되었습니다.`, 'info', 3000);
    });

    // 방 삭제 이벤트 리스너
    socketService.onRoomDeleted(() => { 
      // 💡 alert() 대신 showToast 사용
      showToast('방이 삭제되었습니다.', 'error');
      leaveRoom();
      navigate('/gallery');
    });

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      socketService.off('user-joined');
      socketService.off('user-left');
      socketService.off('new-owner');
      socketService.off('room-deleted');
    };
  }, [currentRoom, navigate, addParticipant, removeParticipant, updateOwner, leaveRoom, showToast]);

  // 방 나가기
  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/gallery');
  };

  // 방 삭제
  const handleDeleteRoom = async () => {
    setDeleting(true);
    try {
      // 1️⃣ DB에서 방 삭제
      await roomService.deleteRoom(roomId, user.id);

      // 2️⃣ Socket 서버에 방 삭제 알림
      await socketService.deleteRoom(roomId);

      console.log('✅ 방 삭제 완료:', roomId);

      // 3️⃣ 갤러리로 이동 (Socket 리스너가 처리하므로 불필요하지만 안전하게 유지)
      leaveRoom();
      navigate('/gallery');
    } catch (error) {
      console.error('방 삭제 실패:', error);
      // 💡 alert() 대신 showToast 사용
      showToast('방 삭제에 실패했습니다: ' + (error.message || '알 수 없는 오류'), 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!currentRoom) {
    return null;
  }

  return (
    // 💡 3. 집중 모드 활성화 시 전체 화면 스타일 적용
    <div className={`min-h-screen flex flex-col ${isFocusMode ? 'fixed inset-0 z-50' : 'bg-gray-50 dark:bg-gray-900'}`}>
      
      {/* 💡 4. 집중 모드일 때 헤더 숨기기 */}
      {!isFocusMode && (
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                  {currentRoom.coverImageUrl ? (
                    <img 
                      src={currentRoom.coverImageUrl} 
                      alt="Room Cover" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-2xl">{currentRoom.emoji}</span>
                  )}
                </div>
                <button
                  onClick={handleLeaveRoom}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="방 나가기"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
                
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{currentRoom.title}</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    방장: {currentRoom.participants.find(p => p.isOwner)?.nickname || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">{currentRoom.participants.length}</span>
                </div>
                
                {/* 방장만 삭제 버튼 표시 */}
                {isOwner && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="방 삭제"
                  >
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </button>
                )}

                 <ThemeToggle />
                
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <Settings className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* 메인 컨텐츠 */}
      {/* 💡 5. 집중 모드에 따라 레이아웃 변경 */}
      <main className={`flex-1 w-full mx-auto py-6 ${isFocusMode ? 'max-w-full h-full p-0' : 'max-w-7xl px-4 sm:px-6 lg:px-8'}`}>
        
        {/* 집중 모드가 아닐 때 일반 3분할 레이아웃 */}
        {!isFocusMode ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* 왼쪽: 타이머 & 미디어 플레이어 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 💡 Key 추가 */}
              <Timer 
                key={roomId} 
                roomId={roomId} 
                onToggleFocus={toggleFocusMode} 
                isFocusMode={isFocusMode} 
              />
              <MediaPlayer roomId={roomId} />
            </div>

            {/* 오른쪽: 참여자 & 채팅 */}
            <div className="space-y-6">
              <ParticipantList participants={currentRoom.participants} />
              <Chat roomId={roomId} />
            </div>
          </div>
        ) : (
          // 집중 모드일 때 타이머만 전체 화면으로 렌더링
          <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            {/* 💡 Key 추가 */}
            <Timer 
              key={roomId} 
              roomId={roomId} 
              onToggleFocus={toggleFocusMode} 
              isFocusMode={isFocusMode} 
            />
          </div>
        )}
      </main>

      {/* 방 삭제 확인 모달 (isFocusMode와 별개로 최상단에 고정) */}
      {showDeleteModal && (
        // 🚨 className 중복 제거
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                방을 삭제하시겠습니까?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                방을 삭제하면 모든 참여자가 내보내지며, 채팅 기록도 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteRoom}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomPage;