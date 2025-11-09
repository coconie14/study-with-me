import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import socketService from '../../services/socket';
import useAuthStore from '../../store/authStore';

function Chat({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const { user } = useAuthStore();
  
  // 사용자 닉네임
  const userNickname = user?.user_metadata?.nickname || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    // 새 메시지 수신
    socketService.onNewMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socketService.off('new-message');
    };
  }, []);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    socketService.sendMessage(roomId, inputMessage, userNickname);
    setInputMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 flex flex-col h-96">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        채팅
      </h2>
      
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-sm">아직 메시지가 없습니다</p>
            <p className="text-xs mt-1">첫 메시지를 보내보세요!</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
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
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        <span className={`font-semibold text-sm ${isOwn ? 'text-purple-600' : 'text-gray-900'}`}>
          {nickname}
        </span>
        <span className="text-xs text-gray-400">{time}</span>
      </div>
      <p className={`text-sm rounded-lg px-3 py-2 max-w-xs break-words ${
        isOwn 
          ? 'bg-purple-600 text-white' 
          : 'bg-gray-100 text-gray-700'
      }`}>
        {message}
      </p>
    </div>
  );
}

export default Chat;