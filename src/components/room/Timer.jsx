import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import useTimer from '../../hooks/useTimer';
import { useState, useEffect } from 'react';
import socketService from '../../services/socket';
import useRoomStore from '../../store/roomStore';

function Timer({ roomId }) {
  const { minutes, seconds, isRunning, progress, start, pause, reset, setTime, setTimerState } = useTimer(25);
  const [showPresets, setShowPresets] = useState(false);
  const { currentRoom } = useRoomStore();
  const isOwner = currentRoom?.participants?.find(p => p.isOwner && p.id === socketService.getSocket()?.id);

  useEffect(() => {
    // 타이머 동기화 이벤트 수신
    socketService.onTimerSync((timerData) => {
      setTimerState(timerData.minutes, timerData.seconds, timerData.isRunning, timerData.totalSeconds);
    });

    return () => {
      socketService.off('timer-sync');
    };
  }, [setTimerState]);

  // 시간 포맷팅 (두 자리로 표시)
  const formatTime = (num) => String(num).padStart(2, '0');

  // 프리셋 시간들 (뽀모도로, 짧은 휴식, 긴 휴식)
  const presets = [
    { label: '뽀모도로', minutes: 25 },
    { label: '짧은 휴식', minutes: 5 },
    { label: '긴 휴식', minutes: 15 },
    { label: '30분', minutes: 30 },
    { label: '45분', minutes: 45 },
    { label: '60분', minutes: 60 },
  ];

  const handleStart = () => {
    if (isOwner) {
      start();
      socketService.timerStart(roomId);
    }
  };

  const handlePause = () => {
    if (isOwner) {
      pause();
      socketService.timerPause(roomId);
    }
  };

  const handleReset = () => {
    if (isOwner) {
      reset();
      socketService.timerReset(roomId, 25);
    }
  };

  const handleSetTime = (newMinutes) => {
    if (isOwner) {
      setTime(newMinutes);
      socketService.timerReset(roomId, newMinutes);
      setShowPresets(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">타이머</h2>
        {isOwner ? (
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            <Clock className="w-4 h-4" />
            시간 설정
          </button>
        ) : (
          <span className="text-xs text-gray-500">방장만 컨트롤 가능</span>
        )}
      </div>

      {/* 프리셋 버튼들 */}
      {showPresets && isOwner && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleSetTime(preset.minutes)}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-purple-100 hover:text-purple-700 rounded-lg transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* 타이머 디스플레이 */}
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-7xl font-bold text-gray-900 mb-8 font-mono">
          {formatTime(minutes)}:{formatTime(seconds)}
        </div>

        {/* 진행 상태 표시 */}
        {isRunning && (
          <div className="mb-6 flex items-center gap-2 text-green-600">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">진행 중</span>
          </div>
        )}

        {/* 컨트롤 버튼들 */}
        <div className="flex gap-4">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={!isOwner || (minutes === 0 && seconds === 0)}
              className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5" />
              시작
            </button>
          ) : (
            <button
              onClick={handlePause}
              disabled={!isOwner}
              className="px-8 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pause className="w-5 h-5" />
              일시정지
            </button>
          )}
          
          <button
            onClick={handleReset}
            disabled={!isOwner}
            className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-5 h-5" />
            리셋
          </button>
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="mt-6">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-600 transition-all duration-1000"
            style={{
              width: `${progress}%`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default Timer;