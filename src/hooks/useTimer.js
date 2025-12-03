import { useState, useEffect, useRef } from 'react';

function useTimer(initialMinutes = 25) {
  // 💡 남은 시간을 '초' 단위로만 관리
  const [remainingTime, setRemainingTime] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  
  // 💡 초기 총 시간 (진행률 계산용)
  const initialTotalSecondsRef = useRef(initialMinutes * 60); 

  const intervalRef = useRef(null);
  const lastTickRef = useRef(Date.now());

  // initialMinutes가 변경될 때마다 초기화
  useEffect(() => {
    initialTotalSecondsRef.current = initialMinutes * 60;
    setRemainingTime(initialMinutes * 60);
  }, [initialMinutes]);

  useEffect(() => {
    if (isRunning) {
      lastTickRef.current = Date.now();
      
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastTickRef.current;
        
        // 💡 1초 이상 경과했을 때만 업데이트 (정확도 향상)
        if (elapsed >= 1000) {
          lastTickRef.current = now;
          
          setRemainingTime((prevTime) => {
            if (prevTime <= 1) { // 1초 남았을 때 0으로 종료
              setIsRunning(false);
              clearInterval(intervalRef.current);
              return 0;
            }
            return prevTime - 1;
          });
        }
      }, 100); // 100ms마다 체크하지만 1초마다만 업데이트
      
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

  // 계산된 minutes와 seconds를 반환
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;

  const start = () => {
    if (remainingTime > 0) {
      setIsRunning(true);
    }
  };

  const pause = () => {
    setIsRunning(false);
  };

  const reset = (newMinutes = initialMinutes) => {
    setIsRunning(false);
    initialTotalSecondsRef.current = newMinutes * 60;
    setRemainingTime(newMinutes * 60);
  };

  const setTime = (newMinutes) => {
    setIsRunning(false);
    initialTotalSecondsRef.current = newMinutes * 60;
    setRemainingTime(newMinutes * 60);
  };

  // 진행률 계산 (0-100)
  const progress = initialTotalSecondsRef.current > 0 
    ? ((initialTotalSecondsRef.current - remainingTime) / initialTotalSecondsRef.current) * 100 
    : 0;

  // 💡 타이머 상태를 외부에서 설정 (Socket 동기화용)
  const setTimerState = (newMinutes, newSeconds, newIsRunning, newTotalSeconds) => {
    console.log('⚙️ setTimerState called:', {
      minutes: newMinutes,
      seconds: newSeconds,
      isRunning: newIsRunning,
      totalSeconds: newTotalSeconds
    });

    // Socket에서 분/초로 왔다면 초로 변환하여 설정
    const newRemainingTime = newMinutes * 60 + newSeconds;
    
    // 💡 totalSeconds를 받으면 그것을 기준으로 진행률 초기화
    if (newTotalSeconds !== undefined && newTotalSeconds > 0) {
      initialTotalSecondsRef.current = newTotalSeconds;
    } else {
      // totalSeconds가 없으면 현재 남은 시간을 기준으로
      initialTotalSecondsRef.current = newRemainingTime;
    }

    setRemainingTime(newRemainingTime);
    setIsRunning(newIsRunning);
    
    // 💡 타이머가 시작되면 lastTick 업데이트
    if (newIsRunning) {
      lastTickRef.current = Date.now();
    }
    
    console.log('✅ Timer state updated:', {
      remainingTime: newRemainingTime,
      initialTotal: initialTotalSecondsRef.current,
      progress: ((initialTotalSecondsRef.current - newRemainingTime) / initialTotalSecondsRef.current) * 100
    });
  };

  return {
    minutes,
    seconds,
    isRunning,
    totalSeconds: initialTotalSecondsRef.current, // 진행률 계산을 위해 반환
    remainingSeconds: remainingTime,
    progress,
    start,
    pause,
    reset,
    setTime,
    setTimerState,
  };
}

export default useTimer;