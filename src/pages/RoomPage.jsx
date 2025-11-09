import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, Users, Settings } from 'lucide-react';
import Timer from '../components/room/Timer';
import MediaPlayer from '../components/room/MediaPlayer';
import Chat from '../components/room/Chat';
import ParticipantList from '../components/room/ParticipantList';
import socketService from '../services/socket';
import useRoomStore from '../store/roomStore';

function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { currentRoom, addParticipant, removeParticipant, updateOwner, leaveRoom } = useRoomStore();

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
    });

    socketService.onUserLeft((participant) => {
      removeParticipant(participant.id);
      console.log('User left:', participant);
    });

    socketService.onNewOwner((newOwner) => {
      updateOwner(newOwner);
      console.log('New owner:', newOwner);
    });

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      socketService.off('user-joined');
      socketService.off('user-left');
      socketService.off('new-owner');
    };
  }, [currentRoom, navigate, addParticipant, removeParticipant, updateOwner]);

  // 방 나가기
  const handleLeaveRoom = () => {
    leaveRoom();
    socketService.disconnect();
    navigate('/gallery');
  };

  if (!currentRoom) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 상단 헤더 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-gray-900 dark:text-white" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* 왼쪽: 타이머 & 미디어 플레이어 */}
          <div className="lg:col-span-2 space-y-6">
            <Timer roomId={roomId} />
            <MediaPlayer roomId={roomId} />
          </div>

          {/* 오른쪽: 참여자 & 채팅 */}
          <div className="space-y-6">
            <ParticipantList participants={currentRoom.participants} />
            <Chat roomId={roomId} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default RoomPage;