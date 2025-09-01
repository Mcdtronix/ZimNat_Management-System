import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuthToken } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

type KPIs = {
  total_customers?: number;
  total_claims?: number;
  pending_claims?: number;
  active_policies?: number;
};

type AnalyticsOverview = {
  monthly_data: { month: number; month_name: string; claims: number; policies: number }[];
  category_distribution?: { category: string; count: number }[];
  year: number;
};

function authFetch<T = any>(url: string): Promise<T> {
  const token = getAuthToken();
  return fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }).then(async (res) => {
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  });
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

const COLORS = ["#0ea5e9", "#22c55e", "#a78bfa", "#ef4444", "#f59e0b", "#14b8a6"]; // cyan, green, violet, red, amber, teal

export default function UnderwriterDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const role = getRoleFromToken();
    if (role && !["underwriter", "manager"].includes(role)) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const kpis = useQuery<KPIs>({ queryKey: ["uw", "kpis"], queryFn: () => authFetch("/api/dashboard/data/") });
  const analytics = useQuery<AnalyticsOverview>({ queryKey: ["uw", "analytics"], queryFn: () => authFetch("/api/analytics/overview/") });

  const monthly = analytics.data?.monthly_data || [];
  const chartData = monthly.map((m) => ({ name: m.month_name.slice(0, 3), claims: m.claims, policies: m.policies }));
  const categories = analytics.data?.category_distribution || [];

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="text-sm text-muted-foreground">Customers</div>
          <div className="mt-2 text-2xl font-bold">{kpis.data?.total_customers ?? 0}</div>
        </CardContent></Card>
      </div>

      {/* Monthly Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Monthly Analytics</span>
            <Badge variant="secondary" className="text-xs">{analytics.data?.year ?? "--"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Bar dataKey="claims" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="policies" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Category Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categories} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={100} label>
                  {categories.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
