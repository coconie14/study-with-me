import { create } from 'zustand';
import { auth } from '../lib/supabase';

const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,

  // 사용자 설정
  setUser: (user) => set({ user }),

  // 세션 설정
  setSession: (session) => set({ session }),

  // 로딩 상태
  setLoading: (loading) => set({ loading }),

  // 초기화
  initialize: async () => {
    try {
      // auth 헬퍼 사용 (이미 올바른 형식으로 반환됨)
      const { session } = await auth.getSession();
      const { user } = await auth.getCurrentUser();
      
      set({ 
        user, 
        session,
        loading: false 
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false });
    }
  },

  // 회원가입
  signUp: async (email, password, nickname) => {
    const { data, error } = await auth.signUp(email, password, nickname);
    if (error) {
      return { error };
    }
    
    set({ 
      user: data.user,
      session: data.session 
    });
    
    return { data };
  },

  // 로그인
  signIn: async (email, password) => {
    const { data, error } = await auth.signIn(email, password);
    if (error) {
      return { error };
    }
    
    set({ 
      user: data.user,
      session: data.session 
    });
    
    return { data };
  },

  // 로그아웃
  signOut: async () => {
    const { error } = await auth.signOut();
    if (error) {
      return { error };
    }
    
    set({ 
      user: null,
      session: null 
    });
    
    return {};
  },
}));

export default useAuthStore;