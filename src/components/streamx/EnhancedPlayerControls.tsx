'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FastForward, Play,
  Globe, Subtitles, Gauge, Minus, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { AudioTrackItem } from '@/lib/types';

interface EnhancedPlayerControlsProps {
  contentId: string;
  contentType: string;
  title: string;
  currentTime: number;
  duration: number;
  seasonNumber?: number;
  episodeNumber?: number;
  onNextEpisode?: () => void;
  onSeek: (time: number) => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SUBTITLE_SIZES = [
  { key: 'small', label: 'Small', size: '14px' },
  { key: 'medium', label: 'Medium', size: '18px' },
  { key: 'large', label: 'Large', size: '24px' },
];

// Mock audio tracks for demo
const MOCK_AUDIO_TRACKS: AudioTrackItem[] = [
  { id: 'at-1', contentId: '', episodeId: null, language: 'en', label: 'English', url: null, isDefault: true },
  { id: 'at-2', contentId: '', episodeId: null, language: 'es', label: 'Español', url: null, isDefault: false },
  { id: 'at-3', contentId: '', episodeId: null, language: 'fr', label: 'Français', url: null, isDefault: false },
  { id: 'at-4', contentId: '', episodeId: null, language: 'hi', label: 'हिन्दी', url: null, isDefault: false },
  { id: 'at-5', contentId: '', episodeId: null, language: 'ja', label: '日本語', url: null, isDefault: false },
];

// Mock subtitles for demo
const MOCK_SUBTITLES = [
  { id: 'sub-1', language: 'off', label: 'Off' },
  { id: 'sub-2', language: 'en', label: 'English' },
  { id: 'sub-3', language: 'es', label: 'Español' },
  { id: 'sub-4', language: 'fr', label: 'Français' },
  { id: 'sub-5', language: 'hi', label: 'हिन्दी' },
  { id: 'sub-6', language: 'ar', label: 'العربية' },
  { id: 'sub-7', language: 'ja', label: '日本語' },
];

// Mock next episode data
const MOCK_NEXT_EPISODE = {
  title: 'The Next Chapter',
  seasonNumber: 1,
  episodeNumber: 2,
  thumbnail: null,
};

export function EnhancedPlayerControls({
  contentId,
  contentType,
  title,
  currentTime,
  duration,
  seasonNumber,
  episodeNumber,
  onNextEpisode,
  onSeek,
  hasPrevious,
  hasNext,
}: EnhancedPlayerControlsProps) {
  // State
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'audio' | 'subtitle' | 'speed' | null>(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<string>('at-1');
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('off');
  const [subtitleFontSize, setSubtitleFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [subtitleBackground, setSubtitleBackground] = useState(true);
  const [subtitleOffset, setSubtitleOffset] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(10);
  const [nextEpisodeCancelled, setNextEpisodeCancelled] = useState(false);
  const nextEpisodeEnteredAtRef = useRef<number | null>(null);
  const prevIsNearEndRef = useRef(false);
  const cancelledRef = useRef(false);
  const autoPlayRef = useRef(autoPlay);
  const onNextEpisodeRef = useRef(onNextEpisode);

  // Keep refs in sync with latest prop values (must use effect per React rules)
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);
  useEffect(() => { onNextEpisodeRef.current = onNextEpisode; }, [onNextEpisode]);
  const [audioTracks, setAudioTracks] = useState<AudioTrackItem[]>(MOCK_AUDIO_TRACKS);
  const [subtitles] = useState(MOCK_SUBTITLES);
  const [nextEpisodeData, setNextEpisodeData] = useState(MOCK_NEXT_EPISODE);

  // Fetch audio tracks from content API
  useEffect(() => {
    const fetchAudioTracks = async () => {
      try {
        const res = await fetch(`/api/content/${contentId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.item?.audioTracks && data.item.audioTracks.length > 0) {
            setAudioTracks(data.item.audioTracks);
            const defaultTrack = data.item.audioTracks.find((t: AudioTrackItem) => t.isDefault);
            if (defaultTrack) setSelectedAudioTrack(defaultTrack.id);
          }
        }
      } catch {
        // Use mock data
      }
    };
    fetchAudioTracks();
  }, [contentId]);

  // Skip Intro: show during first 60 seconds
  const showSkipIntro = currentTime > 0 && currentTime < 60 && duration > 120;

  // Skip Recap: show between 60-120 seconds (simulated recap segment)
  const showSkipRecap = currentTime >= 60 && currentTime < 120 && duration > 180;

  // Next Episode: show when within last 30 seconds for TV content
  const isNearEnd = duration > 0 && currentTime > duration - 30 && contentType === 'tv' && hasNext;
  const showNextEpisodeCard = isNearEnd && !nextEpisodeCancelled;

  // Single interval manages countdown, transition detection, and auto-play
  useEffect(() => {
    const timer = setInterval(() => {
      // Detect transition into near-end zone
      if (isNearEnd && !prevIsNearEndRef.current) {
        nextEpisodeEnteredAtRef.current = Date.now();
        cancelledRef.current = false;
        setNextEpisodeCancelled(false);
        setNextEpisodeCountdown(10);
      }
      // Detect transition out of near-end zone
      if (!isNearEnd && prevIsNearEndRef.current) {
        nextEpisodeEnteredAtRef.current = null;
        cancelledRef.current = false;
        setNextEpisodeCancelled(false);
      }
      prevIsNearEndRef.current = isNearEnd;

      // Update countdown if in near-end and not cancelled
      if (isNearEnd && !cancelledRef.current && nextEpisodeEnteredAtRef.current) {
        const elapsed = Math.floor((Date.now() - nextEpisodeEnteredAtRef.current) / 1000);
        const remaining = Math.max(10 - elapsed, 0);
        setNextEpisodeCountdown(remaining);

        if (remaining <= 0 && autoPlayRef.current && onNextEpisodeRef.current) {
          onNextEpisodeRef.current();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isNearEnd]);

  const handleSkipIntro = () => {
    onSeek(60);
  };

  const handleSkipRecap = () => {
    onSeek(120);
  };

  const handleCancelNextEpisode = () => {
    cancelledRef.current = true;
    setNextEpisodeCancelled(true);
  };

  const handlePlayNext = () => {
    if (onNextEpisode) {
      onNextEpisode();
    }
  };

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    // Dispatch custom event for VideoPlayer to pick up
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('streamx:playback-speed', { detail: speed }));
    }
  }, []);

  return (
    <>
      {/* Skip Intro Button */}
      <AnimatePresence>
        {showSkipIntro && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={handleSkipIntro}
            className="absolute bottom-24 right-4 sm:right-8 z-30 flex items-center gap-2 px-4 py-2 rounded bg-white/20 backdrop-blur-md border border-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors"
          >
            <FastForward className="h-4 w-4" />
            Skip Intro
          </motion.button>
        )}
      </AnimatePresence>

      {/* Skip Recap Button */}
      <AnimatePresence>
        {showSkipRecap && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={handleSkipRecap}
            className="absolute bottom-24 right-4 sm:right-8 z-30 flex items-center gap-2 px-4 py-2 rounded bg-white/20 backdrop-blur-md border border-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors"
          >
            <FastForward className="h-4 w-4" />
            Skip Recap
          </motion.button>
        )}
      </AnimatePresence>

      {/* Next Episode Countdown Card */}
      <AnimatePresence>
        {showNextEpisodeCard && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-24 right-4 sm:right-8 z-30 w-72 rounded-xl overflow-hidden bg-neutral-900/95 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            <div className="flex gap-3 p-3">
              {/* Thumbnail */}
              <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/10 relative">
                {nextEpisodeData.thumbnail ? (
                  <img
                    src={nextEpisodeData.thumbnail}
                    alt="Next episode"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                    <Play className="h-6 w-6 text-primary fill-primary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Next Episode</p>
                <p className="text-sm font-semibold text-white truncate mt-0.5">
                  {nextEpisodeData.title}
                </p>
                <p className="text-xs text-gray-400">
                  S{nextEpisodeData.seasonNumber}E{nextEpisodeData.episodeNumber}
                </p>
              </div>
            </div>

            {/* Countdown & Actions */}
            <div className="flex items-center gap-2 px-3 pb-3">
              <Button
                size="sm"
                onClick={handlePlayNext}
                className="flex-1 bg-primary hover:bg-primary/90 text-white text-xs h-8 gap-1"
              >
                <Play className="h-3 w-3 fill-white" />
                Play Next
                {autoPlay && (
                  <span className="text-[10px] opacity-70">({nextEpisodeCountdown}s)</span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelNextEpisode}
                className="h-8 px-3 text-gray-400 hover:text-white hover:bg-white/10 text-xs"
              >
                Cancel
              </Button>
            </div>

            {/* Countdown progress bar */}
            <div className="h-0.5 bg-white/10">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: '100%' }}
                animate={{ width: `${(nextEpisodeCountdown / 10) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Controls Bar (integrated into player controls area) */}
      <div className="absolute bottom-14 right-4 sm:right-6 z-20 flex items-center gap-2">
        {/* Auto-Play Toggle */}
        {contentType === 'tv' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/60 uppercase tracking-wider hidden sm:inline">Auto</span>
            <Switch
              checked={autoPlay}
              onCheckedChange={setAutoPlay}
              className="scale-75 data-[state=checked]:bg-primary"
            />
          </div>
        )}

        {/* Playback Speed */}
        <button
          onClick={() => {
            setSettingsTab(settingsTab === 'speed' ? null : 'speed');
            setShowSettings(settingsTab !== 'speed');
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            playbackSpeed !== 1
              ? 'bg-primary/20 text-primary'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Gauge className="h-3.5 w-3.5" />
          {playbackSpeed !== 1 ? `${playbackSpeed}x` : '1x'}
        </button>

        {/* Audio Track Selector */}
        <button
          onClick={() => {
            setSettingsTab(settingsTab === 'audio' ? null : 'audio');
            setShowSettings(settingsTab !== 'audio');
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            settingsTab === 'audio'
              ? 'bg-primary/20 text-primary'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {audioTracks.find(t => t.id === selectedAudioTrack)?.label || 'Audio'}
          </span>
        </button>

        {/* Subtitle Selector */}
        <button
          onClick={() => {
            setSettingsTab(settingsTab === 'subtitle' ? null : 'subtitle');
            setShowSettings(settingsTab !== 'subtitle');
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            selectedSubtitle !== 'off'
              ? 'bg-primary/20 text-primary'
              : settingsTab === 'subtitle'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Subtitles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {selectedSubtitle === 'off' ? 'CC' : subtitles.find(s => s.id === selectedSubtitle)?.language?.toUpperCase()}
          </span>
        </button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-28 right-4 sm:right-6 z-40 w-72 max-h-[70vh] bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Tab Navigation */}
            <div className="flex border-b border-white/10">
              {[
                { key: 'audio' as const, icon: Globe, label: 'Audio' },
                { key: 'subtitle' as const, icon: Subtitles, label: 'Subtitles' },
                { key: 'speed' as const, icon: Gauge, label: 'Speed' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSettingsTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                    settingsTab === tab.key
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <ScrollArea className="max-h-[50vh]">
              {/* Audio Tab */}
              {settingsTab === 'audio' && (
                <div className="p-3 space-y-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Audio Track</p>
                  {audioTracks.map(track => (
                    <button
                      key={track.id}
                      onClick={() => setSelectedAudioTrack(track.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedAudioTrack === track.id
                          ? 'bg-primary/20 text-primary'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Globe className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{track.label}</span>
                      {track.isDefault && (
                        <span className="text-[10px] text-white/30 uppercase">Default</span>
                      )}
                      {selectedAudioTrack === track.id && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Subtitle Tab */}
              {settingsTab === 'subtitle' && (
                <div className="p-3 space-y-4">
                  {/* Language Selector */}
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Language</p>
                    <div className="space-y-1">
                      {subtitles.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubtitle(sub.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedSubtitle === sub.id
                              ? 'bg-primary/20 text-primary'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <Subtitles className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1">{sub.label}</span>
                          {selectedSubtitle === sub.id && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-white/10" />

                  {/* Font Size */}
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Font Size</p>
                    <div className="flex gap-2">
                      {SUBTITLE_SIZES.map(size => (
                        <button
                          key={size.key}
                          onClick={() => setSubtitleFontSize(size.key as 'small' | 'medium' | 'large')}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                            subtitleFontSize === size.key
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                          }`}
                          style={{ fontSize: size.key === 'large' ? '14px' : size.key === 'medium' ? '12px' : '10px' }}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-white/10" />

                  {/* Background Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/80">Subtitle Background</p>
                      <p className="text-[10px] text-white/40">Show semi-transparent background behind text</p>
                    </div>
                    <Switch
                      checked={subtitleBackground}
                      onCheckedChange={setSubtitleBackground}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <Separator className="bg-white/10" />

                  {/* Offset Adjustment */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-white/80">Timing Offset</p>
                      <span className="text-xs text-white/50 font-mono">
                        {subtitleOffset >= 0 ? '+' : ''}{subtitleOffset}s
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSubtitleOffset(prev => Math.max(prev - 0.5, -10))}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <Slider
                        value={[subtitleOffset]}
                        min={-10}
                        max={10}
                        step={0.5}
                        onValueChange={([val]) => setSubtitleOffset(val)}
                        className="flex-1"
                      />
                      <button
                        onClick={() => setSubtitleOffset(prev => Math.min(prev + 0.5, 10))}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-white/30">-10s</span>
                      <button
                        onClick={() => setSubtitleOffset(0)}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Reset
                      </button>
                      <span className="text-[10px] text-white/30">+10s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Speed Tab */}
              {settingsTab === 'speed' && (
                <div className="p-3 space-y-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Playback Speed</p>
                  {PLAYBACK_SPEEDS.map(speed => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        playbackSpeed === speed
                          ? 'bg-primary/20 text-primary'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Gauge className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{speed}x</span>
                      {speed === 1 && (
                        <span className="text-[10px] text-white/30 uppercase">Normal</span>
                      )}
                      {playbackSpeed === speed && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
