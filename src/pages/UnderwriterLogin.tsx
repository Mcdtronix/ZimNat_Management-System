import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getAuthToken, getUserPermissions } from "@/lib/api";
import { Shield, ArrowLeft, Building2 } from "lucide-react";

const UnderwriterLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, logout } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      
      // Check user permissions after login
      try {
        const perms = await getUserPermissions();
        const userType = perms?.user?.user_type;
        
        console.log("UnderwriterLogin - Full permissions response:", perms);
        console.log("UnderwriterLogin - User type:", userType);
        console.log("UnderwriterLogin - User object:", perms?.user);
        console.log("UnderwriterLogin - Permissions object:", perms?.permissions);
          
        // Only allow underwriters and managers to access underwriter dashboard
        if (userType === "underwriter" || userType === "manager") {
          toast({ 
            title: "Login Successful", 
            description: `Welcome back, ${perms?.user?.first_name || 'Underwriter'}!` 
          });
          console.log("UnderwriterLogin - Navigating to /underwriter/dashboard");
          navigate("/underwriter/dashboard", { replace: true });
        } else {
          // If user is not an underwriter/manager, show access denied message
          toast({ 
            title: "Access Denied", 
            description: "You do not have permission to access the underwriter portal. Please contact your administrator if you believe this is an error.",
            variant: "destructive"
          });
          
          // Clear the form and logout the user to prevent confusion
          setEmail("");
          setPassword("");
          logout(); // Logout the user to prevent any session confusion
        }
      } catch (error) {
        // If we can't get permissions, show a generic error
        toast({
          title: "Access Error",
          description: "Unable to verify your permissions. Please try again or contact support.",
          variant: "destructive",
        });
        setEmail("");
        setPassword("");
      }
    } catch (err: any) {
      // Handle login failures (incorrect credentials)
      const errorMessage = err?.data?.detail || err?.message || "Invalid credentials";
      
      toast({
        title: "Login Failed",
        description: errorMessage.includes("credentials") || errorMessage.includes("password") || errorMessage.includes("email") 
          ? "Invalid email or password. Please check your credentials and try again."
          : errorMessage,
        variant: "destructive",
      });
      
      // Clear the form on login failure
      setEmail("");
      setPassword("");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        {/* Header with back button */}
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-primary">Underwriter Portal</h1>
          <p className="text-muted-foreground">Access your underwriter dashboard</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Staff Login</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your underwriter/manager credentials to access the portal
            </p>
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>Restricted Access:</strong> This portal is only accessible to authorized underwriters and managers.
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Work Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="h-11"
                />
              </div>

              <div className="text-right">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Forgot Password? Reset Here
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium"
                disabled={login.isPending}
              >
                {login.isPending ? "Signing in..." : "Sign In to Portal"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Looking for customer access?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Customer Login
                </Link>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Only authorized staff members can access this portal
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional info for underwriters */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <Building2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">Underwriter Portal</h3>
              <p className="text-xs text-blue-700 mt-1">
                This portal is for underwriters and managers only. You can review policies, 
                process claims, generate quotations, and manage customer accounts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnderwriterLogin;
