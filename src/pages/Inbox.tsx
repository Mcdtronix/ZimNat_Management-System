import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAuthToken, API_BASE } from "@/lib/api";
import { Link } from "react-router-dom";

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
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export default function Inbox() {
  const qc = useQueryClient();
  const { data } = useQuery<Notification[]>({ queryKey: ["notifications"], queryFn: () => api("/api/notifications/") });
  const { data: perms } = useQuery({
    queryKey: ["user-permissions"],
    queryFn: async () => api("/api/user-permissions/")
  });
  const isUnderwriter = perms?.user_type === "underwriter" || perms?.user_type === "manager";

  // Normalize to array in case backend returns a paginated object
  const notificationsList = useMemo<Notification[]>(() => {
    if (Array.isArray(data)) return data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any)?.results ?? [];
  }, [data]);

  const markRead = useMutation({
    mutationFn: (id: number) => api(`/api/notifications/${id}/read/`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
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

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationsList.map(n => (
            <div key={n.id} className="flex items-start justify-between gap-4 border rounded-md p-3 cursor-pointer" onClick={() => setOpenId(n.id)}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{n.title}</span>
                  <Badge variant={n.type === "quotation" ? "default" : "secondary"} className="capitalize">{n.type}</Badge>
                  {!n.is_read && <Badge variant="destructive">New</Badge>}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{n.message}</div>
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
                          <Button size="sm" variant="default" onClick={() => acceptQuote.mutate(n.payload.quotation_id)} disabled={acceptQuote.isPending}>Accept</Button>
                          <Button size="sm" variant="outline" onClick={() => declineQuote.mutate(n.payload.quotation_id)} disabled={declineQuote.isPending}>Decline</Button>
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
                <Button size="sm" onClick={() => markRead.mutate(n.id)} disabled={markRead.isPending}>Mark read</Button>
              )}
            </div>
          ))}
          {!notificationsList.length && <div className="text-sm text-muted-foreground">No notifications.</div>}
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
