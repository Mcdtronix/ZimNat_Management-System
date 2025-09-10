import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/api";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer 
} from "recharts";

type KPIs = {
  // customer view
  active_policies?: number;
  total_claims?: number;
  pending_claims?: number;
  vehicles?: number;
  // staff view
  total_customers?: number;
};

type AnalyticsOverview = {
  monthly_data: { month: number; month_name: string; claims: number; policies: number }[];
  year: number;
};

type ClaimsList = {
  claims: Array<{
    id: number;
    claim_id: string;
    vehicle_number: string;
    estimated_amount: string;
    approval_status: string;
    status: string;
    customer_name: string;
    created_at: string;
  }>;
};

const API_BASE = import.meta.env.VITE_BACKEND_URL || "https://zimnat.pythonanywhere.com/";

const api = async (path: string) => {
  const token = getAuthToken();
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

const Dashboard = () => {
  const kpis = useQuery<KPIs>({ queryKey: ["dashboard","kpis"], queryFn: () => api("/api/dashboard/data/") });
  const analytics = useQuery<AnalyticsOverview>({ queryKey: ["dashboard","analytics"], queryFn: () => api("/api/analytics/overview/") });
  const claims = useQuery<ClaimsList>({ queryKey: ["dashboard","claims"], queryFn: () => api("/api/claims/data/") });

  const monthly = analytics.data?.monthly_data || [];
  const chartData = monthly.map((m) => ({ name: m.month_name.slice(0,3), claims: m.claims, policies: m.policies }));

  const isLoading = kpis.isLoading || analytics.isLoading || claims.isLoading;
  const isError = kpis.isError || analytics.isError || claims.isError;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1 p-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <span>Dashboard</span>
          <ChevronRight className="h-4 w-4" />
          <span>Overview</span>
        </div>

        <div className="space-y-6">
          {isError && (
            <div className="rounded border border-red-200 bg-red-50 text-red-700 px-4 py-2 text-sm">
              Failed to load some dashboard data. Please try again.
            </div>
          )}
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Active Policies</div>
              <div className="mt-2 text-2xl font-bold">{kpis.data?.active_policies ?? 0}</div>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Total Claims</div>
              <div className="mt-2 text-2xl font-bold">{kpis.data?.total_claims ?? 0}</div>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Pending Claims</div>
              <div className="mt-2 text-2xl font-bold text-orange-600">{kpis.data?.pending_claims ?? 0}</div>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Vehicles / Customers</div>
              <div className="mt-2 text-2xl font-bold">{(kpis.data?.vehicles ?? kpis.data?.total_customers) ?? 0}</div>
            </CardContent></Card>
          </div>

          {/* Analytics Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Monthly Analytics</span>
                <Badge variant="secondary" className="text-xs">{analytics.data?.year ?? "--"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {analytics.isLoading ? (
                  <div className="h-full w-full animate-pulse bg-gray-100 rounded" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Bar dataKey="claims" fill="#0ea5e9" radius={[4,4,0,0]} />
                      <Bar dataKey="policies" fill="#22c55e" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Claims */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Claims</CardTitle>
            </CardHeader>
            <CardContent>
              {claims.isLoading && <div className="h-24 animate-pulse bg-gray-100 rounded" />}
              {claims.isError && <div className="text-red-600 text-sm">Failed to load claims.</div>}
              {!claims.isLoading && !claims.isError && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-4">Claim ID</th>
                        <th className="py-2 pr-4">Vehicle</th>
                        <th className="py-2 pr-4">Customer</th>
                        <th className="py-2 pr-4">Est. Amount</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(claims.data?.claims || []).slice(0,5).map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="py-2 pr-4 font-medium">{c.claim_id}</td>
                          <td className="py-2 pr-4">{c.vehicle_number}</td>
                          <td className="py-2 pr-4">{c.customer_name}</td>
                          <td className="py-2 pr-4">${c.estimated_amount}</td>
                          <td className="py-2 pr-4">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.approval_status === 'approved' ? 'bg-green-100 text-green-700' : c.approval_status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                              {c.approval_status}
                            </span>
                          </td>
                          <td className="py-2 pr-4">{c.created_at}</td>
                        </tr>
                      ))}
                      {(!claims.data || claims.data.claims.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-muted-foreground">No claims yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
