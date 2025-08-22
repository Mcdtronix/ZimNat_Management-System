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
