import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { clearAuthTokens, getAuthToken, loginApi, registerApi, setAuthTokens } from "@/lib/api";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAuthToken());

  useEffect(() => {
    const sync = () => setIsAuthenticated(!!getAuthToken());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const login = useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      setAuthTokens(data.access, data.refresh);
      // storage event fired by setAuthTokens; state will sync via listener
    },
  });

  const register = useMutation({
    mutationFn: registerApi,
    onSuccess: (data) => {
      setAuthTokens(data.access, data.refresh);
      // storage event fired by setAuthTokens; state will sync via listener
    },
  });

  function logout() {
    clearAuthTokens();
    // storage event fired by clearAuthTokens; state will sync via listener
  }

  return { isAuthenticated, login, register, logout };
}
