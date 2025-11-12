import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Youtube, Minimize2, Maximize2 } from 'lucide-react';
import socketService from '../../services/socket';
import useRoomStore from '../../store/roomStore';

function MediaPlayer({ roomId }) {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const [videoSize, setVideoSize] = useState('large'); // 👈 'large', 'small', 'audio'
  const playerRef = useRef(null);
  const isLoadingRef = useRef(false);
  
  const { currentRoom } = useRoomStore();
  const isOwner = currentRoom?.participants?.find(p => p.isOwner && p.id === socketService.getSocket()?.id);

  // 크기 순환: large → small → audio → large
  const cycleVideoSize = () => {
    setVideoSize(prev => {
      if (prev === 'large') return 'small';
      if (prev === 'small') return 'audio';
      return 'large';
    });
  };

  // YouTube IFrame API 로드
  useEffect(() => {
    // API가 이미 로드되어 있는지 확인
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // API 준비 완료 이벤트
    window.onYouTubeIframeAPIReady = () => {
      console.log('YouTube API Ready');
    };
  }, []);

  // YouTube URL에서 Video ID 추출
  const extractVideoId = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : null;
  };

  // 플레이어 생성
  const createPlayer = (id) => {
    if (isLoadingRef.current || !playerRef.current) return;
    isLoadingRef.current = true;

    // 기존 플레이어가 있으면 제거
    if (player) {
      try {
        player.destroy();
      } catch (e) {
        console.log('Player destroy error:', e);
      }
    }

    // playerRef에 고유 ID 설정
    if (!playerRef.current.id) {
      playerRef.current.id = `Youtubeer-${Date.now()}`;
    }

    // 새 플레이어 생성
    try {
      const newPlayer = new window.YT.Player(playerRef.current.id, {
        videoId: id,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(volume);
            setIsPlaying(true);
            isLoadingRef.current = false;
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            }
          },
        },
      });

      setPlayer(newPlayer);
    } catch (error) {
      console.error('Player creation error:', error);
      isLoadingRef.current = false;
    }
  };

  // 미디어 동기화 이벤트 수신
  useEffect(() => {
    const handleMediaSync = (mediaData) => {
      console.log('Media sync received:', mediaData);
      
      // 새 영상 로드 (videoId가 변경되었을 때만)
      if (mediaData.videoId && mediaData.videoId !== videoId && !isLoadingRef.current) {
        setVideoId(mediaData.videoId);
        setTimeout(() => {
          createPlayer(mediaData.videoId);
        }, 100);
        return; // 새 플레이어 생성 중이면 나머지는 스킵
      }

      // 재생/일시정지 동기화 (방장이 아닐 때만)
      if (player && !isOwner && videoId === mediaData.videoId) {
        if (mediaData.isPlaying && !isPlaying) {
          player.playVideo();
          setIsPlaying(true);
        } else if (!mediaData.isPlaying && isPlaying) {
          player.pauseVideo();
          setIsPlaying(false);
        }

        // 볼륨은 동기화하지 않음 (개인 설정)
      }
    };

    socketService.onMediaSync(handleMediaSync);

    return () => {
      socketService.off('media-sync');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, videoId, isPlaying, isOwner, volume]);

  // 영상 로드 (방장만)
  const loadVideo = () => {
    if (!isOwner) {
      alert('방장만 영상을 변경할 수 있습니다');
      return;
    }

    const id = extractVideoId(url);
    if (id) {
      setVideoId(id);
      createPlayer(id);
      
      // Socket으로 전송
      socketService.mediaLoad(roomId, id);
    } else {
      alert('올바른 YouTube URL을 입력해주세요');
    }
  };

  // 재생/일시정지 (방장만)
  const togglePlay = () => {
    if (!isOwner) {
      alert('방장만 컨트롤할 수 있습니다');
      return;
    }

    if (player) {
      if (isPlaying) {
        player.pauseVideo();
        socketService.mediaPause(roomId);
      } else {
        player.playVideo();
        socketService.mediaPlay(roomId);
      }
    }
  };

  // 음소거 토글
  const toggleMute = () => {
    if (player) {
      if (isMuted) {
        player.unMute();
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    }
  };

  // 볼륨 조절 (모두 가능 - 개인 볼륨)
  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (player) {
      player.setVolume(newVolume);
      
      if (newVolume === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">배경 음악/영상</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={cycleVideoSize}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={videoSize === 'large' ? '작게' : videoSize === 'small' ? '오디오만' : '크게'}
          >
            {videoSize === 'audio' ? (
              <Volume2 className="w-4 h-4 text-blue-500" />
            ) : videoSize === 'large' ? (
              <Minimize2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>
          <Youtube className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">YouTube</span>
          {!isOwner && (
            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">방장만 컨트롤 가능</span>
          )}
        </div>
      </div>

      {/* YouTube 플레이어 영역 - 크기 조절 가능 */}
      <div 
        className={`bg-gray-900 rounded-lg overflow-hidden mb-4 transition-all duration-300 ${
          videoSize === 'audio' ? 'h-0 opacity-0' : videoSize === 'small' ? 'h-40' : 'aspect-video'
        }`}
      >
        {!videoId ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Youtube className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>YouTube URL을 입력하고 재생 버튼을 눌러주세요</p>
              {!isOwner && (
                <p className="text-sm mt-2">방장이 영상을 재생하면 여기에 표시됩니다</p>
              )}
            </div>
          </div>
        ) : (
          <div ref={playerRef} className="w-full h-full"></div>
        )}
      </div>

      {/* 오디오만 모드 표시 */}
      {videoSize === 'audio' && videoId && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">오디오만 재생 중</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">영상은 숨겨져 있지만 음악은 계속 재생됩니다</p>
          </div>
        </div>
      )}

      {/* URL 입력 및 컨트롤 */}
      <div className="space-y-4">
        {/* URL 입력 (방장만) */}
        {isOwner && (
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && loadVideo()}
              placeholder="YouTube URL 입력 (예: https://youtu.be/jfKfPfyJRdk)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={loadVideo}
              disabled={!url || !window.YT}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              재생
            </button>
          </div>
        )}

        {/* 플레이어 컨트롤 */}
        {videoId && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            {/* 재생/일시정지 버튼 */}
            <button
              onClick={togglePlay}
              disabled={!isOwner}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            {/* 볼륨 컨트롤 */}
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #2563eb 0%, #2563eb ${volume}%, #d1d5db ${volume}%, #d1d5db 100%)`,
                }}
              />
              <span className="text-sm text-gray-600 w-12 text-right">
                {volume}%
              </span>
            </div>
          </div>
        )}

        {/* 추천 lo-fi 링크 (방장만) */}
        {isOwner && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600 mb-2">추천 lo-fi 음악:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setUrl('https://youtu.be/RTGkz2K632U?si=_RTsRBiUMHbSERLq');
                  setTimeout(() => {
                    const id = extractVideoId('https://youtu.be/RTGkz2K632U?si=_RTsRBiUMHbSERLq');
                    if (id) {
                      setVideoId(id);
                      createPlayer(id);
                      socketService.mediaLoad(roomId, id);
                    }
                  }, 100);
                }}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
              >
                집중 잘되는 음악 
              </button>
              <button
                onClick={() => {
                  setUrl('https://youtu.be/wjR4ObKmfOU?si=D4ORHhCwrOJ4vzCW');
                  setTimeout(() => {
                    const id = extractVideoId('https://youtu.be/wjR4ObKmfOU?si=D4ORHhCwrOJ4vzCW');
                    if (id) {
                      setVideoId(id);
                      createPlayer(id);
                      socketService.mediaLoad(roomId, id);
                    }
                  }, 100);
                }}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
              >
                미친 집중력 모드 ON
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaPlayer;