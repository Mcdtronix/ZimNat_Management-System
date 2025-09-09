import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'customer' | 'manager' | 'underwriter' | 'staff';
  requireStaff?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  requireStaff = false 
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, isCustomer, isStaff, isManager, isUnderwriter, getDashboardRoute } = useAuth();

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      navigate("/login", { replace: true, state: { from: location } });
      return;
    }

    // Check role-based access if user data is available
    if (user) {
      // If staff access is required but user is not staff
      if (requireStaff && !isStaff) {
        navigate(getDashboardRoute(), { replace: true });
        return;
      }

      // Check specific role requirements
      if (requiredRole) {
        let hasAccess = false;
        
        switch (requiredRole) {
          case 'customer':
            hasAccess = isCustomer;
            break;
          case 'manager':
            hasAccess = isManager;
            break;
          case 'underwriter':
            hasAccess = isUnderwriter;
            break;
          case 'staff':
            hasAccess = isStaff;
            break;
        }

        if (!hasAccess) {
          navigate(getDashboardRoute(), { replace: true });
          return;
        }
      }

      // Redirect customers trying to access staff routes
      if (isCustomer && (location.pathname.includes('/admin') || location.pathname.includes('/manage'))) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // Redirect staff trying to access customer-only routes
      if (isStaff && location.pathname.includes('/apply')) {
        navigate('/admin-dashboard', { replace: true });
        return;
      }
    }
  }, [isAuthenticated, user, navigate, location, requiredRole, requireStaff, isCustomer, isStaff, isManager, isUnderwriter, getDashboardRoute]);

  // Show loading while checking authentication and permissions
  if (!isAuthenticated || (isAuthenticated && !user)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}
