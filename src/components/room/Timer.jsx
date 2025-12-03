import { Play, Pause, RotateCcw, Clock, Edit2, Maximize, Minimize } from 'lucide-react';
import useTimer from '../../hooks/useTimer';
import { useState, useEffect, useRef } from 'react';
import socketService from '../../services/socket';
import studySessionService from '../../services/studySessionService';
import useRoomStore from '../../store/roomStore';
import useAuthStore from '../../store/authStore';

function Timer({ roomId, onToggleFocus, isFocusMode }) {
  const { currentRoom } = useRoomStore();
  const { user } = useAuthStore();
  
  // 💡 currentRoom의 타이머 상태로 초기화
  const initialMinutes = currentRoom?.timer?.minutes || 25;
  
  const { minutes, seconds, isRunning, progress, start, pause, reset, setTime, setTimerState } = useTimer(initialMinutes);
  
  const [showPresets, setShowPresets] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const isOwner = currentRoom?.participants?.find(p => p.isOwner && p.id === socketService.getSocket()?.id);
  
  // 💡 타이머 시작 시간 기록용
  const startTimeRef = useRef(null);
  const initialMinutesRef = useRef(initialMinutes);
  const serverStartedAtRef = useRef(currentRoom?.timer?.startedAt || null); // 💡 서버의 startedAt 저장
  
  // 💡 타이머 동기화 간격 (1분마다 서버 시간과 재동기화)
  const syncIntervalRef = useRef(null);

  // 💡 컴포넌트 마운트 시 currentRoom의 타이머 상태 적용
  useEffect(() => {
    if (currentRoom?.timer) {
      const { minutes: m, seconds: s, isRunning: running, totalSeconds, startedAt } = currentRoom.timer;
      
      setTimerState(m, s, running, totalSeconds);
      initialMinutesRef.current = Math.floor(totalSeconds / 60);
      serverStartedAtRef.current = startedAt;
      
      if (running && startedAt) {
        startTimeRef.current = startedAt;
      }
      
      console.log('⏱️ Timer initialized from currentRoom:', currentRoom.timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 💡 의도적으로 마운트 시 한 번만 실행

  // 💡 서버로부터 타이머 상태 동기화
  useEffect(() => {
    socketService.onTimerSync((timerData) => {
      console.log('📡 Timer sync received:', timerData);
      
      // 💡 서버의 startedAt 저장
      if (timerData.startedAt) {
        serverStartedAtRef.current = timerData.startedAt;
      }
      
      // 💡 타이머가 실행 중이고 startedAt이 있으면 정확한 시간 계산
      if (timerData.isRunning && timerData.startedAt) {
        const elapsed = Math.floor((Date.now() - timerData.startedAt) / 1000);
        const remaining = Math.max(0, timerData.totalSeconds - elapsed);
        
        const calculatedMinutes = Math.floor(remaining / 60);
        const calculatedSeconds = remaining % 60;
        
        console.log('⏱️ Calculated time:', { 
          minutes: calculatedMinutes, 
          seconds: calculatedSeconds,
          elapsed,
          remaining 
        });
        
        setTimerState(
          calculatedMinutes,
          calculatedSeconds,
          timerData.isRunning,
          timerData.totalSeconds
        );
      } else {
        // 💡 일시정지 또는 리셋된 경우 서버 값 그대로 사용
        setTimerState(
          timerData.minutes,
          timerData.seconds,
          timerData.isRunning,
          timerData.totalSeconds
        );
      }
    });

    return () => {
      socketService.off('timer-sync');
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [setTimerState]);

  // 💡 타이머 실행 중일 때 주기적 동기화 (1분마다)
  useEffect(() => {
    if (isRunning && serverStartedAtRef.current) {
      // 1분마다 서버 시간 기준으로 재계산
      syncIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - serverStartedAtRef.current) / 1000);
        const remaining = Math.max(0, (minutes * 60 + seconds) - 1); // 현재 남은 시간 기준
        
        // 드리프트 감지 (5초 이상 차이나면 재동기화)
        const expectedRemaining = Math.max(0, initialMinutesRef.current * 60 - elapsed);
        const drift = Math.abs(remaining - expectedRemaining);
        
        if (drift > 5) {
          console.log('⚠️ Timer drift detected, requesting sync...', {
            current: remaining,
            expected: expectedRemaining,
            drift
          });
          
          // 서버에 동기화 요청 (선택사항)
          socketService.requestTimerSync(roomId);
        }
      }, 60000); // 1분마다
      
      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }
  }, [isRunning, minutes, seconds, roomId]);

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
          
          // 브라우저 알림 표시
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('공부 완료! 🎉', {
              body: `${studiedMinutes}분 동안 집중했습니다!`,
              icon: '/favicon.ico'
            });
          }
          
          // 기록 완료 후 초기화
          startTimeRef.current = null;
          serverStartedAtRef.current = null;
        } catch (error) {
          console.error('Failed to record study session:', error);
        }
      }
    };

    recordStudyTime();
  }, [minutes, seconds, isRunning, user, roomId]);

  // 💡 컴포넌트 마운트 시 브라우저 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

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
      
      // 💡 타이머 시작 시간 기록
      startTimeRef.current = Date.now();
      serverStartedAtRef.current = Date.now();
      initialMinutesRef.current = minutes; // 현재 남은 분을 기록
      
      console.log('▶️ Timer started:', {
        startedAt: new Date(startTimeRef.current).toLocaleTimeString(),
        initialMinutes: initialMinutesRef.current
      });
    }
  };

  const handlePause = () => {
    if (isOwner) {
      pause();
      socketService.timerPause(roomId);
      
      // 💡 일시정지 시 시작 시간 초기화
      serverStartedAtRef.current = null;
      
      console.log('⏸️ Timer paused at:', {
        minutes,
        seconds
      });
    }
  };

  const handleReset = () => {
    if (isOwner) {
      reset();
      socketService.timerReset(roomId, 25);
      
      // 💡 리셋 시 모든 참조 초기화
      startTimeRef.current = null;
      serverStartedAtRef.current = null;
      initialMinutesRef.current = 25;
      
      console.log('🔄 Timer reset to 25 minutes');
    }
  };

  const handleSetTime = (newMinutes) => {
    if (isOwner) {
      setTime(newMinutes);
      socketService.timerReset(roomId, newMinutes);
      setShowPresets(false);
      
      // 💡 시간 변경 시 초기화
      startTimeRef.current = null;
      serverStartedAtRef.current = null;
      initialMinutesRef.current = newMinutes;
      
      console.log(`⏱️ Timer set to ${newMinutes} minutes`);
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
    <div 
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 ${
        isFocusMode ? 'w-full h-full flex flex-col justify-center items-center' : ''
      }`}
    >
      <div className={`flex items-center justify-between ${isFocusMode ? 'w-full max-w-xl' : 'mb-4'}`}>
        <h2 className={`font-semibold ${isFocusMode ? 'text-2xl' : 'text-lg'} text-gray-900 dark:text-white`}>
          타이머
        </h2>
        
        <div className='flex items-center gap-3'>
          {/* 집중 모드 토글 버튼 */}
          <button
            onClick={onToggleFocus}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={isFocusMode ? "집중 모드 종료" : "집중 모드 시작"}
          >
            {isFocusMode ? (
              <Minimize className="w-5 h-5 text-gray-900 dark:text-white" />
            ) : (
              <Maximize className="w-5 h-5 text-gray-900 dark:text-white" />
            )}
          </button>
          
          {isOwner ? (
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              <Clock className="w-4 h-4" />
              시간 설정
            </button>
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">방장만 컨트롤 가능</span>
          )}
        </div>
      </div>

      {/* 프리셋 버튼들 (집중 모드에서는 숨김) */}
      {showPresets && isOwner && !isFocusMode && (
        <div className="mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleSetTime(preset.minutes)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* 커스텀 시간 입력 */}
          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full px-4 py-2 text-sm border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors flex items-center justify-center gap-2"
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
                className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleCustomTime}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
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
      <div className={`flex flex-col items-center justify-center ${isFocusMode ? 'py-20' : 'py-12'}`}>
        <div className={`font-bold text-gray-900 dark:text-white mb-8 font-mono ${isFocusMode ? 'text-9xl md:text-[160px]' : 'text-7xl'}`}>
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
          <div className="mb-6 flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <span className="text-sm font-medium">✅ 공부 시간이 기록되었습니다!</span>
          </div>
        )}

        {/* 컨트롤 버튼들 */}
        <div className="flex gap-4">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={!isOwner || (minutes === 0 && seconds === 0)}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className={`mt-6 ${isFocusMode ? 'w-full max-w-lg' : ''}`}>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-1000"
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