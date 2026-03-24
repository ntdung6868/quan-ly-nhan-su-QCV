"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="min-h-dvh bg-[#0f172a] text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold mb-2">Lỗi hệ thống</h1>
          <p className="text-gray-400 mb-6">
            {error.message || "Đã xảy ra lỗi nghiêm trọng. Vui lòng tải lại trang."}
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            Tải lại trang
          </button>
        </div>
      </body>
    </html>
  );
}
