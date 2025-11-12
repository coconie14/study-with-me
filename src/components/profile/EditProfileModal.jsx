import React, { useState } from 'react';
import { X, Camera } from 'lucide-react';
import profileService from '../../services/profileService';
import { supabase } from '../../lib/supabase';
// 💡 useToast 임포트 추가 (ToastProvider에서 useToast를 내보낸다고 가정)
import { useToast } from '../../contexts/ToastProvider'; 

const EditProfileModal = ({ profile, onClose, onUpdate }) => {
  const { showToast } = useToast(); // 💡 useToast 사용
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [bio, setBio] = useState(profile?.bio || '');
  
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); 

  // 💡 파일 선택 및 미리보기 설정
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('파일 크기는 5MB를 초과할 수 없습니다.');
      return;
    }
    
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError('');
  };
  
  // 💡 이미지 업로드 처리 함수
  const uploadAvatar = async (file) => {
    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `avatars/${profile.id}_${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars') 
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    setLoading(true);
    let avatarUrl = profile?.avatar_url;

    try {
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }
      
      const updates = {
        nickname: nickname.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
      };

      await profileService.updateProfile(profile.id, updates);

      // 💡 성공 토스트 메시지 표시
      showToast('프로필이 성공적으로 업데이트되었습니다.', 'success');
      
      onUpdate(); // 부모 컴포넌트 상태 업데이트 요청
      
    } catch (err) {
      console.error('프로필 업데이트 실패:', err);
      // 💡 오류 토스트 메시지 표시
      setError('저장 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
      showToast('프로필 업데이트에 실패했습니다.', 'error'); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">프로필 편집</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. 프로필 사진 편집 */}
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 mb-4">
              {/* 아바타 이미지 */}
              <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-400 to-cyan-400">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">{nickname?.[0]?.toUpperCase() || 'U'}</span>
                )}
              </div>
              
              {/* 사진 변경 버튼 (클릭 시 파일 입력 트리거) */}
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                <Camera className="w-4 h-4" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
          
          {/* 2. 닉네임 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="닉네임을 입력하세요"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {nickname.length}/50
            </p>
          </div>

          {/* 3. 자기소개 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              자기소개
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="자기소개를 입력하세요"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {bio.length}/200
            </p>
          </div>
          
          {/* 💡 에러 메시지 표시 */}
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-600 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* 4. 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !nickname.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;