import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { clearAuthTokens, getAuthToken, loginApi, registerApi, setAuthTokens, getUserPermissions } from "@/lib/api";

interface UserPermissions {
  can_view_dashboard: boolean;
  can_manage_vehicles: boolean;
  can_apply_policies: boolean;
  can_submit_claims: boolean;
  can_process_claims: boolean;
  can_approve_claims: boolean;
  can_quote_policies: boolean;
  can_manage_customers: boolean;
  can_view_all_data: boolean;
  is_staff: boolean;
  is_customer: boolean;
  is_manager: boolean;
  is_underwriter: boolean;
  needs_profile_setup?: boolean;
}

interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'customer' | 'manager' | 'underwriter';
  is_active: boolean;
}

interface CustomerProfile {
  customer_id: string;
  address_no: string;
  street: string;
  town: string;
  date_registered: string;
}

interface AuthUser {
  user: UserData;
  permissions: UserPermissions;
  customer_profile: CustomerProfile | null;
  dashboard_route: string;
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAuthToken());

  useEffect(() => {
    const sync = () => setIsAuthenticated(!!getAuthToken());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // Fetch user permissions and profile data
  const { data: authUser, refetch: refetchUser } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: getUserPermissions,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const login = useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      setAuthTokens(data.access, data.refresh);
      // Refetch user data after successful login
      refetchUser();
    },
  });

  const register = useMutation({
    mutationFn: registerApi,
    // Registration now requires OTP verification. Do NOT set tokens here.
  });

  function logout() {
    clearAuthTokens();
    // storage event fired by clearAuthTokens; state will sync via listener
  }

  // Helper functions for role checking
  const isCustomer = authUser?.permissions?.is_customer ?? false;
  const isStaff = authUser?.permissions?.is_staff ?? false;
  const isManager = authUser?.permissions?.is_manager ?? false;
  const isUnderwriter = authUser?.permissions?.is_underwriter ?? false;
  
  // Get appropriate dashboard route
  const getDashboardRoute = () => {
    if (!authUser) return '/dashboard';
    return authUser.dashboard_route;
  };

  return { 
    isAuthenticated, 
    login, 
    register, 
    logout, 
    user: authUser,
    isCustomer,
    isStaff,
    isManager,
    isUnderwriter,
    getDashboardRoute,
    refetchUser
  };
}
