"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle size={28} className="text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Đã xảy ra lỗi</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {error.message || "Có lỗi không mong muốn. Vui lòng thử lại."}
      </p>
      <div className="flex items-center gap-3 mt-6">
        <Button onClick={reset} leftIcon={<RefreshCw size={14} />} variant="outline">
          Thử lại
        </Button>
        <Link href="/dashboard">
          <Button leftIcon={<Home size={14} />} variant="secondary">
            Về tổng quan
          </Button>
        </Link>
      </div>
    </div>
  );
}
