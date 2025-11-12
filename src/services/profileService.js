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
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
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

  // 공부 시간 추가 (타이머 종료 시 호출)
  async addStudyTime(userId, minutes) {
    try {
      const profile = await this.getProfile(userId);
      return this.updateProfile(userId, {
        total_study_time: (profile.total_study_time || 0) + minutes,
      });
    } catch (error) {
      console.error('공부 시간 추가 오류:', error);
      throw error;
    }
  }

  // 공부 세션 기록 (통계용)
  async recordStudySession(userId, roomId, durationMinutes) {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert([
          {
            user_id: userId,
            room_id: roomId,
            duration_minutes: durationMinutes,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // 총 공부 시간도 업데이트
      await this.addStudyTime(userId, durationMinutes);

      return data;
    } catch (error) {
      console.error('공부 세션 기록 오류:', error);
      throw error;
    }
  }

  // 사용자의 공부 통계 조회
  async getStudyStats(userId) {
    try {
      // 프로필에서 총 공부 시간
      const profile = await this.getProfile(userId);

      // 최근 7일 세션 기록
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentSessions, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('session_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('session_date', { ascending: false });

      if (error) throw error;

      return {
        totalStudyTime: profile.total_study_time || 0,
        recentSessions: recentSessions || [],
      };
    } catch (error) {
      console.error('공부 통계 조회 오류:', error);
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
}

export default new ProfileService();
