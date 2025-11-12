class NotificationService {
  constructor() {
    this.originalTitle = document.title;
    this.titleInterval = null;
  }

  // 알림 권한 요청
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('이 브라우저는 알림을 지원하지 않습니다');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // 브라우저 알림 표시
  showNotification(title, options = {}) {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      // 알림 클릭 시 창 포커스
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    }
  }

  // 알림 소리 재생
  playSound(type = 'default') {
    try {
      if (type === 'complete') {
        // 타이머 완료 소리 (3번의 짧은 비프음)
        const context = new (window.AudioContext || window.webkitAudioContext)();
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
            
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.2);
          }, i * 300);
        }
      } else {
        // 일반 알림 소리 (단일 비프음)
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15);
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.15);
      }
    } catch (error) {
      console.error('소리 재생 실패:', error);
    }
  }

  // 탭 제목 깜빡이기
  blinkTitle(message, duration = 10000) {
    this.stopBlinkTitle(); // 기존 깜빡임 중지
    
    let isOriginal = true;
    this.titleInterval = setInterval(() => {
      document.title = isOriginal ? message : this.originalTitle;
      isOriginal = !isOriginal;
    }, 1000);

    // duration 후 자동 중지
    setTimeout(() => {
      this.stopBlinkTitle();
    }, duration);
  }

  // 탭 제목 깜빡임 중지
  stopBlinkTitle() {
    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
      document.title = this.originalTitle;
    }
  }

  // 타이머 완료 알림
  notifyTimerComplete(minutes) {
    this.showNotification('공부 완료! 🎉', {
      body: `${minutes}분 동안 집중했습니다!\n잠시 휴식을 취하세요.`,
      requireInteraction: true, // 사용자가 닫을 때까지 유지
    });
    
    this.playSound('complete');
    this.blinkTitle('⏰ 타이머 완료!');
  }

  // 참여자 입장 알림
  notifyUserJoined() {
    this.playSound('default');
    // 토스트는 컴포넌트에서 처리
  }

  // 참여자 퇴장 알림
  notifyUserLeft() {
    // 조용히 처리 (소리 없음)
  }
}

export default new NotificationService();