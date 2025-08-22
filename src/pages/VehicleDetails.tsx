import { useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/api";

const api = async (path: string) => {
  const token = getAuthToken();
  const res = await fetch(path, { headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

function normalize<T = any>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.results)) return data.results as T[];
  return [];
}

export default function VehicleDetails() {
  const { id } = useParams();
  const vehicleId = Number(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";
  const typeFilter = searchParams.get("type") || "all";
  const sortBy = searchParams.get("sort") || "latest"; // latest | status

  const { data: vehicleRaw } = useQuery({ queryKey: ["vehicle", vehicleId], queryFn: () => api(`/api/vehicles/${vehicleId}/`) });
  const { data: policiesRaw } = useQuery({ queryKey: ["vehicle-policies", vehicleId], queryFn: () => api(`/api/policies/?vehicle=${vehicleId}`) });
  const { data: coveragesRaw } = useQuery({ queryKey: ["coverages"], queryFn: () => api(`/api/insurance-coverages/`) });

  const vehicle = vehicleRaw; // detail endpoint returns an object
  const policies = useMemo(() => normalize<any>(policiesRaw), [policiesRaw]);
  const coverages = useMemo(() => normalize<any>(coveragesRaw), [coveragesRaw]);

  const coverageMap = useMemo(() => {
    const map = new Map<number, any>();
    coverages.forEach((c: any) => map.set(c.id, c));
    return map;
  }, [coverages]);

  // derive unique statuses and types for filters
  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    policies.forEach((p: any) => p.status && set.add(p.status));
    return Array.from(set);
  }, [policies]);
  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    policies.forEach((p: any) => {
      const covId = typeof p.coverage === 'object' ? p.coverage?.id : p.coverage;
      const cov = covId ? coverageMap.get(covId) : undefined;
      const label = cov?.display_name || cov?.name || String(covId || '-');
      if (label) set.add(label);
    });
    return Array.from(set);
  }, [policies, coverageMap]);

  const filtered = useMemo(() => {
    let list = policies.map((p: any) => {
      const covId = typeof p.coverage === 'object' ? p.coverage?.id : p.coverage;
      const cov = covId ? coverageMap.get(covId) : undefined;
      return {
        id: p.id,
        policyNumber: p.policy_number || `POL-${p.id}`,
        status: p.status || '-',
        start: p.start_date ? new Date(p.start_date) : undefined,
        end: p.end_date ? new Date(p.end_date) : undefined,
        typeLabel: cov?.display_name || cov?.name || String(covId || '-')
      };
    });
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    if (typeFilter !== 'all') list = list.filter(p => p.typeLabel === typeFilter);
    if (sortBy === 'latest') list.sort((a, b) => (b.start?.getTime() || 0) - (a.start?.getTime() || 0));
    if (sortBy === 'status') list.sort((a, b) => a.status.localeCompare(b.status));
    return list;
  }, [policies, coverageMap, statusFilter, typeFilter, sortBy]);

  // counts for badges
  const counts = useMemo(() => {
    const byStatus = new Map<string, number>();
    const byType = new Map<string, number>();
    policies.forEach((p: any) => {
      const s = p.status || '-';
      byStatus.set(s, (byStatus.get(s) || 0) + 1);
      const covId = typeof p.coverage === 'object' ? p.coverage?.id : p.coverage;
      const cov = covId ? coverageMap.get(covId) : undefined;
      const label = cov?.display_name || cov?.name || String(covId || '-');
      byType.set(label, (byType.get(label) || 0) + 1);
    });
    return { byStatus, byType };
  }, [policies, coverageMap]);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v === 'all' && (k === 'status' || k === 'type')) next.delete(k); else next.set(k, v);
    if (k === 'sort' && v === 'latest') next.delete('sort');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vehicle Details</h1>
          <p className="text-sm text-muted-foreground">Vehicle ID: {vehicleId}{vehicle?.vehicle_number ? ` • ${vehicle.vehicle_number}` : ''}</p>
        </div>
        <div className="space-x-2">
          <Link to="/underwriter?tab=vehicles"><Button variant="outline">Back to Vehicles</Button></Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <Select value={statusFilter} onValueChange={(v) => setParam('status', v)}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {statusOptions.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type</span>
              <Select value={typeFilter} onValueChange={(v) => setParam('type', v)}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {typeOptions.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort</span>
              <Select value={sortBy} onValueChange={(v) => setParam('sort', v)}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Latest" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest date</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {Array.from(counts.byStatus.entries()).map(([s, n]) => (
              <Badge key={s} variant={s === 'active' ? 'default' : s === 'pending' ? 'secondary' : 'destructive'} className="capitalize">{s}: {n}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(counts.byType.entries()).map(([t, n]) => (
              <Badge key={t} variant="outline">{t}: {n}</Badge>
            ))}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.policyNumber}</TableCell>
                    <TableCell>{p.typeLabel}</TableCell>
                    <TableCell>{p.start ? `${p.start.toISOString().slice(0,10)} → ${p.end?.toISOString().slice(0,10) || '-'}` : '-'}</TableCell>
                    <TableCell className="capitalize">{p.status}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">No policies match the current filters.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
