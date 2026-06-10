'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VIDEO_SERVERS, getPreferredServer, setPreferredServer } from '@/lib/video-servers';
import {
  Server, ChevronDown, Loader2, AlertTriangle,
  MonitorPlay, Settings2, Check, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StreamPlayerProps {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  backdropPath?: string | null;
  season?: number;
  episode?: number;
  onServerChange?: (serverId: string) => void;
}

export function StreamPlayer({
  tmdbId,
  mediaType,
  title,
  backdropPath,
  season,
  episode,
  onServerChange,
}: StreamPlayerProps) {
  const [activeServerId, setActiveServerId] = useState(getPreferredServer());
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeServer = VIDEO_SERVERS.find(s => s.id === activeServerId) || VIDEO_SERVERS[0];

  const currentUrl = activeServer.getUrl(tmdbId, mediaType, season, episode);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowServerMenu(false);
      }
    }
    if (showServerMenu) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showServerMenu]);

  // Track URL changes for loading state management
  const [prevUrl, setPrevUrl] = useState(currentUrl);
  if (currentUrl !== prevUrl) {
    setPrevUrl(currentUrl);
    setIsLoading(true);
    setHasError(false);
  }

  useEffect(() => {
    // Auto-dismiss loading after 15 seconds (server might load without triggering onload)
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 15000);

    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [currentUrl]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const switchServer = useCallback((serverId: string) => {
    setActiveServerId(serverId);
    setPreferredServer(serverId);
    setShowServerMenu(false);
    setIsLoading(true);
    setHasError(false);
    onServerChange?.(serverId);
  }, [onServerChange]);

  const tryNextServer = useCallback(() => {
    const currentIndex = VIDEO_SERVERS.findIndex(s => s.id === activeServerId);
    const nextIndex = (currentIndex + 1) % VIDEO_SERVERS.length;
    if (nextIndex === currentIndex) return; // Only one server or cycled back
    const nextServer = VIDEO_SERVERS[nextIndex];
    setActiveServerId(nextServer.id);
    setPreferredServer(nextServer.id);
    setIsLoading(true);
    setHasError(false);
    onServerChange?.(nextServer.id);
  }, [activeServerId, onServerChange]);

  const retryCurrentServer = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    // Force iframe reload
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  }, [currentUrl]);

  const displayTitle = mediaType === 'tv' && season && episode
    ? `${title} - S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
    : title;

  return (
    <div className="w-full">
      {/* Player Container */}
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-3" />
            <p className="text-sm text-gray-400">Loading from {activeServer.name}...</p>
          </div>
        )}

        {/* Error overlay */}
        {hasError && !isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-3" />
            <p className="text-white font-medium mb-1">Playback Failed</p>
            <p className="text-sm text-gray-400 mb-4">
              {activeServer.name} couldn&apos;t load this content
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={retryCurrentServer}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" /> Retry
              </Button>
              <Button
                size="sm"
                onClick={tryNextServer}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Server className="h-4 w-4" /> Try Next Server
              </Button>
            </div>
          </div>
        )}

        {/* Iframe - no sandbox restriction to allow video embeds to play freely */}
        <iframe
          ref={iframeRef}
          src={currentUrl}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="no-referrer"
          title={displayTitle}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />

        {/* Top bar overlay - title & server info */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-3 sm:p-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 min-w-0">
            <MonitorPlay className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-white text-sm font-medium truncate">{displayTitle}</span>
          </div>
          <Badge variant="outline" className="border-primary/50 text-primary text-xs flex-shrink-0 pointer-events-auto">
            {activeServer.name}
          </Badge>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Server Selector */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowServerMenu(!showServerMenu)}
            className="gap-2 bg-card/50 border-border/50 hover:bg-card"
          >
            <Server className="h-4 w-4 text-primary" />
            <span className="text-sm">Server: {activeServer.name}</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${showServerMenu ? 'rotate-180' : ''}`} />
          </Button>

          {showServerMenu && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Select Server</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  If one server doesn&apos;t work, try another
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto p-1.5">
                {VIDEO_SERVERS.map(server => {
                  const isActive = server.id === activeServerId;
                  const isPreferred = server.id === getPreferredServer();
                  const statusColor = server.status === 'stable' ? 'text-green-500' : server.status === 'beta' ? 'text-yellow-500' : 'text-red-400';
                  return (
                    <button
                      key={server.id}
                      onClick={() => switchServer(server.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-primary/15 text-primary'
                          : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary' : server.status === 'stable' ? 'bg-green-500' : server.status === 'beta' ? 'bg-yellow-500' : 'bg-red-400'}`} />
                        <div>
                          <span className="font-medium">{server.name}</span>
                          <span className="text-xs text-muted-foreground ml-1">{server.quality}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] ${statusColor}`}>{server.status}</span>
                        {isPreferred && !isActive && (
                          <span className="text-[10px] text-muted-foreground">★</span>
                        )}
                        {isActive && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          {hasError && (
            <Button
              variant="outline"
              size="sm"
              onClick={tryNextServer}
              className="gap-2 text-xs"
            >
              <Server className="h-3.5 w-3.5" /> Next Server
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={retryCurrentServer}
            className="gap-2 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reload
          </Button>
        </div>
      </div>
    </div>
  );
}
