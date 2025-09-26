import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthToken, apiFetch } from "@/lib/api";
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
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Award,
  Calendar,
  Filter,
  Download,
  Eye,
  Settings,
} from "lucide-react";

type KPIs = {
  total_customers?: number;
  total_claims?: number;
  pending_claims?: number;
  active_policies?: number;
  total_revenue?: number;
  claims_approval_rate?: number;
  average_claim_amount?: number;
  policies_expiring_soon?: number;
};

type AnalyticsOverview = {
  monthly_data: { month: number; month_name: string; claims: number; policies: number; revenue: number }[];
  category_distribution?: { category: string; count: number }[];
  claims_by_status?: { status: string; count: number }[];
  revenue_trend?: { month: string; revenue: number; claims: number }[];
  year: number;
};

type ClaimsList = {
  claims: Array<{
    id: number;
    claim_id: string;
    vehicle_number: string;
    estimated_amount: string;
    approved_amount?: string;
    approval_status: string;
    status: string;
    customer_name: string;
    created_at: string;
    incident_date: string;
  }>;
};

type RecentPolicies = {
  policies: Array<{
    id: number;
    policy_number: string;
    customer_name: string;
    vehicle_number: string;
    premium_amount: string;
    status: string;
    end_date: string;
    coverage_type: string;
  }>;
};

const COLORS = ["#0ea5e9", "#22c55e", "#a78bfa", "#ef4444", "#f59e0b", "#14b8a6", "#8b5cf6", "#06b6d4"];

function authFetch<T = any>(url: string): Promise<T> {
  return apiFetch(url);
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
  const [selectedPeriod, setSelectedPeriod] = useState("6months");

  useEffect(() => {
    const role = getRoleFromToken();
    if (role && !["underwriter", "manager"].includes(role)) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Enhanced data fetching
  const kpis = useQuery<KPIs>({ 
    queryKey: ["uw", "kpis"], 
    queryFn: () => authFetch("/api/dashboard/data/") 
  });
  
  const analytics = useQuery<AnalyticsOverview>({ 
    queryKey: ["uw", "analytics"], 
    queryFn: () => authFetch("/api/analytics/overview/") 
  });
  
  const claims = useQuery<ClaimsList>({ 
    queryKey: ["uw", "claims"], 
    queryFn: () => authFetch("/api/claims/data/") 
  });

  const recentPolicies = useQuery<RecentPolicies>({ 
    queryKey: ["uw", "recent-policies"], 
    queryFn: () => authFetch("/api/policies/?limit=10") 
  });

  // Process data for charts
  const monthly = analytics.data?.monthly_data || [];
  const chartData = monthly.map((m) => ({ 
    name: m.month_name.slice(0, 3), 
    claims: m.claims, 
    policies: m.policies,
    revenue: m.revenue || 0
  }));

  const categories = analytics.data?.category_distribution || [];
  const claimsByStatus = analytics.data?.claims_by_status || [];
  const revenueTrend = analytics.data?.revenue_trend || [];

  // Calculate additional metrics
  const totalClaims = kpis.data?.total_claims || 0;
  const pendingClaims = kpis.data?.pending_claims || 0;
  const approvalRate = totalClaims > 0 ? ((totalClaims - pendingClaims) / totalClaims * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Underwriter Dashboard</h1>
            <p className="text-slate-600 mt-1">Comprehensive analytics and management overview</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Enhanced KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Customers</div>
                  <div className="mt-2 text-3xl font-bold text-blue-600">{kpis.data?.total_customers ?? 0}</div>
                  <div className="flex items-center mt-1 text-sm text-green-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +12% from last month
                  </div>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Active Policies</div>
                  <div className="mt-2 text-3xl font-bold text-green-600">{kpis.data?.active_policies ?? 0}</div>
                  <div className="flex items-center mt-1 text-sm text-green-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +8% from last month
                  </div>
                </div>
                <Shield className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Pending Claims</div>
                  <div className="mt-2 text-3xl font-bold text-orange-600">{kpis.data?.pending_claims ?? 0}</div>
                  <div className="flex items-center mt-1 text-sm text-orange-600">
                    <Clock className="w-4 h-4 mr-1" />
                    Requires attention
                  </div>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Approval Rate</div>
                  <div className="mt-2 text-3xl font-bold text-purple-600">{approvalRate}%</div>
                  <div className="flex items-center mt-1 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Above target
                  </div>
                </div>
                <Target className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="claims">Claims Analysis</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Monthly Trends
                    <Badge variant="secondary" className="text-xs">{analytics.data?.year ?? "--"}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="claims" fill="#ef4444" radius={[4, 4, 0, 0]} name="Claims" />
                        <Bar yAxisId="left" dataKey="policies" fill="#22c55e" radius={[4, 4, 0, 0]} name="Policies" />
                        <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} name="Revenue" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5" />
                    Vehicle Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={categories} 
                          dataKey="count" 
                          nameKey="category" 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={100} 
                          label={({ category, count }) => `${category}: ${count}`}
                        >
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
          </TabsContent>

          <TabsContent value="claims" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Claims by Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Claims by Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={claimsByStatus}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Claims Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Recent Claims
                    <Button variant="outline" size="sm" className="ml-auto">
                      <Eye className="w-4 h-4 mr-2" />
                      View All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(claims.data?.claims || []).slice(0, 5).map((claim) => (
                      <div key={claim.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{claim.claim_id}</div>
                          <div className="text-sm text-muted-foreground">{claim.customer_name} • {claim.vehicle_number}</div>
                          <div className="text-sm text-muted-foreground">Incident: {claim.incident_date}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${claim.estimated_amount}</div>
                          <Badge 
                            variant={claim.approval_status === 'approved' ? 'default' : 
                                   claim.approval_status === 'pending' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {claim.approval_status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="policies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Recent Policy Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-3 pr-4">Policy #</th>
                        <th className="py-3 pr-4">Customer</th>
                        <th className="py-3 pr-4">Vehicle</th>
                        <th className="py-3 pr-4">Premium</th>
                        <th className="py-3 pr-4">Coverage</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3 pr-4">Expires</th>
                        <th className="py-3 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(recentPolicies.data?.policies || []).map((policy) => (
                        <tr key={policy.id} className="border-b">
                          <td className="py-3 pr-4 font-medium">{policy.policy_number}</td>
                          <td className="py-3 pr-4">{policy.customer_name}</td>
                          <td className="py-3 pr-4">{policy.vehicle_number}</td>
                          <td className="py-3 pr-4">${policy.premium_amount}</td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline" className="text-xs">
                              {policy.coverage_type}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge 
                              variant={policy.status === 'active' ? 'default' : 
                                     policy.status === 'pending' ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {policy.status}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">{policy.end_date}</td>
                          <td className="py-3 pr-4">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Claims Processing Time</div>
                        <div className="text-2xl font-bold">2.3 days</div>
                      </div>
                      <div className="text-green-600 text-sm">↓ 15% faster</div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Customer Satisfaction</div>
                        <div className="text-2xl font-bold">94%</div>
                      </div>
                      <div className="text-green-600 text-sm">↑ 3% higher</div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Policy Renewal Rate</div>
                        <div className="text-2xl font-bold">87%</div>
                      </div>
                      <div className="text-green-600 text-sm">↑ 5% higher</div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Average Premium</div>
                        <div className="text-2xl font-bold">$1,247</div>
                      </div>
                      <div className="text-green-600 text-sm">↑ 8% higher</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col">
                <FileText className="w-6 h-6 mb-2" />
                Process Claims
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Shield className="w-6 h-6 mb-2" />
                Review Policies
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Users className="w-6 h-6 mb-2" />
                Manage Customers
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <BarChart3 className="w-6 h-6 mb-2" />
                Generate Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}