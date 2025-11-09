import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Youtube } from 'lucide-react';
import socketService from '../../services/socket';
import useRoomStore from '../../store/roomStore';

function MediaPlayer({ roomId }) {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const playerRef = useRef(null);
  const isLoadingRef = useRef(false);
  
  const { currentRoom } = useRoomStore();
  const isOwner = currentRoom?.participants?.find(p => p.isOwner && p.id === socketService.getSocket()?.id);

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
      playerRef.current.id = `youtube-player-${Date.now()}`;
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
    <div className="bg-white rounded-xl shadow-md p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">배경 음악/영상</h2>
        <div className="flex items-center gap-2">
          <Youtube className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-500">YouTube</span>
          {!isOwner && (
            <span className="ml-2 text-xs text-gray-400">방장만 컨트롤 가능</span>
          )}
        </div>
      </div>

      {/* YouTube 플레이어 영역 */}
      <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={loadVideo}
              disabled={!url || !window.YT}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  background: `linear-gradient(to right, #9333ea 0%, #9333ea ${volume}%, #d1d5db ${volume}%, #d1d5db 100%)`,
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
                  setUrl('https://youtu.be/jfKfPfyJRdk');
                  setTimeout(() => {
                    const id = extractVideoId('https://youtu.be/jfKfPfyJRdk');
                    if (id) {
                      setVideoId(id);
                      createPlayer(id);
                      socketService.mediaLoad(roomId, id);
                    }
                  }, 100);
                }}
                className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
              >
                Lofi Girl - beats to relax/study to
              </button>
              <button
                onClick={() => {
                  setUrl('https://youtu.be/5qap5aO4i9A');
                  setTimeout(() => {
                    const id = extractVideoId('https://youtu.be/5qap5aO4i9A');
                    if (id) {
                      setVideoId(id);
                      createPlayer(id);
                      socketService.mediaLoad(roomId, id);
                    }
                  }, 100);
                }}
                className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
              >
                Chillhop Radio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaPlayer;