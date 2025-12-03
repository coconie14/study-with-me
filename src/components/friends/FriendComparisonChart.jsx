import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Award, Users } from 'lucide-react';
import friendService from '../../services/friendService';
import useAuthStore from '../../store/authStore';
function FriendComparisonChart() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('week'); // 'week' or 'month'
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, period]); // loadStats는 의도적으로 제외 (무한 루프 방지)

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await friendService.getFriendsStudyStats(user.id, period);
      // 공부 시간 많은 순으로 정렬
      const sorted = data.sort((a, b) => b.totalMinutes - a.totalMinutes);
      setStats(sorted);
    } catch (error) {
      console.error('통계 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 상위 3명 찾기
  const top3 = stats.slice(0, 3);
  const myRank = stats.findIndex(s => s.isMe) + 1;

  // 그래프 데이터 변환
  const chartData = stats.map((stat, index) => ({
    name: stat.isMe ? '나' : stat.nickname,
    hours: stat.totalHours,
    isMe: stat.isMe,
    rank: index + 1,
  }));

  // 커스텀 바 색상
  const getBarColor = (entry) => {
    if (entry.isMe) return '#3b82f6'; // 파란색 (나)
    if (entry.rank === 1) return '#fbbf24'; // 금색 (1등)
    if (entry.rank === 2) return '#9ca3af'; // 은색 (2등)
    if (entry.rank === 3) return '#cd7f32'; // 동색 (3등)
    return '#e5e7eb'; // 회색 (나머지)
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">친구 비교</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {period === 'week' ? '최근 7일' : '최근 30일'} 공부 시간
            </p>
          </div>
        </div>

        {/* 기간 선택 */}
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              period === 'week'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            주간
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              period === 'month'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            월간
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <Users className="w-16 h-16 mb-4 opacity-50" />
          <p>친구가 없습니다</p>
          <p className="text-sm mt-1">친구를 추가하고 함께 공부하세요!</p>
        </div>
      ) : (
        <>
          {/* 상위 3명 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {top3.map((stat, index) => (
              <div
                key={stat.id}
                className={`p-4 rounded-lg ${
                  stat.isMe
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Award
                    className={`w-5 h-5 ${
                      index === 0
                        ? 'text-yellow-500'
                        : index === 1
                        ? 'text-gray-400'
                        : 'text-orange-600'
                    }`}
                  />
                  <span className="font-bold text-gray-900 dark:text-white">
                    {index + 1}등
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {stat.isMe ? '나' : stat.nickname}
                </p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {stat.totalHours}시간
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stat.sessionCount}개 세션
                </p>
              </div>
            ))}
          </div>

          {/* 내 순위 */}
          {myRank > 3 && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">내 순위</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {myRank}등 / {stats.length}명
              </p>
            </div>
          )}

          {/* 그래프 */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  label={{ value: '시간 (h)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value, name, props) => [
                    `${value}시간 (${props.payload.rank}등)`,
                    props.payload.isMe ? '나' : '친구'
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="hours"
                  fill="#3b82f6"
                  radius={[8, 8, 0, 0]}
                  shape={(props) => {
                    const { x, y, width, height, payload } = props;
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={getBarColor(payload)}
                        rx={8}
                        ry={8}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 범례 */}
          <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-gray-600 dark:text-gray-400">나</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500"></div>
              <span className="text-gray-600 dark:text-gray-400">1등</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-400"></div>
              <span className="text-gray-600 dark:text-gray-400">2등</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#cd7f32' }}></div>
              <span className="text-gray-600 dark:text-gray-400">3등</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default FriendComparisonChart;