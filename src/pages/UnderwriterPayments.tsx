import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getAllPayments, verifyPayment, rejectPayment, exportPayments } from "@/lib/api";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Upload,
  DollarSign,
  CreditCard,
  Building2,
  Smartphone,
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Calendar,
  User,
  Shield,
  Receipt,
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

interface Payment {
  id: number;
  payment_id: string;
  policy_id: number;
  policy_number: string;
  customer_name: string;
  customer_email: string;
  amount: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_reference: string;
  payment_proof?: string;
  payment_date: string;
  verified_by?: string;
  verified_at?: string;
}

const COLORS = ["#0ea5e9", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#14b8a6"];

export default function UnderwriterPayments() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const paymentIdFromUrl = searchParams.get('payment');
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);

  const handleExport = async () => {
    try {
      await exportPayments();
      toast.success('Payments exported successfully');
    } catch (error) {
      console.error('Failed to export payments:', error);
      toast.error('Failed to export payments. Please try again.');
    }
  };

  // Data fetching
  const { data: paymentsRaw, isLoading } = useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: () => getAllPayments()
  });

  const payments = useMemo(() => {
    if (!paymentsRaw) return [];
    return Array.isArray(paymentsRaw) ? paymentsRaw : [];
  }, [paymentsRaw]);

  // Filtering and sorting
  const filteredPayments = useMemo(() => {
    let filtered = payments;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.payment_id.toLowerCase().includes(term) ||
        p.policy_number.toLowerCase().includes(term) ||
        p.customer_name.toLowerCase().includes(term) ||
        p.customer_email.toLowerCase().includes(term) ||
        p.transaction_reference.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Method filter
    if (methodFilter !== "all") {
      filtered = filtered.filter(p => p.payment_method === methodFilter);
    }

    // Sorting
    if (sortBy === "latest") {
      filtered.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
    } else if (sortBy === "amount") {
      filtered.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    } else if (sortBy === "status") {
      filtered.sort((a, b) => a.status.localeCompare(b.status));
    }

    return filtered;
  }, [payments, searchTerm, statusFilter, methodFilter, sortBy]);

  // Analytics data
  const analyticsData = useMemo(() => {
    const statusStats = new Map<string, number>();
    const methodStats = new Map<string, number>();
    const monthlyStats = new Map<string, { payments: number; revenue: number }>();
    
    payments.forEach(payment => {
      // Status stats
      statusStats.set(payment.status, (statusStats.get(payment.status) || 0) + 1);
      
      // Method stats
      methodStats.set(payment.payment_method, (methodStats.get(payment.payment_method) || 0) + 1);
      
      // Monthly stats
      const month = new Date(payment.payment_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyStats.has(month)) {
        monthlyStats.set(month, { payments: 0, revenue: 0 });
      }
      const monthData = monthlyStats.get(month)!;
      monthData.payments += 1;
      if (payment.status === 'completed') {
        monthData.revenue += parseFloat(payment.amount);
      }
    });

    return {
      statusStats: Array.from(statusStats.entries()).map(([name, value]) => ({ name, value })),
      methodStats: Array.from(methodStats.entries()).map(([name, value]) => ({ name, value })),
      monthlyStats: Array.from(monthlyStats.entries()).map(([name, data]) => ({ name, ...data })),
    };
  }, [payments]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalPayments = payments.length;
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const completedPayments = payments.filter(p => p.status === 'completed').length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;
    const totalRevenue = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    return {
      totalPayments,
      pendingPayments,
      completedPayments,
      failedPayments,
      totalRevenue,
      completionRate: totalPayments > 0 ? ((completedPayments / totalPayments) * 100).toFixed(1) : '0',
    };
  }, [payments]);

  // Auto-select payment from URL parameter
  useEffect(() => {
    if (paymentIdFromUrl && payments.length > 0) {
      const payment = payments.find(p => p.payment_id === paymentIdFromUrl);
      if (payment && payment.status === 'pending' && payment.payment_method === 'bank_transfer') {
        setSelectedPayment(payment);
        setShowVerifyDialog(true);
        toast.success(`Selected payment ${payment.payment_id} for verification`);
      }
    }
  }, [paymentIdFromUrl, payments]);

  // Verify payment mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, file }: { paymentId: string; file: File }) => {
      return verifyPayment(paymentId, file);
    },
    onSuccess: () => {
      toast.success("Payment verified successfully!");
      setShowVerifyDialog(false);
      setSelectedPayment(null);
      setPaymentProofFile(null);
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to verify payment"),
  });

  // Reject payment mutation
  const rejectPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return rejectPayment(paymentId);
    },
    onSuccess: () => {
      toast.success("Payment rejected successfully!");
      setShowRejectDialog(false);
      setSelectedPayment(null);
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to reject payment"),
  });

  const handleVerifyPayment = () => {
    if (!selectedPayment || !paymentProofFile) {
      toast.error("Please select a payment proof file");
      return;
    }
    verifyPaymentMutation.mutate({ paymentId: selectedPayment.payment_id, file: paymentProofFile });
  };

  const handleRejectPayment = () => {
    if (!selectedPayment) return;
    rejectPaymentMutation.mutate(selectedPayment.payment_id);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="w-4 h-4" />;
      case 'bank_transfer':
        return <Building2 className="w-4 h-4" />;
      case 'ecocash':
      case 'onemoney':
        return <Smartphone className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  if (isLoading) {
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
            <h1 className="text-3xl font-bold text-slate-900">Payment Management</h1>
            <p className="text-slate-600 mt-1">Manage and verify customer payments</p>
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
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Payments</div>
                  <div className="mt-2 text-3xl font-bold text-blue-600">{summaryStats.totalPayments}</div>
                  <div className="flex items-center mt-1 text-sm text-blue-600">
                    <Receipt className="w-4 h-4 mr-1" />
                    All time
                  </div>
                </div>
                <Receipt className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Pending Verification</div>
                  <div className="mt-2 text-3xl font-bold text-orange-600">{summaryStats.pendingPayments}</div>
                  <div className="flex items-center mt-1 text-sm text-orange-600">
                    <Clock className="w-4 h-4 mr-1" />
                    Awaiting verification
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
                  <div className="text-sm text-muted-foreground">Completed Payments</div>
                  <div className="mt-2 text-3xl font-bold text-green-600">{summaryStats.completedPayments}</div>
                  <div className="flex items-center mt-1 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {summaryStats.completionRate}% completion rate
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
                    From completed payments
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payments">All Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-6">
            {/* Filters and Search */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search payments, customers, or transaction references..."
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
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter by method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="debit_card">Debit Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="ecocash">EcoCash</SelectItem>
                      <SelectItem value="onemoney">OneMoney</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Payments Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  All Payments
                  <Badge variant="outline" className="ml-2">
                    {filteredPayments.length} of {payments.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Policy</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Verified By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Receipt className="w-4 h-4 text-blue-600" />
                              {payment.payment_id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payment.customer_name}</div>
                              <div className="text-sm text-muted-foreground">{payment.customer_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-muted-foreground" />
                              <div className="font-medium">{payment.policy_number}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-green-600">
                              ${parseFloat(payment.amount).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(payment.payment_method)}
                              <span className="text-sm capitalize">
                                {payment.payment_method.replace('_', ' ')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(payment.payment_date).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {payment.verified_by || 'N/A'}
                            </div>
                            {payment.verified_at && (
                              <div className="text-xs text-muted-foreground">
                                {new Date(payment.verified_at).toLocaleDateString()}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Button size="sm" variant="outline" title="View Details">
                                <Eye className="w-4 h-4" />
                              </Button>
                              {payment.status === 'pending' && payment.payment_method === 'bank_transfer' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setShowVerifyDialog(true);
                                    }}
                                    title="Verify Payment"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setShowRejectDialog(true);
                                    }}
                                    title="Reject Payment"
                                  >
                                    <XCircle className="w-4 h-4" />
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
              {/* Payment Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Payment Status Distribution
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

              {/* Payment Method Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Payment Methods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.methodStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Verify Payment Dialog */}
        <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verify Bank Transfer Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPayment && (
                <div className="space-y-2">
                  <p><strong>Payment ID:</strong> {selectedPayment.payment_id}</p>
                  <p><strong>Customer:</strong> {selectedPayment.customer_name}</p>
                  <p><strong>Policy:</strong> {selectedPayment.policy_number}</p>
                  <p><strong>Amount:</strong> ${parseFloat(selectedPayment.amount).toLocaleString()}</p>
                </div>
              )}
              <div>
                <Label htmlFor="payment-proof">Upload Payment Proof</Label>
                <Input
                  id="payment-proof"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a copy of the bank transfer slip or receipt
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleVerifyPayment}
                  disabled={verifyPaymentMutation.isPending || !paymentProofFile}
                >
                  {verifyPaymentMutation.isPending ? "Verifying..." : "Verify Payment"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject Payment Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPayment && (
                <div className="space-y-2">
                  <p><strong>Payment ID:</strong> {selectedPayment.payment_id}</p>
                  <p><strong>Customer:</strong> {selectedPayment.customer_name}</p>
                  <p><strong>Policy:</strong> {selectedPayment.policy_number}</p>
                  <p><strong>Amount:</strong> ${parseFloat(selectedPayment.amount).toLocaleString()}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Are you sure you want to reject this payment? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleRejectPayment}
                  disabled={rejectPaymentMutation.isPending}
                >
                  {rejectPaymentMutation.isPending ? "Rejecting..." : "Reject Payment"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}




