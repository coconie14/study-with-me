import { create } from 'zustand';

const useRoomStore = create((set) => ({
  // 현재 방 정보
  currentRoom: null,
  isOwner: false,

  // 방 목록
  rooms: [],

  // 액션들
  setCurrentRoom: (room) => set({ 
    currentRoom: room,
    isOwner: room?.participants?.some(p => p.isOwner) || false
  }),

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

  updateOwner: (newOwner) => set((state) => ({
    currentRoom: state.currentRoom ? {
      ...state.currentRoom,
      owner: newOwner.id,
      participants: state.currentRoom.participants.map(p => 
        p.id === newOwner.id ? { ...p, isOwner: true } : { ...p, isOwner: false }
      )
    } : null
  })),

  leaveRoom: () => set({ currentRoom: null, isOwner: false }),
}));

export default useRoomStore;