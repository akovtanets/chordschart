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
  
  // Контейнер, який контролює React
  const containerRef = useRef<HTMLDivElement>(null);

  const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*vExternal\/|v\/|u\/\w\/|embed\/|watch\?v=))([^#\&\?]*)/)?.[1];

  // Слухаємо натискання пробілу з SetlistPage
  useEffect(() => {
    const handleTogglePlay = () => {
      if (!player || typeof player.getPlayerState !== 'function') return;
      try {
        const state = player.getPlayerState();
        if (state === 1) { // 1 = Playing
          player.pauseVideo();
        } else {
          window.dispatchEvent(new CustomEvent('stopOtherPlayers', { detail: videoId }));
          player.playVideo();
        }
      } catch (error) {
        // Ігноруємо можливі внутрішні помилки YouTube API, якщо плеєр ще не повністю готовий
      }
    };

    window.addEventListener("toggle-youtube-play", handleTogglePlay);
    return () => window.removeEventListener("toggle-youtube-play", handleTogglePlay);
  }, [player, videoId]);

  useEffect(() => {
    if (!url) return;
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      .then(res => res.json())
      .then(data => {
        if (data && data.author_name) setVideoAuthor(data.author_name);
      })
      .catch(() => console.log("OEmbed failed"));
  }, [url, videoId]);

  const updateMetadataFromPlayer = (ytPlayer: any) => {
    if (!videoAuthor && ytPlayer && typeof ytPlayer.getVideoData === 'function') {
      try {
        const data = ytPlayer.getVideoData();
        if (data && data.author) setVideoAuthor(data.author);
      } catch (error) {}
    }
  };

  // Ініціалізація та знищення плеєра (ВИПРАВЛЕНО ДЛЯ СТАБІЛЬНОСТІ)
  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    let ytPlayer: any = null;
    let isMounted = true;

    // Створюємо ізольований елемент для YouTube, щоб він не конфліктував із React DOM
    const playerEl = document.createElement("div");
    containerRef.current.appendChild(playerEl);

    const init = () => {
      ytPlayer = new (window as any).YT.Player(playerEl, {
        height: "1", width: "1", videoId: videoId,
        playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0 },
        events: {
          onReady: (e: any) => {
            if (isMounted) {
              setPlayer(e.target);
              setDuration(e.target.getDuration());
              updateMetadataFromPlayer(e.target);
            }
          },
          onApiChange: (e: any) => isMounted && updateMetadataFromPlayer(e.target),
          onStateChange: (e: any) => {
            if (isMounted) {
              setIsPlaying(e.data === 1);
              updateMetadataFromPlayer(e.target);
            }
          },
        },
      });
    };

    if (!(window as any).YT && !document.getElementById("yt-api-script")) {
      const tag = document.createElement("script");
      tag.id = "yt-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    if ((window as any).YT && (window as any).YT.Player) {
      init();
    } else {
      if (!(window as any).YT_API_CALLBACKS) (window as any).YT_API_CALLBACKS = [];
      (window as any).YT_API_CALLBACKS.push(init);
      (window as any).onYouTubeIframeAPIReady = () => {
        (window as any).YT_API_CALLBACKS.forEach((cb: any) => cb());
      };
    }

    // CLEANUP: Знищуємо плеєр при зміні пісні, щоб не було помилок у терміналі
    return () => {
      isMounted = false;
      if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        try {
          ytPlayer.destroy();
        } catch (e) {}
      }
      setPlayer(null);
      setIsPlaying(false);
      setProgress(0);
      
      // Очищаємо контейнер від старих iframe
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [videoId]);

  // Оновлення прогресу
  useEffect(() => {
    const interval = setInterval(() => {
      if (player && isPlaying && typeof player.getCurrentTime === 'function') {
        try {
          const currentDuration = duration || player.getDuration() || 1;
          setProgress((player.getCurrentTime() / currentDuration) * 100);
        } catch (error) {}
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [player, isPlaying, duration]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!player || typeof player.seekTo !== 'function') return;
    try {
      const time = (parseFloat(e.target.value) / 100) * duration;
      player.seekTo(time, true);
      setProgress(parseFloat(e.target.value));
    } catch (error) {}
  };

  useEffect(() => {
    const handleStopOthers = (e: any) => {
      if (player && e.detail !== videoId && typeof player.pauseVideo === 'function') {
        try {
          player.pauseVideo();
        } catch (error) {}
      }
    };
    window.addEventListener('stopOtherPlayers', handleStopOthers);
    return () => window.removeEventListener('stopOtherPlayers', handleStopOthers);
  }, [player, videoId]);

  const handleRestart = () => {
    if (!player || typeof player.seekTo !== 'function') return;
    try {
      player.seekTo(0, true);
      if (!isPlaying) player.playVideo();
    } catch (error) {}
  };

  if (!videoId) return null;

  return (
    <div className={`flex items-center gap-3 bg-[#1a1d23] border border-gray-800 transition-all shadow-2xl ${isFullWidth ? 'w-full p-3 rounded-2xl' : 'w-[140px] p-2 rounded-xl -translate-x-[100px]'}`}>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button 
          onClick={() => {
            if (!player || typeof player.getPlayerState !== 'function') return;
            try {
              if (isPlaying) {
                player.pauseVideo();
              } else {
                window.dispatchEvent(new CustomEvent('stopOtherPlayers', { detail: videoId }));
                player.playVideo();
              }
            } catch (error) {}
          }}
          className="w-10 h-10 flex items-center justify-center bg-blue-600 rounded-full hover:bg-blue-500 transition-all active:scale-95 flex-shrink-0 shadow-lg"
        >
          {isPlaying ? (
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
          ) : (
            <svg className="w-5 h-5 fill-white ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        <button onClick={handleRestart} title="Почати спочатку" className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full border border-gray-700 transition-all active:scale-95 flex-shrink-0">
          <svg className="w-4 h-4 fill-gray-400" viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" /></svg>
        </button>
      </div>

      {isFullWidth && (
        <div className="flex-1 flex flex-col justify-center pr-1 min-w-0">
          <input type="range" value={progress} onChange={handleSeek} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-1.5" />
          <div className="flex justify-between items-start px-0.5 gap-4">
            <div className="flex flex-col shrink-0">
              <span className="text-[7px] text-gray-500 uppercase tracking-tighter font-bold leading-tight">Аудіо: оригінальна тональність</span>
              {offset !== 0 && <span className="text-[7px] text-orange-500 font-bold uppercase animate-pulse leading-tight">⚠️ Тональність не змінюється</span>}
            </div>
            {videoAuthor && (
              <div className="text-right flex flex-col items-end min-w-0">
                <span className="text-[6px] text-gray-600 uppercase font-black leading-none mb-0.5 tracking-tighter">Джерело YouTube:</span>
                <span className="text-[8px] text-blue-400 font-black uppercase tracking-wider italic leading-tight text-right break-words max-w-[150px] sm:max-w-[200px]">{videoAuthor}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Безпечний контейнер для плеєра */}
      <div className="absolute w-0 h-0 overflow-hidden opacity-0 pointer-events-none" ref={containerRef}></div>
    </div>
  );
}