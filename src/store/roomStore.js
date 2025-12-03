import { create } from 'zustand';

const useRoomStore = create((set) => ({
  // 현재 방 정보
  currentRoom: null,
  isOwner: false,

  // 방 목록
  rooms: [],

  // 액션들
  setCurrentRoom: (room) => set((state) => {
    // 💡 기존 타이머 상태 보존 (덮어쓰기 방지)
    const preservedTimer = state.currentRoom?.timer;
    // 💡 기존 미디어 상태 보존
    const preservedMedia = state.currentRoom?.media;
    
    return {
      currentRoom: {
        ...room,
        // 새 room에 타이머 정보가 있으면 사용, 없으면 기존 것 유지
        timer: room.timer || preservedTimer || {
          minutes: 25,
          seconds: 0,
          isRunning: false,
          totalSeconds: 1500,
          startedAt: null
        },
        // 💡 미디어 정보도 동일하게 처리
        media: room.media || preservedMedia || {
          videoId: null,
          isPlaying: false,
          volume: 50
        }
      },
      isOwner: room?.participants?.some(p => p.isOwner) || false
    };
  }),

  // 💡 타이머 상태만 업데이트 (방 전체를 바꾸지 않음)
  updateTimer: (timerState) => set((state) => ({
    currentRoom: state.currentRoom ? {
      ...state.currentRoom,
      timer: {
        ...state.currentRoom.timer,
        ...timerState
      }
    } : null
  })),

  setRooms: (rooms) => set({ rooms }),

  addParticipant: (participant) => set((state) => ({
    currentRoom: state.currentRoom ? {
      ...state.currentRoom,
      participants: [...state.currentRoom.participants, participant]
    } : null
  })),

  removeParticipant: (participantId) => set((state) => ({
    currentRoom: state.currentRoom ? {
      ...state.currentRoom,
      participants: state.currentRoom.participants.filter(p => p.id !== participantId)
    } : null
  })),

  updateOwner: (newOwner) => set((state) => {
    if (!state.currentRoom) return {};
    
    // 💡 현재 사용자가 새 방장인지 확인
    const socketId = window.__socketId; // Socket ID를 전역으로 저장해야 함
    const isNewOwner = newOwner.id === socketId;
    
    return {
      currentRoom: {
        ...state.currentRoom,
        owner: newOwner.id,
        owner_id: newOwner.userId, // DB의 owner_id도 업데이트
        participants: state.currentRoom.participants.map(p => 
          p.id === newOwner.id ? { ...p, isOwner: true } : { ...p, isOwner: false }
        )
      },
      isOwner: isNewOwner
    };
  }),

  leaveRoom: () => set({ currentRoom: null, isOwner: false }),
}));

export default useRoomStore;