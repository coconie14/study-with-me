import { supabase } from '../lib/supabase';

class StudySessionService {
  // 공부 세션 저장
  async saveSession(userId, roomId, durationMinutes) {
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

      console.log('✅ 공부 세션 저장:', data);
      return data;
    } catch (error) {
      console.error('공부 세션 저장 오류:', error);
      throw error;
    }
  }

  // 사용자의 최근 세션 가져오기
  async getRecentSessions(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('세션 가져오기 오류:', error);
      return [];
    }
  }

  // 총 공부 시간 계산
  async getTotalStudyTime(userId) {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('duration_minutes')
        .eq('user_id', userId);

      if (error) throw error;

      const total = data.reduce((sum, session) => sum + session.duration_minutes, 0);
      return total;
    } catch (error) {
      console.error('총 공부 시간 계산 오류:', error);
      return 0;
    }
  }

  // 오늘 공부한 시간
  async getTodayStudyTime(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('study_sessions')
        .select('duration_minutes')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const total = data.reduce((sum, session) => sum + session.duration_minutes, 0);
      return total;
    } catch (error) {
      console.error('오늘 공부 시간 계산 오류:', error);
      return 0;
    }
  }
}

export default new StudySessionService();