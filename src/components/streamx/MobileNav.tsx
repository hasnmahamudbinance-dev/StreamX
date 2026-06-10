'use client';

import { useAppStore } from '@/lib/store';
import { Home, Search, Bookmark, User, Clock, Globe } from 'lucide-react';

export function MobileNav() {
  const { navigate, currentPage, isAuthenticated } = useAppStore();

  const navItems = [
    { icon: Home, label: 'Home', page: 'home' as const },
    { icon: Search, label: 'Search', page: 'search' as const },
    { icon: Globe, label: 'Bangla', page: 'bangla' as const },
    { icon: Bookmark, label: 'My List', page: 'watchlist' as const },
    { icon: User, label: 'Profile', page: isAuthenticated ? 'profile' as const : 'login' as const },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around h-14 px-1">
        {navItems.map(item => (
          <button
            key={item.label}
            onClick={() => navigate(item.page)}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-md transition-colors ${
              currentPage === item.page ? 'text-primary' : 'text-gray-400'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
