import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getAuthToken, apiFetch, exportPolicies } from "@/lib/api";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Shield,
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Settings,
  RefreshCw,
  Calendar,
  DollarSign,
  Car,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

interface Policy {
  id: number;
  policy_number: string;
  vehicle: number | Vehicle;
  customer: number | Customer;
  coverage: number | Coverage;
  premium_amount?: string;
  coverage_amount?: string;
  start_date?: string;
  end_date?: string;
  status: "pending" | "active" | "cancelled" | "expired" | string;
  created_at: string;
}

interface VehicleCategory { 
  id: number; 
  name: string; 
  display_name?: string;
  description?: string;
}

interface Customer {
  id: number;
  customer_id: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Vehicle { 
  id: number; 
  vehicle_number: string; 
  category: number | VehicleCategory;
  make: string;
  model: string;
  year: number;
}

interface Coverage { 
  id: number; 
  name: string; 
  description?: string;
}

const COLORS = ["#0ea5e9", "#22c55e", "#a78bfa", "#ef4444", "#f59e0b", "#14b8a6", "#8b5cf6", "#06b6d4"];

function authFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  return apiFetch(url, init);
}

function normalize<T = any>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.results)) return data.results as T[];
  return [];
}

export default function UnderwriterPolicies() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [coverageFilter, setCoverageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleExport = async () => {
    try {
      await exportPolicies();
      toast.success('Policies exported successfully');
    } catch (error) {
      console.error('Failed to export policies:', error);
      toast.error('Failed to export policies. Please try again.');
    }
  };

  // Data fetching
  const { data: policies, isLoading: policiesLoading } = useQuery<Policy[]>({
    queryKey: ["policies"],
    queryFn: () => authFetch("/api/policies/")
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => authFetch("/api/vehicles/")
  });

  const { data: coverages } = useQuery<Coverage[]>({
    queryKey: ["coverages"],
    queryFn: () => authFetch("/api/insurance-coverages/")
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => authFetch("/api/customers/")
  });

  // Normalize data
  const policiesList = useMemo(() => normalize<Policy>(policies), [policies]);
  const vehiclesList = useMemo(() => normalize<Vehicle>(vehicles), [vehicles]);
  const coveragesList = useMemo(() => normalize<Coverage>(coverages), [coverages]);
  const customersList = useMemo(() => normalize<Customer>(customers), [customers]);

  // Create lookup maps
  const customerMap = useMemo(() => {
    const map = new Map<number, Customer>();
    customersList.forEach(c => map.set(c.id, c));
    return map;
  }, [customersList]);

  const vehicleMap = useMemo(() => {
    const map = new Map<number, Vehicle>();
    vehiclesList.forEach(v => map.set(v.id, v));
    return map;
  }, [vehiclesList]);

  const coverageMap = useMemo(() => {
    const map = new Map<number, Coverage>();
    coveragesList.forEach(c => map.set(c.id, c));
    return map;
  }, [coveragesList]);

  // Enhanced policy data with related information
  const enhancedPolicies = useMemo(() => {
    return policiesList.map(policy => {
      const customer = typeof policy.customer === 'object' ? policy.customer : customerMap.get(policy.customer);
      const vehicle = typeof policy.vehicle === 'object' ? policy.vehicle : vehicleMap.get(policy.vehicle);
      const coverage = typeof policy.coverage === 'object' ? policy.coverage : coverageMap.get(policy.coverage);
      
      const daysUntilExpiry = policy.end_date ? 
        Math.ceil((new Date(policy.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : null;
      
      return {
        ...policy,
        customer,
        vehicle,
        coverage,
        daysUntilExpiry,
        isExpiringSoon: daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0,
        isExpired: daysUntilExpiry !== null && daysUntilExpiry <= 0,
      };
    });
  }, [policiesList, customerMap, vehicleMap, coverageMap]);

  // Filtering and sorting
  const filteredPolicies = useMemo(() => {
    let filtered = enhancedPolicies;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.policy_number.toLowerCase().includes(term) ||
        (p.customer && (
          p.customer.user.first_name.toLowerCase().includes(term) ||
          p.customer.user.last_name.toLowerCase().includes(term) ||
          p.customer.customer_id.toLowerCase().includes(term)
        )) ||
        (p.vehicle && p.vehicle.vehicle_number.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Coverage filter
    if (coverageFilter !== "all") {
      filtered = filtered.filter(p => {
        const coverageId = typeof p.coverage === 'object' ? p.coverage.id : p.coverage;
        return String(coverageId) === coverageFilter;
      });
    }

    // Sorting
    if (sortBy === "latest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "premium") {
      filtered.sort((a, b) => parseFloat(b.premium_amount || '0') - parseFloat(a.premium_amount || '0'));
    } else if (sortBy === "expiry") {
      filtered.sort((a, b) => {
        const aExpiry = a.daysUntilExpiry || Infinity;
        const bExpiry = b.daysUntilExpiry || Infinity;
        return aExpiry - bExpiry;
      });
    }

    return filtered;
  }, [enhancedPolicies, searchTerm, statusFilter, coverageFilter, sortBy]);

  // Analytics data
  const analyticsData = useMemo(() => {
    const statusStats = new Map<string, number>();
    const coverageStats = new Map<string, number>();
    const monthlyStats = new Map<string, { policies: number; revenue: number }>();
    
    enhancedPolicies.forEach(policy => {
      // Status stats
      statusStats.set(policy.status, (statusStats.get(policy.status) || 0) + 1);
      
      // Coverage stats
      const coverageName = policy.coverage?.name || 'Unknown';
      coverageStats.set(coverageName, (coverageStats.get(coverageName) || 0) + 1);
      
      // Monthly stats
      const month = new Date(policy.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyStats.has(month)) {
        monthlyStats.set(month, { policies: 0, revenue: 0 });
      }
      const monthData = monthlyStats.get(month)!;
      monthData.policies += 1;
      monthData.revenue += parseFloat(policy.premium_amount || '0');
    });

    return {
      statusStats: Array.from(statusStats.entries()).map(([name, value]) => ({ name, value })),
      coverageStats: Array.from(coverageStats.entries()).map(([name, value]) => ({ name, value })),
      monthlyStats: Array.from(monthlyStats.entries()).map(([name, data]) => ({ name, ...data })),
    };
  }, [enhancedPolicies]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalPolicies = enhancedPolicies.length;
    const activePolicies = enhancedPolicies.filter(p => p.status === 'active').length;
    const pendingPolicies = enhancedPolicies.filter(p => p.status === 'pending').length;
    const expiringSoon = enhancedPolicies.filter(p => p.isExpiringSoon).length;
    const totalRevenue = enhancedPolicies.reduce((sum, p) => sum + parseFloat(p.premium_amount || '0'), 0);
    
    return {
      totalPolicies,
      activePolicies,
      pendingPolicies,
      expiringSoon,
      totalRevenue,
      activeRate: totalPolicies > 0 ? ((activePolicies / totalPolicies) * 100).toFixed(1) : '0',
    };
  }, [enhancedPolicies]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (policyId: number) => {
      await authFetch(`/api/policies/${policyId}/`, { method: 'DELETE' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete policy"),
  });

  const handleDelete = (policy: Policy) => {
    if (window.confirm(`Are you sure you want to delete policy ${policy.policy_number}?`)) {
      deleteMutation.mutate(policy.id);
    }
  };

  if (policiesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Policy Management</h1>
            <p className="text-slate-600 mt-1">Comprehensive policy management and analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Policy
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Policy</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                  <p className="text-muted-foreground">Policy creation form would go here...</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Policies</div>
                  <div className="mt-2 text-3xl font-bold text-blue-600">{summaryStats.totalPolicies}</div>
                  <div className="flex items-center mt-1 text-sm text-green-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    {summaryStats.activeRate}% active
                  </div>
                </div>
                <Shield className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Active Policies</div>
                  <div className="mt-2 text-3xl font-bold text-green-600">{summaryStats.activePolicies}</div>
                  <div className="flex items-center mt-1 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    In force
                  </div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Pending Approval</div>
                  <div className="mt-2 text-3xl font-bold text-orange-600">{summaryStats.pendingPolicies}</div>
                  <div className="flex items-center mt-1 text-sm text-orange-600">
                    <Clock className="w-4 h-4 mr-1" />
                    Awaiting review
                  </div>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                  <div className="mt-2 text-3xl font-bold text-purple-600">
                    ${summaryStats.totalRevenue.toLocaleString()}
                  </div>
                  <div className="flex items-center mt-1 text-sm text-purple-600">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Premium income
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="policies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          </TabsList>

          <TabsContent value="policies" className="space-y-6">
            {/* Filters and Search */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search policies, customers, or vehicles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={coverageFilter} onValueChange={setCoverageFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter by coverage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Coverage Types</SelectItem>
                      {coveragesList.map((coverage) => (
                        <SelectItem key={coverage.id} value={String(coverage.id)}>
                          {coverage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="premium">Premium Amount</SelectItem>
                      <SelectItem value="expiry">Expiry Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Policies Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  All Policies
                  <Badge variant="outline" className="ml-2">
                    {filteredPolicies.length} of {enhancedPolicies.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Policy Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Coverage</TableHead>
                        <TableHead>Premium</TableHead>
                        <TableHead>Coverage Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPolicies.map((policy) => (
                        <TableRow key={policy.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-blue-600" />
                              {policy.policy_number}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {policy.customer ? 
                                  `${policy.customer.user.first_name} ${policy.customer.user.last_name}` : 
                                  'Unknown Customer'
                                }
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {policy.customer?.customer_id || 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {policy.vehicle ? policy.vehicle.vehicle_number : 'Unknown Vehicle'}
                                </div>
                                {policy.vehicle && (
                                  <div className="text-sm text-muted-foreground">
                                    {policy.vehicle.year} {policy.vehicle.make} {policy.vehicle.model}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {policy.coverage?.name || 'Unknown Coverage'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-green-600">
                              ${policy.premium_amount || '0'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              ${policy.coverage_amount || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={policy.status === 'active' ? 'default' : 
                                       policy.status === 'pending' ? 'secondary' : 
                                       policy.status === 'expired' ? 'destructive' : 'outline'}
                                className="text-xs"
                              >
                                {policy.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                                {policy.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                {policy.status === 'expired' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                {policy.status}
                              </Badge>
                              {policy.isExpiringSoon && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Expires in {policy.daysUntilExpiry} days
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {policy.start_date ? new Date(policy.start_date).toLocaleDateString() : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {policy.end_date ? new Date(policy.end_date).toLocaleDateString() : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Link to={`/policies/${policy.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button size="sm" variant="outline">
                                <Edit className="w-4 h-4" />
                              </Button>
                              {policy.status === 'pending' && (
                                <>
                                  <Link to={`/underwriter/quotes?policy=${policy.id}`}>
                                    <Button size="sm" variant="default" title="Generate Quote">
                                      <FileText className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                  <Button size="sm" variant="secondary">
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDelete(policy)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Policy Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Policy Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={analyticsData.statusStats}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {analyticsData.statusStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Coverage Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Coverage Type Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.coverageStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Policy Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Monthly Policy Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="policies" fill="#22c55e" radius={[4, 4, 0, 0]} name="Policies" />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} name="Revenue ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expiring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Policies Expiring Soon
                  <Badge variant="destructive" className="ml-2">
                    {summaryStats.expiringSoon} policies
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enhancedPolicies
                    .filter(p => p.isExpiringSoon)
                    .sort((a, b) => (a.daysUntilExpiry || 0) - (b.daysUntilExpiry || 0))
                    .map((policy) => (
                      <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{policy.policy_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {policy.customer ? 
                              `${policy.customer.user.first_name} ${policy.customer.user.last_name}` : 
                              'Unknown Customer'
                            } • {policy.vehicle ? policy.vehicle.vehicle_number : 'Unknown Vehicle'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Expires: {policy.end_date ? new Date(policy.end_date).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${policy.premium_amount || '0'}</div>
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {policy.daysUntilExpiry} days left
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
