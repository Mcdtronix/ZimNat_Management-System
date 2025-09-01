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
  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch("/api/notifications/unread_count/", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Failed to load unread count");
      return res.json();
    },
    // Poll periodically to reflect new notifications
    refetchInterval: 15000,
  });
  const unreadCount = Math.max(0, Number(unread?.count || 0));
  const isUnderwriter = perms?.user_type === "underwriter" || perms?.user_type === "manager";
  // Simplified active check: no tab-based highlighting anymore
  const isActive = (path: string) => location.pathname === path;

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
        {/* Show compact unread badge when closed for Inbox */}
        {!open && label === "Inbox" && unreadCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] min-w-[1rem] h-4 px-1">
            {Math.min(unreadCount, 99)}
          </span>
        )}
        {/* Hide label when closed */}
        <span className={open ? "block text-sm" : "hidden"}>{label}</span>
      </div>
      {/* Hide chevron when closed */}
      {open && (
        label === "Inbox" && unreadCount > 0 ? (
          <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-600 text-white text-xs min-w-[1.25rem] h-5 px-1.5">
            {Math.min(unreadCount, 99)}
          </span>
        ) : (
          <ChevronRight className="h-4 w-4" />
        )
      )}
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
        {item(isUnderwriter ? "/underwriter" : "/dashboard", "Dashboard", <BarChart3 className="h-5 w-5" />, isActive(isUnderwriter ? "/underwriter" : "/dashboard"))}
        {item("/vehicles", "Vehicles", <Car className="h-5 w-5" />, isActive("/vehicles"))}
        {item("/policies", "Policies", <FileText className="h-5 w-5" />, isActive("/policies"))}
        {item("/inbox", "Inbox", <Inbox className="h-5 w-5" />, isActive("/inbox"))}
        {item("/claims", "Claim List", <FileText className="h-5 w-5" />, isActive("/claims"))}
        {item("/claims/create", "Claim Intimation", <AlertTriangle className="h-5 w-5" />, isActive("/claims/create"))}
      </nav>
    </aside>
  );
};

export default Sidebar;
