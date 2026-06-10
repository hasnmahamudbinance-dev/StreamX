'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Headphones,
  MessageSquare,
  HelpCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

interface FAQItem {
  id: string;
  key: string;
  question: string;
  answer: string;
  order: number;
}

interface TicketMessage {
  id: string;
  userId: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
  user: { name: string; avatar: string | null };
}

interface TicketItem {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: { name: string; email: string };
  messageCount?: number;
  messages?: TicketMessage[];
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  in_progress: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
  closed: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const categoryColors: Record<string, string> = {
  technical: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  billing: 'bg-green-500/10 text-green-500 border-green-500/20',
  content: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  account: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  other: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const statusIcons: Record<string, typeof Clock> = {
  open: Clock,
  in_progress: Loader2,
  resolved: CheckCircle,
  closed: AlertCircle,
};

export function SupportPage() {
  const { isAuthenticated, navigate } = useAppStore();
  const [activeTab, setActiveTab] = useState('faq');
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [loadingFaq, setLoadingFaq] = useState(true);

  // Contact form state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('technical');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<Record<string, TicketMessage[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<Record<string, boolean>>({});

  // Fetch FAQs
  const fetchFaqs = useCallback(async () => {
    try {
      setLoadingFaq(true);
      const res = await fetch('/api/support/faq');
      if (!res.ok) throw new Error('Failed to fetch FAQ');
      const data = await res.json();
      setFaqs(data.faqs || []);
    } catch {
      toast.error('Failed to load FAQ');
    } finally {
      setLoadingFaq(false);
    }
  }, []);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingTickets(true);
      const res = await fetch('/api/support/tickets');
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setLoadingTickets(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  useEffect(() => {
    if (activeTab === 'tickets' && isAuthenticated) {
      fetchTickets();
    }
  }, [activeTab, isAuthenticated, fetchTickets]);

  // Fetch ticket messages when expanding
  const fetchTicketMessages = async (ticketId: string) => {
    if (ticketMessages[ticketId]) return; // Already loaded
    try {
      setLoadingMessages(prev => ({ ...prev, [ticketId]: true }));
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      if (!res.ok) throw new Error('Failed to fetch ticket');
      const data = await res.json();
      setTicketMessages(prev => ({ ...prev, [ticketId]: data.ticket?.messages || [] }));
    } catch {
      toast.error('Failed to load ticket messages');
    } finally {
      setLoadingMessages(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleToggleTicket = (ticketId: string) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
    } else {
      setExpandedTicket(ticketId);
      fetchTicketMessages(ticketId);
    }
  };

  // Submit ticket
  const handleSubmitTicket = async () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          priority,
          description: description.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create ticket');
      }
      toast.success('Support ticket created successfully');
      setSubject('');
      setCategory('technical');
      setPriority('medium');
      setDescription('');
      setActiveTab('tickets');
      fetchTickets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Reply to ticket
  const handleReply = async (ticketId: string) => {
    const message = replyText[ticketId]?.trim();
    if (!message) {
      toast.error('Please enter a message');
      return;
    }

    setSendingReply(prev => ({ ...prev, [ticketId]: true }));
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send reply');
      }
      const data = await res.json();
      setTicketMessages(prev => ({
        ...prev,
        [ticketId]: [...(prev[ticketId] || []), data.message],
      }));
      setReplyText(prev => ({ ...prev, [ticketId]: '' }));
      toast.success('Reply sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSendingReply(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    const Icon = statusIcons[status] || Clock;
    return <Icon className={`h-3 w-3 ${status === 'in_progress' ? 'animate-spin' : ''}`} />;
  };

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 pt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('home')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Help & Support</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Find answers, contact us, or track your support requests</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto mb-6">
          <TabsTrigger value="faq" className="gap-1.5">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Contact Us</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-1.5">
            <Headphones className="h-4 w-4" />
            <span className="hidden sm:inline">My Tickets</span>
          </TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-3">
          {loadingFaq ? (
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : faqs.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No FAQ Available Yet</h3>
                <p className="text-sm text-muted-foreground">
                  We&apos;re working on adding frequently asked questions. In the meantime, feel free to contact us directly.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={() => setActiveTab('contact')}
                >
                  <MessageSquare className="h-4 w-4" />
                  Contact Us
                </Button>
              </CardContent>
            </Card>
          ) : (
            faqs.map((faq) => (
              <Card key={faq.id} className="bg-card border-border">
                <CardContent className="p-0">
                  <button
                    className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  >
                    <span className="font-medium pr-4">{faq.question}</span>
                    {expandedFaq === faq.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {expandedFaq === faq.id && (
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Contact Us Tab */}
        <TabsContent value="contact" className="space-y-6">
          {!isAuthenticated ? (
            <Card className="bg-card border-border">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sign in Required</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Please sign in to submit a support ticket
                </p>
                <Button onClick={() => navigate('login')}>Sign In</Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Submit a Support Ticket
                </CardTitle>
                <CardDescription>
                  Describe your issue and we&apos;ll get back to you as soon as possible
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                    className="bg-background"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="content">Content</SelectItem>
                        <SelectItem value="account">Account</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please describe your issue in detail..."
                    className="bg-background min-h-[120px] resize-y"
                  />
                </div>

                <Button
                  onClick={handleSubmitTicket}
                  disabled={submitting}
                  className="gap-2 w-full sm:w-auto"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit Ticket
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
          {!isAuthenticated ? (
            <Card className="bg-card border-border">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                <Headphones className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sign in Required</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Please sign in to view your support tickets
                </p>
                <Button onClick={() => navigate('login')}>Sign In</Button>
              </CardContent>
            </Card>
          ) : loadingTickets ? (
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : tickets.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                <Headphones className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Support Tickets</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You haven&apos;t submitted any support tickets yet
                </p>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setActiveTab('contact')}
                >
                  <MessageSquare className="h-4 w-4" />
                  Create a Ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <Card key={ticket.id} className="bg-card border-border">
                  <CardContent className="p-0">
                    {/* Ticket Header - Clickable */}
                    <button
                      className="w-full text-left p-4 sm:p-6 hover:bg-muted/50 transition-colors"
                      onClick={() => handleToggleTicket(ticket.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{ticket.subject}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className={`text-xs gap-1 ${categoryColors[ticket.category] || categoryColors.other}`}>
                              {ticket.category}
                            </Badge>
                            <Badge variant="outline" className={`text-xs gap-1 ${priorityColors[ticket.priority] || priorityColors.medium}`}>
                              {ticket.priority}
                            </Badge>
                            <Badge variant="outline" className={`text-xs gap-1 ${statusColors[ticket.status] || statusColors.open}`}>
                              <StatusIcon status={ticket.status} />
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {expandedTicket === ticket.id ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(ticket.createdAt)}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Ticket Messages */}
                    {expandedTicket === ticket.id && (
                      <div className="border-t border-border">
                        {loadingMessages[ticket.id] ? (
                          <div className="p-6 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="p-4 sm:p-6 space-y-4">
                            {/* Messages */}
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {(ticketMessages[ticket.id] || []).map((msg) => (
                                <div
                                  key={msg.id}
                                  className={`flex gap-3 ${msg.isAdmin ? 'flex-row' : 'flex-row-reverse'}`}
                                >
                                  <div
                                    className={`rounded-lg px-4 py-3 max-w-[80%] ${
                                      msg.isAdmin
                                        ? 'bg-primary/10 border border-primary/20'
                                        : 'bg-muted'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-medium">
                                        {msg.user?.name || 'User'}
                                      </span>
                                      {msg.isAdmin && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                          Support
                                        </Badge>
                                      )}
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatDate(msg.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-sm leading-relaxed">{msg.message}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Reply Form */}
                            {ticket.status !== 'closed' && (
                              <div className="flex gap-2 pt-2 border-t border-border">
                                <Input
                                  value={replyText[ticket.id] || ''}
                                  onChange={(e) =>
                                    setReplyText(prev => ({ ...prev, [ticket.id]: e.target.value }))
                                  }
                                  placeholder="Type your reply..."
                                  className="bg-background flex-1"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleReply(ticket.id);
                                    }
                                  }}
                                />
                                <Button
                                  size="icon"
                                  onClick={() => handleReply(ticket.id)}
                                  disabled={sendingReply[ticket.id] || !(replyText[ticket.id]?.trim())}
                                >
                                  {sendingReply[ticket.id] ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )}

                            {ticket.status === 'closed' && (
                              <p className="text-xs text-muted-foreground text-center pt-2">
                                This ticket is closed. Create a new ticket if you need further assistance.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
