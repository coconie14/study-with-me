import { Play, Pause, RotateCcw, Clock, Edit2 } from 'lucide-react';
import useTimer from '../../hooks/useTimer';
import { useState, useEffect, useRef } from 'react';
import socketService from '../../services/socket';
import studySessionService from '../../services/studySessionService';
import useRoomStore from '../../store/roomStore';
import useAuthStore from '../../store/authStore';

function Timer({ roomId }) {
  const { minutes, seconds, isRunning, progress, start, pause, reset, setTime, setTimerState } = useTimer(25);
  const [showPresets, setShowPresets] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const { currentRoom } = useRoomStore();
  const { user } = useAuthStore();
  const isOwner = currentRoom?.participants?.find(p => p.isOwner && p.id === socketService.getSocket()?.id);
  
  // 타이머 시작 시간 기록용
  const startTimeRef = useRef(null);
  const initialMinutesRef = useRef(25);

  useEffect(() => {
    // 타이머 동기화 이벤트 수신
    socketService.onTimerSync((timerData) => {
      setTimerState(timerData.minutes, timerData.seconds, timerData.isRunning, timerData.totalSeconds);
    });

    return () => {
      socketService.off('timer-sync');
    };
  }, [setTimerState]);

  // 타이머 완료 감지 및 공부 시간 기록
  useEffect(() => {
    const recordStudyTime = async () => {
      // 타이머가 0이 되고, 이전에 실행 중이었던 경우
      if (minutes === 0 && seconds === 0 && startTimeRef.current && !isRunning) {
        const studiedMinutes = initialMinutesRef.current;
        
        try {
          // DB에 공부 세션 기록
          await studySessionService.saveSession(
            user.id,
            roomId,
            studiedMinutes
          );
          
          console.log(`✅ 공부 시간 기록: ${studiedMinutes}분`);
          
          // 알림 표시
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('공부 완료! 🎉', {
              body: `${studiedMinutes}분 동안 집중했습니다!`,
              icon: '/favicon.ico'
            });
          }
          
          // 기록 완료 후 초기화
          startTimeRef.current = null;
        } catch (error) {
          console.error('Failed to record study session:', error);
        }
      }
    };

    recordStudyTime();
  }, [minutes, seconds, isRunning, user, roomId]);

  // 시간 포맷팅
  const formatTime = (num) => String(num).padStart(2, '0');

  // 프리셋 시간들
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
      
      // 타이머 시작 시간 기록
      startTimeRef.current = Date.now();
      initialMinutesRef.current = minutes;
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
      
      // 리셋 시 시작 시간 초기화
      startTimeRef.current = null;
      initialMinutesRef.current = 25;
    }
  };

  const handleSetTime = (newMinutes) => {
    if (isOwner) {
      setTime(newMinutes);
      socketService.timerReset(roomId, newMinutes);
      setShowPresets(false);
      
      // 시간 변경 시 초기화
      startTimeRef.current = null;
      initialMinutesRef.current = newMinutes;
    }
  };

  const handleCustomTime = () => {
    const mins = parseInt(customMinutes);
    if (isNaN(mins) || mins < 1 || mins > 180) {
      alert('1분에서 180분 사이의 시간을 입력해주세요');
      return;
    }
    
    handleSetTime(mins);
    setCustomMinutes('');
    setShowCustomInput(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">타이머</h2>
        {isOwner ? (
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
          >
            <Clock className="w-4 h-4" />
            시간 설정
          </button>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">방장만 컨트롤 가능</span>
        )}
      </div>

      {/* 프리셋 버튼들 */}
      {showPresets && isOwner && (
        <div className="mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleSetTime(preset.minutes)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900 hover:text-purple-700 dark:hover:text-purple-300 rounded-lg transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* 커스텀 시간 입력 */}
          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full px-4 py-2 text-sm border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              직접 입력
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomTime()}
                placeholder="분 (1-180)"
                min="1"
                max="180"
                className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
              <button
                onClick={handleCustomTime}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
              >
                설정
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomMinutes('');
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
            </div>
          )}
        </div>
      )}

      {/* 타이머 디스플레이 */}
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-7xl font-bold text-gray-900 dark:text-white mb-8 font-mono">
          {formatTime(minutes)}:{formatTime(seconds)}
        </div>

        {/* 진행 상태 표시 */}
        {isRunning && (
          <div className="mb-6 flex items-center gap-2 text-green-600 dark:text-green-400">
            <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">진행 중</span>
          </div>
        )}

        {/* 완료 메시지 */}
        {minutes === 0 && seconds === 0 && !isRunning && startTimeRef.current && (
          <div className="mb-6 flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <span className="text-sm font-medium">✅ 공부 시간이 기록되었습니다!</span>
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
            className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-5 h-5" />
            리셋
          </button>
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="mt-6">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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