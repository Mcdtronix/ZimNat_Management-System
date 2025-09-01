import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import MotorInsurance from "./pages/MotorInsurance";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Claims from "./pages/Claims";
import NotFound from "./pages/NotFound";
import Vehicles from "./pages/Vehicles";
import Policies from "./pages/Policies";
import ApplyPolicy from "./pages/ApplyPolicy";
import Inbox from "./pages/Inbox";
import CreateClaim from "./pages/CreateClaim";
import Profile from "./pages/Profile";
import UnderwriterDashboard from "./pages/UnderwriterDashboard";
import VehicleDetails from "./pages/VehicleDetails";
import PaymentCheckout from "./pages/PaymentCheckout";
import UnderwriterQuotes from "./pages/UnderwriterQuotes";
import PolicyDetails from "./pages/PolicyDetails";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout hideSidebar><Home /></Layout>} />
          <Route path="/about" element={<Layout hideSidebar><About /></Layout>} />
          <Route path="/contact" element={<Layout hideSidebar><Contact /></Layout>} />
          <Route path="/motor-insurance" element={<Layout hideSidebar><MotorInsurance /></Layout>} />
          <Route path="/login" element={<Layout><Login /></Layout>} />
          <Route path="/register" element={<Layout><Register /></Layout>} />
          <Route path="/verify-otp" element={<Layout><VerifyOtp /></Layout>} />
          <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
          <Route path="/reset-password/:uidb64/:token" element={<Layout><ResetPassword /></Layout>} />
          <Route
            path="/underwriter"
            element={
              <RoleProtectedRoute requiredUserTypes={["underwriter", "manager"]} requiredPermissions={["can_manage_policies", "can_manage_claims"]}>
                <Layout>
                  <UnderwriterDashboard />
                </Layout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/underwriter/quotes"
            element={
              <RoleProtectedRoute requiredUserTypes={["underwriter", "manager"]} requiredPermissions={["can_manage_policies"]}>
                <Layout>
                  <UnderwriterQuotes />
                </Layout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicles/:id"
            element={
              <RoleProtectedRoute requiredUserTypes={["underwriter", "manager"]}>
                <Layout>
                  <VehicleDetails />
                </Layout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/payments/checkout"
            element={
              <ProtectedRoute>
                <Layout>
                  <PaymentCheckout />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/claims"
            element={
              <ProtectedRoute>
                <Layout>
                  <Claims />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/policies"
            element={
              <ProtectedRoute>
                <Layout>
                  <Policies />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/policies/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <PolicyDetails />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply-policy"
            element={
              <ProtectedRoute>
                <Layout>
                  <ApplyPolicy />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inbox"
            element={
              <ProtectedRoute>
                <Layout>
                  <Inbox />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/claims/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateClaim />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicles"
            element={
              <ProtectedRoute>
                <Layout>
                  <Vehicles />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<Layout><NotFound /></Layout>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
