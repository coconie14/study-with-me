import { useState, useEffect, useRef } from 'react';

function useTimer(initialMinutes = 25) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60); // 전체 시간 추적
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prevSeconds) => {
          if (prevSeconds === 0) {
            setMinutes((prevMinutes) => {
              if (prevMinutes === 0) {
                // 타이머 종료
                setIsRunning(false);
                clearInterval(intervalRef.current);
                // 알림 소리나 알림 표시 가능
                alert('타이머가 종료되었습니다!');
                return 0;
              }
              return prevMinutes - 1;
            });
            return 59;
          }
          return prevSeconds - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const start = () => {
    if (minutes === 0 && seconds === 0) {
      return; // 0:00 상태에서는 시작 불가
    }
    setIsRunning(true);
  };

  const pause = () => {
    setIsRunning(false);
  };

  const reset = (newMinutes = initialMinutes) => {
    setIsRunning(false);
    setMinutes(newMinutes);
    setSeconds(0);
    setTotalSeconds(newMinutes * 60); // 전체 시간도 리셋
  };

  const setTime = (newMinutes) => {
    setIsRunning(false);
    setMinutes(newMinutes);
    setSeconds(0);
    setTotalSeconds(newMinutes * 60); // 전체 시간 업데이트
  };

  // 현재 남은 시간 (초 단위)
  const remainingSeconds = minutes * 60 + seconds;

  // 진행률 계산 (0-100)
  const progress = totalSeconds > 0 
    ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 
    : 0;

  // 타이머 상태를 외부에서 설정 (Socket 동기화용)
  const setTimerState = (newMinutes, newSeconds, newIsRunning, newTotalSeconds) => {
    setMinutes(newMinutes);
    setSeconds(newSeconds);
    setIsRunning(newIsRunning);
    setTotalSeconds(newTotalSeconds);
  };

  return {
    minutes,
    seconds,
    isRunning,
    totalSeconds,
    remainingSeconds,
    progress,
    start,
    pause,
    reset,
    setTime,
    setTimerState,
  };
}

export default useTimer;