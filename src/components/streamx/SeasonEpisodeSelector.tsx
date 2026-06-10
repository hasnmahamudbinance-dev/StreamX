'use client';

import { useState, useEffect } from 'react';
import { getSeasonDetails, getImageUrl } from '@/lib/tmdb';
import type { TMDBSeason, TMDBEpisode, TMDBSeasonDetail } from '@/lib/types';
import { Play, Clock, Star, ChevronDown, Loader2, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SeasonEpisodeSelectorProps {
  tvId: string;
  seasons: TMDBSeason[];
  selectedSeason: number;
  selectedEpisode: number;
  onEpisodeSelect: (seasonNumber: number, episodeNumber: number) => void;
  progressPosition?: number;
  progressDuration?: number;
}

export function SeasonEpisodeSelector({
  tvId,
  seasons,
  selectedSeason,
  selectedEpisode,
  onEpisodeSelect,
  progressPosition,
  progressDuration,
}: SeasonEpisodeSelectorProps) {
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [loadedKey, setLoadedKey] = useState(`${tvId}-${selectedSeason}`);

  // Filter out season 0 (specials) if there are other seasons
  const filteredSeasons = seasons.filter(
    s => s.season_number > 0 || seasons.length === 1
  );

  const currentFetchKey = `${tvId}-${selectedSeason}`;

  useEffect(() => {
    getSeasonDetails(tvId, selectedSeason)
      .then((data: TMDBSeasonDetail) => {
        setEpisodes(data.episodes || []);
        setLoadedKey(currentFetchKey);
      })
      .catch(() => {
        setEpisodes([]);
        setLoadedKey(currentFetchKey);
      });
  }, [tvId, selectedSeason, currentFetchKey]);

  const isSeasonLoading = loadedKey !== currentFetchKey;

  const currentSeason = filteredSeasons.find(s => s.season_number === selectedSeason);

  return (
    <div className="mt-6">
      {/* Season Selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
            className="gap-2 bg-card/50 border-border/50"
          >
            <span className="font-medium">
              {currentSeason?.name || `Season ${selectedSeason}`}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showSeasonDropdown ? 'rotate-180' : ''}`} />
          </Button>

          {showSeasonDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto">
              {filteredSeasons.map(season => (
                <button
                  key={season.id}
                  onClick={() => {
                    onEpisodeSelect(season.season_number, 1);
                    setShowSeasonDropdown(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                    season.season_number === selectedSeason
                      ? 'bg-primary/15 text-primary'
                      : 'hover:bg-accent'
                  )}
                >
                  <div className="w-10 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                    {season.poster_path ? (
                      <img
                        src={getImageUrl(season.poster_path, 'w185')}
                        alt={season.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{season.name}</p>
                    <p className="text-xs text-muted-foreground">{season.episode_count} episodes</p>
                  </div>
                  {season.season_number === selectedSeason && (
                    <Badge variant="outline" className="ml-auto text-[10px] border-primary text-primary">Active</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {episodes.length} Episode{episodes.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Episodes List */}
      {isSeasonLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : episodes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Film className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No episodes available for this season</p>
        </div>
      ) : (
        <div className="grid gap-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          {episodes.map(episode => {
            const isActive = episode.episode_number === selectedEpisode;
            // Calculate progress for this episode
            const hasProgress = progressPosition && progressDuration && progressDuration > 0;
            const progressPercent = hasProgress ? Math.min((progressPosition / progressDuration) * 100, 100) : 0;

            return (
              <button
                key={episode.id}
                onClick={() => onEpisodeSelect(selectedSeason, episode.episode_number)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left group',
                  isActive
                    ? 'bg-primary/15 border border-primary/30'
                    : 'hover:bg-accent/50 border border-transparent'
                )}
              >
                {/* Episode Number / Play indicator */}
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                )}>
                  {isActive ? (
                    <Play className="h-4 w-4 fill-current" />
                  ) : (
                    episode.episode_number
                  )}
                </div>

                {/* Episode Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm font-medium truncate',
                      isActive ? 'text-primary' : ''
                    )}>
                      {episode.name || `Episode ${episode.episode_number}`}
                    </span>
                    {episode.runtime > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <Clock className="h-3 w-3" /> {episode.runtime}m
                      </span>
                    )}
                  </div>

                  {episode.overview && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {episode.overview}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    {episode.vote_average > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                        <Star className="h-3 w-3 fill-yellow-500" /> {episode.vote_average.toFixed(1)}
                      </span>
                    )}
                    {episode.air_date && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(episode.air_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {isActive && hasProgress && progressPercent > 0 && (
                    <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Still image thumbnail */}
                {episode.still_path && (
                  <div className="hidden sm:block w-24 h-14 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={getImageUrl(episode.still_path, 'w300')}
                      alt={episode.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
