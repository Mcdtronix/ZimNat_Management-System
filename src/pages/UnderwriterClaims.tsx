import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import ClaimApprovalDialog from "@/components/ClaimApprovalDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getAuthToken, apiFetch } from "@/lib/api";
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
  Target,
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

interface Claim {
  id: number;
  claim_id: string;
  policy: number | Policy;
  customer: number | Customer;
  vehicle: number | Vehicle;
  incident_date: string;
  description: string;
  estimated_amount: string;
  approved_amount?: string;
  status: "submitted" | "under_review" | "approved" | "rejected" | "settled" | string;
  approval_status: "pending" | "approved" | "rejected" | string;
  priority: "low" | "medium" | "high" | "urgent";
  approval_notes?: string;
  rejection_reason?: string;
  requires_investigation: boolean;
  investigation_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at?: string;
}

interface Policy {
  id: number;
  policy_number: string;
  vehicle: number | Vehicle;
  customer: number | Customer;
  premium_amount?: string;
  status: string;
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
  make: string;
  model: string;
  year: number;
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

export default function UnderwriterClaims() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Data fetching
  const { data: claims, isLoading: claimsLoading } = useQuery<Claim[]>({
    queryKey: ["claims"],
    queryFn: () => authFetch("/api/claims/")
  });

  const { data: policies } = useQuery<Policy[]>({
    queryKey: ["policies"],
    queryFn: () => authFetch("/api/policies/")
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => authFetch("/api/vehicles/")
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => authFetch("/api/customers/")
  });

  // Normalize data
  const claimsList = useMemo(() => normalize<Claim>(claims), [claims]);
  const policiesList = useMemo(() => normalize<Policy>(policies), [policies]);
  const vehiclesList = useMemo(() => normalize<Vehicle>(vehicles), [vehicles]);
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

  const policyMap = useMemo(() => {
    const map = new Map<number, Policy>();
    policiesList.forEach(p => map.set(p.id, p));
    return map;
  }, [policiesList]);

  // Enhanced claim data with related information
  const enhancedClaims = useMemo(() => {
    return claimsList.map(claim => {
      const customer = typeof claim.customer === 'object' ? claim.customer : customerMap.get(claim.customer);
      const vehicle = typeof claim.vehicle === 'object' ? claim.vehicle : vehicleMap.get(claim.vehicle);
      const policy = typeof claim.policy === 'object' ? claim.policy : policyMap.get(claim.policy);
      
      const daysSinceIncident = Math.ceil((new Date().getTime() - new Date(claim.incident_date).getTime()) / (1000 * 3600 * 24));
      const daysSinceCreated = Math.ceil((new Date().getTime() - new Date(claim.created_at).getTime()) / (1000 * 3600 * 24));
      
      return {
        ...claim,
        customer,
        vehicle,
        policy,
        daysSinceIncident,
        daysSinceCreated,
        isOverdue: claim.approval_status === 'pending' && daysSinceCreated > 7,
        isHighValue: parseFloat(claim.estimated_amount) > 10000,
      };
    });
  }, [claimsList, customerMap, vehicleMap, policyMap]);

  // Filtering and sorting
  const filteredClaims = useMemo(() => {
    let filtered = enhancedClaims;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.claim_id.toLowerCase().includes(term) ||
        (c.customer && (
          c.customer.user.first_name.toLowerCase().includes(term) ||
          c.customer.user.last_name.toLowerCase().includes(term) ||
          c.customer.customer_id.toLowerCase().includes(term)
        )) ||
        (c.vehicle && c.vehicle.vehicle_number.toLowerCase().includes(term)) ||
        c.description.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Approval filter
    if (approvalFilter !== "all") {
      filtered = filtered.filter(c => c.approval_status === approvalFilter);
    }

    // Sorting
    if (sortBy === "latest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "amount") {
      filtered.sort((a, b) => parseFloat(b.estimated_amount) - parseFloat(a.estimated_amount));
    } else if (sortBy === "incident") {
      filtered.sort((a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime());
    }

    return filtered;
  }, [enhancedClaims, searchTerm, statusFilter, approvalFilter, sortBy]);

  // Analytics data
  const analyticsData = useMemo(() => {
    const statusStats = new Map<string, number>();
    const approvalStats = new Map<string, number>();
    const monthlyStats = new Map<string, { claims: number; amount: number }>();
    
    enhancedClaims.forEach(claim => {
      // Status stats
      statusStats.set(claim.status, (statusStats.get(claim.status) || 0) + 1);
      
      // Approval stats
      approvalStats.set(claim.approval_status, (approvalStats.get(claim.approval_status) || 0) + 1);
      
      // Monthly stats
      const month = new Date(claim.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyStats.has(month)) {
        monthlyStats.set(month, { claims: 0, amount: 0 });
      }
      const monthData = monthlyStats.get(month)!;
      monthData.claims += 1;
      monthData.amount += parseFloat(claim.estimated_amount);
    });

    return {
      statusStats: Array.from(statusStats.entries()).map(([name, value]) => ({ name, value })),
      approvalStats: Array.from(approvalStats.entries()).map(([name, value]) => ({ name, value })),
      monthlyStats: Array.from(monthlyStats.entries()).map(([name, data]) => ({ name, ...data })),
    };
  }, [enhancedClaims]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalClaims = enhancedClaims.length;
    const pendingClaims = enhancedClaims.filter(c => c.approval_status === 'pending').length;
    const approvedClaims = enhancedClaims.filter(c => c.approval_status === 'approved').length;
    const rejectedClaims = enhancedClaims.filter(c => c.approval_status === 'rejected').length;
    const overdueClaims = enhancedClaims.filter(c => c.isOverdue).length;
    const totalAmount = enhancedClaims.reduce((sum, c) => sum + parseFloat(c.estimated_amount), 0);
    const approvedAmount = enhancedClaims
      .filter(c => c.approval_status === 'approved')
      .reduce((sum, c) => sum + parseFloat(c.approved_amount || c.estimated_amount), 0);
    
    return {
      totalClaims,
      pendingClaims,
      approvedClaims,
      rejectedClaims,
      overdueClaims,
      totalAmount,
      approvedAmount,
      approvalRate: totalClaims > 0 ? ((approvedClaims / totalClaims) * 100).toFixed(1) : '0',
      averageAmount: totalClaims > 0 ? (totalAmount / totalClaims).toFixed(0) : '0',
    };
  }, [enhancedClaims]);

  // Approve/Reject mutations
  const approveMutation = useMutation({
    mutationFn: async ({ claimId, approvedAmount }: { claimId: number; approvedAmount?: string }) => {
      await authFetch(`/api/claims/${claimId}/approve/`, { 
        method: 'POST',
        body: JSON.stringify({ approved_amount: approvedAmount })
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claims"] });
      toast.success("Claim approved successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to approve claim"),
  });

  const rejectMutation = useMutation({
    mutationFn: async (claimId: number) => {
      await authFetch(`/api/claims/${claimId}/reject/`, { method: 'POST' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claims"] });
      toast.success("Claim rejected successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to reject claim"),
  });

  const handleApprove = (claim: Claim) => {
    setSelectedClaim(claim);
    setShowApprovalDialog(true);
  };

  const handleReject = (claim: Claim) => {
    setSelectedClaim(claim);
    setShowApprovalDialog(true);
  };

  const handleCloseApprovalDialog = () => {
    setShowApprovalDialog(false);
    setSelectedClaim(null);
  };

  if (claimsLoading) {
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
            <h1 className="text-3xl font-bold text-slate-900">Claims Management</h1>
            <p className="text-slate-600 mt-1">Process and monitor insurance claims</p>
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
                  Add Claim
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Claim</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                  <p className="text-muted-foreground">Claim creation form would go here...</p>
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
                  <div className="text-sm text-muted-foreground">Total Claims</div>
                  <div className="mt-2 text-3xl font-bold text-blue-600">{summaryStats.totalClaims}</div>
                  <div className="flex items-center mt-1 text-sm text-blue-600">
                    <FileText className="w-4 h-4 mr-1" />
                    ${summaryStats.totalAmount.toLocaleString()} total
                  </div>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Pending Claims</div>
                  <div className="mt-2 text-3xl font-bold text-orange-600">{summaryStats.pendingClaims}</div>
                  <div className="flex items-center mt-1 text-sm text-orange-600">
                    <Clock className="w-4 h-4 mr-1" />
                    {summaryStats.overdueClaims} overdue
                  </div>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Approved Claims</div>
                  <div className="mt-2 text-3xl font-bold text-green-600">{summaryStats.approvedClaims}</div>
                  <div className="flex items-center mt-1 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {summaryStats.approvalRate}% approval rate
                  </div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Avg. Claim Amount</div>
                  <div className="mt-2 text-3xl font-bold text-purple-600">
                    ${summaryStats.averageAmount}
                  </div>
                  <div className="flex items-center mt-1 text-sm text-purple-600">
                    <DollarSign className="w-4 h-4 mr-1" />
                    ${summaryStats.approvedAmount.toLocaleString()} paid
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="claims" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="pending">Pending Review</TabsTrigger>
          </TabsList>

          <TabsContent value="claims" className="space-y-6">
            {/* Filters and Search */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search claims, customers, vehicles, or descriptions..."
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
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="settled">Settled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter by approval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Approval Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="amount">Claim Amount</SelectItem>
                      <SelectItem value="incident">Incident Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Claims Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  All Claims
                  <Badge variant="outline" className="ml-2">
                    {filteredClaims.length} of {enhancedClaims.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Claim ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Incident Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Estimated Amount</TableHead>
                        <TableHead>Approved Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClaims.map((claim) => (
                        <TableRow key={claim.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              {claim.claim_id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {claim.customer ? 
                                  `${claim.customer.user.first_name} ${claim.customer.user.last_name}` : 
                                  'Unknown Customer'
                                }
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {claim.customer?.customer_id || 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {claim.vehicle ? claim.vehicle.vehicle_number : 'Unknown Vehicle'}
                                </div>
                                {claim.vehicle && (
                                  <div className="text-sm text-muted-foreground">
                                    {claim.vehicle.year} {claim.vehicle.make} {claim.vehicle.model}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(claim.incident_date).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {claim.daysSinceIncident} days ago
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={claim.description}>
                              {claim.description}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-orange-600">
                              ${claim.estimated_amount}
                            </div>
                            {claim.isHighValue && (
                              <Badge variant="destructive" className="text-xs">
                                High Value
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-green-600">
                              ${claim.approved_amount || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={claim.approval_status === 'approved' ? 'default' : 
                                       claim.approval_status === 'pending' ? 'secondary' : 'destructive'}
                                className="text-xs"
                              >
                                {claim.approval_status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                                {claim.approval_status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                {claim.approval_status === 'rejected' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                {claim.approval_status}
                              </Badge>
                              {claim.isOverdue && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(claim.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {claim.daysSinceCreated} days ago
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Link to={`/claims/${claim.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              {claim.approval_status === 'pending' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => handleApprove(claim)}
                                    disabled={approveMutation.isPending}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleReject(claim)}
                                    disabled={rejectMutation.isPending}
                                  >
                                    <AlertTriangle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
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
              {/* Claim Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Claim Status Distribution
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

              {/* Approval Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Approval Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={analyticsData.approvalStats}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {analyticsData.approvalStats.map((entry, index) => (
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
            </div>

            {/* Monthly Claims Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Monthly Claims Trends
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
                      <Bar yAxisId="left" dataKey="claims" fill="#22c55e" radius={[4, 4, 0, 0]} name="Claims Count" />
                      <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} name="Total Amount ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Claims Pending Review
                  <Badge variant="destructive" className="ml-2">
                    {summaryStats.pendingClaims} claims
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enhancedClaims
                    .filter(c => c.approval_status === 'pending')
                    .sort((a, b) => a.daysSinceCreated - b.daysSinceCreated)
                    .map((claim) => (
                      <div key={claim.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{claim.claim_id}</div>
                          <div className="text-sm text-muted-foreground">
                            {claim.customer ? 
                              `${claim.customer.user.first_name} ${claim.customer.user.last_name}` : 
                              'Unknown Customer'
                            } • {claim.vehicle ? claim.vehicle.vehicle_number : 'Unknown Vehicle'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Incident: {new Date(claim.incident_date).toLocaleDateString()} • 
                            Created: {claim.daysSinceCreated} days ago
                          </div>
                          <div className="text-sm text-muted-foreground max-w-md truncate">
                            {claim.description}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-orange-600">${claim.estimated_amount}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleApprove(claim)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleReject(claim)}
                              disabled={rejectMutation.isPending}
                            >
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                          {claim.isOverdue && (
                            <Badge variant="destructive" className="text-xs mt-2">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Claim Approval Dialog */}
        <ClaimApprovalDialog
          claim={selectedClaim as any}
          isOpen={showApprovalDialog}
          onClose={handleCloseApprovalDialog}
        />
      </div>
    </div>
  );
}
