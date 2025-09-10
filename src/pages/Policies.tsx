import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuthToken } from "@/lib/api";

interface Policy {
  id: number;
  policy_number: string;
  vehicle: number;
  coverage: number;
  premium_amount?: string;
  coverage_amount?: string;
  start_date?: string;
  end_date?: string;
  status: "pending" | "active" | "cancelled" | string;
}

interface VehicleCategory { id: number; name: string; }
interface Vehicle { id: number; vehicle_number: string; category: number; }
interface Coverage { id: number; name: string; }

const API_BASE = import.meta.env.VITE_BACKEND_URL || "https://zimnat.pythonanywhere.com/";

const api = async (path: string) => {
  const token = getAuthToken();
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

const statusVariant = (s: string) => {
  if (s === "active") return "default" as const;
  if (s === "pending") return "secondary" as const;
  return "destructive" as const;
};

export default function Policies() {
  const { data: policies } = useQuery<Policy[]>({ queryKey: ["policies"], queryFn: () => api("/api/policies/") });
  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["vehicles"], queryFn: () => api("/api/vehicles/") });
  const { data: coverages } = useQuery<Coverage[]>({ queryKey: ["coverages"], queryFn: () => api("/api/insurance-coverages/") });
  // Permissions to detect underwriter/manager for title and scope awareness
  const { data: perms } = useQuery({
    queryKey: ["user-permissions"],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/user-permissions/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Failed to load permissions");
      return res.json();
    },
  });
  const isUnderwriter = perms?.user_type === "underwriter" || perms?.user_type === "manager";

  // Normalize potential paginated responses into arrays
  const policiesList = useMemo<Policy[]>(() => {
    if (Array.isArray(policies)) return policies;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (policies as any)?.results ?? [];
  }, [policies]);

  const vehiclesList = useMemo<Vehicle[]>(() => {
    if (Array.isArray(vehicles)) return vehicles;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (vehicles as any)?.results ?? [];
  }, [vehicles]);

  const coveragesList = useMemo<Coverage[]>(() => {
    if (Array.isArray(coverages)) return coverages;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (coverages as any)?.results ?? [];
  }, [coverages]);

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>{isUnderwriter ? "Company Policies" : "My Policies"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy #</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policiesList.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{p.policy_number}</TableCell>
                  <TableCell>{vehiclesList.find(v => v.id === p.vehicle)?.vehicle_number || p.vehicle}</TableCell>
                  <TableCell>{coveragesList.find(c => c.id === p.coverage)?.name || p.coverage}</TableCell>
                  <TableCell>{p.premium_amount ? `$${p.premium_amount}` : "-"}</TableCell>
                  <TableCell>{p.start_date ? `${p.start_date} → ${p.end_date}` : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(p.status)} className="capitalize">{p.status}</Badge>
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
