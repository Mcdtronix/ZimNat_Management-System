import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthToken, getUserPermissions } from "@/lib/api";

interface RoleProtectedRouteProps {
  children: ReactNode;
  requiredUserTypes?: string[]; // e.g., ["underwriter", "manager"]
  requiredPermissions?: string[]; // keys from /api/user-permissions
}

type Perms = {
  user?: {
    user_type?: string;
    [k: string]: any;
  };
  permissions?: {
    [k: string]: any;
  };
  [k: string]: any;
};

export default function RoleProtectedRoute({ children, requiredUserTypes, requiredPermissions }: RoleProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [perms, setPerms] = useState<Perms | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate("/login", { replace: true, state: { from: location } });
      return;
    }
    
    getUserPermissions()
      .then((data) => {
        setPerms(data);
      })
      .catch((e) => setError(e?.message || "Failed to load permissions"));
  }, [navigate, location]);

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }
  if (!perms) {
    return <div className="p-6 text-sm text-muted-foreground">Loading permissions...</div>;
  }

  const userType = perms?.user?.user_type;
  const hasUserType = !requiredUserTypes || (userType && requiredUserTypes.includes(userType));
  const hasPerms = !requiredPermissions || requiredPermissions.every((k) => !!perms?.permissions?.[k]);

  console.log("RoleProtectedRoute - Permissions data:", perms);
  console.log("RoleProtectedRoute - User type:", userType);
  console.log("RoleProtectedRoute - Required user types:", requiredUserTypes);
  console.log("RoleProtectedRoute - Has user type:", hasUserType);
  console.log("RoleProtectedRoute - Required permissions:", requiredPermissions);
  console.log("RoleProtectedRoute - Has permissions:", hasPerms);

  if (!hasUserType || !hasPerms) {
    return (
      <div className="p-6">
        <div className="rounded border bg-card text-card-foreground p-6">
          <h2 className="font-semibold mb-2">Not authorized</h2>
          <p className="text-sm text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
