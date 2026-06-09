'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Search, Bell, User, X, LogOut, Bookmark, Shield, Settings, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const { navigate, user, isAuthenticated, notifications, unreadCount, markNotificationRead, markAllNotificationsRead, logout, currentPage } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus();
  }, [showSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('search', { query: searchQuery.trim() });
      setShowSearch(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    markNotificationRead(id);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch {}
  };

  const handleMarkAllRead = async () => {
    markAllNotificationsRead();
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch {}
  };

  const navLinks = [
    { label: 'Home', page: 'home' as const },
    { label: 'Movies', page: 'search' as const, params: { type: 'movie' } },
    { label: 'TV Shows', page: 'search' as const, params: { type: 'tv' } },
    { label: 'My List', page: 'watchlist' as const },
    { label: 'Favorites', page: 'favorites' as const, icon: Heart },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-black/95 backdrop-blur-md shadow-lg' : 'bg-gradient-to-b from-black/80 to-transparent'
    }`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('home')} className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary tracking-tight">StreamX</span>
            </button>
            
            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <button
                  key={link.label}
                  onClick={() => navigate(link.page, link.params)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                    currentPage === link.page 
                      ? 'text-white font-medium' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {link.icon && <link.icon className="h-3.5 w-3.5" />}
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <AnimatePresence>
              {showSearch ? (
                <motion.form
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 240, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSearch}
                  className="flex items-center gap-2 overflow-hidden"
                >
                  <Input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movies, TV shows..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-9"
                  />
                  <button type="button" onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </motion.form>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setShowSearch(true)} className="text-gray-300 hover:text-white">
                  <Search className="h-5 w-5" />
                </Button>
              )}
            </AnimatePresence>

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <Button variant="ghost" size="icon" onClick={() => setShowNotifications(!showNotifications)} className="text-gray-300 hover:text-white relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-[10px]">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                  
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-3 border-b border-border">
                          <span className="text-sm font-medium">Notifications</span>
                          {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                              Mark all read
                            </button>
                          )}
                        </div>
                        <ScrollArea className="max-h-80">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground text-sm">No notifications</div>
                          ) : (
                            notifications.map(n => (
                              <button
                                key={n.id}
                                onClick={() => handleMarkRead(n.id)}
                                className={`w-full text-left p-3 border-b border-border/50 hover:bg-accent transition-colors ${
                                  !n.read ? 'bg-primary/5' : ''
                                }`}
                              >
                                <p className="text-sm font-medium">{n.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                              </button>
                            ))
                          )}
                        </ScrollArea>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* User Menu */}
                <div className="relative" ref={menuRef}>
                  <Button variant="ghost" size="icon" onClick={() => setShowUserMenu(!showUserMenu)} className="text-gray-300 hover:text-white">
                    <User className="h-5 w-5" />
                  </Button>
                  
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
                      >
                        <div className="p-3 border-b border-border">
                          <p className="text-sm font-medium">{user?.name}</p>
                          <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                        <div className="py-1">
                          <button onClick={() => { navigate('profile'); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors">
                            <User className="h-4 w-4" /> Profile
                          </button>
                          <button onClick={() => { navigate('profile'); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors">
                            <Settings className="h-4 w-4" /> Settings
                          </button>
                          <button onClick={() => { navigate('watchlist'); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors">
                            <Bookmark className="h-4 w-4" /> My List
                          </button>
                          <button onClick={() => { navigate('favorites'); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors">
                            <Heart className="h-4 w-4" /> Favorites
                          </button>
                          {user?.role === 'admin' && (
                            <button onClick={() => { navigate('admin'); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors">
                              <Shield className="h-4 w-4" /> Admin
                            </button>
                          )}
                          <button onClick={() => { logout(); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors">
                            <LogOut className="h-4 w-4" /> Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('login')} className="text-gray-300 hover:text-white">
                  Sign In
                </Button>
                <Button size="sm" onClick={() => navigate('register')} className="bg-primary hover:bg-primary/90">
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
