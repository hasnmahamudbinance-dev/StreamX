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
import { ProfileSettings } from '@/components/streamx/ProfileSettings';
import { AdminDashboard } from '@/components/streamx/AdminDashboard';
import { PlayerPage } from '@/components/streamx/PlayerPage';
import { WatchHistoryPage } from '@/components/streamx/WatchHistoryPage';
import { FavoritesPage } from '@/components/streamx/FavoritesPage';
import { DeviceManagement } from '@/components/streamx/DeviceManagement';
import { SecuritySettings } from '@/components/streamx/SecuritySettings';
import { ProfileSelectPage } from '@/components/streamx/ProfileSelectPage';
import { PricingPage } from '@/components/streamx/PricingPage';
import { BillingPage } from '@/components/streamx/BillingPage';
import { DownloadsPage } from '@/components/streamx/DownloadsPage';
import { NotificationCenterPage } from '@/components/streamx/NotificationCenterPage';

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
        return <AuthPage mode="login" initialEmail={currentParams.email} />;
      case 'register':
        return <AuthPage mode="register" initialEmail={currentParams.email} />;
      case 'verify-email':
        return <AuthPage mode="verify-email" initialEmail={currentParams.email} />;
      case 'forgot-password':
        return <AuthPage mode="forgot-password" initialEmail={currentParams.email} />;
      case 'reset-password':
        return <AuthPage mode="reset-password" initialEmail={currentParams.email} />;
      case 'profile':
        return <ProfileSettings />;
      case 'admin':
        return <AdminDashboard />;
      case 'player':
        return currentParams.id ? <PlayerPage /> : <HomePage />;
      case 'history':
        return <WatchHistoryPage />;
      case 'favorites':
        return <FavoritesPage />;
      case 'devices':
        return <DeviceManagement />;
      case 'security':
        return <SecuritySettings />;
      case 'profiles':
        return <ProfileSelectPage />;
      case 'pricing':
        return <PricingPage />;
      case 'billing':
        return <BillingPage />;
      case 'downloads':
        return <DownloadsPage />;
      case 'notifications':
        return <NotificationCenterPage />;
      default:
        return <HomePage />;
    }
  };

  const isAuthPage = currentPage === 'login' || currentPage === 'register' || currentPage === 'verify-email' || currentPage === 'forgot-password' || currentPage === 'reset-password';
  const isProfileSelect = currentPage === 'profiles';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {!isAuthPage && !isProfileSelect && <Navbar />}
      <main className="flex-1">
        {renderPage()}
      </main>
      {!isAuthPage && !isProfileSelect && <Footer />}
      {!isAuthPage && !isProfileSelect && <MobileNav />}
      {/* Bottom padding for mobile nav */}
      {!isAuthPage && !isProfileSelect && <div className="h-16 md:hidden" />}
    </div>
  );
}
