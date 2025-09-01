import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/api";

interface Policy {
  id: number;
  policy_number: string;
  customer: number;
  vehicle: number;
  coverage: number;
  premium_amount?: string;
  coverage_amount?: string;
  start_date?: string;
  end_date?: string;
  status: string;
}

interface Vehicle { id: number; vehicle_number: string }
interface Coverage { id: number; name: string; display_name?: string }
interface Quotation { id: number; quote_id: string; policy: number; premium_amount: string; coverage_amount: string; currency: string; status: string; payment_url?: string }
interface Claim { id: number; claim_id: string; policy: number; status: string; approval_status: string; estimated_amount?: string; approved_amount?: string; created_at?: string }

interface Permissions { user_type: string; can_manage_claims?: boolean; can_manage_policies?: boolean }

const api = async (path: string, init?: RequestInit) => {
  const token = getAuthToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) return res.json();
  return null;
};

function normalize<T = any>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.results ?? [];
}

export default function PolicyDetails() {
  const { id } = useParams<{ id: string }>();
  const policyId = Number(id);
  const qc = useQueryClient();

  const { data: perms } = useQuery<Permissions>({ queryKey: ["perms"], queryFn: () => api("/api/user-permissions/") });
  const isUW = perms?.user_type === "underwriter" || perms?.user_type === "manager";

  const { data: policy } = useQuery<Policy>({ queryKey: ["policy", policyId], queryFn: () => api(`/api/policies/${policyId}/`) });
  const { data: vehiclesRaw } = useQuery<Vehicle[]>({ queryKey: ["vehicles"], queryFn: () => api("/api/vehicles/") });
  const { data: coveragesRaw } = useQuery<Coverage[]>({ queryKey: ["coverages"], queryFn: () => api("/api/insurance-coverages/") });
  const { data: quotesRaw } = useQuery<Quotation[]>({ queryKey: ["quotations", policyId], queryFn: () => api(`/api/quotations/?policy=${policyId}`) });

  const vehicles = useMemo(() => normalize<Vehicle>(vehiclesRaw), [vehiclesRaw]);
  const coverages = useMemo(() => normalize<Coverage>(coveragesRaw), [coveragesRaw]);
  const quotes = useMemo(() => normalize<Quotation>(quotesRaw), [quotesRaw]);

  // Claims: fetch by customer then filter by this policy id (API lacks direct policy filter)
  const customerId = policy?.customer;
  const { data: claimsRaw, enabled: claimsEnabled } = useQuery<any>({
    queryKey: ["claims", customerId],
    queryFn: () => api(`/api/claims/?policy__customer=${customerId}`),
    enabled: !!customerId,
  });
  const claimsAll = useMemo(() => normalize<Claim>(claimsRaw), [claimsRaw]);
  const claims = useMemo(() => claimsAll.filter(c => c.policy === policyId), [claimsAll, policyId]);

  // UW: create quote
  const [premium, setPremium] = useState("");
  const [coverageAmt, setCoverageAmt] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [terms, setTerms] = useState("");

  const createQuote = useMutation({
    mutationFn: async () => {
      if (!premium || !coverageAmt) throw new Error("premium_amount and coverage_amount are required");
      const body = { premium_amount: premium, coverage_amount: coverageAmt, currency, ...(terms ? { terms } : {}) };
      return api(`/api/policies/${policyId}/quote/`, { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      toast.success("Quotation created");
      setPremium(""); setCoverageAmt(""); setTerms("");
      qc.invalidateQueries({ queryKey: ["quotations", policyId] });
      qc.invalidateQueries({ queryKey: ["policies"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create quotation"),
  });

  // UW: process claim
  const processClaim = useMutation({
    mutationFn: async (payload: { id: number; action: "approve" | "reject"; approved_amount?: string }) => {
      const body: any = { action: payload.action };
      if (payload.approved_amount) body.approved_amount = payload.approved_amount;
      return api(`/api/claims/${payload.id}/process_claim/`, { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => { toast.success("Claim processed"); qc.invalidateQueries({ queryKey: ["claims", customerId] }); },
    onError: (e: any) => toast.error(e?.message || "Failed to process claim"),
  });

  // Pre-fill currency from latest quote
  useEffect(() => {
    if (quotes.length && !premium && !coverageAmt) {
      setCurrency(quotes[0].currency || "USD");
    }
  }, [quotes, premium, coverageAmt]);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Policy Details</CardTitle>
        </CardHeader>
        <CardContent>
          {!policy ? (
            <div>Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Policy #</div>
                <div className="font-medium">{policy.policy_number}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Vehicle</div>
                <div className="font-medium">{vehicles.find(v => v.id === policy.vehicle)?.vehicle_number || policy.vehicle}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Coverage</div>
                <div className="font-medium">{coverages.find(c => c.id === policy.coverage)?.display_name || coverages.find(c => c.id === policy.coverage)?.name || policy.coverage}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div><Badge className="capitalize">{policy.status}</Badge></div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Premium / Cover</div>
                <div className="font-medium">{policy.premium_amount || "-"} / {policy.coverage_amount || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Period</div>
                <div className="font-medium">{policy.start_date ? `${policy.start_date} → ${policy.end_date}` : "-"}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isUW && (
        <Card>
          <CardHeader>
            <CardTitle>Create Quotation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <Label>Premium</Label>
                <Input type="number" value={premium} onChange={(e) => setPremium(e.target.value)} placeholder="e.g. 120.00" />
              </div>
              <div>
                <Label>Coverage</Label>
                <Input type="number" value={coverageAmt} onChange={(e) => setCoverageAmt(e.target.value)} placeholder="e.g. 5000.00" />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue placeholder="Currency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="ZWL">ZWL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Terms (optional)</Label>
                <Input value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Custom terms" />
              </div>
            </div>
            <div className="mt-3">
              <Button onClick={() => createQuote.mutate()} disabled={createQuote.isPending}>Create Quote</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote ID</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map(q => (
                <TableRow key={q.id}>
                  <TableCell>{q.quote_id}</TableCell>
                  <TableCell>{q.premium_amount}</TableCell>
                  <TableCell>{q.coverage_amount}</TableCell>
                  <TableCell>{q.currency}</TableCell>
                  <TableCell className="capitalize">{q.status}</TableCell>
                  <TableCell>
                    {q.payment_url ? (
                      <Link to={q.payment_url}><Button size="sm">Pay</Button></Link>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Claims</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Estimated</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.claim_id}</TableCell>
                  <TableCell className="capitalize">{c.status}</TableCell>
                  <TableCell className="capitalize">{c.approval_status}</TableCell>
                  <TableCell>{c.estimated_amount || "-"}</TableCell>
                  <TableCell>{c.approved_amount || "-"}</TableCell>
                  <TableCell>
                    {isUW ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => processClaim.mutate({ id: c.id, action: "approve" })}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => processClaim.mutate({ id: c.id, action: "reject" })}>Reject</Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
