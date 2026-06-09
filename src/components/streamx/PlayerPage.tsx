'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { VideoPlayer } from './VideoPlayer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Film, Loader2, Tv, Calendar, Clock, Star, Globe } from 'lucide-react';

interface ContentData {
  id: string;
  title: string;
  description?: string;
  type: string;
  genres?: string;
  language: string;
  runtime: number;
  rating: number;
  posterUrl?: string;
  backdropUrl?: string;
  hlsMasterUrl?: string;
  views: number;
  releaseDate?: string;
  cast?: string;
  director?: string;
  episodes?: EpisodeData[];
  subtitles?: { id: string; language: string; label: string; url: string; format: string }[];
}

interface EpisodeData {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description?: string;
  runtime: number;
  hlsMasterUrl?: string;
  thumbnailUrl?: string;
  status: string;
}

interface ProgressData {
  position: number;
  duration: number;
}

export function PlayerPage() {
  const { currentParams, navigate } = useAppStore();
  const [content, setContent] = useState<ContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialPosition, setInitialPosition] = useState(0);
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeData | null>(null);

  useEffect(() => {
    if (!currentParams.id) return;

    Promise.all([
      fetch(`/api/content/${currentParams.id}`).then(r => r.json()),
      fetch(`/api/progress?contentId=${currentParams.id}&contentType=uploaded`).then(r => r.json()).catch(() => null),
    ])
      .then(([contentData, progressData]) => {
        if (contentData.item) {
          setContent(contentData.item);

          // Resume from last position
          if (progressData?.items?.length > 0) {
            const latest = progressData.items[0];
            setInitialPosition(latest.position || 0);
          }

          // Auto-select first episode with video for TV shows
          if (contentData.item.type === 'tv' && contentData.item.episodes?.length > 0) {
            const firstWithVideo = contentData.item.episodes.find(ep => ep.hlsMasterUrl);
            if (firstWithVideo) setSelectedEpisode(firstWithVideo);
          }
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [currentParams.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Content Not Found</h2>
          <p className="text-muted-foreground mb-4">This content does not exist or is not available</p>
          <Button onClick={() => navigate('home')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const videoSrc = selectedEpisode?.hlsMasterUrl || content.hlsMasterUrl;

  if (!videoSrc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Video Not Available</h2>
          <p className="text-muted-foreground mb-4">This content does not have a video file yet</p>
          <Button onClick={() => navigate('home')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-[1400px] mx-auto px-4 pt-4">
        <button
          onClick={() => navigate('home')}
          className="mb-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>

        <VideoPlayer
          src={videoSrc}
          title={selectedEpisode ? `S${selectedEpisode.seasonNumber}E${selectedEpisode.episodeNumber}: ${selectedEpisode.title}` : content.title}
          poster={content.backdropUrl || content.posterUrl}
          subtitles={content.subtitles?.map(s => ({ url: s.url, label: s.label, language: s.language }))}
          contentId={content.id}
          episodeId={selectedEpisode?.id}
          initialPosition={initialPosition}
          onProgress={(position, duration) => {
            // Save progress
            fetch('/api/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contentId: content.id,
                contentType: 'uploaded',
                title: content.title,
                posterPath: content.posterUrl || '',
                position,
                duration,
                seasonNumber: selectedEpisode?.seasonNumber,
                episodeNumber: selectedEpisode?.episodeNumber,
              }),
            }).catch(() => {});
          }}
        />

        {/* Content info */}
        <div className="mt-6 pb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {selectedEpisode ? selectedEpisode.title : content.title}
          </h1>
          {selectedEpisode && (
            <p className="text-gray-400 text-sm mt-1">
              {content.title} • Season {selectedEpisode.seasonNumber}, Episode {selectedEpisode.episodeNumber}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-400">
            {content.rating > 0 && (
              <span className="flex items-center gap-1 text-yellow-500">
                <Star className="h-3.5 w-3.5 fill-yellow-500" /> {content.rating.toFixed(1)}
              </span>
            )}
            {(selectedEpisode?.runtime || content.runtime) > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {selectedEpisode?.runtime || content.runtime} min
              </span>
            )}
            {content.releaseDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {new Date(content.releaseDate).getFullYear()}
              </span>
            )}
            {content.genres && <span>{content.genres}</span>}
            <span className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" /> {content.language.toUpperCase()}
            </span>
            <span>{content.views.toLocaleString()} views</span>
          </div>

          {(content.description || selectedEpisode?.description) && (
            <p className="text-gray-400 mt-4 max-w-3xl leading-relaxed">
              {selectedEpisode?.description || content.description}
            </p>
          )}

          {content.director && (
            <p className="text-gray-500 text-sm mt-2">
              <span className="text-gray-400">Director:</span> {content.director}
            </p>
          )}
          {content.cast && (
            <p className="text-gray-500 text-sm mt-1">
              <span className="text-gray-400">Cast:</span> {content.cast}
            </p>
          )}

          {/* Episode selector for TV shows */}
          {content.type === 'tv' && content.episodes && content.episodes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Tv className="h-5 w-5" /> Episodes
              </h3>
              <div className="grid gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {content.episodes
                  .sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber)
                  .map(ep => (
                    <button
                      key={ep.id}
                      onClick={() => {
                        if (ep.hlsMasterUrl) {
                          setSelectedEpisode(ep);
                          setInitialPosition(0);
                        }
                      }}
                      disabled={!ep.hlsMasterUrl}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        selectedEpisode?.id === ep.id
                          ? 'bg-primary/20 border border-primary/30'
                          : ep.hlsMasterUrl
                            ? 'bg-white/5 hover:bg-white/10 border border-transparent'
                            : 'bg-white/5 opacity-50 cursor-not-allowed border border-transparent'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                        selectedEpisode?.id === ep.id ? 'bg-primary text-white' : 'bg-white/10 text-gray-400'
                      }`}>
                        {ep.episodeNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          S{ep.seasonNumber}E{ep.episodeNumber}: {ep.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ep.runtime > 0 ? `${ep.runtime} min` : '--'}
                          {ep.hlsMasterUrl ? ' • Ready' : ' • No video'}
                        </p>
                      </div>
                      {ep.hlsMasterUrl && (
                        <Play className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Play({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
