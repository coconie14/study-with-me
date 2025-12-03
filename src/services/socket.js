import { io } from 'socket.io-client';

// 환경에 따라 자동 전환
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      console.log('🔌 Connecting to:', SOCKET_URL);
      this.socket = io(SOCKET_URL);
      
      this.socket.on('connect', () => {
        console.log('✅ Connected to server:', this.socket.id);
        // 💡 Socket ID를 전역으로 저장 (roomStore에서 사용)
        window.__socketId = this.socket.id;
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        window.__socketId = null;
      });

      this.socket.on('connect_error', (error) => {
        console.error('🚨 Connection error:', error.message);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    if (!this.socket) {
      this.connect();
    }
    return this.socket;
  }

  // 방 생성
  createRoom(roomData) {
    return new Promise((resolve, reject) => {
      this.getSocket().emit('create-room', roomData, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(response.error);
        }
      });
    });
  }

  // 💡 방 입장 (userId 추가)
  joinRoom(roomId, nickname, userId) {
    return new Promise((resolve, reject) => {
      this.getSocket().emit('join-room', { roomId, nickname, userId }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(response.error);
        }
      });
    });
  }

  // 💡 명시적 방 퇴장 (새로 추가)
  leaveRoom(roomId, nickname) {
    return new Promise((resolve, reject) => {
      this.getSocket().emit('leave-room', { roomId, nickname }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(response.error);
        }
      });
    });
  }

  // 방 목록 가져오기
  getRooms() {
    return new Promise((resolve) => {
      this.getSocket().emit('get-rooms', (rooms) => {
        resolve(rooms);
      });
    });
  }

  // 타이머 이벤트
  timerStart(roomId) {
    this.getSocket().emit('timer-start', roomId);
  }

  timerPause(roomId) {
    this.getSocket().emit('timer-pause', roomId);
  }

  timerReset(roomId, minutes) {
    this.getSocket().emit('timer-reset', { roomId, minutes });
  }

  timerUpdate(roomId, minutes, seconds) {
    this.getSocket().emit('timer-update', { roomId, minutes, seconds });
  }

  // 💡 타이머 동기화 요청 (선택 사항)
  requestTimerSync(roomId) {
    this.getSocket().emit('request-timer-sync', roomId);
  }

  // 미디어 이벤트
  mediaLoad(roomId, videoId) {
    this.getSocket().emit('media-load', { roomId, videoId });
  }

  mediaPlay(roomId) {
    this.getSocket().emit('media-play', roomId);
  }

  mediaPause(roomId) {
    this.getSocket().emit('media-pause', roomId);
  }

  mediaVolume(roomId, volume) {
    this.getSocket().emit('media-volume', { roomId, volume });
  }

  // 채팅
  sendMessage(roomId, message, nickname) {
    this.getSocket().emit('send-message', { roomId, message, nickname });
  }

  // 방 삭제
  deleteRoom(roomId) {
    return new Promise((resolve, reject) => {
      this.getSocket().emit('delete-room', { roomId }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(response.error);
        }
      });
    });
  }

  // 이벤트 리스너
  onUserJoined(callback) {
    this.getSocket().on('user-joined', callback);
  }

  onUserLeft(callback) {
    this.getSocket().on('user-left', callback);
  }

  onTimerSync(callback) {
    this.getSocket().on('timer-sync', callback);
  }

  onMediaSync(callback) {
    this.getSocket().on('media-sync', callback);
  }

  onNewMessage(callback) {
    this.getSocket().on('new-message', callback);
  }

  onNewOwner(callback) {
    this.getSocket().on('new-owner', callback);
  }

  onRoomDeleted(callback) {
    this.getSocket().on('room-deleted', callback);
  }

  // 💡 방이 비었을 때 (새로 추가)
  onRoomEmpty(callback) {
    this.getSocket().on('room-empty', callback);
  }

  // 💡 방장 부재 이벤트 (새로 추가)
  onOwnerAway(callback) {
    this.getSocket().on('owner-away', callback);
  }

  // 💡 방장 복귀 이벤트 (선택 사항)
  onOwnerReturned(callback) {
    this.getSocket().on('owner-returned', callback);
  }

  // 리스너 제거
  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

export default new SocketService();