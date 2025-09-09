import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles: ('customer' | 'manager' | 'underwriter')[];
  fallbackRoute?: string;
}

export default function RoleBasedRoute({ 
  children, 
  allowedRoles, 
  fallbackRoute 
}: RoleBasedRouteProps) {
  const { user, isAuthenticated, getDashboardRoute } = useAuth();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user data not loaded yet, show loading
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Check if user's role is in allowed roles
  const hasAccess = allowedRoles.includes(user.user.user_type);

  if (!hasAccess) {
    const redirectTo = fallbackRoute || getDashboardRoute();
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
