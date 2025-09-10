import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { getAuthToken } from "@/lib/api";

interface Claim {
  id: number;
  claim_id: string;
  policy: number;
  incident_date: string;
  description: string;
  estimated_amount: string;
  approved_amount?: string | null;
  status: "submitted" | "under_review" | "approved" | "rejected" | "settled" | string;
  approval_status: "pending" | "approve" | "reject" | string;
  vehicle_number?: string | null;
  created_at: string;
}

const API_BASE = import.meta.env.VITE_BACKEND_URL || "https://zimnat.pythonanywhere.com/";

const api = async (path: string) => {
  const token = getAuthToken();
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

const statusVariant = (s: string) => {
  switch (s) {
    case "approved":
    case "approve":
      return "default" as const;
    case "rejected":
    case "reject":
      return "destructive" as const;
    case "submitted":
    case "pending":
    default:
      return "secondary" as const;
  }
};

export default function Claims() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery<Claim[]>({ queryKey: ["claims"], queryFn: () => api("/api/claims/") });
  
  // Determine role to adjust title and actions visibility
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

  // Normalize to array in case backend returns a paginated object
  const claimsList = useMemo<Claim[]>(() => {
    if (Array.isArray(data)) return data.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (data as any)?.results ?? [];
    return results.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [data]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">{isUnderwriter ? "Company Claims" : "Claims"}</h1>
        {!isUnderwriter && (
          <Link to="/claims/create">
            <Button>New Claim</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isUnderwriter ? "All Claims (Latest First)" : "Your Claims"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-600">Failed to load claims</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim Ref</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Estimated</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claimsList.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.claim_id}</TableCell>
                    <TableCell>{c.vehicle_number || '-'}</TableCell>
                    <TableCell>{c.estimated_amount}</TableCell>
                    <TableCell>{c.approved_amount ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.status)} className="capitalize">{c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.approval_status)} className="capitalize">{c.approval_status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
