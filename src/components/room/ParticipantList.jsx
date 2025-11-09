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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
              {participant.nickname[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{participant.nickname}</p>
              {participant.isOwner && (
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">👑 방장</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ParticipantList;