"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Clock,
  CheckSquare,
  CalendarOff,
  DollarSign,
  Users,
  Building2,
  Calendar,
  Megaphone,
  BarChart3,
  Settings,
  FileText,
  Bell,
  User,
  LogOut,
  X,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  managerOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan", icon: <LayoutDashboard size={18} /> },
  { href: "/attendance", label: "Chấm công", icon: <Clock size={18} /> },
  { href: "/tasks", label: "Công việc", icon: <CheckSquare size={18} /> },
  { href: "/leaves", label: "Nghỉ phép", icon: <CalendarOff size={18} /> },
  { href: "/salary", label: "Lương", icon: <DollarSign size={18} /> },
  { href: "/contracts", label: "Hợp đồng", icon: <FileText size={18} /> },
  { href: "/notifications", label: "Thông báo", icon: <Bell size={18} /> },
  { href: "/profile", label: "Hồ sơ", icon: <User size={18} /> },
];

const adminNavItems: NavItem[] = [
  { href: "/employees", label: "Nhân viên", icon: <Users size={18} />, adminOnly: true },
  { href: "/departments", label: "Phòng ban", icon: <Building2 size={18} />, adminOnly: true },
  { href: "/shifts", label: "Ca làm việc", icon: <Calendar size={18} />, adminOnly: true },
  { href: "/holidays", label: "Ngày lễ", icon: <Megaphone size={18} />, adminOnly: true },
  { href: "/reports", label: "Báo cáo", icon: <BarChart3 size={18} />, adminOnly: true },
  { href: "/settings", label: "Cài đặt", icon: <Settings size={18} />, adminOnly: true },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, employee, isAdmin, signOut } = useAuth();

  return (
    <>
      {/* Overlay on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 flex flex-col transition-transform duration-300",
          "lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">HR System</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
              {(employee?.full_name || profile?.full_name || "U")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {employee?.full_name || profile?.full_name || "Người dùng"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profile?.role === "admin" ? "Quản trị viên" : profile?.role === "manager" ? "Quản lý" : employee?.position || "Nhân viên"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} />
            ))}
          </div>

          {isAdmin && (
            <>
              <div className="mt-4 mb-2 px-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Quản trị
                </p>
              </div>
              <div className="space-y-0.5">
                {adminNavItems.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} />
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick: () => void;
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        isActive
          ? "bg-blue-50 text-blue-700 font-medium"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <span className={cn(isActive ? "text-blue-600" : "text-gray-400")}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}
