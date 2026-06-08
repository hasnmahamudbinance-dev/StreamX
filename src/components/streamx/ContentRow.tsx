'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ContentCard } from './ContentCard';
import type { TMDBContent } from '@/lib/types';

interface ContentRowProps {
  title: string;
  items: TMDBContent[];
  watchlistIds?: Set<string>;
  onAddToWatchlist?: (item: TMDBContent) => void;
  onRemoveFromWatchlist?: (item: TMDBContent) => void;
}

export function ContentRow({ title, items, watchlistIds, onAddToWatchlist, onRemoveFromWatchlist }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkArrows = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    checkArrows();
    const ref = scrollRef.current;
    ref?.addEventListener('scroll', checkArrows);
    return () => ref?.removeEventListener('scroll', checkArrows);
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative group/row">
      <h2 className="text-lg sm:text-xl font-bold mb-3 px-4 sm:px-6 lg:px-8">{title}</h2>
      
      <div className="relative">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-10 w-12 flex items-center justify-center bg-gradient-to-r from-black/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </button>
        )}

        {/* Content */}
        <div
          ref={scrollRef}
          className="content-row flex gap-3 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-2"
        >
          {items.map((item, index) => {
            const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
            const watchlistKey = `${mediaType}-${item.id}`;
            return (
              <ContentCard
                key={`${mediaType}-${item.id}`}
                item={item}
                index={index}
                inWatchlist={watchlistIds?.has(watchlistKey)}
                onAddToWatchlist={() => onAddToWatchlist?.(item)}
                onRemoveFromWatchlist={() => onRemoveFromWatchlist?.(item)}
              />
            );
          })}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-10 w-12 flex items-center justify-center bg-gradient-to-l from-black/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
