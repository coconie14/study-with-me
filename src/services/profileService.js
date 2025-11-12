import { supabase } from '../lib/supabase';

class ProfileService {
  // 프로필 생성 (회원가입 시 자동 호출)
  async createProfile(userId, nickname) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            nickname: nickname,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('프로필 생성 오류:', error);
      throw error;
    }
  }

  // 프로필 조회
  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('프로필 조회 오류:', error);
      throw error;
    }
  }

  // 프로필 업데이트
  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      throw error;
    }
  }

  // 공부 통계 가져오기
  async getStudyStats(userId) {
    try {
      // 최근 7일 세션 기록
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentSessions, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        recentSessions: recentSessions || [],
      };
    } catch (error) {
      console.error('통계 가져오기 오류:', error);
      return { recentSessions: [] };
    }
  }
}

export default new ProfileService();