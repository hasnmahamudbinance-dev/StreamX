'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Star, MessageSquare, Pencil, Trash2, X, Send, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/lib/store';
import type { RatingData, ReviewItem } from '@/lib/types';
import { toast } from 'sonner';

interface RatingsReviewsProps {
  contentId: string;
  contentType: string;
}

export function RatingsReviews({ contentId, contentType }: RatingsReviewsProps) {
  const { isAuthenticated, user, navigate } = useAppStore();

  // Rating state
  const [ratingData, setRatingData] = useState<RatingData | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingLoaded, setRatingLoaded] = useState(false);

  // Review state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Form states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Edit states
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete confirmation
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);

  // Fetch ratings
  const fetchRatings = useCallback(async () => {
    try {
      const res = await fetch(`/api/ratings?contentId=${encodeURIComponent(contentId)}&contentType=${encodeURIComponent(contentType)}`);
      if (res.ok) {
        const data = await res.json();
        setRatingData(data.ratings);
        setRatingLoaded(true);
      }
    } catch {
      // silently fail
    }
  }, [contentId, contentType]);

  // Fetch reviews
  const fetchReviews = useCallback(async (page: number, append = false) => {
    try {
      const res = await fetch(`/api/reviews?contentId=${encodeURIComponent(contentId)}&contentType=${encodeURIComponent(contentType)}&page=${page}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setReviews(prev => [...prev, ...data.reviews]);
        } else {
          setReviews(data.reviews);
        }
        setReviewsTotal(data.total);
        setReviewsPage(page);
        setHasMore(data.reviews.length === 5 && (page * 5) < data.total);
        setReviewsLoaded(true);
      }
    } catch {
      // silently fail
    }
  }, [contentId, contentType]);

  useEffect(() => {
    fetchRatings();
    fetchReviews(1);
  }, [fetchRatings, fetchReviews]);

  // Handle star click
  const handleRate = async (score: number) => {
    if (!isAuthenticated) {
      navigate('login');
      return;
    }

    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType, score }),
      });
      if (res.ok) {
        toast.success(`You rated ${score} star${score > 1 ? 's' : ''}`);
        fetchRatings();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit rating');
      }
    } catch {
      toast.error('Failed to submit rating');
    }
  };

  // Handle delete rating
  const handleDeleteRating = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/ratings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType }),
      });
      if (res.ok) {
        toast.success('Rating removed');
        fetchRatings();
      }
    } catch {
      toast.error('Failed to remove rating');
    }
  };

  // Handle submit review
  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      navigate('login');
      return;
    }
    if (!reviewTitle.trim() || !reviewContent.trim()) {
      toast.error('Please fill in title and content');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType, title: reviewTitle.trim(), content: reviewContent.trim() }),
      });
      if (res.ok) {
        toast.success('Review submitted');
        setShowReviewForm(false);
        setReviewTitle('');
        setReviewContent('');
        fetchReviews(1);
        fetchRatings();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit review');
      }
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle edit review
  const handleEditReview = (review: ReviewItem) => {
    setEditingReviewId(review.id);
    setEditTitle(review.title);
    setEditContent(review.content);
  };

  const handleSubmitEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      toast.error('Please fill in title and content');
      return;
    }

    setSubmittingEdit(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingReviewId, title: editTitle.trim(), content: editContent.trim() }),
      });
      if (res.ok) {
        toast.success('Review updated');
        setEditingReviewId(null);
        fetchReviews(1);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update review');
      }
    } catch {
      toast.error('Failed to update review');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Handle delete review
  const handleDeleteReview = async (id: string) => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success('Review deleted');
        setDeleteReviewId(null);
        fetchReviews(1);
        fetchRatings();
      }
    } catch {
      toast.error('Failed to delete review');
    }
  };

  // Load more reviews
  const handleLoadMore = () => {
    fetchReviews(reviewsPage + 1, true);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const distribution = ratingData?.distribution || [0, 0, 0, 0, 0];
  const maxDistribution = Math.max(...distribution, 1);

  return (
    <div className="space-y-6">
      {/* Ratings Section */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            Ratings & Reviews
          </h3>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Average Rating */}
            <div className="flex flex-col items-center justify-center min-w-[140px]">
              <div className="text-5xl font-bold text-foreground">
                {ratingData ? ratingData.average.toFixed(1) : '—'}
              </div>
              <div className="flex items-center gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      ratingData && star <= Math.round(ratingData.average)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {ratingData?.count || 0} rating{ratingData?.count !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Distribution */}
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map(starLevel => {
                const count = distribution[starLevel - 1] || 0;
                const pct = ratingData?.count ? (count / ratingData.count) * 100 : 0;
                return (
                  <div key={starLevel} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-3 text-right">{starLevel}</span>
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Rating */}
          <Separator className="my-4 bg-border/50" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-sm text-muted-foreground">Rate this {contentType === 'movie' ? 'movie' : 'show'}:</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      star <= (hoverRating || ratingData?.userRating || 0)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            {ratingData?.userRating && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-yellow-400 font-medium">
                  Your Rating: {ratingData.userRating} star{ratingData.userRating > 1 ? 's' : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground hover:text-destructive"
                  onClick={handleDeleteRating}
                >
                  Remove
                </Button>
              </div>
            )}
            {!isAuthenticated && (
              <Button
                variant="link"
                size="sm"
                className="text-primary p-0 h-auto"
                onClick={() => navigate('login')}
              >
                Sign in to rate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reviews Section */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Reviews
              {reviewsTotal > 0 && (
                <span className="text-sm font-normal text-muted-foreground">({reviewsTotal})</span>
              )}
            </h3>
            {isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                {showReviewForm ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {showReviewForm ? 'Cancel' : 'Write a Review'}
              </Button>
            )}
            {!isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate('login')}
              >
                <Pencil className="h-4 w-4" /> Sign in to Review
              </Button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
              <Input
                placeholder="Review title..."
                value={reviewTitle}
                onChange={e => setReviewTitle(e.target.value)}
                className="bg-background/50"
                maxLength={100}
              />
              <Textarea
                placeholder="Share your thoughts about this content..."
                value={reviewContent}
                onChange={e => setReviewContent(e.target.value)}
                className="bg-background/50 min-h-[100px] resize-y"
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {reviewContent.length}/1000
                </span>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleSubmitReview}
                  disabled={submittingReview || !reviewTitle.trim() || !reviewContent.trim()}
                >
                  <Send className="h-4 w-4" />
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </div>
          )}

          {/* Reviews List */}
          {!reviewsLoaded ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="space-y-1">
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="h-3 w-16 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No reviews yet</p>
              <p className="text-sm text-muted-foreground/70">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              {reviews.map(review => {
                const isOwnReview = user?.id === review.userId;
                const isEditing = editingReviewId === review.id;

                return (
                  <div
                    key={review.id}
                    className="p-4 rounded-lg bg-muted/20 border border-border/30 hover:border-border/60 transition-colors"
                  >
                    {isEditing ? (
                      /* Edit Mode */
                      <div className="space-y-3">
                        <Input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="bg-background/50"
                          maxLength={100}
                        />
                        <Textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          className="bg-background/50 min-h-[80px] resize-y"
                          maxLength={1000}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingReviewId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={handleSubmitEdit}
                            disabled={submittingEdit}
                          >
                            <Send className="h-3.5 w-3.5" />
                            {submittingEdit ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-primary">
                                {review.user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{review.user.name}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                            </div>
                          </div>
                          {isOwnReview && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEditReview(review)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteReviewId(review.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold mt-2">{review.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{review.content}</p>
                        {review.updatedAt !== review.createdAt && (
                          <p className="text-[10px] text-muted-foreground/50 mt-2 italic">edited</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground"
                    onClick={handleLoadMore}
                  >
                    <ChevronDown className="h-4 w-4" />
                    Load More Reviews
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Review Confirmation Dialog */}
      <AlertDialog open={!!deleteReviewId} onOpenChange={(open) => { if (!open) setDeleteReviewId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteReviewId && handleDeleteReview(deleteReviewId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
