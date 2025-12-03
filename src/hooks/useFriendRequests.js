import { useState, useEffect } from 'react';
import friendService from '../services/friendService';
import useAuthStore from '../store/authStore';

/**
 * 친구 요청 알림 훅
 */
export function useFriendRequests() {
  const { user } = useAuthStore();
  const [requestCount, setRequestCount] = useState(0);
  const [hasNewRequest, setHasNewRequest] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchRequestCount = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const requests = await friendService.getReceivedRequests(user.id);
      const newCount = requests.length;
      
      if (newCount > requestCount && requestCount > 0) {
        setHasNewRequest(true);
      }
      
      setRequestCount(newCount);
    } catch (error) {
      console.error('친구 요청 확인 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchRequestCount();
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, requestCount]);

  const markAsRead = () => {
    setHasNewRequest(false);
  };

  const refresh = () => {
    fetchRequestCount();
  };

  return {
    requestCount,
    hasNewRequest,
    loading,
    markAsRead,
    refresh,
  };
}