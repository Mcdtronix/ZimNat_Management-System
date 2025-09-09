import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getAuthToken, API_BASE } from "@/lib/api";
import { Link } from "react-router-dom";
import { Bell, BellRing, CheckCircle, Clock, Filter, Mail, MailOpen, MessageSquare, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "quotation" | "status_update" | string;
  payload?: any;
  is_read: boolean;
  created_at: string;
}

const api = async (path: string, init?: RequestInit) => {
  const token = getAuthToken();
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `HTTP ${res.status}`);
  }
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return null;
};

export default function Inbox() {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  
  const { data, isLoading, error } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => api("/api/notifications/"),
    refetchInterval: 30000,
    staleTime: 10000,
  });
  
  const { data: perms } = useQuery({
    queryKey: ["user-permissions"],
    queryFn: async () => api("/api/user-permissions/")
  });
  
  const isUnderwriter = perms?.user_type === "underwriter" || perms?.user_type === "manager";
  
  const { data: unreadCount } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => api("/api/notifications/unread_count/"),
    refetchInterval: 30000,
  });

  const notificationsList = useMemo<Notification[]>(() => {
    let notifications: Notification[] = [];
    if (Array.isArray(data)) {
      notifications = data;
    } else {
      notifications = (data as any)?.results ?? [];
    }

    if (searchQuery) {
      notifications = notifications.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType !== "all") {
      notifications = notifications.filter(n => n.type === filterType);
    }

    if (filterStatus === "unread") {
      notifications = notifications.filter(n => !n.is_read);
    } else if (filterStatus === "read") {
      notifications = notifications.filter(n => n.is_read);
    }

    notifications.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      
      switch (sortBy) {
        case "oldest":
          return dateA - dateB;
        case "unread":
          if (a.is_read !== b.is_read) {
            return a.is_read ? 1 : -1;
          }
          return dateB - dateA;
        case "type":
          if (a.type !== b.type) {
            return a.type.localeCompare(b.type);
          }
          return dateB - dateA;
        default:
          return dateB - dateA;
      }
    });

    return notifications;
  }, [data, searchQuery, filterType, filterStatus, sortBy]);

  const stats = useMemo(() => {
    const all = Array.isArray(data) ? data : (data as any)?.results ?? [];
    return {
      total: all.length,
      unread: all.filter((n: Notification) => !n.is_read).length,
      quotations: all.filter((n: Notification) => n.type === "quotation").length,
      messages: all.filter((n: Notification) => n.type === "message").length,
    };
  }, [data]);

  const markRead = useMutation({
    mutationFn: (id: number) => api(`/api/notifications/${id}/read/`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Notification marked as read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
    onError: (error) => {
      toast.error(`Failed to mark as read: ${error.message}`);
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api("/api/notifications/mark_all_read/", { method: "POST" }),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
    onError: (error) => {
      toast.error(`Failed to mark all as read: ${error.message}`);
    },
  });

  const autoQuote = useMutation({
    mutationFn: (policyId: number) => api(`/api/policies/${policyId}/auto_quote/`, { method: "POST" }),
    onSuccess: () => {
      // Refresh notifications; customer will receive a quotation notification
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const previewAutoQuote = useMutation({
    mutationFn: (policyId: number) => api(`/api/policies/${policyId}/auto_quote/?preview=true`, { method: "POST" }),
  });

  const sendManualMessage = useMutation({
    mutationFn: (args: { policyId: number; title: string; message: string }) =>
      api(`/api/policies/${args.policyId}/message/`, {
        method: "POST",
        body: JSON.stringify({ title: args.title, message: args.message })
      }),
  });

  const acceptQuote = useMutation({
    mutationFn: (quotationId: number) => api(`/api/quotations/${quotationId}/accept/`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const declineQuote = useMutation({
    mutationFn: (quotationId: number) => api(`/api/quotations/${quotationId}/decline/`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // Dialog state per individual message
  const [openId, setOpenId] = useState<number | null>(null);
  const [manualTitle, setManualTitle] = useState<string>("Message from Underwriter");
  const [manualBody, setManualBody] = useState<string>("");
  const selected = notificationsList.find(n => n.id === openId) || null;

  // Assessor message state
  const [assessorName, setAssessorName] = useState<string>("");
  const [assessorPhone, setAssessorPhone] = useState<string>("");
  const [visitDate, setVisitDate] = useState<string>("");

  const sendAssessor = useMutation({
    mutationFn: async (args: { claimId: number; assessor_name: string; assessor_phone?: string; visit_date: string; message?: string }) =>
      api(`/api/claims/${args.claimId}/assessor_message/`, {
        method: "POST",
        body: JSON.stringify({
          assessor_name: args.assessor_name,
          assessor_phone: args.assessor_phone,
          visit_date: args.visit_date,
          message: args.message ?? "",
        })
      }),
    onSuccess: () => {
      setAssessorName("");
      setAssessorPhone("");
      setVisitDate("");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  async function downloadQuote(policyId: number, fmt: 'pdf' | 'xlsx', preview = false) {
    const token = getAuthToken();
    const url = `${API_BASE}/api/policies/${policyId}/export_quote/?format=${fmt}${preview ? '&preview=true' : ''}`;
    const res = await fetch(url, {
      headers: {
        "Authorization": token ? `Bearer ${token}` : "",
      }
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Failed to export');
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    const href = window.URL.createObjectURL(blob);
    a.href = href;
    const ext = fmt === 'pdf' ? 'pdf' : 'xlsx';
    a.download = `quotation_${policyId}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(href);
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quotation':
        return <Bell className="h-4 w-4" />;
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'status_update':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [qc]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Failed to load notifications: {error.message}</p>
              <Button 
                onClick={() => qc.invalidateQueries({ queryKey: ["notifications"] })} 
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BellRing className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Inbox</h1>
            {stats.unread > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.unread} unread
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {stats.unread > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => qc.invalidateQueries({ queryKey: ["notifications"] })}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unread</p>
                  <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
                </div>
                <MailOpen className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Quotations</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.quotations}</p>
                </div>
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Messages</p>
                  <p className="text-2xl font-bold text-green-600">{stats.messages}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="quotation">Quotations</SelectItem>
                  <SelectItem value="message">Messages</SelectItem>
                  <SelectItem value="status_update">Status Updates</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="unread">Unread First</SelectItem>
                  <SelectItem value="type">By Type</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Notifications ({notificationsList.length})</span>
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {notificationsList.map((n, index) => (
                <div key={n.id}>
                  <div 
                    className={`flex items-start justify-between gap-4 border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                      !n.is_read ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`} 
                    onClick={() => setOpenId(n.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getTypeIcon(n.type)}
                        <span className={`font-semibold ${!n.is_read ? 'text-blue-900' : ''}`}>{n.title}</span>
                        <Badge variant={n.type === "quotation" ? "default" : "secondary"} className="capitalize">
                          {n.type.replace('_', ' ')}
                        </Badge>
                        {!n.is_read && <Badge variant="destructive">New</Badge>}
                        <span className="text-xs text-muted-foreground ml-auto">{formatDate(n.created_at)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{n.message}</div>
                      {n.type === "quotation" && (
                        <div className="mt-2 text-sm space-y-1">
                          <div>
                            <span className="font-medium">Policy:</span> {n.payload?.policy_number}
                          </div>
                          <div className="flex gap-4">
                            <div><span className="font-medium">Premium:</span> {n.payload?.currency || 'USD'} {n.payload?.premium_amount}</div>
                            <div><span className="font-medium">Cover:</span> {n.payload?.currency || 'USD'} {n.payload?.coverage_amount}</div>
                          </div>
                          {n.payload?.terms && (
                            <div className="text-muted-foreground"><span className="font-medium text-foreground">Terms:</span> {n.payload.terms}</div>
                          )}
                          {n.payload?.bank_details && (
                            <div className="text-muted-foreground">
                              <span className="font-medium text-foreground">Bank details:</span> {n.payload.bank_details.bank} • {n.payload.bank_details.account_number} • {n.payload.bank_details.branch}
                            </div>
                          )}
                          <div className="pt-1">
                            {typeof n.payload?.quotation_id === 'number' && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); acceptQuote.mutate(n.payload.quotation_id); }} disabled={acceptQuote.isPending}>Accept</Button>
                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); declineQuote.mutate(n.payload.quotation_id); }} disabled={declineQuote.isPending}>Decline</Button>
                                {n.payload?.payment_url && (
                                  <Link to={n.payload.payment_url}>
                                    <Button size="sm" variant="secondary">Pay Online</Button>
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {!n.is_read && (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }} disabled={markRead.isPending}>Mark read</Button>
                    )}
                  </div>
                  {index < notificationsList.length - 1 && <Separator />}
                </div>
              ))}
              {!notificationsList.length && (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No notifications found</p>
                  {(searchQuery || filterType !== "all" || filterStatus !== "all") && (
                    <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail dialog per message */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setOpenId(null); setManualBody(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.title}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">{selected.message}</div>

              {/* Claim documents listing if provided */}
              {selected.type === 'message' && Array.isArray(selected.payload?.documents) && selected.payload.documents.length > 0 && (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="font-medium">Claim documents</div>
                  <div className="text-xs text-muted-foreground">Claim Ref: {selected.payload?.claim_ref || selected.payload?.claim_id}</div>
                  <div className="space-y-1">
                    {selected.payload.documents.map((d: any) => (
                      <div key={d.id} className="text-sm">
                        <span className="mr-2 capitalize">{String(d.type).replace('_', ' ')}:</span>
                        {d.url ? (
                          <a className="text-primary underline" href={d.url} target="_blank" rel="noreferrer">Open</a>
                        ) : (
                          <span className="text-muted-foreground">(no link)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto-calc area for pending policy applications */}
              {isUnderwriter && selected.type === 'status_update' && selected.payload?.policy_id && selected.payload?.status === 'pending' && (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="font-medium">Auto calculate subscription</div>
                  <div className="text-xs text-muted-foreground">Preview calculation before sending a quotation to the customer. Sending is enabled after preview.</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); previewAutoQuote.mutate(selected.payload.policy_id); }} disabled={previewAutoQuote.isPending}>
                      {previewAutoQuote.isPending ? 'Previewing…' : 'Preview calculation'}
                    </Button>
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); autoQuote.mutate(selected.payload.policy_id); }} disabled={autoQuote.isPending || !previewAutoQuote.data}>
                      {autoQuote.isPending ? 'Sending…' : 'Send quotation'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); downloadQuote(selected.payload.policy_id, 'pdf', true).catch(console.error); }} disabled={!previewAutoQuote.data}>
                      Export PDF (preview)
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); downloadQuote(selected.payload.policy_id, 'xlsx', true).catch(console.error); }} disabled={!previewAutoQuote.data}>
                      Export Excel (preview)
                    </Button>
                  </div>
                  {previewAutoQuote.data && (
                    <div className="text-sm grid grid-cols-2 gap-x-6 gap-y-1 pt-2">
                      <div><span className="text-muted-foreground">Annual premium:</span> USD {previewAutoQuote.data.annual_premium}</div>
                      <div><span className="text-muted-foreground">Termly premium:</span> USD {previewAutoQuote.data.termly_premium}</div>
                      <div><span className="text-muted-foreground">Sum insured:</span> USD {previewAutoQuote.data.coverage_amount}</div>
                      <div className="col-span-2 text-muted-foreground">{previewAutoQuote.data.terms}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual message compose for underwriter */}
              {isUnderwriter && selected.payload?.policy_id && (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="font-medium">Manual message to customer</div>
                  <Input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="Title" />
                  <Textarea value={manualBody} onChange={(e) => setManualBody(e.target.value)} placeholder="Write your message..." rows={4} />
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); sendManualMessage.mutate({ policyId: selected.payload.policy_id, title: manualTitle, message: manualBody }); }} disabled={sendManualMessage.isPending || !manualBody.trim()}>
                      {sendManualMessage.isPending ? 'Sending…' : 'Send message'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Assessor visit compose for underwriter on claim notifications */}
              {isUnderwriter && selected.payload?.claim_id && (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="font-medium">Send assessor visit details</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input value={assessorName} onChange={(e) => setAssessorName(e.target.value)} placeholder="Assessor name" />
                    <Input value={assessorPhone} onChange={(e) => setAssessorPhone(e.target.value)} placeholder="Assessor phone (optional)" />
                    <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} placeholder="Visit date" />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); if (selected?.payload?.claim_id) { sendAssessor.mutate({ claimId: selected.payload.claim_id, assessor_name: assessorName, assessor_phone: assessorPhone || undefined, visit_date: visitDate, message: manualBody || undefined }); } }} disabled={sendAssessor.isPending || !assessorName.trim() || !visitDate}>
                      {sendAssessor.isPending ? 'Sending…' : 'Send assessor message'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Quotation details if this is a quotation notification */}
              {selected.type === 'quotation' && (
                <div className="rounded-md border p-3 space-y-1 text-sm">
                  <div><span className="font-medium">Policy:</span> {selected.payload?.policy_number}</div>
                  <div className="flex gap-6">
                    <div><span className="text-muted-foreground">Premium:</span> {selected.payload?.currency || 'USD'} {selected.payload?.premium_amount}</div>
                    <div><span className="text-muted-foreground">Cover:</span> {selected.payload?.currency || 'USD'} {selected.payload?.coverage_amount}</div>
                  </div>
                  {selected.payload?.terms && <div className="text-muted-foreground">{selected.payload.terms}</div>}
                  {isUnderwriter && selected.payload?.policy_id && (
                    <div className="pt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => downloadQuote(selected.payload.policy_id, 'pdf', false).catch(console.error)}>Export PDF</Button>
                      <Button size="sm" variant="outline" onClick={() => downloadQuote(selected.payload.policy_id, 'xlsx', false).catch(console.error)}>Export Excel</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selected && !selected.is_read && (
              <Button size="sm" onClick={() => markRead.mutate(selected.id)} disabled={markRead.isPending}>Mark read</Button>
            )}
            <Button variant="outline" onClick={() => setOpenId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
