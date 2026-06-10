'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Film, Tv, Upload, Plus, Edit, Trash2, Search, Loader2,
  Image as ImageIcon, FileVideo, Subtitles,
  Archive, CheckCircle, Clock, Save,
} from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  originalTitle?: string;
  description?: string;
  type: string;
  status: string;
  releaseDate?: string;
  genres?: string;
  language: string;
  runtime: number;
  rating: number;
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  cast?: string;
  director?: string;
  hlsMasterUrl?: string;
  videoFileSize: number;
  videoFormat?: string;
  videoDuration: number;
  thumbnailUrl?: string;
  views: number;
  watchTime: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { episodes: number; subtitles: number };
  episodes?: EpisodeItem[];
  subtitles?: SubtitleItem[];
}

interface EpisodeItem {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description?: string;
  runtime: number;
  hlsMasterUrl?: string;
  thumbnailUrl?: string;
  videoFileSize: number;
  videoFormat?: string;
  videoDuration: number;
  status: string;
}

interface SubtitleItem {
  id: string;
  language: string;
  label: string;
  url: string;
  format: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Edit }> = {
  draft: { label: 'Draft', color: 'bg-gray-500', icon: Edit },
  processing: { label: 'Processing', color: 'bg-yellow-500', icon: Clock },
  published: { label: 'Published', color: 'bg-green-500', icon: CheckCircle },
  archived: { label: 'Archived', color: 'bg-orange-500', icon: Archive },
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export function ContentManager() {
  const { navigate } = useAppStore();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEpisodeDialog, setShowEpisodeDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const backdropInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    title: '', originalTitle: '', description: '', type: 'movie',
    releaseDate: '', genres: '', language: 'en', runtime: 0,
    rating: 0, director: '', cast: '', featured: false,
  });

  // Episode form state
  const [episodeForm, setEpisodeForm] = useState({
    seasonNumber: 1, episodeNumber: 1, title: '', description: '', runtime: 0,
  });

  const loadContent = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await fetch(`/api/admin/content?${params}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      // ignore fetch errors
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { loadContent(); }, [loadContent]);

  const handleCreate = async () => {
    if (!form.title) return;
    setIsUploading(true);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Content created successfully');
        setShowCreateDialog(false);
        setForm({ title: '', originalTitle: '', description: '', type: 'movie', releaseDate: '', genres: '', language: 'en', runtime: 0, rating: 0, director: '', cast: '', featured: false });
        loadContent();
        // Open edit dialog for the new content so user can upload files
        setSelectedItem(data.item);
        setShowEditDialog(true);
      }
    } catch {
      toast.error('Failed to create content');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    try {
      await fetch(`/api/admin/content/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success('Changes saved');
      setShowEditDialog(false);
      loadContent();
    } catch {
      toast.error('Failed to save changes');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/content/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      toast.success(`Status changed to ${status}`);
      loadContent();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/admin/content/${id}`, { method: 'DELETE' });
      toast.success('Content deleted');
      loadContent();
    } catch {
      // ignore
    }
  };

  const handleFileUpload = async (file: File, type: string, contentId?: string, episodeId?: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      if (contentId) formData.append('contentId', contentId);
      if (episodeId) formData.append('episodeId', episodeId);

      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${type} uploaded successfully`);
        loadContent();
        // Refresh selected item
        if (contentId) {
          const detailRes = await fetch(`/api/admin/content/${contentId}`);
          const detailData = await detailRes.json();
          if (detailData.item) setSelectedItem(detailData.item);
        }
        return data;
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch {
      // ignore
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddEpisode = async () => {
    if (!selectedItem || !episodeForm.title) return;
    try {
      await fetch('/api/admin/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: selectedItem.id, ...episodeForm }),
      });
      toast.success('Episode added');
      setShowEpisodeDialog(false);
      setEpisodeForm({ seasonNumber: 1, episodeNumber: 1, title: '', description: '', runtime: 0 });
      // Refresh selected item
      const res = await fetch(`/api/admin/content/${selectedItem.id}`);
      const data = await res.json();
      if (data.item) setSelectedItem(data.item);
    } catch {
      // ignore
    }
  };

  const handleDeleteEpisode = async (id: string) => {
    if (!confirm('Delete this episode?')) return;
    try {
      await fetch(`/api/admin/episodes/${id}`, { method: 'DELETE' });
      if (selectedItem) {
        const res = await fetch(`/api/admin/content/${selectedItem.id}`);
        const data = await res.json();
        if (data.item) setSelectedItem(data.item);
      }
    } catch {
      // ignore
    }
  };

  const openEditDialog = async (item: ContentItem) => {
    // Fetch full details
    const res = await fetch(`/api/admin/content/${item.id}`);
    const data = await res.json();
    setSelectedItem(data.item);
    setForm({
      title: data.item.title,
      originalTitle: data.item.originalTitle || '',
      description: data.item.description || '',
      type: data.item.type,
      releaseDate: data.item.releaseDate || '',
      genres: data.item.genres || '',
      language: data.item.language,
      runtime: data.item.runtime,
      rating: data.item.rating,
      director: data.item.director || '',
      cast: data.item.cast || '',
      featured: data.item.featured,
    });
    setShowEditDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Content Library</h2>
          <p className="text-sm text-muted-foreground">{items.length} items total</p>
        </div>
        <Button onClick={() => { setForm({ title: '', originalTitle: '', description: '', type: 'movie', releaseDate: '', genres: '', language: 'en', runtime: 0, rating: 0, director: '', cast: '', featured: false }); setShowCreateDialog(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Upload Content
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search content..." className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="movie">Movies</SelectItem>
            <SelectItem value="tv">TV Shows</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length > 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Video</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Watch Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => {
                    const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.posterUrl ? (
                              <img src={item.posterUrl} alt={item.title} className="w-10 h-14 rounded object-cover" onError={e => { (e.target as HTMLImageElement).src = '/placeholder-poster.svg'; }} />
                            ) : (
                              <div className="w-10 h-14 rounded bg-muted flex items-center justify-center"><Film className="h-4 w-4 text-muted-foreground" /></div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{item.title}</p>
                              {item.originalTitle && item.originalTitle !== item.title && (
                                <p className="text-xs text-muted-foreground">{item.originalTitle}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            {item.type === 'movie' ? <Film className="h-3 w-3" /> : <Tv className="h-3 w-3" />}
                            {item.type === 'movie' ? 'Movie' : 'TV'}
                          </Badge>
                          {item._count?.episodes ? <span className="text-xs text-muted-foreground ml-1">({item._count.episodes} ep)</span> : null}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConf.color} text-white gap-1`}>
                            <statusConf.icon className="h-3 w-3" />
                            {statusConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.hlsMasterUrl ? (
                            <span className="text-xs text-green-400">✓ {item.videoFormat?.toUpperCase()}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No video</span>
                          )}
                          {item.videoFileSize > 0 && <p className="text-xs text-muted-foreground">{formatFileSize(item.videoFileSize)}</p>}
                        </TableCell>
                        <TableCell><span className="text-sm">{item.views.toLocaleString()}</span></TableCell>
                        <TableCell><span className="text-sm">{formatDuration(item.watchTime)}</span></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.status === 'draft' && (
                              <Button size="sm" variant="outline" onClick={() => handleStatusChange(item.id, 'published')}>Publish</Button>
                            )}
                            {item.status === 'published' && (
                              <Button size="sm" variant="outline" onClick={() => handleStatusChange(item.id, 'archived')}>Archive</Button>
                            )}
                            {item.status === 'archived' && (
                              <Button size="sm" variant="outline" onClick={() => handleStatusChange(item.id, 'published')}>Restore</Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => openEditDialog(item)}><Edit className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(item.id, item.title)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12">
          <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No content yet</h3>
          <p className="text-muted-foreground mb-4">Start uploading movies and TV shows</p>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Upload Content</Button>
        </div>
      )}

      {/* Create Content Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add New Content</DialogTitle>
            <DialogDescription>Enter metadata for the movie or TV show</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Content title" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Original Title</Label>
                <Input value={form.originalTitle} onChange={e => setForm(f => ({...f, originalTitle: e.target.value}))} placeholder="Original title" className="bg-secondary border-border" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Plot synopsis..." className="bg-secondary border-border min-h-[80px]" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Movie</SelectItem>
                    <SelectItem value="tv">TV Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={form.language} onValueChange={v => setForm(f => ({...f, language: v}))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="bn">Bengali</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Release Date</Label>
                <Input type="date" value={form.releaseDate} onChange={e => setForm(f => ({...f, releaseDate: e.target.value}))} className="bg-secondary border-border" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Genres</Label>
                <Input value={form.genres} onChange={e => setForm(f => ({...f, genres: e.target.value}))} placeholder="Action, Drama" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Runtime (min)</Label>
                <Input type="number" value={form.runtime || ''} onChange={e => setForm(f => ({...f, runtime: parseInt(e.target.value) || 0}))} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Rating</Label>
                <Input type="number" step="0.1" min="0" max="10" value={form.rating || ''} onChange={e => setForm(f => ({...f, rating: parseFloat(e.target.value) || 0}))} className="bg-secondary border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Director</Label>
                <Input value={form.director} onChange={e => setForm(f => ({...f, director: e.target.value}))} placeholder="Director name" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Cast</Label>
                <Input value={form.cast} onChange={e => setForm(f => ({...f, cast: e.target.value}))} placeholder="Actor 1, Actor 2" className="bg-secondary border-border" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="featured" checked={form.featured} onChange={e => setForm(f => ({...f, featured: e.target.checked}))} className="rounded" />
              <Label htmlFor="featured">Featured content</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title || isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create & Upload Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Content Dialog (with file uploads) */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit: {selectedItem?.title}</DialogTitle>
            <DialogDescription>Update metadata and upload files</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <Tabs defaultValue="metadata" className="space-y-4">
              <TabsList className="bg-secondary">
                <TabsTrigger value="metadata"><Edit className="h-4 w-4 mr-1" /> Metadata</TabsTrigger>
                <TabsTrigger value="files"><FileVideo className="h-4 w-4 mr-1" /> Files</TabsTrigger>
                {selectedItem.type === 'tv' && (
                  <TabsTrigger value="episodes"><Tv className="h-4 w-4 mr-1" /> Episodes</TabsTrigger>
                )}
                <TabsTrigger value="subtitles"><Subtitles className="h-4 w-4 mr-1" /> Subtitles</TabsTrigger>
              </TabsList>

              <TabsContent value="metadata" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Original Title</Label>
                    <Input value={form.originalTitle} onChange={e => setForm(f => ({...f, originalTitle: e.target.value}))} className="bg-secondary border-border" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="bg-secondary border-border min-h-[80px]" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Genres</Label><Input value={form.genres} onChange={e => setForm(f => ({...f, genres: e.target.value}))} className="bg-secondary border-border" /></div>
                  <div className="space-y-2"><Label>Runtime (min)</Label><Input type="number" value={form.runtime || ''} onChange={e => setForm(f => ({...f, runtime: parseInt(e.target.value) || 0}))} className="bg-secondary border-border" /></div>
                  <div className="space-y-2"><Label>Rating</Label><Input type="number" step="0.1" value={form.rating || ''} onChange={e => setForm(f => ({...f, rating: parseFloat(e.target.value) || 0}))} className="bg-secondary border-border" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Director</Label><Input value={form.director} onChange={e => setForm(f => ({...f, director: e.target.value}))} className="bg-secondary border-border" /></div>
                  <div className="space-y-2"><Label>Cast</Label><Input value={form.cast} onChange={e => setForm(f => ({...f, cast: e.target.value}))} className="bg-secondary border-border" /></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="edit-featured" checked={form.featured} onChange={e => setForm(f => ({...f, featured: e.target.checked}))} />
                    <Label htmlFor="edit-featured">Featured</Label>
                  </div>
                  <Select value={selectedItem.status} onValueChange={v => handleStatusChange(selectedItem.id, v)}>
                    <SelectTrigger className="w-[140px] bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleUpdate} className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
              </TabsContent>

              <TabsContent value="files" className="space-y-4">
                {/* Poster Upload */}
                <div className="space-y-2">
                  <Label>Poster Image</Label>
                  <div className="flex items-center gap-4">
                    {selectedItem.posterUrl && (
                      <img src={selectedItem.posterUrl} alt="Poster" className="w-16 h-24 rounded object-cover" onError={e => { (e.target as HTMLImageElement).src = '/placeholder-poster.svg'; }} />
                    )}
                    <div>
                      <input ref={posterInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'poster', selectedItem.id);
                      }} />
                      <Button variant="outline" size="sm" onClick={() => posterInputRef.current?.click()} className="gap-2">
                        <ImageIcon className="h-4 w-4" /> Upload Poster
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Backdrop Upload */}
                <div className="space-y-2">
                  <Label>Backdrop Image</Label>
                  <div className="flex items-center gap-4">
                    {selectedItem.backdropUrl && (
                      <img src={selectedItem.backdropUrl} alt="Backdrop" className="w-24 h-14 rounded object-cover" onError={e => { (e.target as HTMLImageElement).src = '/placeholder-backdrop.svg'; }} />
                    )}
                    <div>
                      <input ref={backdropInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'backdrop', selectedItem.id);
                      }} />
                      <Button variant="outline" size="sm" onClick={() => backdropInputRef.current?.click()} className="gap-2">
                        <ImageIcon className="h-4 w-4" /> Upload Backdrop
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Video Upload */}
                <div className="space-y-2">
                  <Label>Video File</Label>
                  <div className="space-y-2">
                    {selectedItem.hlsMasterUrl ? (
                      <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">Video uploaded</p>
                          <p className="text-xs text-muted-foreground">{selectedItem.videoFormat?.toUpperCase()} • {formatFileSize(selectedItem.videoFileSize)}</p>
                        </div>
                      </div>
                    ) : null}
                    <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'video', selectedItem.id);
                    }} />
                    <Button variant="outline" onClick={() => videoInputRef.current?.click()} className="gap-2" disabled={isUploading}>
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileVideo className="h-4 w-4" />}
                      {selectedItem.hlsMasterUrl ? 'Replace Video' : 'Upload Video'}
                    </Button>
                    <p className="text-xs text-muted-foreground">Supported: MP4, MOV, MKV, WEBM (max 500MB)</p>
                  </div>
                </div>
              </TabsContent>

              {selectedItem.type === 'tv' && (
                <TabsContent value="episodes" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Episodes ({selectedItem.episodes?.length || 0})</h3>
                    <Button size="sm" onClick={() => setShowEpisodeDialog(true)} className="gap-1"><Plus className="h-3 w-3" /> Add Episode</Button>
                  </div>
                  {selectedItem.episodes && selectedItem.episodes.length > 0 ? (
                    <div className="space-y-2">
                      {selectedItem.episodes.map(ep => (
                        <div key={ep.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">S{ep.seasonNumber}E{ep.episodeNumber}</Badge>
                            <div>
                              <p className="text-sm font-medium">{ep.title}</p>
                              <p className="text-xs text-muted-foreground">{ep.runtime > 0 ? `${ep.runtime} min` : '--'} {ep.hlsMasterUrl ? '✓ Video' : 'No video'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'video/*';
                              input.onchange = (e: Event) => {
                                const target = e.target as HTMLInputElement;
                                const file = target.files?.[0];
                                if (file) handleFileUpload(file, 'video', selectedItem.id, ep.id);
                              };
                              input.click();
                            }}><Upload className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteEpisode(ep.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No episodes yet</p>
                  )}
                </TabsContent>
              )}

              <TabsContent value="subtitles" className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Subtitles ({selectedItem.subtitles?.length || 0})</h3>
                  {selectedItem.subtitles && selectedItem.subtitles.length > 0 && (
                    <div className="space-y-1">
                      {selectedItem.subtitles.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                          <span className="text-sm">{sub.label} ({sub.language}) - {sub.format.toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2 mt-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Language</Label>
                      <Input placeholder="en" className="w-20 bg-secondary border-border h-9" id="sub-lang" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input placeholder="English" className="w-28 bg-secondary border-border h-9" id="sub-label" />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.vtt,.srt';
                      input.onchange = (e: Event) => {
                        const target = e.target as HTMLInputElement;
                        const file = target.files?.[0];
                        if (file) {
                          const langEl = document.getElementById('sub-lang') as HTMLInputElement;
                          const labelEl = document.getElementById('sub-label') as HTMLInputElement;
                          const fd = new FormData();
                          fd.append('file', file);
                          fd.append('type', 'subtitle');
                          fd.append('contentId', selectedItem.id);
                          fd.append('language', langEl?.value || 'en');
                          fd.append('label', labelEl?.value || 'English');
                          fetch('/api/admin/upload', { method: 'POST', body: fd }).then(() => loadContent());
                        }
                      };
                      input.click();
                    }} className="gap-1"><Upload className="h-3 w-3" /> Upload</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Episode Dialog */}
      <Dialog open={showEpisodeDialog} onOpenChange={setShowEpisodeDialog}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add Episode</DialogTitle>
            <DialogDescription>Add a new episode to this TV show</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Season</Label>
                <Input type="number" min="1" value={episodeForm.seasonNumber} onChange={e => setEpisodeForm(f => ({...f, seasonNumber: parseInt(e.target.value) || 1}))} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Episode</Label>
                <Input type="number" min="1" value={episodeForm.episodeNumber} onChange={e => setEpisodeForm(f => ({...f, episodeNumber: parseInt(e.target.value) || 1}))} className="bg-secondary border-border" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Episode Title *</Label>
              <Input value={episodeForm.title} onChange={e => setEpisodeForm(f => ({...f, title: e.target.value}))} placeholder="Episode title" className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={episodeForm.description} onChange={e => setEpisodeForm(f => ({...f, description: e.target.value}))} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>Runtime (min)</Label>
              <Input type="number" value={episodeForm.runtime || ''} onChange={e => setEpisodeForm(f => ({...f, runtime: parseInt(e.target.value) || 0}))} className="bg-secondary border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEpisodeDialog(false)}>Cancel</Button>
            <Button onClick={handleAddEpisode} disabled={!episodeForm.title}>Add Episode</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
