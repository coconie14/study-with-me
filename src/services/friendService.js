import { supabase } from '../lib/supabase';

class FriendService {
  // 👥 친구 요청 보내기
  async sendFriendRequest(userId, friendId) {
    try {
      // 자기 자신에게 요청 방지
      if (userId === friendId) {
        throw new Error('자기 자신에게 친구 요청을 보낼 수 없습니다.');
      }

      // 이미 친구 관계가 있는지 확인 (양방향)
      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

      if (existing && existing.length > 0) {
        const status = existing[0].status;
        if (status === 'accepted') {
          throw new Error('이미 친구입니다.');
        } else if (status === 'pending') {
          throw new Error('이미 친구 요청을 보냈거나 받았습니다.');
        }
      }

      // 친구 요청 생성
      const { data, error } = await supabase
        .from('friendships')
        .insert([
          {
            user_id: userId,
            friend_id: friendId,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('친구 요청 오류:', error);
      throw error;
    }
  }

  // ✅ 친구 요청 수락
  async acceptFriendRequest(requestId, userId) {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('friend_id', userId) // 받는 사람만 수락 가능
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('친구 요청 수락 오류:', error);
      throw error;
    }
  }

  // ❌ 친구 요청 거절/취소
  async rejectFriendRequest(requestId, userId) {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId)
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`); // 보낸 사람이나 받는 사람 모두 취소 가능

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('친구 요청 거절 오류:', error);
      throw error;
    }
  }

  // 🗑️ 친구 삭제
  async removeFriend(userId, friendId) {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
        .eq('status', 'accepted');

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('친구 삭제 오류:', error);
      throw error;
    }
  }

  // 📋 내 친구 목록 (수락된 친구만)
  async getFriends(userId) {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at
        `)
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) throw error;

      // 친구 ID 추출 (나를 제외한)
      const friendIds = data.map(f => 
        f.user_id === userId ? f.friend_id : f.user_id
      );

      if (friendIds.length === 0) return [];

      // 친구 프로필 정보 가져오기
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url, total_study_time')
        .in('id', friendIds);

      if (profileError) throw profileError;

      return profiles || [];
    } catch (error) {
      console.error('친구 목록 조회 오류:', error);
      return [];
    }
  }

  // 📨 받은 친구 요청 목록
  async getReceivedRequests(userId) {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          created_at
        `)
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // 요청 보낸 사람들의 프로필 정보
      const userIds = data.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .in('id', userIds);

      // 프로필 정보 병합
      return data.map(request => ({
        ...request,
        sender: profiles?.find(p => p.id === request.user_id),
      }));
    } catch (error) {
      console.error('받은 요청 조회 오류:', error);
      return [];
    }
  }

  // 📤 보낸 친구 요청 목록
  async getSentRequests(userId) {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          friend_id,
          created_at
        `)
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // 요청 받은 사람들의 프로필 정보
      const friendIds = data.map(r => r.friend_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .in('id', friendIds);

      // 프로필 정보 병합
      return data.map(request => ({
        ...request,
        receiver: profiles?.find(p => p.id === request.friend_id),
      }));
    } catch (error) {
      console.error('보낸 요청 조회 오류:', error);
      return [];
    }
  }

  // 🔍 사용자 검색 (닉네임으로)
  async searchUsers(query, currentUserId) {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url, total_study_time')
        .ilike('nickname', `%${query}%`)
        .neq('id', currentUserId) // 자기 자신 제외
        .limit(10);

      if (error) throw error;

      // 각 사용자에 대해 이미 친구인지, 요청을 보냈는지 확인
      const usersWithStatus = await Promise.all(
        (data || []).map(async (user) => {
          const { data: friendship } = await supabase
            .from('friendships')
            .select('status')
            .or(`and(user_id.eq.${currentUserId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${currentUserId})`)
            .maybeSingle();

          return {
            ...user,
            friendshipStatus: friendship?.status || null, // null, 'pending', 'accepted'
          };
        })
      );

      return usersWithStatus;
    } catch (error) {
      console.error('사용자 검색 오류:', error);
      return [];
    }
  }

  // 📊 친구들의 공부 통계 가져오기 (비교용)
  async getFriendsStudyStats(userId, period = 'week') {
    try {
      // 친구 목록 가져오기
      const friends = await this.getFriends(userId);
      const friendIds = friends.map(f => f.id);

      if (friendIds.length === 0) return [];

      // 기간 설정
      const startDate = new Date();
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      // 친구들의 공부 세션 가져오기
      const { data: sessions, error } = await supabase
        .from('study_sessions')
        .select('user_id, duration_minutes, created_at')
        .in('user_id', [...friendIds, userId]) // 나 + 친구들
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // 사용자별로 그룹화
      const stats = {};
      sessions?.forEach(session => {
        if (!stats[session.user_id]) {
          stats[session.user_id] = {
            total: 0,
            sessions: [],
          };
        }
        stats[session.user_id].total += session.duration_minutes;
        stats[session.user_id].sessions.push(session);
      });

      // 프로필 정보와 병합
      const allUsers = [
        { id: userId, nickname: '나', isMe: true },
        ...friends.map(f => ({ ...f, isMe: false })),
      ];

      return allUsers.map(user => ({
        id: user.id,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        isMe: user.isMe,
        totalMinutes: stats[user.id]?.total || 0,
        totalHours: Math.floor((stats[user.id]?.total || 0) / 60),
        sessionCount: stats[user.id]?.sessions?.length || 0,
      }));
    } catch (error) {
      console.error('친구 통계 조회 오류:', error);
      return [];
    }
  }
}

export default new FriendService();