import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, Timer, Music } from 'lucide-react';

function IntroPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* 메인 타이틀 */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">
            Study With Me
          </h1>
          <p className="text-xl text-white/90">
            함께 공부하는 즐거움, 지금 시작하세요
          </p>
        </div>

        {/* 기능 소개 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <FeatureCard 
            icon={<Users className="w-8 h-8" />}
            title="함께하는 공부"
            description="실시간으로 다른 사람들과 함께 공부하세요"
          />
          <FeatureCard 
            icon={<Timer className="w-8 h-8" />}
            title="공유 타이머"
            description="같은 시간을 공유하며 집중력을 높이세요"
          />
          <FeatureCard 
            icon={<Music className="w-8 h-8" />}
            title="배경 음악"
            description="lo-fi 음악과 함께 편안한 분위기 조성"
          />
          <FeatureCard 
            icon={<BookOpen className="w-8 h-8" />}
            title="공부 기록"
            description="나의 공부 시간을 기록하고 관리하세요"
          />
        </div>

        {/* 입장 버튼 */}
        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="bg-white text-purple-600 px-12 py-4 rounded-full text-xl font-bold hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-2xl"
          >
            시작하기
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white hover:bg-white/20 transition-all duration-200">
      <div className="mb-3">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-white/80">{description}</p>
    </div>
  );
}

export default IntroPage;