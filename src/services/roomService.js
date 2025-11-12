import { supabase } from '../lib/supabase';

class RoomService {
  // 방 생성
  async createRoom(roomData) {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert([
          {
            name: roomData.name,
            description: roomData.description || '',
            owner_id: roomData.ownerId,
            max_participants: roomData.maxParticipants || 6,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // 방장을 참여자 목록에 추가
      await this.addParticipant(
        data.id,
        roomData.ownerId,
        roomData.ownerNickname,
        true
      );

      return data;
    } catch (error) {
      console.error('방 생성 오류:', error);
      throw error;
    }
  }

  // 활성 방 목록 조회
  async getActiveRooms() {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          room_participants (id)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 참여자 수 계산 및 방장 정보 조회
      const roomsWithDetails = await Promise.all(
        data.map(async (room) => {
          // 방장 닉네임 조회
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', room.owner_id)
            .single();

          return {
            ...room,
            participantCount: room.room_participants?.length || 0,
            ownerNickname: ownerProfile?.nickname || 'Unknown',
          };
        })
      );

      return roomsWithDetails;
    } catch (error) {
      console.error('방 목록 조회 오류:', error);
      throw error;
    }
  }

  // 특정 방 조회 (참여자 정보 포함)
  async getRoom(roomId) {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          room_participants (
            id,
            user_id,
            nickname,
            is_owner,
            joined_at
          )
        `)
        .eq('id', roomId)
        .single();

      if (error) throw error;

      // 방장 닉네임 조회
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', data.owner_id)
        .single();

      return {
        ...data,
        ownerNickname: ownerProfile?.nickname || 'Unknown',
      };
    } catch (error) {
      console.error('방 조회 오류:', error);
      throw error;
    }
  }

  // 참여자 추가
  async addParticipant(roomId, userId, nickname, isOwner = false) {
    try {
      // 이미 참여 중인지 확인
      const { data: existing, error: checkError } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        console.log('이미 참여 중인 사용자');
        return existing;
      }

      // 새로 추가
      const { data, error } = await supabase
        .from('room_participants')
        .insert([
          {
            room_id: roomId,
            user_id: userId,
            nickname: nickname,
            is_owner: isOwner,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('참여자 추가 오류:', error);
      throw error;
    }
  }

  // 참여자 제거
  async removeParticipant(roomId, userId) {
    try {
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;

      // 남은 참여자 확인
      const { data: remainingParticipants } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId);

      // 참여자가 없으면 방 비활성화
      if (!remainingParticipants || remainingParticipants.length === 0) {
        await this.deleteRoom(roomId);
      }
    } catch (error) {
      console.error('참여자 제거 오류:', error);
      throw error;
    }
  }

  // 방 삭제 (비활성화)
  async deleteRoom(roomId) {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ is_active: false })
        .eq('id', roomId);

      if (error) throw error;
    } catch (error) {
      console.error('방 삭제 오류:', error);
      throw error;
    }
  }

  // 현재 재생 중인 영상 업데이트
  async updateCurrentVideo(roomId, videoId) {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          current_video_id: videoId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomId);

      if (error) throw error;
    } catch (error) {
      console.error('현재 영상 업데이트 오류:', error);
      throw error;
    }
  }

  // 타이머 시간 업데이트
  async updateTimer(roomId, minutes) {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          current_timer_minutes: minutes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomId);

      if (error) throw error;
    } catch (error) {
      console.error('타이머 업데이트 오류:', error);
      throw error;
    }
  }

  // 방장 권한 이전
  async transferOwnership(roomId, newOwnerId) {
    try {
      // 1. 방의 owner_id 변경
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ owner_id: newOwnerId })
        .eq('id', roomId);

      if (roomError) throw roomError;

      // 2. 모든 참여자의 is_owner를 false로
      const { error: resetError } = await supabase
        .from('room_participants')
        .update({ is_owner: false })
        .eq('room_id', roomId);

      if (resetError) throw resetError;

      // 3. 새 방장의 is_owner를 true로
      const { error: newOwnerError } = await supabase
        .from('room_participants')
        .update({ is_owner: true })
        .eq('room_id', roomId)
        .eq('user_id', newOwnerId);

      if (newOwnerError) throw newOwnerError;
    } catch (error) {
      console.error('방장 권한 이전 오류:', error);
      throw error;
    }
  }
  // 방 삭제 (방장만 가능)
  async deleteRoom(roomId, userId) {
    try {
      // 방장 확인
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('owner_id')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;

      if (room.owner_id !== userId) {
        throw new Error('방장만 방을 삭제할 수 있습니다');
      }

      // 방 삭제 (CASCADE로 참여자, 채팅도 자동 삭제)
      const { error: deleteError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (deleteError) throw deleteError;

      return { success: true };
    } catch (error) {
      console.error('방 삭제 오류:', error);
      throw error;
    }
  }
}

export default new RoomService();