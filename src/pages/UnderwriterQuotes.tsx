import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/api";
import { Link } from "react-router-dom";

interface Policy {
  id: number;
  policy_number: string;
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

export default function UnderwriterQuotes() {
  const qc = useQueryClient();

  const { data: pendingPoliciesRaw, isLoading } = useQuery<Policy[]>({
    queryKey: ["policies", "pending"],
    queryFn: () => api(`/api/policies/?status=pending`),
  });
  const { data: vehiclesRaw } = useQuery<Vehicle[]>({ queryKey: ["vehicles"], queryFn: () => api("/api/vehicles/") });
  const { data: coveragesRaw } = useQuery<Coverage[]>({ queryKey: ["coverages"], queryFn: () => api("/api/insurance-coverages/") });

  const pendingPolicies = useMemo(() => normalize<Policy>(pendingPoliciesRaw), [pendingPoliciesRaw]);
  const vehicles = useMemo(() => normalize<Vehicle>(vehiclesRaw), [vehiclesRaw]);
  const coverages = useMemo(() => normalize<Coverage>(coveragesRaw), [coveragesRaw]);

  const [selectedPolicy, setSelectedPolicy] = useState<number | null>(null);
  const [premium, setPremium] = useState<string>("");
  const [coverageAmt, setCoverageAmt] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [terms, setTerms] = useState<string>("");

  const quoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPolicy) throw new Error("Select a policy");
      if (!premium || !coverageAmt) throw new Error("premium_amount and coverage_amount are required");
      const body = { premium_amount: premium, coverage_amount: coverageAmt, currency, ...(terms ? { terms } : {}) };
      return api(`/api/policies/${selectedPolicy}/quote/`, { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      toast.success("Quotation created and customer notified");
      setPremium("");
      setCoverageAmt("");
      setTerms("");
      qc.invalidateQueries({ queryKey: ["policies", "pending"] });
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create quotation"),
  });

  const { data: quotationsRaw } = useQuery<any>({
    queryKey: ["quotations"],
    queryFn: () => api(`/api/quotations/`),
  });
  const quotations = useMemo(() => normalize<any>(quotationsRaw), [quotationsRaw]);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Quote for Pending Policies</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Policy #</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPolicies.map((p) => (
                      <TableRow key={p.id} className={selectedPolicy === p.id ? "bg-muted/50" : undefined}>
                        <TableCell>{p.policy_number}</TableCell>
                        <TableCell>{vehicles.find(v => v.id === p.vehicle)?.vehicle_number || p.vehicle}</TableCell>
                        <TableCell>{coverages.find(c => c.id === p.coverage)?.display_name || coverages.find(c => c.id === p.coverage)?.name || p.coverage}</TableCell>
                        <TableCell className="capitalize">{p.status}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant={selectedPolicy === p.id ? "secondary" : "outline"} onClick={() => setSelectedPolicy(p.id)}>
                              {selectedPolicy === p.id ? "Selected" : "Select"}
                            </Button>
                            <Link to={`/policies/${p.id}`}>
                              <Button size="sm">Details</Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Selected Policy</Label>
                  <Input value={selectedPolicy ? String(selectedPolicy) : ""} readOnly placeholder="Select from table" />
                </div>
                <div>
                  <Label>Premium Amount</Label>
                  <Input type="number" value={premium} onChange={(e) => setPremium(e.target.value)} placeholder="e.g. 120.00" />
                </div>
                <div>
                  <Label>Coverage Amount</Label>
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
                <div>
                  <Label>Terms (optional)</Label>
                  <Input value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Custom terms" />
                </div>
                <Button onClick={() => quoteMutation.mutate()} disabled={quoteMutation.isPending || !selectedPolicy}>Create Quotation</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote ID</TableHead>
                <TableHead>Policy #</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((q: any) => (
                <TableRow key={q.id}>
                  <TableCell>{q.quote_id}</TableCell>
                  <TableCell>{q.policy}</TableCell>
                  <TableCell>{q.premium_amount}</TableCell>
                  <TableCell>{q.coverage_amount}</TableCell>
                  <TableCell>{q.currency}</TableCell>
                  <TableCell className="capitalize">{q.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
