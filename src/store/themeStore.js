import { create } from 'zustand';

const useThemeStore = create((set, get) => ({
  isDarkMode: false,

  toggleTheme: () => {
    const currentMode = get().isDarkMode;
    const newMode = !currentMode;
    
    // HTML에 dark 클래스 토글
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // localStorage에 저장
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    
    set({ isDarkMode: newMode });
  },

  initializeTheme: () => {
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark';
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    set({ isDarkMode: isDark });
  }
}));

export default useThemeStore;