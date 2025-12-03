import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Users, Settings, Trash2, LogOut } from 'lucide-react';
import Timer from '../components/room/Timer';
import MediaPlayer from '../components/room/MediaPlayer';
import Chat from '../components/room/Chat';
import ParticipantList from '../components/room/ParticipantList';
import socketService from '../services/socket';
import roomService from '../services/roomService';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import ThemeToggle from '../components/common/ThemeToggle';
import { useToast } from '../contexts/ToastProvider';

function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentRoom, addParticipant, removeParticipant, updateOwner, leaveRoom, setCurrentRoom } = useRoomStore();
  const { showToast } = useToast();
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false); // 💡 퇴장 확인 모달 추가
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false); // 💡 퇴장 중 상태
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [ownerAwayUntil, setOwnerAwayUntil] = useState(null); // 💡 방장 부재 시간
  const [isLoading, setIsLoading] = useState(true); // 💡 로딩 상태 추가

  // 현재 사용자가 방장인지 확인
  const isOwner = currentRoom?.isOwner || currentRoom?.owner_id === user?.id;
  
  // 💡 현재 사용자 닉네임
  const userNickname = user?.user_metadata?.nickname || user?.email?.split('@')[0] || 'User';

  // 집중 모드 토글
  const toggleFocusMode = () => {
    setIsFocusMode(prev => !prev);
  };

  // 💡 방 입장 시 타이머 동기화
  useEffect(() => {
    const initRoom = async () => {
      try {
        // Socket으로 방 재입장 (타이머 상태 받기)
        const response = await socketService.joinRoom(roomId, userNickname, user.id);
        
        if (response.success && response.room) {
          // 💡 서버에서 계산된 타이머 상태로 업데이트
          setCurrentRoom(response.room);
          console.log('✅ Room state synced:', response.room.timer);
          setIsLoading(false); // 💡 로딩 완료
        } else {
          // 💡 방을 찾을 수 없음
          console.error('❌ Room not found');
          setIsLoading(false);
          navigate('/gallery');
        }
      } catch (error) {
        console.error('Failed to sync room state:', error);
        showToast('방 정보를 불러오는데 실패했습니다.', 'error');
        setIsLoading(false);
        navigate('/gallery');
      }
    };

    initRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // 의도적으로 roomId 변경 시에만 실행

  useEffect(() => {
    // 💡 로딩 중에는 리스너 설정 안함
    if (isLoading || !currentRoom) {
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

    socketService.onNewOwner((newOwnerData) => {
      updateOwner(newOwnerData);
      console.log('New owner:', newOwnerData);
      
      // 💡 DB에도 방장 변경 반영 (비동기로 처리)
      if (newOwnerData.userId && roomId) {
        roomService.transferOwnership(roomId, newOwnerData.userId)
          .then(() => {
            console.log('✅ Owner updated in DB');
          })
          .catch(err => {
            console.error('❌ Failed to update owner in DB:', err);
          });
      }
      
      // 💡 reason에 따라 다른 메시지 표시
      if (newOwnerData.reason === 'owner-timeout') {
        showToast(`방장이 오래 자리를 비워 ${newOwnerData.nickname} 님이 새로운 방장이 되었습니다.`, 'warning', 4000);
      } else if (newOwnerData.reason === 'owner-left') {
        showToast(`${newOwnerData.nickname} 님이 새로운 방장이 되었습니다.`, 'info', 3000);
      } else {
        showToast(`${newOwnerData.nickname} 님이 새로운 방장이 되었습니다.`, 'info', 3000);
      }
      
      // 💡 방장 부재 상태 해제
      setOwnerAwayUntil(null);
    });

    // 💡 방장 부재 이벤트
    socketService.onOwnerAway((data) => {
      console.log('Owner went away:', data);
      setOwnerAwayUntil(data.graceEndTime);
      showToast(`방장 ${data.nickname} 님이 일시적으로 자리를 비웠습니다. (3분 내 복귀 시 방장 유지)`, 'warning', 5000);
    });

    // 방 삭제 이벤트
    socketService.onRoomDeleted(() => {
      showToast('방이 삭제되었습니다.', 'error');
      leaveRoom();
      navigate('/gallery');
    });

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      socketService.off('user-joined');
      socketService.off('user-left');
      socketService.off('new-owner');
      socketService.off('owner-away');
      socketService.off('room-deleted');
    };
  }, [currentRoom, navigate, addParticipant, removeParticipant, updateOwner, leaveRoom, showToast, userNickname, roomId]);

  // 💡 브라우저 닫기/새로고침 감지
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 💡 명시적으로 퇴장하지 않은 경우 비정상 종료로 처리
      // (서버에서 disconnect 이벤트로 처리됨)
      console.log('⚠️ User is leaving (beforeunload)');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 💡 명시적 퇴장 (퇴장 버튼)
  const handleExplicitLeave = async () => {
    setLeaving(true);
    
    // 💡 나가기 전에 현재 참여자 수 확인
    const isLastParticipant = currentRoom?.participants?.length === 1;
    
    try {
      // 1️⃣ DB에서 먼저 처리 (Socket보다 먼저)
      if (isLastParticipant) {
        // 💡 마지막 참여자 - 방 완전 삭제
        console.log('⚠️ Last participant, force deleting room from DB');
        await roomService.forceDeleteRoom(roomId);
      } else {
        // 💡 일반 퇴장 - 참여자만 제거
        console.log('👋 Removing participant from DB');
        await roomService.removeParticipant(roomId, user.id);
      }
      
      // 2️⃣ Socket으로 명시적 퇴장 알림
      const response = await socketService.leaveRoom(roomId, userNickname);
      console.log('✅ Explicit leave response:', response);
      
      // 3️⃣ 로컬 상태 정리
      leaveRoom();
      
      // 4️⃣ 갤러리로 이동
      navigate('/gallery');
      
      if (response.roomDeleted || isLastParticipant) {
        showToast('마지막 참여자였습니다. 방이 삭제되었습니다.', 'info');
      } else {
        showToast('방을 나갔습니다.', 'success');
      }
    } catch (error) {
      console.error('Failed to leave room:', error);
      showToast('방 나가기에 실패했습니다: ' + (error.message || '알 수 없는 오류'), 'error');
      
      // 오류가 발생해도 로컬에서는 나가기
      leaveRoom();
      navigate('/gallery');
    } finally {
      setLeaving(false);
      setShowLeaveModal(false);
    }
  };

  // 💡 뒤로가기 버튼 (비정상 종료)
  const handleBackButton = () => {
    // 💡 명시적 퇴장 없이 그냥 나가기 (disconnect 이벤트 발생)
    leaveRoom();
    navigate('/gallery');
  };

  // 방 삭제 (방장만)
  const handleDeleteRoom = async () => {
    setDeleting(true);
    try {
      // 1️⃣ DB에서 방 삭제
      await roomService.deleteRoom(roomId, user.id);

      // 2️⃣ Socket 서버에 방 삭제 알림
      await socketService.deleteRoom(roomId);

      console.log('✅ 방 삭제 완료:', roomId);

      // 3️⃣ 갤러리로 이동
      leaveRoom();
      navigate('/gallery');
      showToast('방이 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('방 삭제 실패:', error);
      showToast('방 삭제에 실패했습니다: ' + (error.message || '알 수 없는 오류'), 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">방 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!currentRoom) {
    return null;
  }

  return (
    <div className={`min-h-screen flex flex-col ${isFocusMode ? 'fixed inset-0 z-50' : 'bg-gray-50 dark:bg-gray-900'}`}>
      
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
                
                {/* 💡 뒤로가기 버튼 */}
                <button
                  onClick={handleBackButton}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="뒤로가기 (비정상 종료)"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
                
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{currentRoom.title}</h1>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      방장: {currentRoom.participants.find(p => p.isOwner)?.nickname || 'Unknown'}
                    </p>
                    {/* 💡 방장 부재 표시 */}
                    {ownerAwayUntil && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                        ⏱️ 부재중
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">{currentRoom.participants.length}</span>
                </div>
                
                {/* 💡 명시적 퇴장 버튼 (모든 사용자) */}
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="방 나가기"
                >
                  <LogOut className="w-4 h-4 text-gray-900 dark:text-white" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">퇴장</span>
                </button>
                
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
            
            {/* 💡 방장 부재 알림 배너 */}
            {ownerAwayUntil && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  ⚠️ 방장이 일시적으로 자리를 비웠습니다. 3분 내 복귀하지 않으면 자동으로 다음 참여자에게 방장이 넘어갑니다.
                </p>
              </div>
            )}
          </div>
        </header>
      )}

      {/* 메인 컨텐츠 */}
      <main className={`flex-1 w-full mx-auto py-6 ${isFocusMode ? 'max-w-full h-full p-0' : 'max-w-7xl px-4 sm:px-6 lg:px-8'}`}>
        
        {!isFocusMode ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2 space-y-6">
              <Timer 
                key={roomId} 
                roomId={roomId} 
                onToggleFocus={toggleFocusMode} 
                isFocusMode={isFocusMode} 
              />
              <MediaPlayer roomId={roomId} />
            </div>

            <div className="space-y-6">
              <ParticipantList participants={currentRoom.participants} />
              <Chat roomId={roomId} />
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <Timer 
              key={roomId} 
              roomId={roomId} 
              onToggleFocus={toggleFocusMode} 
              isFocusMode={isFocusMode} 
            />
          </div>
        )}
      </main>

      {/* 💡 퇴장 확인 모달 (새로 추가) */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                <LogOut className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                방을 나가시겠습니까?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {isOwner 
                  ? '방장이 나가면 다음 참여자에게 자동으로 방장이 넘어갑니다. 혼자 남았다면 방이 삭제됩니다.' 
                  : '퇴장 버튼을 누르면 즉시 방을 나가게 됩니다.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  disabled={leaving}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  onClick={handleExplicitLeave}
                  disabled={leaving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {leaving ? '퇴장 중...' : '퇴장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 방 삭제 확인 모달 */}
      {showDeleteModal && (
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