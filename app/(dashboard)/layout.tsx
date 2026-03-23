"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Tổng quan",
  "/attendance": "Chấm công",
  "/tasks": "Công việc",
  "/leaves": "Nghỉ phép",
  "/salary": "Lương",
  "/profile": "Hồ sơ",
  "/employees": "Nhân viên",
  "/departments": "Phòng ban",
  "/shifts": "Ca làm việc",
  "/holidays": "Ngày lễ",
  "/contracts": "Hợp đồng",
  "/notifications": "Thông báo",
  "/reports": "Báo cáo",
  "/settings": "Cài đặt",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const title = pageTitles[pathname] || "";

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-gray-500 text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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
