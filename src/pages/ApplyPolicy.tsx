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

function normalizeList<T = any>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.results)) return data.results as T[];
  if (Array.isArray(data?.items)) return data.items as T[];
  if (Array.isArray(data?.vehicles)) return data.vehicles as T[];
  if (Array.isArray(data?.coverages)) return data.coverages as T[];
  return [];
}

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

export default function ApplyPolicy() {
  const nav = useNavigate();
  const params = new URLSearchParams(useLocation().search);
  const vehicleId = Number(params.get("vehicle"));

  const { data: vehiclesRaw } = useQuery<any>({ queryKey: ["vehicles"], queryFn: () => api("/api/vehicles/") });
  const { data: coveragesRaw } = useQuery<any>({ queryKey: ["coverages"], queryFn: () => api("/api/insurance-coverages/") });

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
    onError: (e: any) => toast.error(e?.message || "Failed to apply"),
  });

  const vehicleOptions = useMemo(() => normalizeList<Vehicle>(vehiclesRaw).map(v => ({ value: String(v.id), label: v.vehicle_number })), [vehiclesRaw]);
  const coverageOptions = useMemo(
    () => normalizeList<Coverage>(coveragesRaw)
      .filter(c => c.is_active !== false)
      .map(c => ({ value: String(c.id), label: c.display_name || c.name })),
    [coveragesRaw]
  );

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
                  {coverageOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
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
