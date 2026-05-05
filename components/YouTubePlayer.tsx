"use client";
import { useState, useEffect, useRef } from "react";

interface Props {
  url: string;
  isFullWidth?: boolean;
  offset?: number;
}

export default function YouTubePlayer({ url, isFullWidth = false, offset = 0 }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoAuthor, setVideoAuthor] = useState(""); 
  const [player, setPlayer] = useState<any>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*vExternal\/|v\/|u\/\w\/|embed\/|watch\?v=))([^#\&\?]*)/)?.[1];

  // 1. Метод получения данных через OEmbed (самый надежный)
  useEffect(() => {
    if (!url) return;
    
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      .then(res => res.json())
      .then(data => {
        if (data && data.author_name) {
          setVideoAuthor(data.author_name);
        }
      })
      .catch(() => {
        console.log("OEmbed failed, falling back to Player API");
      });
  }, [url, videoId]);

  // 2. Метод через Player API (запасной)
  const updateMetadataFromPlayer = (ytPlayer: any) => {
    if (!videoAuthor && ytPlayer && typeof ytPlayer.getVideoData === 'function') {
      const data = ytPlayer.getVideoData();
      if (data && data.author) {
        setVideoAuthor(data.author);
      }
    }
  };

  useEffect(() => {
    if (!videoId) return;

    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    const init = () => {
      new (window as any).YT.Player(playerRef.current, {
        height: "0",
        width: "0",
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (e: any) => {
            setPlayer(e.target);
            setDuration(e.target.getDuration());
            updateMetadataFromPlayer(e.target);
          },
          onApiChange: (e: any) => updateMetadataFromPlayer(e.target),
          onStateChange: (e: any) => {
            setIsPlaying(e.data === 1);
            updateMetadataFromPlayer(e.target);
          },
        },
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      init();
    } else {
      (window as any).onYouTubeIframeAPIReady = init;
    }

    const interval = setInterval(() => {
      if (player && isPlaying) {
        setProgress((player.getCurrentTime() / player.getDuration()) * 100);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [videoId, isPlaying, player]); // videoAuthor убран из зависимостей во избежание ошибок рендера

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!player) return;
    const time = (parseFloat(e.target.value) / 100) * duration;
    player.seekTo(time);
    setProgress(parseFloat(e.target.value));
  };

  const handleRestart = () => {
    if (!player) return;
    player.seekTo(0);
    if (!isPlaying) player.playVideo();
  };

  if (!videoId) return null;

  return (
    <div 
      className={`flex items-center gap-3 bg-[#1a1d23] border border-gray-800 transition-all shadow-2xl
        ${isFullWidth ? 'w-full p-3 rounded-2xl' : 'w-[140px] p-2 rounded-xl -translate-x-[100px]'} 
      `}
    >
      <div className="flex items-center gap-2 flex-shrink-0">
        <button 
          onClick={() => {
            if (!player) return; // Якщо плеєр ще не готовий, нічого не робимо
            isPlaying ? player.pauseVideo() : player.playVideo();
          }}
          className="w-10 h-10 flex items-center justify-center bg-blue-600 rounded-full hover:bg-blue-500 transition-all active:scale-95 flex-shrink-0 shadow-lg"
        >
          {isPlaying ? (
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
          ) : (
            <svg className="w-5 h-5 fill-white ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        <button 
          onClick={handleRestart}
          title="Почати спочатку"
          className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full border border-gray-700 transition-all active:scale-95 flex-shrink-0"
        >
          <svg className="w-4 h-4 fill-gray-400" viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" /></svg>
        </button>
      </div>

      {isFullWidth && (
        <div className="flex-1 flex flex-col justify-center pr-1 min-w-0">
          <input 
            type="range" 
            value={progress} 
            onChange={handleSeek}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-1.5"
          />
          
          <div className="flex justify-between items-start px-0.5 gap-4">
            <div className="flex flex-col shrink-0">
              <span className="text-[7px] text-gray-500 uppercase tracking-tighter font-bold leading-tight">
                Аудіо: оригінальна тональність
              </span>
              {offset !== 0 && (
                <span className="text-[7px] text-orange-500 font-bold uppercase animate-pulse leading-tight">
                  ⚠️ Тональність не змінюється
                </span>
              )}
            </div>

            {/* ВЫВОД АВТОРА */}
            {videoAuthor && (
              <div className="text-right flex flex-col items-end min-w-0">
                <span className="text-[6px] text-gray-600 uppercase font-black leading-none mb-0.5 tracking-tighter">
                  Джерело YouTube:
                </span>
                <span className="text-[8px] text-blue-400 font-black uppercase tracking-wider italic leading-tight text-right break-words max-w-[150px] sm:max-w-[200px]">
                  {videoAuthor}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div ref={playerRef} className="hidden"></div>
    </div>
  );
}