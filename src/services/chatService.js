import { supabase } from '../lib/supabase';

class ChatService {
  // 메시지 저장 (DB에 영구 보관)
  async saveMessage(roomId, userId, nickname, message) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            room_id: roomId,
            user_id: userId,
            nickname: nickname,
            message: message,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('메시지 저장 오류:', error);
      throw error;
    }
  }

  // 방의 채팅 기록 조회 (최근 N개)
  async getMessages(roomId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true }) // 오래된 순으로
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('메시지 조회 오류:', error);
      throw error;
    }
  }

  // 실시간 메시지 구독 (Supabase Realtime)
  subscribeToMessages(roomId, callback) {
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return channel;
  }

  // 구독 해제
  unsubscribe(channel) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  }

  // 특정 방의 모든 메시지 삭제 (방 삭제 시)
  async deleteRoomMessages(roomId) {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('room_id', roomId);

      if (error) throw error;
    } catch (error) {
      console.error('메시지 삭제 오류:', error);
      throw error;
    }
  }

  // 메시지 개수 조회 (통계용)
  async getMessageCount(roomId) {
    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('메시지 개수 조회 오류:', error);
      throw error;
    }
  }
}

export default new ChatService();
