import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL);
      
      this.socket.on('connect', () => {
        console.log('Connected to server:', this.socket.id);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
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

  // 방 입장
  joinRoom(roomId, nickname) {
    return new Promise((resolve, reject) => {
      this.getSocket().emit('join-room', { roomId, nickname }, (response) => {
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

  // 리스너 제거
  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

export default new SocketService();