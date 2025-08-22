import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthToken } from "@/lib/api";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const check = () => {
      const token = getAuthToken();
      if (!token) {
        navigate("/login", { replace: true, state: { from: location } });
      }
    };

    // initial check
    check();
    // react to token changes (logout or refresh failure clears tokens)
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, [navigate, location]);

  return <>{children}</>;
}
