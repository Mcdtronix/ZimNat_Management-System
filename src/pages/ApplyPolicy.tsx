import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/api";

interface Vehicle { id: number; vehicle_number: string; }
interface Coverage { id: number; name: string; display_name?: string; is_active?: boolean; }
interface Policy { id: number; vehicle: number; coverage: number; status: string; start_date: string; end_date: string; }

function normalizeList<T = any>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.results)) return data.results as T[];
  if (Array.isArray(data?.items)) return data.items as T[];
  if (Array.isArray(data?.vehicles)) return data.vehicles as T[];
  if (Array.isArray(data?.coverages)) return data.coverages as T[];
  return [];
}

const API_BASE = import.meta.env.VITE_BACKEND_URL || "https://zimnat.pythonanywhere.com/";

const api = async (path: string, init?: RequestInit) => {
  const token = getAuthToken();
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let message = "Failed to apply";
    try {
      const data = ct.includes("application/json") ? await res.json() : await res.text();
      if (typeof data === "string") {
        message = data;
      } else if (data) {
        // Try common DRF error shapes
        if (typeof data.detail === "string") message = data.detail;
        else if (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) message = data.non_field_errors[0];
        else if (Array.isArray(data.__all__) && data.__all__[0]) message = data.__all__[0];
        else {
          const firstKey = Object.keys(data)[0];
          const firstVal = (firstKey && data[firstKey]) || "";
          if (Array.isArray(firstVal) && firstVal[0]) message = firstVal[0];
          else if (typeof firstVal === "string") message = firstVal;
        }
      }
    } catch (_) {
      // ignore parse errors, use default message
    }
    throw new Error(String(message));
  }
  if (ct.includes("application/json")) return res.json();
  return null;
};

export default function ApplyPolicy() {
  const nav = useNavigate();
  const params = new URLSearchParams(useLocation().search);
  const vehicleId = Number(params.get("vehicle"));

  const { data: vehiclesRaw } = useQuery<any>({ queryKey: ["vehicles"], queryFn: () => api("/api/vehicles/") });
  const { data: coveragesRaw } = useQuery<any>({ queryKey: ["coverages"], queryFn: () => api("/api/insurance-coverages/") });
  const { data: policiesRaw } = useQuery<any>({ queryKey: ["policies"], queryFn: () => api("/api/policies/") });

  const [vehicle, setVehicle] = useState<number | undefined>(vehicleId || undefined);
  const [coverage, setCoverage] = useState<number | undefined>(undefined);
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!vehicle || !coverage || !start || !end) throw new Error("All fields are required");
      await api("/api/policies/", { method: "POST", body: JSON.stringify({ vehicle, coverage, start_date: start, end_date: end }) });
    },
    onSuccess: () => { toast.success("Policy application submitted"); nav("/policies"); },
    onError: (e: any) => {
      const msg = String(e?.message || "Failed to apply");
      // If it's our business rule message from backend, show as a non-error notice
      if (msg.startsWith("An active/pending") && msg.includes("policy already exists for this vehicle")) {
        toast.warning(msg);
      } else {
        toast.error(msg);
      }
    },
  });

  const vehicleOptions = useMemo(() => normalizeList<Vehicle>(vehiclesRaw).map(v => ({ value: String(v.id), label: v.vehicle_number })), [vehiclesRaw]);
  const coverageOptions = useMemo(() => {
    const covs = normalizeList<Coverage>(coveragesRaw).filter(c => c.is_active !== false);
    const policies = normalizeList<Policy>(policiesRaw);
    // Determine which coverages are blocked due to active/pending policy on same vehicle
    const blocked = new Set<number>();
    if (vehicle) {
      const selectedStart = start ? new Date(start) : null;
      const selectedEnd = end ? new Date(end) : null;
      const byVehicle = policies.filter(p => p.vehicle === vehicle && (p.status === 'active' || p.status === 'pending'));
      for (const p of byVehicle) {
        const pStart = new Date(p.start_date);
        const pEnd = new Date(p.end_date);
        // If dates not chosen yet, be conservative: block same-coverage selection
        if (!selectedStart || !selectedEnd) {
          blocked.add(p.coverage);
          continue;
        }
        // Check overlap: p.start <= selectedEnd && p.end >= selectedStart
        if (pStart <= selectedEnd && pEnd >= selectedStart) blocked.add(p.coverage);
      }
    }
    return covs.map(c => ({ value: String(c.id), label: c.display_name || c.name, disabled: blocked.has(c.id) }));
  }, [coveragesRaw, policiesRaw, vehicle, start, end]);

  return (
    <div className="p-6">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Apply for Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Vehicle</Label>
              <Select value={vehicle ? String(vehicle) : undefined} onValueChange={(v) => setVehicle(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicleOptions.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Coverage</Label>
              <Select value={coverage ? String(coverage) : undefined} onValueChange={(v) => setCoverage(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select coverage" /></SelectTrigger>
                <SelectContent>
                  {coverageOptions.map(c => (
                    <SelectItem key={c.value} value={c.value} disabled={(c as any).disabled}>
                      {c.label}{(c as any).disabled ? " (already active/pending)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>Apply</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
