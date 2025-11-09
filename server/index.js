import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite 개발 서버
    methods: ["GET", "POST"]
  }
});

// 방 데이터 저장 (메모리)
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 방 생성
  socket.on('create-room', (roomData, callback) => {
    const roomId = Date.now().toString();
    const room = {
      id: roomId,
      title: roomData.title,
      owner: socket.id,
      participants: [{
        id: socket.id,
        nickname: roomData.nickname,
        isOwner: true
      }],
      timer: {
        minutes: 25,
        seconds: 0,
        isRunning: false,
        totalSeconds: 25 * 60
      },
      media: {
        videoId: null,
        isPlaying: false,
        volume: 50
      }
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    
    console.log(`Room created: ${roomId}`);
    callback({ success: true, roomId, room });
  });

  // 방 입장
  socket.on('join-room', (data, callback) => {
    const { roomId, nickname } = data;
    const room = rooms.get(roomId);

    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    // 참여자 추가
    const participant = {
      id: socket.id,
      nickname: nickname,
      isOwner: false
    };
    room.participants.push(participant);

    socket.join(roomId);
    
    // 방에 있는 모든 사람에게 새 참여자 알림
    io.to(roomId).emit('user-joined', participant);
    
    console.log(`User ${socket.id} joined room ${roomId}`);
    callback({ success: true, room });
  });

  // 방 목록 가져오기
  socket.on('get-rooms', (callback) => {
    const roomList = Array.from(rooms.values()).map(room => ({
      id: room.id,
      title: room.title,
      participants: room.participants.length,
      owner: room.participants.find(p => p.isOwner)?.nickname || 'Unknown'
    }));
    
    callback(roomList);
  });

  // 타이머 동기화
  socket.on('timer-start', (roomId) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.owner) {
      room.timer.isRunning = true;
      io.to(roomId).emit('timer-sync', room.timer);
    }
  });

  socket.on('timer-pause', (roomId) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.owner) {
      room.timer.isRunning = false;
      io.to(roomId).emit('timer-sync', room.timer);
    }
  });

  socket.on('timer-reset', (data) => {
    const { roomId, minutes } = data;
    const room = rooms.get(roomId);
    if (room && socket.id === room.owner) {
      room.timer = {
        minutes,
        seconds: 0,
        isRunning: false,
        totalSeconds: minutes * 60
      };
      io.to(roomId).emit('timer-sync', room.timer);
    }
  });

  socket.on('timer-update', (data) => {
    const { roomId, minutes, seconds } = data;
    const room = rooms.get(roomId);
    if (room && socket.id === room.owner) {
      room.timer.minutes = minutes;
      room.timer.seconds = seconds;
      io.to(roomId).emit('timer-sync', room.timer);
    }
  });

  // 미디어 동기화
  socket.on('media-load', (data) => {
    const { roomId, videoId } = data;
    const room = rooms.get(roomId);
    if (room && socket.id === room.owner) {
      room.media.videoId = videoId;
      room.media.isPlaying = true;
      io.to(roomId).emit('media-sync', room.media);
    }
  });

  socket.on('media-play', (roomId) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.owner) {
      room.media.isPlaying = true;
      io.to(roomId).emit('media-sync', room.media);
    }
  });

  socket.on('media-pause', (roomId) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.owner) {
      room.media.isPlaying = false;
      io.to(roomId).emit('media-sync', room.media);
    }
  });

  socket.on('media-volume', (data) => {
    const { roomId, volume } = data;
    const room = rooms.get(roomId);
    if (room && socket.id === room.owner) {
      room.media.volume = volume;
      io.to(roomId).emit('media-sync', room.media);
    }
  });

  // 채팅
  socket.on('send-message', (data) => {
    const { roomId, message, nickname } = data;
    const room = rooms.get(roomId);
    
    if (room) {
      const chatMessage = {
        id: Date.now(),
        nickname,
        message,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      };
      
      io.to(roomId).emit('new-message', chatMessage);
    }
  });

  // 연결 해제
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // 모든 방에서 해당 유저 제거
    rooms.forEach((room, roomId) => {
      const participantIndex = room.participants.findIndex(p => p.id === socket.id);
      
      if (participantIndex !== -1) {
        const participant = room.participants[participantIndex];
        room.participants.splice(participantIndex, 1);
        
        // 방에 남은 사람들에게 알림
        io.to(roomId).emit('user-left', participant);
        
        // 방이 비었으면 삭제
        if (room.participants.length === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        } else if (participant.isOwner && room.participants.length > 0) {
          // 방장이 나갔으면 다음 사람을 방장으로
          room.participants[0].isOwner = true;
          room.owner = room.participants[0].id;
          io.to(roomId).emit('new-owner', room.participants[0]);
        }
      }
    });
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});