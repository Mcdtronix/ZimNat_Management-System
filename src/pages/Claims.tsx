import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ChevronRight, BarChart3, User, FileText, AlertTriangle, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const claimsData = [
  {
    id: 1,
    vehicleNo: "CAD22",
    estimation: "25000",
    status: "reject",
  },
  {
    id: 2,
    vehicleNo: "CBG41",
    estimation: "25000",
    status: "reject",
  },
  {
    id: 3,
    vehicleNo: "CNJ85",
    estimation: "25000",
    status: "approve",
  },
];

const Claims = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user] = useState({ name: "kumal sandaru" });

  const handleLogout = () => {
    navigate("/login");
  };

  const handleAction = (claimId: number, action: "approve" | "reject") => {
    toast({
      title: `Claim ${action}d`,
      description: `Claim ID ${claimId} has been ${action}d successfully.`,
    });
  };

  const handleGenerateReport = () => {
    toast({
      title: "Report Generated",
      description: "Claims report has been generated successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-white text-primary px-3 py-1 rounded font-bold text-lg">
              PEAK
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Hello {user.name} !</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-white/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-800 text-white min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            <div className="text-white font-semibold p-3">
              Customer list
            </div>
            
            <Link 
              to="/claims" 
              className="flex items-center justify-between p-3 rounded-lg bg-primary text-white font-medium"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5" />
                <span>Claims</span>
              </div>
            </Link>
            
            <Link 
              to="/payments" 
              className="flex items-center justify-between p-3 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span>Payments</span>
              </div>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Generate Report */}
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Claims Management</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Generate a report:</span>
              <Button 
                onClick={handleGenerateReport}
                className="bg-primary hover:bg-primary-dark"
              >
                Generate
              </Button>
            </div>
          </div>

          {/* Claims Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-primary">
                  <TableRow>
                    <TableHead className="text-white font-semibold">Claim ID</TableHead>
                    <TableHead className="text-white font-semibold">Vehicle No</TableHead>
                    <TableHead className="text-white font-semibold">Estimation(Rs)</TableHead>
                    <TableHead className="text-white font-semibold">Approval Status</TableHead>
                    <TableHead className="text-white font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claimsData.map((claim) => (
                    <TableRow key={claim.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{claim.id}</TableCell>
                      <TableCell>{claim.vehicleNo}</TableCell>
                      <TableCell>{claim.estimation}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={claim.status === "approve" ? "default" : "destructive"}
                          className={claim.status === "approve" ? "bg-green-600" : "bg-red-600"}
                        >
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(claim.id, "approve")}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(claim.id, "reject")}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-primary">3</div>
                <p className="text-sm text-muted-foreground">Total Claims</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-green-600">1</div>
                <p className="text-sm text-muted-foreground">Approved</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-red-600">2</div>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Claims;