import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import socketService from '../../services/socket';
import chatService from '../../services/chatService';
import useAuthStore from '../../store/authStore';
// 💡 useToast 임포트
import { useToast } from '../../contexts/ToastProvider';

function Chat({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const { user } = useAuthStore();
  const { showToast } = useToast(); // 💡 useToast 사용
  
  // 사용자 닉네임
  const userNickname = user?.user_metadata?.nickname || user?.email?.split('@')[0] || 'User';

  // 방 입장 시 이전 채팅 기록 불러오기
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        setLoading(true);
        // DB에서 이전 채팅 기록 조회 (최근 50개)
        const history = await chatService.getMessages(roomId, 50);
        
        // DB 메시지를 화면에 표시할 형식으로 변환
        const formattedMessages = history.map(msg => ({
          id: msg.id,
          nickname: msg.nickname,
          message: msg.message,
          time: new Date(msg.created_at).toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
        }));
        
        setMessages(formattedMessages);
      } catch (error) {
        console.error('Failed to load chat history:', error);
        showToast('채팅 기록을 불러오는 데 실패했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (roomId) {
      loadChatHistory();
    }
  }, [roomId, showToast]);

  // Socket으로 새 메시지 실시간 수신
  useEffect(() => {
    const handleNewMessage = (message) => {
      console.log('📩 새 메시지 수신:', message);
      
      // 내가 보낸 메시지는 이미 화면에 있으므로 무시
      if (message.nickname === userNickname) {
        console.log('⏭️ 내가 보낸 메시지는 무시');
        return;
      }
      
      setMessages((prev) => [...prev, message]);
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.off('new-message');
    };
  }, [userNickname]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const messageText = inputMessage;
    const currentTime = new Date().toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // 임시 메시지 ID 생성
    const tempId = `temp-${Date.now()}-${userNickname}`;

    try {
      // 즉시 화면에 표시 (낙관적 업데이트)
      const tempMessage = {
        id: tempId,
        nickname: userNickname,
        message: messageText,
        time: currentTime,
        isTemp: true, // 임시 메시지 표시
      };
      
      setMessages((prev) => [...prev, tempMessage]);
      setInputMessage('');

      // 1️⃣ DB에 메시지 저장
      await chatService.saveMessage(
        roomId,
        user.id,
        userNickname,
        messageText
      );

      // 2️⃣ Socket으로 실시간 전송 (다른 사람들에게)
      socketService.sendMessage(roomId, messageText, userNickname);

    } catch (error) {
      console.error('Failed to send message:', error);
      // 💡 alert() 대신 showToast 사용
      showToast('메시지 전송에 실패했습니다.', 'error');
      // 에러 발생 시 임시 메시지 제거
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col h-96">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        채팅
      </h2>
      
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-400 dark:text-gray-500 mt-8">
            <p className="text-sm">채팅 기록을 불러오는 중...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 mt-8">
            <p className="text-sm">아직 메시지가 없습니다</p>
            <p className="text-xs mt-1">첫 메시지를 보내보세요!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage
              key={message.id || `msg-${index}`}
              nickname={message.nickname}
              message={message.message}
              time={message.time}
              isOwn={message.nickname === userNickname}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지 입력..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ChatMessage({ nickname, message, time, isOwn }) {
  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className="flex items-baseline gap-2 mb-1">
        <span className={`font-semibold text-sm ${isOwn ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
          {nickname}
        </span>
        <span className="text-xs text-gray-400">{time}</span>
      </div>
      <p className={`text-sm rounded-lg px-3 py-2 max-w-xs break-words ${
        isOwn 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
      }`}>
        {message}
      </p>
    </div>
  );
}

export default Chat;