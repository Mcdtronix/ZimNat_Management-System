import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthToken } from "@/lib/api";

interface RoleProtectedRouteProps {
  children: ReactNode;
  requiredUserTypes?: string[]; // e.g., ["underwriter", "manager"]
  requiredPermissions?: string[]; // keys from /api/user-permissions
}

type Perms = {
  user_type?: string;
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
    const controller = new AbortController();
    fetch("/api/user-permissions/", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(setPerms)
      .catch((e) => setError(e?.message || "Failed to load permissions"));
    return () => controller.abort();
  }, [navigate, location]);

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }
  if (!perms) {
    return <div className="p-6 text-sm text-muted-foreground">Loading permissions...</div>;
  }

  const hasUserType = !requiredUserTypes || requiredUserTypes.includes(perms.user_type);
  const hasPerms = !requiredPermissions || requiredPermissions.every((k) => !!perms[k]);

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
