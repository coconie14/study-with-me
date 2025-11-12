import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';
import ReactCrop, { 
    centerCrop, 
    makeAspectCrop 
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { canvasPreview } from './canvasPreview'; 
// 💡 경로를 ToastProvider 파일 이름으로 최종 수정
import { useToast } from '../../contexts/ToastProvider'; 

const emojiOptions = ['📚', '💻', '☕', '🔥', '🎧', '🌙', '💡', '📖', '✏️', '🧠'];

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

const CreateRoomModal = ({ isOpen, onClose, onCreate, ownerId, ownerNickname }) => {
  const { showToast } = useToast(); 
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('📚');
  
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImgSrc(reader.result?.toString() || '');
    });
    reader.readAsDataURL(file);
    
    setEmoji('🖼️'); 
  };
  
  const onImageLoad = (e) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 16 / 9)); 
  };

  const getCroppedImageBlob = async () => {
    if (!completedCrop || !imgRef.current) return null;

    canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop);
    
    return new Promise((resolve) => {
        previewCanvasRef.current.toBlob((blob) => {
            if (blob) {
                blob.name = `cropped_${Date.now()}.png`;
                resolve(blob);
            } else {
                resolve(null);
            }
        }, 'image/png');
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return showToast('방 이름을 입력하세요.', 'error');
    setLoading(true);
    
    try {
      let coverImageUrl = null;
      let finalFileToUpload = null;

      if (imgSrc && completedCrop) {
        finalFileToUpload = await getCroppedImageBlob();
      }

      if (finalFileToUpload) {
        const fileExt = finalFileToUpload.name.split('.').pop() || 'png';
        const filePath = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('room-covers')
          .upload(filePath, finalFileToUpload, {
             cacheControl: '3600',
             upsert: false,
             contentType: 'image/png',
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('room-covers')
          .getPublicUrl(filePath);
          
        coverImageUrl = publicUrlData.publicUrl;
      }

      await onCreate({
        name,
        description,
        emoji: imgSrc ? '🖼️' : emoji,
        coverImageUrl,
        ownerId,
        ownerNickname,
      });

      onClose();
      showToast(`공부방 "${name.trim()}"이 생성되었습니다.`, 'success'); 
      
      setName('');
      setDescription('');
      setEmoji('📚');
      setImgSrc('');
      setCompletedCrop(null);
      setCrop(undefined);
    } catch (err) {
      console.error('방 생성 실패:', err);
      showToast('방 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-4 text-center dark:text-white">새 공부방 만들기</h2>

        <label className="block mb-2 text-sm font-medium dark:text-gray-300">방 이름</label>
        <input
          className="w-full p-2 rounded-md bg-gray-100 dark:bg-gray-800 dark:text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 오늘의 집중 세션"
        />

        <label className="block mt-4 mb-2 text-sm font-medium dark:text-gray-300">설명</label>
        <textarea
          className="w-full p-2 rounded-md bg-gray-100 dark:bg-gray-800 dark:text-white"
          rows="3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="방에 대한 간단한 소개를 적어주세요"
        />

        <label className="block mt-4 mb-2 text-sm font-medium dark:text-gray-300">이모지 선택</label>
        <div className="flex flex-wrap gap-2">
          {emojiOptions.map((emj) => (
            <button
              key={emj}
              className={`p-2 text-2xl rounded-lg ${
                emoji === emj ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 dark:text-white'
              }`}
              onClick={() => { setEmoji(emj); setImgSrc(''); setCompletedCrop(null); }}
            >
              {emj}
            </button>
          ))}
        </div>

        <label className="block mt-4 mb-2 text-sm font-medium dark:text-gray-300">커버 이미지</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full text-sm dark:text-gray-400"
          disabled={!!imgSrc} 
        />
        
        {imgSrc && (
          <div className="mt-3">
            <h3 className="text-sm font-medium mb-2 dark:text-gray-300">이미지 영역 지정 (16:9 비율)</h3>
            <div className="flex justify-center max-h-80 overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={c => setCompletedCrop(c)}
                aspect={16 / 9}
                minWidth={100}
                minHeight={50}
              >
                <img 
                  ref={imgRef}
                  alt="Crop me"
                  src={imgSrc}
                  onLoad={onImageLoad}
                  style={{ maxHeight: '400px', width: '100%', height: 'auto' }} 
                />
              </ReactCrop>
            </div>
            
            {completedCrop && (
                <div className="hidden">
                    <canvas
                        ref={previewCanvasRef}
                        style={{
                            width: completedCrop.width,
                            height: completedCrop.height,
                        }}
                    />
                </div>
            )}
            
             <button
                onClick={() => { setImgSrc(''); setCompletedCrop(null); setEmoji('📚'); }}
                className="mt-3 w-full py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
             >
                이미지 취소 및 이모지 선택
             </button>
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full mt-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '생성 중...' : '공부방 생성하기'}
        </button>
      </div>
    </div>
  );
};

export default CreateRoomModal;