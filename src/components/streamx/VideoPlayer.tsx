'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Subtitles, Settings, Loader2, SkipBack, SkipForward,
  ChevronUp, ChevronDown,
} from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  subtitles?: { url: string; label: string; language: string }[];
  contentId?: string;
  episodeId?: string;
  initialPosition?: number;
  onProgress?: (position: number, duration: number) => void;
}

export function VideoPlayer({ src, title, poster, subtitles, contentId, episodeId, initialPosition, onProgress }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState<number>(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = auto
  const [availableQualities, setAvailableQualities] = useState<{ height: number; level: number }[]>([]);
  const [buffered, setBuffered] = useState(0);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastAnalyticsPing = useRef<number>(0);
  const progressSaved = useRef<number>(0);

  // Track analytics
  const trackEvent = useCallback(async (action: string, position?: number) => {
    if (!contentId) return;
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          episodeId,
          action,
          position: position || Math.floor(currentTime),
          duration: Math.floor(duration),
          quality: currentQuality === -1 ? 'auto' : `${availableQualities[currentQuality]?.height || 0}p`,
          device: window.innerWidth < 768 ? 'mobile' : 'desktop',
        }),
      });
    } catch {
      // ignore analytics errors
    }
  }, [contentId, episodeId, currentTime, duration, currentQuality, availableQualities]);

  // Initialize HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Check if source is HLS
    const isHLS = src.includes('.m3u8');

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsLoading(false);
        const qualities = data.levels.map((level, index) => ({
          height: level.height,
          level: index,
        }));
        setAvailableQualities(qualities);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setCurrentQuality(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      // Set initial position after manifest is loaded
      if (initialPosition && initialPosition > 0) {
        hls.on(Hls.Events.FRAG_LOADED, () => {
          if (video.currentTime === 0 && initialPosition > 0) {
            video.currentTime = initialPosition;
          }
        });
      }

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
      // Loading state will be handled by loadeddata event
    } else {
      // Regular video file
      video.src = src;
      // Loading state will be handled by loadeddata event
    }
  }, [src, initialPosition]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);

      // Buffered progress
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }

      // Report progress every 30 seconds
      const now = Date.now();
      if (now - lastAnalyticsPing.current > 30000) {
        lastAnalyticsPing.current = now;
        trackEvent('play');
        onProgress?.(Math.floor(video.currentTime), Math.floor(video.duration));

        // Save playback progress
        if (contentId) {
          fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentId,
              contentType: 'uploaded',
              title: title || '',
              posterPath: poster || '',
              position: Math.floor(video.currentTime),
              duration: Math.floor(video.duration),
            }),
          }).catch(() => {});
        }
      }
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      if (initialPosition && initialPosition > 0 && video.currentTime === 0) {
        video.currentTime = initialPosition;
      }
    };
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleEnded = () => { setIsPlaying(false); trackEvent('complete'); };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [trackEvent, onProgress, contentId, title, poster, initialPosition]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Add subtitle tracks
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !subtitles || subtitles.length === 0) return;

    // Remove existing tracks
    const existingTracks = video.querySelectorAll('track');
    existingTracks.forEach(track => track.remove());

    // Add new tracks
    subtitles.forEach((sub, index) => {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = sub.label;
      track.srclang = sub.language;
      track.src = sub.url;
      if (index === 0 && selectedSubtitle >= 0) {
        track.default = true;
      }
      video.appendChild(track);
    });
  }, [subtitles, selectedSubtitle]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      trackEvent('play');
    } else {
      video.pause();
      trackEvent('pause');
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const vol = parseFloat(e.target.value);
    video.volume = vol;
    setVolume(vol);
    if (vol === 0) {
      setIsMuted(true);
      video.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      video.muted = false;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.currentTime + 10, video.duration);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(video.currentTime - 10, 0);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettings(false);
      }
    }, 3000);
  };

  const handleQualityChange = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
    }
    setShowSettings(false);
  };

  const handleSubtitleChange = (index: number) => {
    const video = videoRef.current;
    if (!video) return;

    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = i === index ? 'showing' : 'hidden';
    }
    setSelectedSubtitle(index);
    setShowSettings(false);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden group select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
      style={{ touchAction: 'none' }}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full aspect-video"
        playsInline
        crossOrigin="anonymous"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
        </div>
      )}

      {/* Play overlay when paused */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer" onClick={togglePlay}>
          <div className="p-5 rounded-full bg-white/20 backdrop-blur-sm transition-transform hover:scale-110">
            <Play className="h-14 w-14 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Title */}
      {showControls && title && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300">
          <h3 className="text-white font-medium text-lg">{title}</h3>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-10 pb-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress bar */}
        <div className="relative mb-3 h-1.5 group/progress cursor-pointer">
          {/* Buffered */}
          <div
            className="absolute inset-y-0 left-0 bg-white/20 rounded-full"
            style={{ width: `${bufferedPercent}%` }}
          />
          {/* Progress */}
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Seek input */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.5"
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
          {/* Hover dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 7px)` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={skipBackward} className="text-white/80 hover:text-white transition-colors">
              <SkipBack className="h-5 w-5" />
            </button>
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-white" />}
            </button>
            <button onClick={skipForward} className="text-white/80 hover:text-white transition-colors">
              <SkipForward className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-1.5 group/vol">
              <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/vol:w-16 transition-all duration-200 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            <span className="text-xs text-white/70 ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quality & Subtitles */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>

              {showSettings && (
                <div className="absolute bottom-10 right-0 bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-lg p-3 min-w-[180px] shadow-xl z-50">
                  {/* Quality */}
                  {availableQualities.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-white/50 uppercase tracking-wider mb-2 px-2">Quality</p>
                      <button
                        onClick={() => handleQualityChange(-1)}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-white/10 transition-colors ${currentQuality === -1 ? 'text-primary font-medium' : 'text-white/80'}`}
                      >
                        Auto
                      </button>
                      {availableQualities.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleQualityChange(q.level)}
                          className={`w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-white/10 transition-colors ${currentQuality === q.level ? 'text-primary font-medium' : 'text-white/80'}`}
                        >
                          {q.height}p
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Subtitles */}
                  {subtitles && subtitles.length > 0 && (
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wider mb-2 px-2">Subtitles</p>
                      <button
                        onClick={() => handleSubtitleChange(-1)}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-white/10 transition-colors ${selectedSubtitle === -1 ? 'text-primary font-medium' : 'text-white/80'}`}
                      >
                        Off
                      </button>
                      {subtitles.map((sub, index) => (
                        <button
                          key={index}
                          onClick={() => handleSubtitleChange(index)}
                          className={`w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-white/10 transition-colors ${selectedSubtitle === index ? 'text-primary font-medium' : 'text-white/80'}`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen} className="text-white/80 hover:text-white transition-colors">
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
