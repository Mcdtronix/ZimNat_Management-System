import { Link, useLocation } from "react-router-dom";
import { ChevronRight, BarChart3, FileText, AlertTriangle, Inbox, Car } from "lucide-react";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/api";

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const location = useLocation();
  const { data: perms } = useQuery({
    queryKey: ["user-permissions"],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch("/api/user-permissions/", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Failed to load permissions");
      return res.json();
    },
  });
  const isUnderwriter = perms?.user_type === "underwriter" || perms?.user_type === "manager";
  const dashboardPath = isUnderwriter ? "/underwriter" : "/dashboard";
  // Active check supports underwriter tabs via query param
  const isActive = (path: string) => {
    if (!isUnderwriter) return location.pathname === path;
    // For underwriter, map tab-aware paths like "/underwriter?tab=vehicles"
    try {
      const u = new URL(path, window.location.origin);
      if (u.pathname !== location.pathname) return false;
      const targetTab = u.searchParams.get("tab");
      if (!targetTab) return location.pathname === u.pathname;
      const current = new URLSearchParams(location.search).get("tab") || "policies";
      return current === targetTab;
    } catch {
      return location.pathname === path;
    }
  };

  const item = (
    to: string,
    label: string,
    icon: React.ReactNode,
    highlighted?: boolean
  ) => (
    <Link
      to={to}
      title={!open ? label : undefined}
      aria-label={!open ? label : undefined}
      className={
        (
          "group h-10 px-2 rounded-lg transition-colors flex items-center " +
          (open ? "justify-between" : "justify-center")
        ) +
        " " +
        (highlighted
          ? "bg-gray-100 text-gray-900 font-medium"
          : "text-gray-600 hover:bg-gray-100")
      }
    >
      <div className={open ? "flex items-center space-x-3" : "flex items-center"}>
        {icon}
        {/* Hide label when closed */}
        <span className={open ? "block text-sm" : "hidden"}>{label}</span>
      </div>
      {/* Hide chevron when closed */}
      {open && <ChevronRight className="h-4 w-4" />}
    </Link>
  );

  return (
    <aside
      className={
        "bg-white shadow-sm transition-[width] duration-200 overflow-hidden border-r " +
        (open ? "w-64" : "w-16")
      }
    >
      <nav className="p-2 md:p-3 space-y-2">
        {item(isUnderwriter ? "/underwriter?tab=policies" : "/dashboard", "Dashboard", <BarChart3 className="h-5 w-5" />, isActive(isUnderwriter ? "/underwriter?tab=policies" : "/dashboard"))}
        {item(isUnderwriter ? "/underwriter?tab=vehicles" : "/vehicles", "Vehicles", <Car className="h-5 w-5" />, isActive(isUnderwriter ? "/underwriter?tab=vehicles" : "/vehicles"))}
        {item(isUnderwriter ? "/underwriter?tab=policies" : "/policies", "Policies", <FileText className="h-5 w-5" />, isActive(isUnderwriter ? "/underwriter?tab=policies" : "/policies"))}
        {item(isUnderwriter ? "/underwriter?tab=inquiries" : "/inbox", "Inbox", <Inbox className="h-5 w-5" />, isActive(isUnderwriter ? "/underwriter?tab=inquiries" : "/inbox"))}
        {item(isUnderwriter ? "/underwriter?tab=claims" : "/claims", "Claim List", <FileText className="h-5 w-5" />, isActive(isUnderwriter ? "/underwriter?tab=claims" : "/claims"))}
        {item("/claims/create", "Claim Intimation", <AlertTriangle className="h-5 w-5" />, isActive("/claims/create"))}
      </nav>
    </aside>
  );
};

export default Sidebar;
