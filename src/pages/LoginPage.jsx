import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import useAuthStore from '../store/authStore';
// 💡 useToast 임포트
import { useToast } from '../contexts/ToastProvider';

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuthStore();
  const { showToast } = useToast(); // 💡 useToast 사용

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // 회원가입
        if (!nickname.trim()) {
          setError('닉네임을 입력해주세요');
          setLoading(false);
          return;
        }

        const { error: authError } = await signUp(email, password, nickname);
        if (authError) {
          setError(authError.message);
          showToast('회원가입에 실패했습니다.', 'error');
        } else {
          // 💡 alert() 대체
          showToast('회원가입이 완료되었습니다! 이메일을 확인해주세요.', 'success'); 
          setIsSignUp(false);
        }
      } else {
        // 로그인
        const { error: authError } = await signIn(email, password);
        if (authError) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다');
          showToast('로그인에 실패했습니다.', 'error');
        } else {
          showToast('환영합니다! 갤러리로 이동합니다.', 'success');
          navigate('/gallery');
        }
      }
    } catch (error) {
      setError('오류가 발생했습니다. 다시 시도해주세요.');
      showToast('인증 과정 중 심각한 오류가 발생했습니다.', 'error');
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-500 to-sky-400 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Study With Me
          </h1>
          <p className="text-white/90">
            함께 공부하는 즐거움
          </p>
        </div>

        {/* 로그인/회원가입 폼 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => {
                setIsSignUp(false);
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                !isSignUp
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => {
                setIsSignUp(true);
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                isSignUp
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  닉네임
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="닉네임을 입력하세요"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="비밀번호를 입력하세요"
                required
                minLength={6}
              />
              {isSignUp && (
                <p className="text-xs text-gray-500 mt-1">
                  최소 6자 이상
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '처리중...' : isSignUp ? '회원가입' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;