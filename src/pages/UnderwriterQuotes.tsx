import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getAuthToken, apiFetch, exportQuotations } from "@/lib/api";
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
  Send,
  Copy,
  ExternalLink,
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
  status: string;
  created_at: string;
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

interface Coverage { 
  id: number; 
  name: string; 
  display_name?: string;
  description?: string;
}

interface Quotation {
  id: number;
  quote_id: string;
  policy: number | Policy;
  customer: number | Customer;
  premium_amount: string;
  coverage_amount: string;
  currency: string;
  terms?: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  created_at: string;
  expires_at?: string;
  sent_at?: string;
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

export default function UnderwriterQuotes() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const policyIdFromUrl = searchParams.get('policy');
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [selectedPolicy, setSelectedPolicy] = useState<number | null>(null);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  const handleExport = async () => {
    try {
      await exportQuotations();
      toast.success('Quotations exported successfully');
    } catch (error) {
      console.error('Failed to export quotations:', error);
      toast.error('Failed to export quotations. Please try again.');
    }
  };

  // Form state for quote generation
  const [premium, setPremium] = useState<string>("");
  const [coverageAmt, setCoverageAmt] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [terms, setTerms] = useState<string>("");
  const [validityDays, setValidityDays] = useState<string>("30");

  // Data fetching
  const { data: pendingPoliciesRaw, isLoading: policiesLoading } = useQuery<Policy[]>({
    queryKey: ["policies", "pending"],
    queryFn: () => authFetch("/api/policies/?status=pending")
  });

  const { data: vehiclesRaw } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => authFetch("/api/vehicles/")
  });

  const { data: coveragesRaw } = useQuery<Coverage[]>({
    queryKey: ["coverages"],
    queryFn: () => authFetch("/api/insurance-coverages/")
  });

  const { data: customersRaw } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => authFetch("/api/customers/")
  });

  const { data: quotationsRaw, isLoading: quotationsLoading } = useQuery<Quotation[]>({
    queryKey: ["quotations"],
    queryFn: () => authFetch("/api/quotations/")
  });

  // Normalize data
  const pendingPolicies = useMemo(() => normalize<Policy>(pendingPoliciesRaw), [pendingPoliciesRaw]);
  const vehicles = useMemo(() => normalize<Vehicle>(vehiclesRaw), [vehiclesRaw]);
  const coverages = useMemo(() => normalize<Coverage>(coveragesRaw), [coveragesRaw]);
  const customers = useMemo(() => normalize<Customer>(customersRaw), [customersRaw]);
  const quotations = useMemo(() => normalize<Quotation>(quotationsRaw), [quotationsRaw]);

  // Create lookup maps
  const customerMap = useMemo(() => {
    const map = new Map<number, Customer>();
    customers.forEach(c => map.set(c.id, c));
    return map;
  }, [customers]);

  const vehicleMap = useMemo(() => {
    const map = new Map<number, Vehicle>();
    vehicles.forEach(v => map.set(v.id, v));
    return map;
  }, [vehicles]);

  const coverageMap = useMemo(() => {
    const map = new Map<number, Coverage>();
    coverages.forEach(c => map.set(c.id, c));
    return map;
  }, [coverages]);

  // Enhanced policy data with related information
  const enhancedPolicies = useMemo(() => {
    return pendingPolicies.map(policy => {
      const customer = typeof policy.customer === 'object' ? policy.customer : customerMap.get(policy.customer);
      const vehicle = typeof policy.vehicle === 'object' ? policy.vehicle : vehicleMap.get(policy.vehicle);
      const coverage = typeof policy.coverage === 'object' ? policy.coverage : coverageMap.get(policy.coverage);
      
      return {
        ...policy,
        customer,
        vehicle,
        coverage,
      };
    });
  }, [pendingPolicies, customerMap, vehicleMap, coverageMap]);

  // Enhanced quotation data
  const enhancedQuotations = useMemo(() => {
    return quotations.map(quotation => {
      const customer = typeof quotation.customer === 'object' ? quotation.customer : customerMap.get(quotation.customer);
      const policy = typeof quotation.policy === 'object' ? quotation.policy : null;
      
      return {
        ...quotation,
        customer,
        policy,
      };
    });
  }, [quotations, customerMap]);

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

    // Sorting
    if (sortBy === "latest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "policy") {
      filtered.sort((a, b) => a.policy_number.localeCompare(b.policy_number));
    }

    return filtered;
  }, [enhancedPolicies, searchTerm, sortBy]);

  const filteredQuotations = useMemo(() => {
    let filtered = enhancedQuotations;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.quote_id.toLowerCase().includes(term) ||
        (q.customer && (
          q.customer.user.first_name.toLowerCase().includes(term) ||
          q.customer.user.last_name.toLowerCase().includes(term)
        ))
      );
    }

    // Sorting
    if (sortBy === "latest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "status") {
      filtered.sort((a, b) => a.status.localeCompare(b.status));
    }

    return filtered;
  }, [enhancedQuotations, statusFilter, searchTerm, sortBy]);

  // Analytics data
  const analyticsData = useMemo(() => {
    const statusStats = new Map<string, number>();
    const monthlyStats = new Map<string, { quotes: number; revenue: number }>();
    
    enhancedQuotations.forEach(quotation => {
      // Status stats
      statusStats.set(quotation.status, (statusStats.get(quotation.status) || 0) + 1);
      
      // Monthly stats
      const month = new Date(quotation.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyStats.has(month)) {
        monthlyStats.set(month, { quotes: 0, revenue: 0 });
      }
      const monthData = monthlyStats.get(month)!;
      monthData.quotes += 1;
      monthData.revenue += parseFloat(quotation.premium_amount);
    });

    return {
      statusStats: Array.from(statusStats.entries()).map(([name, value]) => ({ name, value })),
      monthlyStats: Array.from(monthlyStats.entries()).map(([name, data]) => ({ name, ...data })),
    };
  }, [enhancedQuotations]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalQuotes = enhancedQuotations.length;
    const pendingQuotes = enhancedQuotations.filter(q => q.status === 'pending').length;
    const acceptedQuotes = enhancedQuotations.filter(q => q.status === 'accepted').length;
    const rejectedQuotes = enhancedQuotations.filter(q => q.status === 'rejected').length;
    const totalRevenue = enhancedQuotations
      .filter(q => q.status === 'accepted')
      .reduce((sum, q) => sum + parseFloat(q.premium_amount), 0);
    
    return {
      totalQuotes,
      pendingQuotes,
      acceptedQuotes,
      rejectedQuotes,
      totalRevenue,
      acceptanceRate: totalQuotes > 0 ? ((acceptedQuotes / totalQuotes) * 100).toFixed(1) : '0',
    };
  }, [enhancedQuotations]);

  // Auto-select policy from URL parameter
  useEffect(() => {
    if (policyIdFromUrl && enhancedPolicies.length > 0) {
      const policyId = parseInt(policyIdFromUrl);
      const policy = enhancedPolicies.find(p => p.id === policyId);
      if (policy) {
        setSelectedPolicy(policyId);
        setShowQuoteDialog(true);
        toast.success(`Selected policy ${policy.policy_number} for quotation`);
      }
    }
  }, [policyIdFromUrl, enhancedPolicies]);

  // Quote generation mutation
  const quoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPolicy) throw new Error("Select a policy");
      if (!premium || !coverageAmt) throw new Error("Premium amount and coverage amount are required");
      
      const body = { 
        premium_amount: premium, 
        coverage_amount: coverageAmt, 
        currency, 
        validity_days: parseInt(validityDays),
        ...(terms ? { terms } : {}) 
      };
      
      return authFetch(`/api/policies/${selectedPolicy}/quote/`, { 
        method: "POST", 
        body: JSON.stringify(body) 
      });
    },
    onSuccess: () => {
      toast.success("Quotation created successfully!");
      setPremium("");
      setCoverageAmt("");
      setTerms("");
      setValidityDays("30");
      setSelectedPolicy(null);
      setShowQuoteDialog(false);
      qc.invalidateQueries({ queryKey: ["policies", "pending"] });
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create quotation"),
  });

  // Send quotation mutation
  const sendQuotationMutation = useMutation({
    mutationFn: async (quotationId: number) => {
      return authFetch(`/api/quotations/${quotationId}/send/`, { method: "POST" });
    },
    onSuccess: () => {
      toast.success("Quotation sent to customer successfully!");
      setShowSendDialog(false);
      setSelectedQuotation(null);
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to send quotation"),
  });

  // Delete quotation mutation
  const deleteQuotationMutation = useMutation({
    mutationFn: async (quotationId: number) => {
      return authFetch(`/api/quotations/${quotationId}/`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Quotation deleted successfully!");
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete quotation"),
  });

  const handleSendQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowSendDialog(true);
  };

  const handleDeleteQuotation = (quotation: Quotation) => {
    if (window.confirm(`Are you sure you want to delete quotation ${quotation.quote_id}?`)) {
      deleteQuotationMutation.mutate(quotation.id);
    }
  };

  const copyQuoteLink = (quotation: Quotation) => {
    const link = `${window.location.origin}/quotes/${quotation.quote_id}`;
    navigator.clipboard.writeText(link);
    toast.success("Quote link copied to clipboard!");
  };

  if (policiesLoading || quotationsLoading) {
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
            <h1 className="text-3xl font-bold text-slate-900">Quotes Management</h1>
            <p className="text-slate-600 mt-1">Generate and manage insurance quotations</p>
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
            <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Quote
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Generate New Quotation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Policy</Label>
                    <Select value={selectedPolicy ? String(selectedPolicy) : ""} onValueChange={(value) => setSelectedPolicy(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a pending policy" />
                      </SelectTrigger>
                      <SelectContent>
                        {enhancedPolicies.map((policy) => (
                          <SelectItem key={policy.id} value={String(policy.id)}>
                            {policy.policy_number} - {policy.customer ? `${policy.customer.user.first_name} ${policy.customer.user.last_name}` : 'Unknown Customer'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Premium Amount</Label>
                      <Input 
                        type="number" 
                        value={premium} 
                        onChange={(e) => setPremium(e.target.value)} 
                        placeholder="e.g. 120.00" 
                      />
                    </div>
                    <div>
                      <Label>Coverage Amount</Label>
                      <Input 
                        type="number" 
                        value={coverageAmt} 
                        onChange={(e) => setCoverageAmt(e.target.value)} 
                        placeholder="e.g. 5000.00" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Currency</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger>
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="ZWL">ZWL</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Validity (Days)</Label>
                      <Input 
                        type="number" 
                        value={validityDays} 
                        onChange={(e) => setValidityDays(e.target.value)} 
                        placeholder="30" 
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Terms & Conditions (Optional)</Label>
                    <Textarea 
                      value={terms} 
                      onChange={(e) => setTerms(e.target.value)} 
                      placeholder="Enter custom terms and conditions..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowQuoteDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => quoteMutation.mutate()} 
                      disabled={quoteMutation.isPending || !selectedPolicy || !premium || !coverageAmt}
                    >
                      {quoteMutation.isPending ? "Creating..." : "Create Quotation"}
                    </Button>
                  </div>
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
                  <div className="text-sm text-muted-foreground">Total Quotes</div>
                  <div className="mt-2 text-3xl font-bold text-blue-600">{summaryStats.totalQuotes}</div>
                  <div className="flex items-center mt-1 text-sm text-blue-600">
                    <FileText className="w-4 h-4 mr-1" />
                    All time
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
                  <div className="text-sm text-muted-foreground">Pending Quotes</div>
                  <div className="mt-2 text-3xl font-bold text-orange-600">{summaryStats.pendingQuotes}</div>
                  <div className="flex items-center mt-1 text-sm text-orange-600">
                    <Clock className="w-4 h-4 mr-1" />
                    Awaiting response
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
                  <div className="text-sm text-muted-foreground">Accepted Quotes</div>
                  <div className="mt-2 text-3xl font-bold text-green-600">{summaryStats.acceptedQuotes}</div>
                  <div className="flex items-center mt-1 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {summaryStats.acceptanceRate}% acceptance rate
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
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                  <div className="mt-2 text-3xl font-bold text-purple-600">
                    ${summaryStats.totalRevenue.toLocaleString()}
                  </div>
                  <div className="flex items-center mt-1 text-sm text-purple-600">
                    <DollarSign className="w-4 h-4 mr-1" />
                    From accepted quotes
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="quotes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quotes">Quotations</TabsTrigger>
            <TabsTrigger value="policies">Pending Policies</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="quotes" className="space-y-6">
            {/* Filters and Search */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search quotations, customers, or quote IDs..."
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Quotations Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  All Quotations
                  <Badge variant="outline" className="ml-2">
                    {filteredQuotations.length} of {enhancedQuotations.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quote ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Policy</TableHead>
                        <TableHead>Premium</TableHead>
                        <TableHead>Coverage</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuotations.map((quotation) => (
                        <TableRow key={quotation.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              {quotation.quote_id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {quotation.customer ? 
                                  `${quotation.customer.user.first_name} ${quotation.customer.user.last_name}` : 
                                  'Unknown Customer'
                                }
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {quotation.customer?.user.email || 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {quotation.policy ? quotation.policy.policy_number : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-green-600">
                              {quotation.currency} {quotation.premium_amount}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {quotation.currency} {quotation.coverage_amount}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {quotation.currency}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={quotation.status === 'accepted' ? 'default' : 
                                     quotation.status === 'pending' ? 'secondary' : 
                                     quotation.status === 'rejected' ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              {quotation.status === 'accepted' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {quotation.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                              {quotation.status === 'rejected' && <AlertTriangle className="w-3 h-3 mr-1" />}
                              {quotation.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(quotation.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {quotation.expires_at ? new Date(quotation.expires_at).toLocaleDateString() : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Button size="sm" variant="outline" title="View Quote">
                                <Eye className="w-4 h-4" />
                              </Button>
                              {quotation.status === 'pending' && (
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => handleSendQuotation(quotation)}
                                  title="Send to Customer"
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => copyQuoteLink(quotation)}
                                title="Copy Quote Link"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDeleteQuotation(quotation)}
                                title="Delete Quote"
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
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="policy">Policy Number</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Pending Policies Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Pending Policies
                  <Badge variant="outline" className="ml-2">
                    {filteredPolicies.length} policies
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
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
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
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {policy.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(policy.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Link to={`/policies/${policy.id}`}>
                                <Button size="sm" variant="outline" title="View Details">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => {
                                  setSelectedPolicy(policy.id);
                                  setShowQuoteDialog(true);
                                }}
                                title="Generate Quote"
                              >
                                <FileText className="w-4 h-4" />
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
              {/* Quote Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Quote Status Distribution
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

              {/* Monthly Quote Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Monthly Quote Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.monthlyStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="quotes" fill="#22c55e" radius={[4, 4, 0, 0]} name="Quotes Count" />
                        <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} name="Revenue ($)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Send Quotation Dialog */}
        <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Quotation to Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedQuotation && (
                <div className="space-y-2">
                  <p><strong>Quote ID:</strong> {selectedQuotation.quote_id}</p>
                  <p><strong>Customer:</strong> {selectedQuotation.customer ? `${selectedQuotation.customer.user.first_name} ${selectedQuotation.customer.user.last_name}` : 'Unknown'}</p>
                  <p><strong>Premium:</strong> {selectedQuotation.currency} {selectedQuotation.premium_amount}</p>
                  <p><strong>Coverage:</strong> {selectedQuotation.currency} {selectedQuotation.coverage_amount}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                This will send the quotation to the customer via email and SMS (if available).
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => selectedQuotation && sendQuotationMutation.mutate(selectedQuotation.id)}
                  disabled={sendQuotationMutation.isPending}
                >
                  {sendQuotationMutation.isPending ? "Sending..." : "Send Quotation"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}