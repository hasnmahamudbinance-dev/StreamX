'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Play, Plus, Check, Star, Calendar, Clock, Film, Tv,
  Share2, ArrowLeft, Heart, MessageSquare, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { getDetails, getImageUrl, getBackdropUrl, getProfileUrl } from '@/lib/tmdb';
import { ContentRow } from './ContentRow';
import { RatingsReviews } from './RatingsReviews';
import type { TMDBMovieDetail, TMDBTVDetail, TMDBContent, WatchlistItem } from '@/lib/types';
import { toast } from 'sonner';

interface ContentDetailProps {
  mediaType: string;
  contentId: string;
}

export function ContentDetail({ mediaType, contentId }: ContentDetailProps) {
  const { navigate, isAuthenticated } = useAppStore();
  const [detail, setDetail] = useState<TMDBMovieDetail | TMDBTVDetail | null>(null);
  const [fetchedKey, setFetchedKey] = useState('');
  const [inWatchlist, setInWatchlist] = useState(false);

  // Favorite state
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | undefined>(undefined);

  // Rating state (1-10 scale)
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const currentKey = `${mediaType}-${contentId}`;
  const isLoading = fetchedKey !== currentKey;
  const isMovie = mediaType === 'movie';
  const title = detail ? (isMovie ? (detail as TMDBMovieDetail).title : (detail as TMDBTVDetail).name) : '';
  const date = detail ? (isMovie ? (detail as TMDBMovieDetail).release_date : (detail as TMDBTVDetail).first_air_date) : '';

  useEffect(() => {
    getDetails(mediaType, contentId)
      .then(data => {
        setDetail(data);
        setFetchedKey(currentKey);
      })
      .catch(() => setFetchedKey(currentKey));
  }, [mediaType, contentId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/watchlist')
      .then(r => r.json())
      .then(data => {
        const items: WatchlistItem[] = data.items || [];
        setInWatchlist(items.some((w: WatchlistItem) => w.contentId === contentId && w.contentType === mediaType));
      })
      .catch(() => {});
  }, [isAuthenticated, contentId, mediaType]);

  // Check favorite status
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/favorites/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId, contentType: mediaType }),
    })
      .then(r => r.json())
      .then(data => {
        setIsFavorited(data.isFavorite || false);
        setFavoriteId(data.favoriteId);
      })
      .catch(() => {});
  }, [isAuthenticated, contentId, mediaType]);

  // Fetch user's existing rating
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/ratings?contentId=${encodeURIComponent(contentId)}&contentType=${encodeURIComponent(mediaType)}`)
      .then(r => r.json())
      .then(data => {
        if (data.ratings?.userRating) {
          setUserRating(data.ratings.userRating);
        }
        if (data.ratings?.userReview) {
          setUserReview(data.ratings.userReview);
          setShowReviewInput(true);
        }
      })
      .catch(() => {});
  }, [isAuthenticated, contentId, mediaType]);

  // Track watch history
  useEffect(() => {
    if (!isAuthenticated || !detail) return;
    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentId,
        contentType: mediaType,
        title,
        posterPath: detail.poster_path || null,
        overview: detail.overview || null,
        rating: detail.vote_average || null,
        releaseDate: date || null,
      }),
    }).catch(() => {});
  }, [isAuthenticated, detail, contentId, mediaType, title, date]);

  const handleToggleWatchlist = useCallback(async () => {
    if (!isAuthenticated || !detail) return;

    if (inWatchlist) {
      try {
        await fetch(`/api/watchlist?contentId=${contentId}&contentType=${mediaType}`, { method: 'DELETE' });
        setInWatchlist(false);
      } catch {}
    } else {
      try {
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId,
            contentType: mediaType,
            title,
            posterPath: detail.poster_path,
            overview: detail.overview,
            rating: detail.vote_average,
            releaseDate: date,
          }),
        });
        setInWatchlist(true);
      } catch {}
    }
  }, [isAuthenticated, inWatchlist, detail, contentId, mediaType, title, date]);

  const handleToggleFavorite = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('login');
      return;
    }

    if (isFavorited && favoriteId) {
      try {
        const res = await fetch(`/api/favorites/${favoriteId}`, { method: 'DELETE' });
        if (res.ok) {
          setIsFavorited(false);
          setFavoriteId(undefined);
          toast.success('Removed from favorites');
        }
      } catch {
        toast.error('Failed to remove from favorites');
      }
    } else {
      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentId, contentType: mediaType }),
        });
        if (res.ok) {
          const data = await res.json();
          setIsFavorited(true);
          setFavoriteId(data.item?.id);
          toast.success('Added to favorites');
        } else if (res.status === 409) {
          toast.info('Already in favorites');
        }
      } catch {
        toast.error('Failed to add to favorites');
      }
    }
  }, [isAuthenticated, isFavorited, favoriteId, contentId, mediaType, navigate]);

  const handleRate = async (score: number) => {
    if (!isAuthenticated) {
      navigate('login');
      return;
    }

    setSubmittingRating(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          contentType: mediaType,
          score,
          review: userReview || undefined,
        }),
      });
      if (res.ok) {
        setUserRating(score);
        toast.success(`You rated this ${score}/10`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit rating');
      }
    } catch {
      toast.error('Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      navigate('login');
      return;
    }
    if (!userReview.trim()) return;

    setSubmittingRating(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          contentType: mediaType,
          score: userRating || 5,
          review: userReview.trim(),
        }),
      });
      if (res.ok) {
        toast.success('Review saved');
      }
    } catch {
      toast.error('Failed to save review');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/ratings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType: mediaType }),
      });
      if (res.ok) {
        setUserRating(null);
        setUserReview('');
        setShowReviewInput(false);
        toast.success('Rating removed');
      }
    } catch {
      toast.error('Failed to remove rating');
    }
  };

  const trailer = detail?.videos?.results?.find(
    (v: { site: string; type: string }) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  );

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16">
        <div className="h-[50vh] bg-muted animate-pulse" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 space-y-4">
          <div className="h-10 w-2/3 bg-muted animate-pulse rounded" />
          <div className="h-6 w-1/3 bg-muted animate-pulse rounded" />
          <div className="h-40 w-full bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Content Not Found</h2>
          <Button onClick={() => navigate('home')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const cast = detail.credits?.cast?.slice(0, 12) || [];
  const similar = detail.similar?.results || [];
  const recommendations = detail.recommendations?.results || [];
  const relatedContent = recommendations.length > 0 ? recommendations : similar;

  return (
    <div className="min-h-screen pt-16">
      {/* Backdrop */}
      <div className="relative h-[50vh] sm:h-[60vh]">
        <img
          src={getBackdropUrl(detail.backdrop_path)}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-backdrop.svg'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 -mt-40 sm:-mt-48 relative z-10">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Poster */}
          <div className="hidden sm:block flex-shrink-0">
            <img
              src={getImageUrl(detail.poster_path, 'w500')}
              alt={title}
              className="w-[200px] sm:w-[240px] rounded-lg shadow-2xl"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-poster.svg'; }}
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-primary text-primary">
                {isMovie ? 'Movie' : 'TV Show'}
              </Badge>
              {date && <span className="text-sm text-muted-foreground">{date.split('-')[0]}</span>}
              {detail.vote_average > 0 && (
                <span className="flex items-center gap-1 text-sm text-yellow-400">
                  <Star className="h-3.5 w-3.5 fill-yellow-400" />
                  {detail.vote_average.toFixed(1)}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h1>

            {detail.tagline && (
              <p className="text-sm italic text-muted-foreground mb-3">&ldquo;{detail.tagline}&rdquo;</p>
            )}

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-4">
              {detail.genres?.map(genre => (
                <Badge key={genre.id} variant="secondary">{genre.name}</Badge>
              ))}
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
              {isMovie && (detail as TMDBMovieDetail).runtime > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" /> {(detail as TMDBMovieDetail).runtime} min
                </span>
              )}
              {!isMovie && (detail as TMDBTVDetail).number_of_seasons > 0 && (
                <span className="flex items-center gap-1">
                  <Tv className="h-4 w-4" /> {(detail as TMDBTVDetail).number_of_seasons} Season{(detail as TMDBTVDetail).number_of_seasons > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              {trailer && (
                <a
                  href={`https://www.youtube.com/watch?v=${trailer.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="bg-white text-black hover:bg-white/90 gap-2">
                    <Play className="h-4 w-4 fill-black" /> Watch Trailer
                  </Button>
                </a>
              )}
              <Button
                variant="outline"
                onClick={handleToggleWatchlist}
                className="gap-2"
              >
                {inWatchlist ? (
                  <><Check className="h-4 w-4" /> In My List</>
                ) : (
                  <><Plus className="h-4 w-4" /> Add to My List</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleToggleFavorite}
                className={`gap-2 ${isFavorited ? 'border-red-500/50 text-red-500 hover:bg-red-500/10' : ''}`}
              >
                <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500' : ''}`} />
                {isFavorited ? 'Favorited' : 'Favorite'}
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => {
                if (navigator.share) {
                  navigator.share({ title, url: window.location.href });
                }
              }}>
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </div>

            {/* Overview */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Overview</h3>
              <p className="text-muted-foreground leading-relaxed">{detail.overview}</p>
            </div>

            {/* Your Rating Section */}
            <div className="mb-6 p-4 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  Your Rating
                </h3>
                {userRating && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-destructive"
                    onClick={handleDeleteRating}
                  >
                    Remove Rating
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRate(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={submittingRating}
                    className="p-0.5 transition-transform hover:scale-110 focus:outline-none disabled:opacity-50"
                    aria-label={`Rate ${star} out of 10`}
                  >
                    <Star
                      className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${
                        star <= (hoverRating || userRating || 0)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </button>
                ))}
                {userRating && (
                  <span className="ml-2 text-sm text-yellow-400 font-bold">{userRating}/10</span>
                )}
              </div>

              {/* Review text */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowReviewInput(!showReviewInput)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <MessageSquare className="h-3 w-3" />
                  {userReview ? 'Edit your review' : 'Write a review'}
                </button>
                {showReviewInput && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Share your thoughts about this content..."
                      value={userReview}
                      onChange={e => setUserReview(e.target.value)}
                      className="bg-background/50 min-h-[80px] resize-y text-sm"
                      maxLength={1000}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{userReview.length}/1000</span>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={handleSubmitReview}
                        disabled={submittingRating || !userReview.trim()}
                      >
                        <Send className="h-3.5 w-3.5" />
                        {submittingRating ? 'Saving...' : 'Save Review'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {!isAuthenticated && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-primary p-0 h-auto mt-2"
                  onClick={() => navigate('login')}
                >
                  Sign in to rate
                </Button>
              )}
            </div>

            {/* Ratings & Reviews */}
            <div className="mt-8">
              <RatingsReviews contentId={contentId} contentType={mediaType} />
            </div>

            {/* Seasons for TV */}
            {!isMovie && (detail as TMDBTVDetail).seasons && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Seasons</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 content-row">
                  {(detail as TMDBTVDetail).seasons.map(season => (
                    <div key={season.id} className="flex-shrink-0 w-[120px]">
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                        {season.poster_path ? (
                          <img
                            src={getImageUrl(season.poster_path, 'w300')}
                            alt={season.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium mt-1 truncate">{season.name}</p>
                      <p className="text-[10px] text-muted-foreground">{season.episode_count} episodes</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cast */}
        {cast.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-3">Cast</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 content-row">
              {cast.map(person => (
                <div key={person.id} className="flex-shrink-0 text-center w-[80px]">
                  <div className="w-[80px] h-[80px] rounded-full overflow-hidden bg-muted mx-auto">
                    {person.profile_path ? (
                      <img
                        src={getProfileUrl(person.profile_path)}
                        alt={person.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">{person.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium mt-1.5 line-clamp-1">{person.name}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{person.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Content */}
        {relatedContent.length > 0 && (
          <div className="mt-8">
            <ContentRow
              title="You Might Also Like"
              items={relatedContent.filter((item: TMDBContent) => item.poster_path)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
