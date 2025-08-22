import { useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/api";

function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getAuthToken();
  return fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed with ${res.status}`);
    }
    const ct = res.headers.get("content-type");
    if (ct && ct.includes("application/json")) return res.json();
    return null;
  });
}

function normalize<T = any>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.results)) return data.results as T[];
  return [];
}

function getRoleFromToken(): string | undefined {
  try {
    const token = getAuthToken();
    if (!token) return undefined;
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload.role || payload.user_role || payload.groups?.[0];
  } catch {
    return undefined;
  }
}

export default function UnderwriterDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "policies";
  const onTabChange = (val: string) => setSearchParams({ tab: val }, { replace: true });

  useEffect(() => {
    const role = getRoleFromToken();
    if (role && role !== "underwriter") {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Data for tabs
  const { data: allPoliciesRaw, isLoading: loadingAllPolicies } = useQuery({
    queryKey: ["uw", "policies", "all"],
    queryFn: () => authFetch("/api/policies/"),
  });
  const { data: vehiclesRaw, isLoading: loadingVehicles } = useQuery({
    queryKey: ["uw", "vehicles"],
    queryFn: () => authFetch("/api/vehicles/"),
  });
  const { data: allClaimsRaw, isLoading: loadingClaims } = useQuery({
    queryKey: ["uw", "claims", "all"],
    queryFn: () => authFetch("/api/claims/"),
  });
  const { data: coveragesRaw } = useQuery({
    queryKey: ["uw", "coverages"],
    queryFn: () => authFetch("/api/insurance-coverages/"),
  });
  const { data: vehicleCategoriesRaw } = useQuery({
    queryKey: ["uw", "vehicle-categories"],
    queryFn: () => authFetch("/api/vehicle-categories/"),
  });

  const allPolicies = useMemo(() => normalize<any>(allPoliciesRaw), [allPoliciesRaw]);
  const allVehicles = useMemo(() => normalize<any>(vehiclesRaw), [vehiclesRaw]);
  const allClaims = useMemo(() => normalize<any>(allClaimsRaw), [allClaimsRaw]);
  const allCoverages = useMemo(() => normalize<any>(coveragesRaw), [coveragesRaw]);
  const allVehicleCategories = useMemo(() => normalize<any>(vehicleCategoriesRaw), [vehicleCategoriesRaw]);

  // Build lookups for Vehicles tab
  const vehicleMap = useMemo(() => {
    const map = new Map<number, any>();
    allVehicles.forEach((v: any) => map.set(v.id, v));
    return map;
  }, [allVehicles]);

  const coverageMap = useMemo(() => {
    const map = new Map<number, any>();
    allCoverages.forEach((c: any) => map.set(c.id, c));
    return map;
  }, [allCoverages]);

  const vehicleCategoryMap = useMemo(() => {
    const map = new Map<number, any>();
    allVehicleCategories.forEach((c: any) => map.set(c.id, c));
    return map;
  }, [allVehicleCategories]);

  // Vehicles tab: only vehicle info for vehicles that have at least one policy
  type VehicleRow = { vehicleId: number; vehicleNumber: string; categoryName?: string };
  const vehicleRows: VehicleRow[] = useMemo(() => {
    const withPolicy = new Set<number>();
    allPolicies.forEach((p: any) => {
      const vid = typeof p.vehicle === 'object' ? p.vehicle?.id : p.vehicle;
      if (vid) withPolicy.add(vid);
    });
    const rows: VehicleRow[] = [];
    withPolicy.forEach((vid) => {
      const v = vehicleMap.get(vid);
      if (!v) return;
      const catId = typeof v.category === 'object' ? v.category?.id : v.category;
      const cat = catId ? vehicleCategoryMap.get(catId) : undefined;
      rows.push({
        vehicleId: vid,
        vehicleNumber: v.vehicle_number || `#${vid}`,
        categoryName: cat?.name,
      });
    });
    rows.sort((a, b) => a.vehicleNumber.localeCompare(b.vehicleNumber));
    return rows;
  }, [allPolicies, vehicleMap, vehicleCategoryMap]);

  // No mutations here; underwriter view is read-only per spec
  const sendQuotation = useMutation({
    mutationFn: async (policyId: number) => {
      const premiumStr = window.prompt("Enter premium amount (e.g., 120.00)")?.trim();
      const coverageStr = window.prompt("Enter coverage amount (e.g., 5000.00)")?.trim();
      if (!premiumStr || !coverageStr) throw new Error("Premium and coverage are required");
      const premium = Number(premiumStr);
      const coverage = Number(coverageStr);
      if (!isFinite(premium) || premium <= 0 || !isFinite(coverage) || coverage <= 0) {
        throw new Error("Enter valid positive numbers for premium and coverage");
      }
      await authFetch(`/api/policies/${policyId}/quote/`, {
        method: "POST",
        body: JSON.stringify({ premium_amount: premium, coverage_amount: coverage, currency: "USD" }),
      });
    },
    onSuccess: () => {
      toast.success("Quotation created and customer notified");
      qc.invalidateQueries({ queryKey: ["uw", "policies", "all"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to send quotation"),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Policies</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loadingAllPolicies ? "-" : allPolicies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Claims</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loadingClaims ? "-" : allClaims.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Vehicles</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loadingVehicles ? "-" : allVehicles.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
        </TabsList>

        <TabsContent value="policies">
          <Card>
            <CardHeader><CardTitle>Company Policies</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Policy #</th>
                      <th className="py-2 pr-4">Vehicle</th>
                      <th className="py-2 pr-4">Coverage</th>
                      <th className="py-2 pr-4">Dates</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPolicies.map((p: any) => (
                      <tr key={p.id} className="border-t">
                        <td className="py-2 pr-4">{p.policy_number || p.id}</td>
                        <td className="py-2 pr-4">{p.vehicle || "-"}</td>
                        <td className="py-2 pr-4">{p.coverage || "-"}</td>
                        <td className="py-2 pr-4">{p.start_date} → {p.end_date}</td>
                        <td className="py-2 pr-4">{p.status}</td>
                        <td className="py-2 pr-4">
                          {String(p.status).toLowerCase() === 'pending' && (
                            <Button size="sm" onClick={() => sendQuotation.mutate(p.id)} disabled={sendQuotation.isPending}>Send Quotation</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {allPolicies.length === 0 && (
                      <tr><td className="py-4 text-muted-foreground" colSpan={6}>No policies found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims">
          <Card>
            <CardHeader><CardTitle>Claims</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Claim #</th>
                      <th className="py-2 pr-4">Policy</th>
                      <th className="py-2 pr-4">Incident</th>
                      <th className="py-2 pr-4">Estimated</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allClaims.map((c: any) => (
                      <tr key={c.id} className="border-t">
                        <td className="py-2 pr-4">{c.claim_id || c.id}</td>
                        <td className="py-2 pr-4">{c.policy}</td>
                        <td className="py-2 pr-4">{c.incident_date}</td>
                        <td className="py-2 pr-4">{c.estimated_amount ?? "-"}</td>
                        <td className="py-2 pr-4">{c.status}{c.approval_status ? ` (${c.approval_status})` : ""}</td>
                        <td className="py-2 pr-4">{c.description || "-"}</td>
                      </tr>
                    ))}
                    {allClaims.length === 0 && (
                      <tr><td className="py-4 text-muted-foreground" colSpan={6}>No claims found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles">
          <Card>
            <CardHeader><CardTitle>Vehicles with Policies</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Vehicle</th>
                      <th className="py-2 pr-4">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicleRows.map((row) => (
                      <tr key={row.vehicleId} className="border-t">
                        <td className="py-2 pr-4"><a className="text-primary hover:underline" href={`/vehicles/${row.vehicleId}`}>{row.vehicleNumber}</a></td>
                        <td className="py-2 pr-4">{row.categoryName || '-'}</td>
                      </tr>
                    ))}
                    {vehicleRows.length === 0 && (
                      <tr><td className="py-4 text-muted-foreground" colSpan={2}>
                        {(loadingAllPolicies || loadingVehicles) ? 'Loading vehicles...' : 'No vehicles with policies found.'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
