import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="text-xl font-semibold text-foreground mt-4">Không tìm thấy trang</h1>
        <p className="text-muted-foreground mt-2">Trang bạn tìm không tồn tại hoặc đã bị di chuyển.</p>
        <Link
          href="/dashboard"
          className="inline-block mt-6 px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition"
        >
          Về tổng quan
        </Link>
      </div>
    </div>
  );
}
