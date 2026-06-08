'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Navbar } from '@/components/streamx/Navbar';
import { MobileNav } from '@/components/streamx/MobileNav';
import { Footer } from '@/components/streamx/Footer';
import { HomePage } from '@/components/streamx/HomePage';
import { SearchPage } from '@/components/streamx/SearchPage';
import { ContentDetail } from '@/components/streamx/ContentDetail';
import { WatchlistPage } from '@/components/streamx/WatchlistPage';
import { AuthPage } from '@/components/streamx/AuthPage';
import { ProfilePage } from '@/components/streamx/ProfilePage';
import { AdminDashboard } from '@/components/streamx/AdminDashboard';

export default function StreamXApp() {
  const { currentPage, currentParams, setUser, setNotifications, isAuthenticated } = useAppStore();

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await fetch('/api/session');
        const data = await res.json();
        if (data.user) {
          setUser(data.user);

          // Load notifications
          const notifRes = await fetch('/api/notifications');
          const notifData = await notifRes.json();
          if (notifData.items) {
            setNotifications(notifData.items);
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    initSession();
  }, [setUser, setNotifications]);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'search':
        return <SearchPage initialQuery={currentParams.query} initialType={currentParams.type} />;
      case 'movie':
        return currentParams.id ? <ContentDetail mediaType="movie" contentId={currentParams.id} /> : <HomePage />;
      case 'tv':
        return currentParams.id ? <ContentDetail mediaType="tv" contentId={currentParams.id} /> : <HomePage />;
      case 'watchlist':
        return <WatchlistPage />;
      case 'login':
        return <AuthPage mode="login" />;
      case 'register':
        return <AuthPage mode="register" />;
      case 'profile':
        return <ProfilePage />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <HomePage />;
    }
  };

  const isAuthPage = currentPage === 'login' || currentPage === 'register';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {!isAuthPage && <Navbar />}
      <main className="flex-1">
        {renderPage()}
      </main>
      {!isAuthPage && <Footer />}
      {!isAuthPage && <MobileNav />}
      {/* Bottom padding for mobile nav */}
      {!isAuthPage && <div className="h-16 md:hidden" />}
    </div>
  );
}
