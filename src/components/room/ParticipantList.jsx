import { Users } from 'lucide-react';

function ParticipantList({ participants }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        참여자 ({participants.length})
      </h2>
      <div className="space-y-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {/* 💡 프로필 사진 표시 로직 추가 */}
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-400 to-cyan-400">
              {participant.avatar_url ? (
                // avatar_url이 있으면 이미지 표시
                <img 
                  src={participant.avatar_url} 
                  alt={`${participant.nickname}'s avatar`} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                // 없으면 닉네임 첫 글자 표시
                <span className="text-white font-semibold">
                  {participant.nickname[0].toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{participant.nickname}</p>
              {participant.isOwner && (
                // 💡 방장 태그 색상 블루로 변경
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">👑 방장</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ParticipantList;