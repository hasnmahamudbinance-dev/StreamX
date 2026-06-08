'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { VideoPlayer } from './VideoPlayer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Film, Loader2 } from 'lucide-react';

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
  subtitles?: { id: string; language: string; label: string; url: string; format: string }[];
}

export function PlayerPage() {
  const { currentParams, navigate } = useAppStore();
  const [content, setContent] = useState<ContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentParams.id) return;
    fetch(`/api/content/${currentParams.id}`)
      .then(r => r.json())
      .then(data => {
        setContent(data.item);
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

  if (!content || !content.hlsMasterUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Content Not Available</h2>
          <p className="text-muted-foreground mb-4">This content does not have a video file yet</p>
          <Button onClick={() => navigate('home')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-[1400px] mx-auto px-4 pt-4">
        <button onClick={() => navigate('home')} className="mb-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <VideoPlayer
          src={content.hlsMasterUrl}
          title={content.title}
          poster={content.backdropUrl || content.posterUrl}
          subtitles={content.subtitles?.map(s => ({ url: s.url, label: s.label, language: s.language }))}
          contentId={content.id}
        />
        <div className="mt-4 pb-8">
          <h1 className="text-2xl font-bold text-white">{content.title}</h1>
          {content.description && <p className="text-gray-400 mt-2">{content.description}</p>}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            {content.runtime > 0 && <span>{content.runtime} min</span>}
            {content.genres && <span>{content.genres}</span>}
            {content.language && <span>{content.language.toUpperCase()}</span>}
            <span>{content.views.toLocaleString()} views</span>
          </div>
        </div>
      </div>
    </div>
  );
}
