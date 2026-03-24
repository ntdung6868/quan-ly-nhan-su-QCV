"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { useAuth } from "@/hooks/use-auth";

const pageTitles: Record<string, string> = {
  "/dashboard": "Tổng quan",
  "/attendance": "Chấm công",
  "/tasks": "Công việc",
  "/leaves": "Nghỉ phép",
  "/salary": "Lương",
  "/profile": "Hồ sơ",
  "/employees": "Nhân viên",
  "/departments": "Phòng ban",
  "/holidays": "Ngày lễ",
  "/contracts": "Hợp đồng",
  "/notifications": "Thông báo",
  "/reports": "Báo cáo",
  "/settings": "Cài đặt",
};

// Auth được middleware xử lý — render shell ngay lập tức
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useAuth();
  const pathname = usePathname();

  const title = pageTitles[pathname] || "";

  return (
    <div className="flex h-dvh bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
