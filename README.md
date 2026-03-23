# HR Management System

Hệ thống quản lý nhân sự toàn diện xây dựng với Next.js 16 + TypeScript + Tailwind CSS + Supabase, hỗ trợ PWA.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Database/Auth:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **State:** Zustand + TanStack Query
- **Charts:** Recharts
- **Notifications:** Sonner

## Tính năng

| Module | Mô tả |
|--------|-------|
| Auth | Đăng nhập, phân quyền 3 cấp (admin/manager/employee) |
| Dashboard | Tổng quan, check-in nhanh, biểu đồ realtime |
| Chấm công | Check-in/out GPS + ảnh, lịch sử, thống kê tháng |
| Công việc | Tạo/giao/duyệt task, filter theo trạng thái |
| Nghỉ phép | Tạo đơn, duyệt/từ chối, phân bổ phép năm |
| Lương | Tính lương tháng, phiếu lương, xuất file |
| Hợp đồng | Quản lý hợp đồng lao động |
| Nhân viên | CRUD nhân viên, phân quyền (admin) |
| Phòng ban | CRUD phòng ban (admin) |
| Ca làm | Quản lý ca làm việc (admin) |
| Ngày lễ | Quản lý ngày lễ (admin) |
| Thông báo | Realtime via Supabase, thông báo nội bộ |
| Báo cáo | Biểu đồ chấm công, lương, nghỉ phép (admin) |
| Cài đặt | Cấu hình công ty, lương, GPS (admin) |
| Hồ sơ | Thông tin cá nhân, đổi mật khẩu |

## Hướng dẫn cài đặt

### 1. Clone và cài dependencies

```bash
cd /Users/dungdev/Desktop/hr-next
npm install
```

### 2. Tạo Supabase project

1. Truy cập [supabase.com](https://supabase.com) và tạo project mới
2. Vào **Settings > API** để lấy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Cấu hình Environment Variables

Copy `.env.example` thành `.env.local` và điền thông tin Supabase:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 4. Chạy Database Migrations

Trong Supabase Dashboard, vào **SQL Editor** và chạy lần lượt:

```bash
# Chạy theo thứ tự:
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_seed.sql
```

Hoặc nếu có Supabase CLI:

```bash
supabase db push
```

### 5. Cấu hình Supabase Storage

Trong Supabase Dashboard:
1. Vào **Storage** > **New Bucket**
2. Tạo bucket `attendance-photos` (Public)
3. Tạo bucket `avatars` (Public)

### 6. Tạo tài khoản Admin đầu tiên

Trong Supabase Dashboard > **Authentication > Users > Invite user**:
- Tạo user với email/password
- Sau đó vào **SQL Editor** chạy:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

### 7. Khởi động development server

```bash
npm run dev
```

Truy cập: http://localhost:3000

## Deploy lên Vercel

### Cách 1: Deploy qua Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Cách 2: Deploy qua GitHub

1. Push code lên GitHub repository
2. Truy cập [vercel.com](https://vercel.com) > **New Project**
3. Import repository
4. Thêm Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
5. Click **Deploy**

## Cấu trúc thư mục

```
hr-next/
├── app/
│   ├── (auth)/login/         # Trang đăng nhập
│   └── (dashboard)/          # Tất cả trang sau khi login
│       ├── layout.tsx         # Sidebar + Header
│       ├── dashboard/
│       ├── attendance/
│       ├── tasks/
│       ├── leaves/
│       ├── salary/
│       ├── profile/
│       ├── employees/
│       ├── departments/
│       ├── shifts/
│       ├── holidays/
│       ├── contracts/
│       ├── notifications/
│       ├── reports/
│       └── settings/
├── components/
│   ├── attendance/           # CheckInModal, camera
│   ├── shared/               # Sidebar, Header, Providers
│   └── ui/                   # Button, Modal, Badge, ...
├── hooks/                    # useAuth
├── lib/supabase/             # Browser & Server client
├── stores/                   # Zustand auth store
├── supabase/migrations/      # SQL migrations
└── types/database.ts         # TypeScript types
```

## Phân quyền

| Quyền | Admin | Manager | Employee |
|-------|-------|---------|----------|
| Xem nhân viên | Tất cả | Phòng ban | Bản thân |
| Chấm công | Xem tất cả | Xem phòng ban | Bản thân |
| Nghỉ phép | Duyệt tất cả | Duyệt phòng ban | Tạo đơn |
| Công việc | Quản lý tất cả | Tạo/giao | Thực hiện |
| Lương | Tính/xem tất cả | — | Xem bản thân |
| Admin pages | ✅ | ❌ | ❌ |

## PWA

Ứng dụng hỗ trợ Progressive Web App:
- Cài đặt lên màn hình chính (Android/iOS)
- Offline fallback cơ bản
- Shortcuts: Chấm công, Dashboard
