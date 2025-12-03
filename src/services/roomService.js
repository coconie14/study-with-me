import { supabase } from '../lib/supabase';

class RoomService {
  // ✅ 방 생성 (이모지 + 커버 이미지 포함)
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
            emoji: roomData.emoji || '📚',
            cover_image_url: roomData.coverImageUrl || null,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // ✅ 방장을 참여자 목록에 자동 추가
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

  // ✅ 활성화된 방 목록 조회 (이모지/커버 이미지 포함)
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

      // owner 정보를 한번에 조회
      const ownerIds = [...new Set(data.map(room => room.owner_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', ownerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.nickname]) || []);

      // 💡 참여자가 0명인 방 필터링
      const roomsWithDetails = data
        .filter(room => room.room_participants && room.room_participants.length > 0)
        .map((room) => ({
          ...room,
          participantCount: room.room_participants?.length || 0,
          ownerNickname: profileMap.get(room.owner_id) || 'Unknown',
          emoji: room.emoji || '📚',
          coverImageUrl: room.cover_image_url || null,
        }));

      return roomsWithDetails;
    } catch (error) {
      console.error('방 목록 조회 오류:', error);
      throw error;
    }
  }

  // ✅ 특정 방 조회
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

      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', data.owner_id)
        .single();

      return {
        ...data,
        ownerNickname: ownerProfile?.nickname || 'Unknown',
        emoji: data.emoji || '📚',
        cover_image_url: data.cover_image_url || null,
      };
    } catch (error) {
      console.error('방 조회 오류:', error);
      throw error;
    }
  }

  // 참여자 추가
  async addParticipant(roomId, userId, nickname, isOwner = false) {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;
      if (existing) return existing;

      const { data, error } = await supabase
        .from('room_participants')
        .insert([
          {
            room_id: roomId,
            user_id: userId,
            nickname,
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

  async removeParticipant(roomId, userId) {
    try {
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;

      const { data: remaining } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId);

      if (!remaining || remaining.length === 0) {
        await this.deactivateRoom(roomId);
      }
    } catch (error) {
      console.error('참여자 제거 오류:', error);
      throw error;
    }
  }

  async deactivateRoom(roomId) {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ is_active: false })
        .eq('id', roomId);

      if (error) throw error;
      
      console.log(`✅ Room ${roomId} deactivated (is_active: false)`);
    } catch (error) {
      console.error('방 비활성화 오류:', error);
      throw error;
    }
  }

  // 💡 강제 삭제 메소드 (새로 추가)
  async forceDeleteRoom(roomId) {
    try {
      console.log(`🗑️ Force deleting room: ${roomId}`);
      
      // 1. 참여자 먼저 삭제 (CASCADE가 없는 경우 대비)
      const { error: participantsError } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId);
      
      if (participantsError) {
        console.warn('참여자 삭제 중 경고:', participantsError);
      }
      
      // 2. 방 완전 삭제
      const { error: roomError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);
      
      if (roomError) throw roomError;
      
      console.log(`✅ Room ${roomId} permanently deleted`);
      return { success: true };
    } catch (error) {
      console.error('강제 삭제 오류:', error);
      throw error;
    }
  }

  async deleteRoom(roomId, userId) {
    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('owner_id')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;
      if (room.owner_id !== userId)
        throw new Error('방장만 방을 삭제할 수 있습니다');

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

  async transferOwnership(roomId, newOwnerId) {
    try {
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ owner_id: newOwnerId })
        .eq('id', roomId);

      if (roomError) throw roomError;

      const { error: resetError } = await supabase
        .from('room_participants')
        .update({ is_owner: false })
        .eq('room_id', roomId);

      if (resetError) throw resetError;

      const { error: newOwnerError } = await supabase
        .from('room_participants')
        .update({ is_owner: true })
        .eq('room_id', roomId)
        .eq('user_id', newOwnerId);

      if (newOwnerError) throw newOwnerError;
      
      console.log(`✅ Ownership transferred to ${newOwnerId}`);
    } catch (error) {
      console.error('방장 권한 이전 오류:', error);
      throw error;
    }
  }
}

export default new RoomService();