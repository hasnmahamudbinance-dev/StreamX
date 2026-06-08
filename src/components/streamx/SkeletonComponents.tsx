'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function HeroSkeleton() {
  return (
    <div className="relative h-[60vh] sm:h-[70vh]">
      <Skeleton className="w-full h-full" />
      <div className="absolute bottom-[15%] left-4 sm:left-6 lg:left-8 space-y-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-4 w-96" />
        <div className="flex gap-3 mt-4">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}

export function ContentRowSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-40 mx-4 sm:mx-6 lg:mx-8" />
      <div className="flex gap-3 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px]">
            <Skeleton className="aspect-[2/3] rounded-lg" />
            <Skeleton className="h-4 w-24 mt-2" />
            <Skeleton className="h-3 w-16 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
