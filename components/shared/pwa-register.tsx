"use client";

import { useEffect, useState } from "react";

export function PWARegister() {
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    (deferredPrompt as BeforeInstallPromptEvent).prompt();
    const { outcome } = await (deferredPrompt as BeforeInstallPromptEvent).userChoice;
    if (outcome === "accepted") setShowInstall(false);
    setDeferredPrompt(null);
  }

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-lg">📱</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">Cài đặt ứng dụng</p>
          <p className="text-xs text-gray-500">Thêm HR System vào màn hình chính</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={() => setShowInstall(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
            Bỏ qua
          </button>
          <button onClick={handleInstall}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium">
            Cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
