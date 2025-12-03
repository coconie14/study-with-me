/* eslint-env node */
/* global process */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 방 데이터 저장 (메모리)
const rooms = new Map();

// 💡 일시적 부재 사용자 추적
const awayUsers = new Map(); // { socketId: { roomId, nickname, timestamp, isOwner } }

// 💡 유예 시간 (3분 = 180초)
const AWAY_GRACE_PERIOD = 180 * 1000; // 180,000ms

// 💡 타이머 진행 계산 함수
function calculateTimerState(timer) {
  if (!timer.isRunning || !timer.startedAt) {
    return {
      minutes: timer.minutes,
      seconds: timer.seconds,
      isRunning: timer.isRunning,
      totalSeconds: timer.totalSeconds
    };
  }

  // 경과 시간 계산
  const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
  const remaining = Math.max(0, timer.totalSeconds - elapsed);

  return {
    minutes: Math.floor(remaining / 60),
    seconds: remaining % 60,
    isRunning: remaining > 0 ? timer.isRunning : false,
    totalSeconds: timer.totalSeconds,
    startedAt: timer.startedAt
  };
}

// 💡 주기적으로 부재 사용자 체크 (30초마다)
setInterval(() => {
  const now = Date.now();
  
  awayUsers.forEach(({ roomId, nickname, timestamp, isOwner }, socketId) => {
    const timeSinceAway = now - timestamp;
    
    // 유예 시간 초과
    if (timeSinceAway > AWAY_GRACE_PERIOD) {
      const room = rooms.get(roomId);
      
      if (room && isOwner) {
        // 방장 자동 위임
        if (room.participants.length > 0) {
          const newOwner = room.participants[0];
          newOwner.isOwner = true;
          room.owner = newOwner.id;
          
          io.to(roomId).emit('new-owner', {
            id: newOwner.id,
            nickname: newOwner.nickname,
            userId: newOwner.userId, // 💡 DB 업데이트용
            isOwner: true,
            reason: 'owner-timeout'
          });
          
          console.log(`👑 Auto-transferred ownership in room ${roomId}: ${newOwner.nickname}`);
        }
      }
      
      // 부재 목록에서 제거
      awayUsers.delete(socketId);
      console.log(`⏱️ User ${nickname} removed from away list (timeout)`);
    }
  });
}, 30000); // 30초마다 체크

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // 방 생성
  socket.on('create-room', (roomData, callback) => {
    console.log('📦 Received room data:', roomData);
    
    const roomId = roomData.roomId || Date.now().toString();
    console.log('🆔 Using roomId:', roomId);
    
    const room = {
      id: roomId,
      title: roomData.title,
      coverImageUrl: roomData.coverImageUrl || null,
      emoji: roomData.emoji || '📚',
      owner: socket.id,
      participants: [{
        id: socket.id,
        nickname: roomData.nickname,
        isOwner: true,
        joinedAt: Date.now() // 💡 참여 시간 기록
      }],
      timer: {
        minutes: 25,
        seconds: 0,
        isRunning: false,
        totalSeconds: 25 * 60,
        startedAt: null // 💡 시작 시간 추가
      },
      media: {
        videoId: null,
        isPlaying: false,
        volume: 50
      }
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    
    console.log(`🏠 Room created: ${roomId} by ${roomData.nickname}`);
    callback({ success: true, roomId, room });
  });

  // 방 입장
  socket.on('join-room', (data, callback) => {
    const { roomId, nickname, userId } = data;
    const room = rooms.get(roomId);

    if (!room) {
      console.log(`❌ Room not found: ${roomId}`);
      callback({ success: false, error: 'Room not found' });
      return;
    }

    // 💡 유저가 이미 다른 방에 있는지 확인 (유령방 방지)
    rooms.forEach((otherRoom, otherRoomId) => {
      if (otherRoomId !== roomId) {
        const existingIndex = otherRoom.participants.findIndex(
          p => p.userId === userId || p.nickname === nickname
        );
        
        if (existingIndex !== -1) {
          const removed = otherRoom.participants.splice(existingIndex, 1)[0];
          socket.leave(otherRoomId);
          io.to(otherRoomId).emit('user-left', removed);
          console.log(`🚪 User ${nickname} auto-left room ${otherRoomId} to join ${roomId}`);
          
          // 방이 비었으면 삭제
          if (otherRoom.participants.length === 0) {
            rooms.delete(otherRoomId);
            console.log(`🗑️ Room ${otherRoomId} deleted (empty)`);
          }
        }
      }
    });

    // 💡 부재 목록에서 복귀 확인
    const awayEntry = Array.from(awayUsers.entries()).find(
      // eslint-disable-next-line no-unused-vars
      ([_, user]) => user.nickname === nickname && user.roomId === roomId
    );

    if (awayEntry) {
      const [oldSocketId] = awayEntry;
      
      // 기존 참여자 정보 업데이트
      const existingParticipant = room.participants.find(p => p.nickname === nickname);
      if (existingParticipant) {
        existingParticipant.id = socket.id;
        console.log(`🔄 User ${nickname} reconnected (was away) to room ${roomId}`);
        
        // 부재 목록에서 제거
        awayUsers.delete(oldSocketId);
      }
    } else {
      // 이미 참여 중인지 확인 (다른 탭에서 접속 등)
      const existingParticipant = room.participants.find(p => p.nickname === nickname);
      
      if (existingParticipant) {
        // socket.id만 업데이트
        existingParticipant.id = socket.id;
        console.log(`🔄 User ${nickname} reconnected to room ${roomId}`);
      } else {
        // 새 참여자 추가
        const participant = {
          id: socket.id,
          nickname: nickname,
          userId: userId,
          isOwner: false,
          joinedAt: Date.now()
        };
        room.participants.push(participant);
        
        socket.to(roomId).emit('user-joined', participant);
        console.log(`👤 User ${nickname} joined room ${roomId}`);
      }
    }

    socket.join(roomId);
    
    // 💡 타이머 상태 계산해서 전송
    const currentTimerState = calculateTimerState(room.timer);
    const roomWithCalculatedTimer = {
      ...room,
      timer: currentTimerState
    };
    
    callback({ success: true, room: roomWithCalculatedTimer });
  });

  // 방 목록 가져오기
  socket.on('get-rooms', (callback) => {
    const roomList = Array.from(rooms.values()).map(room => {
      // 💡 현재 방장 찾기 (동적으로)
      const currentOwner = room.participants.find(p => p.isOwner);
      
      return {
        id: room.id,
        title: room.title,
        coverImageUrl: room.coverImageUrl,
        emoji: room.emoji,
        participants: room.participants.length,
        owner: currentOwner?.nickname || 'Unknown' // 💡 현재 방장의 닉네임
      };
    });
    
    callback(roomList);
  });

  // 💡 타이머 시작 (타임스탬프 저장)
  socket.on('timer-start', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      const participant = room.participants.find(p => p.id === socket.id);
      if (participant && participant.isOwner) {
        room.timer.isRunning = true;
        room.timer.startedAt = Date.now(); // 💡 시작 시간 저장
        
        io.to(roomId).emit('timer-sync', room.timer);
        console.log(`⏱️ Timer started in room ${roomId} at ${new Date(room.timer.startedAt).toLocaleTimeString()}`);
      }
    }
  });

  socket.on('timer-pause', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      const participant = room.participants.find(p => p.id === socket.id);
      if (participant && participant.isOwner) {
        // 💡 일시정지 시 현재까지 진행된 시간 계산
        if (room.timer.isRunning && room.timer.startedAt) {
          const elapsed = Math.floor((Date.now() - room.timer.startedAt) / 1000);
          const remaining = Math.max(0, room.timer.totalSeconds - elapsed);
          
          room.timer.minutes = Math.floor(remaining / 60);
          room.timer.seconds = remaining % 60;
          room.timer.totalSeconds = remaining;
        }
        
        room.timer.isRunning = false;
        room.timer.startedAt = null;
        
        io.to(roomId).emit('timer-sync', room.timer);
        console.log(`⏸️ Timer paused in room ${roomId}`);
      }
    }
  });

  socket.on('timer-reset', (data) => {
    const { roomId, minutes } = data;
    const room = rooms.get(roomId);
    if (room) {
      const participant = room.participants.find(p => p.id === socket.id);
      if (participant && participant.isOwner) {
        room.timer = {
          minutes,
          seconds: 0,
          isRunning: false,
          totalSeconds: minutes * 60,
          startedAt: null // 💡 리셋 시 시작 시간 초기화
        };
        io.to(roomId).emit('timer-sync', room.timer);
        console.log(`🔄 Timer reset to ${minutes}min in room ${roomId}`);
      }
    }
  });

  // 💡 타이머 업데이트 (매 초마다 호출되는 이벤트 - 필요 시)
  socket.on('timer-update', (data) => {
    const { roomId, minutes, seconds } = data;
    const room = rooms.get(roomId);
    if (room) {
      const participant = room.participants.find(p => p.id === socket.id);
      if (participant && participant.isOwner) {
        room.timer.minutes = minutes;
        room.timer.seconds = seconds;
        // startedAt은 유지 (타이머가 실행 중이면)
        io.to(roomId).emit('timer-sync', room.timer);
      }
    }
  });

  // 미디어 동기화
  socket.on('media-load', (data) => {
    const { roomId, videoId } = data;
    const room = rooms.get(roomId);
    if (room) {
      const participant = room.participants.find(p => p.id === socket.id);
      if (participant && participant.isOwner) {
        room.media.videoId = videoId;
        room.media.isPlaying = true;
        io.to(roomId).emit('media-sync', room.media);
        console.log(`🎵 Media loaded in room ${roomId}: ${videoId}`);
      }
    }
  });

  socket.on('media-play', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      const participant = room.participants.find(p => p.id === socket.id);
      if (participant && participant.isOwner) {
        room.media.isPlaying = true;
        io.to(roomId).emit('media-sync', room.media);
        console.log(`▶️ Media playing in room ${roomId}`);
      }
    }
  });

  socket.on('media-pause', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      const participant = room.participants.find(p => p.id === socket.id);
      if (participant && participant.isOwner) {
        room.media.isPlaying = false;
        io.to(roomId).emit('media-sync', room.media);
        console.log(`⏸️ Media paused in room ${roomId}`);
      }
    }
  });

  socket.on('media-volume', (data) => {
    const { roomId, volume } = data;
    const room = rooms.get(roomId);
    if (room) {
      const participant = room.participants.find(p => p.id === socket.id);
      if (participant && participant.isOwner) {
        room.media.volume = volume;
        io.to(roomId).emit('media-sync', room.media);
      }
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
      console.log(`💬 Message in room ${roomId} from ${nickname}: ${message.substring(0, 20)}...`);
    }
  });

  // 💡 명시적 퇴장 이벤트 (새로 추가)
  socket.on('leave-room', (data, callback) => {
    const { roomId, nickname } = data;
    const room = rooms.get(roomId);

    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    const participantIndex = room.participants.findIndex(p => p.id === socket.id);
    
    if (participantIndex === -1) {
      callback({ success: false, error: 'Not in room' });
      return;
    }

    const participant = room.participants[participantIndex];
    const wasOwner = participant.isOwner;
    
    // 참여자 제거
    room.participants.splice(participantIndex, 1);
    socket.leave(roomId);
    
    // 다른 사람들에게 알림
    io.to(roomId).emit('user-left', participant);
    console.log(`👋 User ${nickname} left room ${roomId} (explicit)`);

    // 방이 비었으면 삭제
    if (room.participants.length === 0) {
      rooms.delete(roomId);
      console.log(`🗑️ Room ${roomId} deleted (empty)`);
      
      // 💡 방이 비었다는 이벤트 emit (DB 정리용)
      io.to(roomId).emit('room-empty', { roomId });
      
      callback({ success: true, roomDeleted: true });
      return;
    }

    // 방장이 나갔으면 즉시 다음 사람에게 위임
    if (wasOwner) {
      const newOwner = room.participants[0];
      newOwner.isOwner = true;
      room.owner = newOwner.id;
      
      io.to(roomId).emit('new-owner', {
        id: newOwner.id,
        nickname: newOwner.nickname,
        userId: newOwner.userId, // 💡 DB 업데이트용
        isOwner: true,
        reason: 'owner-left'
      });
      
      console.log(`👑 New owner in room ${roomId}: ${newOwner.nickname} (explicit transfer)`);
    }

    callback({ success: true, roomDeleted: false });
  });

  // 방 삭제 (방장만 가능)
  socket.on('delete-room', (data, callback) => {
    const { roomId } = data;
    const room = rooms.get(roomId);

    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    const participant = room.participants.find(p => p.id === socket.id);
    if (!participant || !participant.isOwner) {
      callback({ success: false, error: 'Only owner can delete room' });
      return;
    }

    io.to(roomId).emit('room-deleted', { roomId });
    rooms.delete(roomId);
    console.log(`🗑️ Room deleted: ${roomId} by ${participant.nickname}`);
    
    callback({ success: true });
  });

  // 💡 연결 해제 (비정상 종료 - 유예 시간 적용)
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
    
    rooms.forEach((room, roomId) => {
      const participantIndex = room.participants.findIndex(p => p.id === socket.id);
      
      if (participantIndex !== -1) {
        const participant = room.participants[participantIndex];
        
        // 💡 방장인 경우 일시적 부재로 처리
        if (participant.isOwner) {
          awayUsers.set(socket.id, {
            roomId,
            nickname: participant.nickname,
            timestamp: Date.now(),
            isOwner: true
          });
          
          // 방에 알림 (방장이 일시적으로 자리를 비웠음)
          io.to(roomId).emit('owner-away', {
            nickname: participant.nickname,
            graceEndTime: Date.now() + AWAY_GRACE_PERIOD
          });
          
          console.log(`⏱️ Owner ${participant.nickname} went away from room ${roomId} (grace period: 3min)`);
          return; // 즉시 제거하지 않음
        }
        
        // 💡 일반 참여자는 즉시 제거
        room.participants.splice(participantIndex, 1);
        io.to(roomId).emit('user-left', participant);
        console.log(`👋 User ${participant.nickname} left room ${roomId}`);
        
        // 방이 비었으면 삭제
        if (room.participants.length === 0) {
          rooms.delete(roomId);
          console.log(`🗑️ Room ${roomId} deleted (empty)`);
          
          // 💡 방이 비었다는 이벤트 emit (DB 정리용)
          io.to(roomId).emit('room-empty', { roomId });
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});