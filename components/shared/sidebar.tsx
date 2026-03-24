"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, getInitials } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Clock,
  CheckSquare,
  CalendarOff,
  DollarSign,
  Users,
  Building2,
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
  { href: "/employees", label: "Nhân viên", icon: <Users size={18} /> },
  { href: "/departments", label: "Phòng ban", icon: <Building2 size={18} /> },
  { href: "/holidays", label: "Ngày lễ", icon: <Megaphone size={18} /> },
  { href: "/reports", label: "Báo cáo", icon: <BarChart3 size={18} /> },
  { href: "/settings", label: "Cài đặt", icon: <Settings size={18} /> },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, employee, isAdmin, signOut } = useAuth();

  const displayName = employee?.full_name || profile?.full_name || "Người dùng";
  const roleLabel = profile?.role === "admin" ? "Quản trị viên" : profile?.role === "manager" ? "Quản lý" : employee?.position || "Nhân viên";

  return (
    <>
      {/* Overlay on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in-0 duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50 flex flex-col transition-transform duration-300",
          "lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 shrink-0 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 size={16} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-sm">HR System</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground transition">
            <X size={18} />
          </button>
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
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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

        {/* User info + Sign out */}
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
            </div>
            <button
              onClick={signOut}
              title="Đăng xuất"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
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
      prefetch
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <span className={cn(isActive ? "text-primary" : "text-muted-foreground")}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}
