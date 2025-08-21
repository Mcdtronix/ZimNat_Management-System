import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, BarChart3, User, FileText, AlertTriangle, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer 
} from "recharts";

const chartData = [
  { year: "2020", value: 35 },
  { year: "2021", value: 49 },
  { year: "2022", value: 44 },
  { year: "2023", value: 24 },
  { year: "2024", value: 52 },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [user] = useState({ name: "kumal sandaru", role: "Chief Engineer" });

  const handleLogout = () => {
    navigate("/login");
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
        <aside className="w-64 bg-white shadow-sm min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            <Link 
              to="/dashboard" 
              className="flex items-center justify-between p-3 rounded-lg bg-gray-100 text-gray-900 font-medium"
            >
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-5 w-5" />
                <span>Dashboard</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Link>
            
            <Link 
              to="/profile" 
              className="flex items-center justify-between p-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5" />
                <span>My Profile</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Link>
            
            <Link 
              to="/claims" 
              className="flex items-center justify-between p-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5" />
                <span>Claim List</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Link>
            
            <Link 
              to="/claim-intimation" 
              className="flex items-center justify-between p-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5" />
                <span>Claim Intimation</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
            <span>Dashboard</span>
            <ChevronRight className="h-4 w-4" />
            <span>Chief engineer Dashboard</span>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Chief Engineer Dashboard</h1>
              <p className="text-muted-foreground">content here</p>
            </div>

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Analytics Overview</span>
                  <Badge variant="secondary" className="text-xs">undefined</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="year" 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="#00B4D8"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-primary">52</div>
                  <p className="text-sm text-muted-foreground">Total Claims (2024)</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-green-600">24</div>
                  <p className="text-sm text-muted-foreground">Approved Claims</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-orange-600">28</div>
                  <p className="text-sm text-muted-foreground">Pending Claims</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;