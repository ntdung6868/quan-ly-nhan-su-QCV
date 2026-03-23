export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/providers";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HR Management System",
  description: "Hệ thống quản lý nhân sự toàn diện",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HR System",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-full">
      <body className={`${geist.className} h-full antialiased bg-gray-50`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
