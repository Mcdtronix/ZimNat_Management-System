import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAuthToken } from "@/lib/api";
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

  // Normalize to array in case backend returns a paginated object
  const notificationsList = useMemo<Notification[]>(() => {
    if (Array.isArray(data)) return data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any)?.results ?? [];
  }, [data]);

  const markRead = useMutation({
    mutationFn: (id: number) => api(`/api/notifications/${id}/read/`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const acceptQuote = useMutation({
    mutationFn: (quotationId: number) => api(`/api/quotations/${quotationId}/accept/`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const declineQuote = useMutation({
    mutationFn: (quotationId: number) => api(`/api/quotations/${quotationId}/decline/`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationsList.map(n => (
            <div key={n.id} className="flex items-start justify-between gap-4 border rounded-md p-3">
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
    </div>
  );
}
