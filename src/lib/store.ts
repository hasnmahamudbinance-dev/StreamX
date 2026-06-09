import { create } from 'zustand';
import type { AppState, PageRoute, UserSession, NotificationItem, UserProfile } from './types';

function getHashRoute(): { page: PageRoute; params: Record<string, string> } {
  if (typeof window === 'undefined') return { page: 'home', params: {} };
  
  const hash = window.location.hash.slice(1) || 'home';
  const [pathPart, queryString] = hash.split('?');
  const parts = pathPart.split('/');
  const page = (parts[0] || 'home') as PageRoute;
  const params: Record<string, string> = {};
  
  if (parts.length >= 2) {
    params.id = parts[1];
  }

  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
  }
  
  return { page, params };
}

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'home',
  currentParams: {},
  user: null,
  isAuthenticated: false,
  isLoading: true,
  notifications: [],
  unreadCount: 0,
  activeProfile: null,

  navigate: (page: PageRoute, params: Record<string, string> = {}) => {
    let hash = params.id ? `${page}/${params.id}` : page;
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key !== 'id' && value) {
        queryParams.set(key, value);
      }
    }
    const qs = queryParams.toString();
    if (qs) hash += '?' + qs;
    window.location.hash = hash;
    set({ currentPage: page, currentParams: params });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  setUser: (user: UserSession | null) => {
    set({ 
      user, 
      isAuthenticated: !!user,
      isLoading: false,
    });
  },

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setActiveProfile: (profile: UserProfile | null) => {
    set({ activeProfile: profile });
  },

  setNotifications: (notifications: NotificationItem[]) => {
    set({ 
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
    });
  },

  markNotificationRead: (id: string) => {
    set(state => ({
      notifications: state.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllNotificationsRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  logout: async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {}
    set({ 
      user: null, 
      isAuthenticated: false,
      currentPage: 'home',
      currentParams: {},
      notifications: [],
      unreadCount: 0,
      activeProfile: null,
    });
    window.location.hash = 'home';
  },
}));

// Listen to hash changes
if (typeof window !== 'undefined') {
  const handleHashChange = () => {
    const { page, params } = getHashRoute();
    const state = useAppStore.getState();
    if (state.currentPage !== page || JSON.stringify(state.currentParams) !== JSON.stringify(params)) {
      useAppStore.setState({ currentPage: page, currentParams: params });
    }
  };
  
  window.addEventListener('hashchange', handleHashChange);
  
  // Initialize from hash
  const { page, params } = getHashRoute();
  useAppStore.setState({ currentPage: page, currentParams: params });
}
