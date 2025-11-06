import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getAuthToken, apiFetch, exportVehicles } from "@/lib/api";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Car,
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
  Shield,
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
  customer: number | Customer;
  vehicle_number: string;
  category: number | VehicleCategory;
  make: string;
  model: string;
  year: number;
  engine_number?: string;
  chassis_number?: string;
  market_value?: string;
  date_registered: string;
}

interface Policy {
  id: number;
  policy_number: string;
  vehicle: number | Vehicle;
  customer: number | Customer;
  coverage: number | { id: number; name: string };
  premium_amount: string;
  coverage_amount: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

interface Claim {
  id: number;
  claim_id: string;
  policy: number | Policy;
  incident_date: string;
  estimated_amount: string;
  approved_amount?: string;
  status: string;
  approval_status: string;
  created_at: string;
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

export default function UnderwriterVehicles() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleExport = async () => {
    try {
      await exportVehicles();
      toast.success('Vehicles exported successfully');
    } catch (error) {
      console.error('Failed to export vehicles:', error);
      toast.error('Failed to export vehicles. Please try again.');
    }
  };

  // Data fetching
  const { data: categories } = useQuery<VehicleCategory[]>({
    queryKey: ["vehicle-categories"],
    queryFn: () => authFetch("/api/vehicle-categories/")
  });

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => authFetch("/api/vehicles/")
  });

  const { data: policies } = useQuery<Policy[]>({
    queryKey: ["policies"],
    queryFn: () => authFetch("/api/policies/")
  });

  const { data: claims } = useQuery<Claim[]>({
    queryKey: ["claims"],
    queryFn: () => authFetch("/api/claims/")
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => authFetch("/api/customers/")
  });

  // Normalize data
  const vehiclesList = useMemo(() => normalize<Vehicle>(vehicles), [vehicles]);
  const policiesList = useMemo(() => normalize<Policy>(policies), [policies]);
  const claimsList = useMemo(() => normalize<Claim>(claims), [claims]);
  const customersList = useMemo(() => normalize<Customer>(customers), [customers]);
  const categoriesList = useMemo(() => normalize<VehicleCategory>(categories), [categories]);

  // Create lookup maps
  const customerMap = useMemo(() => {
    const map = new Map<number, Customer>();
    customersList.forEach(c => map.set(c.id, c));
    return map;
  }, [customersList]);

  const categoryMap = useMemo(() => {
    const map = new Map<number, VehicleCategory>();
    categoriesList.forEach(c => map.set(c.id, c));
    return map;
  }, [categoriesList]);

  const policyMap = useMemo(() => {
    const map = new Map<number, Policy[]>();
    policiesList.forEach(p => {
      const vehicleId = typeof p.vehicle === 'object' ? p.vehicle.id : p.vehicle;
      if (!map.has(vehicleId)) map.set(vehicleId, []);
      map.get(vehicleId)!.push(p);
    });
    return map;
  }, [policiesList]);

  const claimMap = useMemo(() => {
    const map = new Map<number, Claim[]>();
    claimsList.forEach(c => {
      const policyId = typeof c.policy === 'object' ? c.policy.id : c.policy;
      const policy = policiesList.find(p => p.id === policyId);
      if (policy) {
        const vehicleId = typeof policy.vehicle === 'object' ? policy.vehicle.id : policy.vehicle;
        if (!map.has(vehicleId)) map.set(vehicleId, []);
        map.get(vehicleId)!.push(c);
      }
    });
    return map;
  }, [claimsList, policiesList]);

  // Enhanced vehicle data with related information
  const enhancedVehicles = useMemo(() => {
    return vehiclesList.map(vehicle => {
      const customer = typeof vehicle.customer === 'object' ? vehicle.customer : customerMap.get(vehicle.customer);
      const category = typeof vehicle.category === 'object' ? vehicle.category : categoryMap.get(vehicle.category);
      const vehiclePolicies = policyMap.get(vehicle.id) || [];
      const vehicleClaims = claimMap.get(vehicle.id) || [];
      
      const activePolicies = vehiclePolicies.filter(p => p.status === 'active').length;
      const pendingPolicies = vehiclePolicies.filter(p => p.status === 'pending').length;
      const totalClaims = vehicleClaims.length;
      const pendingClaims = vehicleClaims.filter(c => c.approval_status === 'pending').length;
      const totalPremium = vehiclePolicies.reduce((sum, p) => sum + parseFloat(p.premium_amount || '0'), 0);
      
      return {
        ...vehicle,
        customer,
        category,
        activePolicies,
        pendingPolicies,
        totalClaims,
        pendingClaims,
        totalPremium,
        lastPolicyDate: vehiclePolicies.length > 0 ? 
          new Date(Math.max(...vehiclePolicies.map(p => new Date(p.created_at).getTime()))) : null,
        lastClaimDate: vehicleClaims.length > 0 ? 
          new Date(Math.max(...vehicleClaims.map(c => new Date(c.created_at).getTime()))) : null,
      };
    });
  }, [vehiclesList, customerMap, categoryMap, policyMap, claimMap]);

  // Filtering and sorting
  const filteredVehicles = useMemo(() => {
    let filtered = enhancedVehicles;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v => 
        v.vehicle_number.toLowerCase().includes(term) ||
        v.make.toLowerCase().includes(term) ||
        v.model.toLowerCase().includes(term) ||
        (v.customer && (
          v.customer.user.first_name.toLowerCase().includes(term) ||
          v.customer.user.last_name.toLowerCase().includes(term) ||
          v.customer.customer_id.toLowerCase().includes(term)
        ))
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(v => {
        const categoryId = typeof v.category === 'object' ? v.category.id : v.category;
        return String(categoryId) === categoryFilter;
      });
    }

    // Status filter (based on policies)
    if (statusFilter !== "all") {
      if (statusFilter === "with_policies") {
        filtered = filtered.filter(v => v.activePolicies > 0 || v.pendingPolicies > 0);
      } else if (statusFilter === "no_policies") {
        filtered = filtered.filter(v => v.activePolicies === 0 && v.pendingPolicies === 0);
      } else if (statusFilter === "with_claims") {
        filtered = filtered.filter(v => v.totalClaims > 0);
      } else if (statusFilter === "pending_claims") {
        filtered = filtered.filter(v => v.pendingClaims > 0);
      }
    }

    // Sorting
    if (sortBy === "latest") {
      filtered.sort((a, b) => new Date(b.date_registered).getTime() - new Date(a.date_registered).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.date_registered).getTime() - new Date(b.date_registered).getTime());
    } else if (sortBy === "premium") {
      filtered.sort((a, b) => b.totalPremium - a.totalPremium);
    } else if (sortBy === "claims") {
      filtered.sort((a, b) => b.totalClaims - a.totalClaims);
    } else if (sortBy === "customer") {
      filtered.sort((a, b) => {
        const aName = a.customer ? `${a.customer.user.first_name} ${a.customer.user.last_name}` : '';
        const bName = b.customer ? `${b.customer.user.first_name} ${b.customer.user.last_name}` : '';
        return aName.localeCompare(bName);
      });
    }

    return filtered;
  }, [enhancedVehicles, searchTerm, categoryFilter, statusFilter, sortBy]);

  // Analytics data
  const analyticsData = useMemo(() => {
    const categoryStats = new Map<string, number>();
    const monthlyStats = new Map<string, { vehicles: number; policies: number; claims: number }>();
    
    enhancedVehicles.forEach(vehicle => {
      const categoryName = vehicle.category?.display_name || vehicle.category?.name || 'Unknown';
      categoryStats.set(categoryName, (categoryStats.get(categoryName) || 0) + 1);
      
      const month = new Date(vehicle.date_registered).toISOString().slice(0, 7);
      if (!monthlyStats.has(month)) {
        monthlyStats.set(month, { vehicles: 0, policies: 0, claims: 0 });
      }
      const stats = monthlyStats.get(month)!;
      stats.vehicles += 1;
      stats.policies += vehicle.activePolicies + vehicle.pendingPolicies;
      stats.claims += vehicle.totalClaims;
    });

    return {
      categoryStats: Array.from(categoryStats.entries()).map(([name, value]) => ({ name, value })),
      monthlyStats: Array.from(monthlyStats.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, stats]) => ({ month, ...stats }))
        .slice(-12), // Last 12 months
    };
  }, [enhancedVehicles]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalVehicles = enhancedVehicles.length;
    const vehiclesWithPolicies = enhancedVehicles.filter(v => v.activePolicies > 0 || v.pendingPolicies > 0).length;
    const vehiclesWithClaims = enhancedVehicles.filter(v => v.totalClaims > 0).length;
    const totalPremium = enhancedVehicles.reduce((sum, v) => sum + v.totalPremium, 0);
    const totalClaims = enhancedVehicles.reduce((sum, v) => sum + v.totalClaims, 0);
    const pendingClaims = enhancedVehicles.reduce((sum, v) => sum + v.pendingClaims, 0);

    return {
      totalVehicles,
      vehiclesWithPolicies,
      vehiclesWithClaims,
      totalPremium,
      totalClaims,
      pendingClaims,
      policyCoverageRate: totalVehicles > 0 ? (vehiclesWithPolicies / totalVehicles * 100).toFixed(1) : "0",
      claimRate: totalVehicles > 0 ? (vehiclesWithClaims / totalVehicles * 100).toFixed(1) : "0",
    };
  }, [enhancedVehicles]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => authFetch(`/api/vehicles/${id}/`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Vehicle deleted successfully");
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete vehicle"),
  });

  const handleDelete = (vehicle: Vehicle) => {
    if (window.confirm(`Are you sure you want to delete vehicle ${vehicle.vehicle_number}?`)) {
      deleteMutation.mutate(vehicle.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Vehicle Management</h1>
            <p className="text-slate-600 mt-1">Comprehensive vehicle fleet management and analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
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
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Vehicle</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                  <p className="text-muted-foreground">Vehicle addition form would go here...</p>
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
                  <div className="text-sm text-muted-foreground">Total Vehicles</div>
                  <div className="mt-2 text-3xl font-bold text-blue-600">{summaryStats.totalVehicles}</div>
                  <div className="flex items-center mt-1 text-sm text-green-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +5% this month
                  </div>
                </div>
                <Car className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">With Policies</div>
                  <div className="mt-2 text-3xl font-bold text-green-600">{summaryStats.vehiclesWithPolicies}</div>
                  <div className="flex items-center mt-1 text-sm text-green-600">
                    <Shield className="w-4 h-4 mr-1" />
                    {summaryStats.policyCoverageRate}% coverage
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
                  <div className="text-sm text-muted-foreground">Total Claims</div>
                  <div className="mt-2 text-3xl font-bold text-orange-600">{summaryStats.totalClaims}</div>
                  <div className="flex items-center mt-1 text-sm text-orange-600">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {summaryStats.pendingClaims} pending
                  </div>
                </div>
                <FileText className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Premium</div>
                  <div className="mt-2 text-3xl font-bold text-purple-600">${summaryStats.totalPremium.toLocaleString()}</div>
                  <div className="flex items-center mt-1 text-sm text-green-600">
                    <DollarSign className="w-4 h-4 mr-1" />
                    +12% this month
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="vehicles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vehicles">Vehicle List</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="management">Management</TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="space-y-6">
            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters & Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search vehicles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categoriesList.map(cat => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.display_name || cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="with_policies">With Policies</SelectItem>
                      <SelectItem value="no_policies">No Policies</SelectItem>
                      <SelectItem value="with_claims">With Claims</SelectItem>
                      <SelectItem value="pending_claims">Pending Claims</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest Registered</SelectItem>
                      <SelectItem value="oldest">Oldest Registered</SelectItem>
                      <SelectItem value="premium">Highest Premium</SelectItem>
                      <SelectItem value="claims">Most Claims</SelectItem>
                      <SelectItem value="customer">Customer Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Vehicles ({filteredVehicles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Policies</TableHead>
                        <TableHead>Claims</TableHead>
                        <TableHead>Premium</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVehicles.map(vehicle => (
                        <TableRow key={vehicle.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{vehicle.vehicle_number}</div>
                              <div className="text-sm text-muted-foreground">
                                {vehicle.make} {vehicle.model} ({vehicle.year})
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {vehicle.customer ? (
                              <div>
                                <div className="font-medium">
                                  {vehicle.customer.user.first_name} {vehicle.customer.user.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {vehicle.customer.customer_id}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {vehicle.category?.display_name || vehicle.category?.name || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {vehicle.activePolicies > 0 && (
                                <Badge variant="default" className="text-xs">
                                  {vehicle.activePolicies} Active
                                </Badge>
                              )}
                              {vehicle.pendingPolicies > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {vehicle.pendingPolicies} Pending
                                </Badge>
                              )}
                              {vehicle.activePolicies === 0 && vehicle.pendingPolicies === 0 && (
                                <Badge variant="outline" className="text-xs">
                                  No Policies
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {vehicle.totalClaims > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {vehicle.totalClaims} Total
                                </Badge>
                              )}
                              {vehicle.pendingClaims > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {vehicle.pendingClaims} Pending
                                </Badge>
                              )}
                              {vehicle.totalClaims === 0 && (
                                <span className="text-muted-foreground text-xs">No Claims</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              ${vehicle.totalPremium.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {vehicle.pendingClaims > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Claims Pending
                                </Badge>
                              )}
                              {vehicle.pendingPolicies > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Policy Pending
                                </Badge>
                              )}
                              {vehicle.activePolicies > 0 && vehicle.pendingClaims === 0 && (
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Link to={`/vehicles/${vehicle.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button size="sm" variant="outline">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDelete(vehicle)}
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
              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Vehicle Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={analyticsData.categoryStats}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {analyticsData.categoryStats.map((_, idx) => (
                            <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Monthly Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.monthlyStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="vehicles" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Vehicles" />
                        <Bar dataKey="policies" fill="#22c55e" radius={[4, 4, 0, 0]} name="Policies" />
                        <Bar dataKey="claims" fill="#ef4444" radius={[4, 4, 0, 0]} name="Claims" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="management" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button className="w-full justify-start">
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Vehicle
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleExport}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Vehicle Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleExport}>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh All Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Alerts & Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-sm">Pending Claims</div>
                        <div className="text-xs text-muted-foreground">Vehicles with pending claims</div>
                      </div>
                      <Badge variant="destructive">{summaryStats.pendingClaims}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-sm">No Policies</div>
                        <div className="text-xs text-muted-foreground">Vehicles without active policies</div>
                      </div>
                      <Badge variant="secondary">
                        {summaryStats.totalVehicles - summaryStats.vehiclesWithPolicies}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-sm">High Risk</div>
                        <div className="text-xs text-muted-foreground">Vehicles with multiple claims</div>
                      </div>
                      <Badge variant="outline">
                        {enhancedVehicles.filter(v => v.totalClaims > 2).length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Policy Coverage Rate</div>
                        <div className="text-2xl font-bold">{summaryStats.policyCoverageRate}%</div>
                      </div>
                      <div className="text-green-600 text-sm">↑ 3%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Claim Rate</div>
                        <div className="text-2xl font-bold">{summaryStats.claimRate}%</div>
                      </div>
                      <div className="text-red-600 text-sm">↑ 1%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Avg Premium per Vehicle</div>
                        <div className="text-2xl font-bold">
                          ${summaryStats.totalVehicles > 0 ? (summaryStats.totalPremium / summaryStats.totalVehicles).toFixed(0) : '0'}
                        </div>
                      </div>
                      <div className="text-green-600 text-sm">↑ 8%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

