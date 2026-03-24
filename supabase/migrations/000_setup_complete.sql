-- ============================================================
-- HR MANAGEMENT SYSTEM - COMPLETE SETUP
-- Chạy file này 1 lần duy nhất trong Supabase SQL Editor
-- Idempotent: chạy nhiều lần không bị lỗi
-- Admin mặc định: admin@qcviet.vn / Admin@2026!
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- DROP ALL (để chạy lại sạch, bỏ qua lỗi nếu chưa tồn tại)
-- ============================================================
do $$ begin
  -- Xoá publication trước
  begin alter publication supabase_realtime drop table notifications; exception when others then null; end;
  begin alter publication supabase_realtime drop table attendance; exception when others then null; end;
  begin alter publication supabase_realtime drop table announcements; exception when others then null; end;
end $$;

drop table if exists notifications cascade;
drop table if exists announcements cascade;
drop table if exists payslips cascade;
drop table if exists employee_deductions cascade;
drop table if exists employee_allowances cascade;
drop table if exists deductions cascade;
drop table if exists allowances cascade;
drop table if exists contracts cascade;
drop table if exists leaves cascade;
drop table if exists leave_allocations cascade;
drop table if exists leave_types cascade;
drop table if exists tasks cascade;
drop table if exists attendance cascade;
drop table if exists holidays cascade;
drop table if exists employees cascade;
drop table if exists departments cascade;
drop table if exists shifts cascade;
drop table if exists company_config cascade;
drop table if exists salary_config cascade;
drop table if exists profiles cascade;

-- ============================================================
-- SCHEMA
-- ============================================================

create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'employee' check (role in ('admin', 'manager', 'employee')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table departments (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text unique not null,
  description text,
  manager_id uuid,
  parent_id uuid references departments(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table employees (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete set null,
  employee_code text unique not null,
  full_name text not null,
  email text unique not null,
  phone text,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other')),
  address text,
  avatar_url text,
  department_id uuid references departments(id) on delete set null,
  manager_id uuid references employees(id) on delete set null,
  position text,
  status text not null default 'active' check (status in ('active', 'inactive', 'on_leave')),
  hire_date date not null,
  termination_date date,
  base_salary numeric(15,2) default 0,
  bank_name text,
  bank_account text,
  tax_code text,
  insurance_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- FK manager cho departments
alter table departments add foreign key (manager_id) references employees(id) on delete set null;

create table holidays (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  date date not null,
  is_recurring boolean default false,
  created_at timestamptz default now()
);

create table attendance (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  check_in timestamptz,
  check_out timestamptz,
  check_in_lat numeric(10,7),
  check_in_lng numeric(10,7),
  check_out_lat numeric(10,7),
  check_out_lng numeric(10,7),
  status text not null default 'present' check (status in ('present', 'late', 'absent')),
  work_hours numeric(5,2),
  overtime_hours numeric(5,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, date)
);

create table tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid references employees(id) on delete set null,
  assigned_by uuid references employees(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table leave_types (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text unique not null,
  days_per_year int not null default 12,
  is_paid boolean default true,
  description text,
  created_at timestamptz default now()
);

create table leave_allocations (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type_id uuid not null references leave_types(id) on delete cascade,
  year int not null,
  total_days int not null,
  used_days int default 0,
  remaining_days int generated always as (total_days - used_days) stored,
  created_at timestamptz default now(),
  unique(employee_id, leave_type_id, year)
);

create table leaves (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type_id uuid not null references leave_types(id),
  start_date date not null,
  end_date date not null,
  days int not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by uuid references employees(id) on delete set null,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table contracts (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid not null references employees(id) on delete cascade,
  contract_number text unique not null,
  type text not null check (type in ('full_time', 'part_time', 'probation', 'intern')),
  start_date date not null,
  end_date date,
  base_salary numeric(15,2) not null,
  status text not null default 'active' check (status in ('active', 'expired', 'terminated')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table allowances (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text unique not null,
  amount numeric(15,2) default 0,
  is_taxable boolean default false,
  description text,
  created_at timestamptz default now()
);

create table deductions (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text unique not null,
  amount numeric(15,2),
  percentage numeric(5,2),
  description text,
  created_at timestamptz default now()
);

create table employee_allowances (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid not null references employees(id) on delete cascade,
  allowance_id uuid not null references allowances(id) on delete cascade,
  amount numeric(15,2) not null,
  effective_date date not null default current_date,
  created_at timestamptz default now()
);

create table employee_deductions (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid not null references employees(id) on delete cascade,
  deduction_id uuid not null references deductions(id) on delete cascade,
  amount numeric(15,2),
  percentage numeric(5,2),
  effective_date date not null default current_date,
  created_at timestamptz default now()
);

create table payslips (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid not null references employees(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null,
  base_salary numeric(15,2) not null,
  total_allowances numeric(15,2) default 0,
  total_deductions numeric(15,2) default 0,
  gross_salary numeric(15,2) not null,
  tax_amount numeric(15,2) default 0,
  insurance_amount numeric(15,2) default 0,
  net_salary numeric(15,2) not null,
  work_days int default 26,
  actual_work_days int default 0,
  overtime_hours numeric(5,2) default 0,
  overtime_pay numeric(15,2) default 0,
  breakdown jsonb default '{}',
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'paid')),
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, month, year)
);

create table notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'error')),
  is_read boolean default false,
  link text,
  created_at timestamptz default now()
);

create table announcements (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  created_by uuid not null references employees(id) on delete cascade,
  is_pinned boolean default false,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table company_config (
  id uuid default uuid_generate_v4() primary key,
  company_name text not null default 'Công ty',
  address text,
  phone text,
  email text,
  logo_url text,
  gps_enabled boolean default false,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  gps_radius int default 100,
  work_start_time time default '08:00',
  work_end_time time default '17:00',
  late_after_time time default '08:15',
  standard_work_days int default 26,
  overtime_multiplier numeric(3,1) default 1.5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table salary_config (
  id uuid default uuid_generate_v4() primary key,
  personal_income_tax_rate numeric(5,2) default 10,
  social_insurance_rate numeric(5,2) default 8,
  health_insurance_rate numeric(5,2) default 1.5,
  unemployment_insurance_rate numeric(5,2) default 1,
  tax_threshold numeric(15,2) default 11000000,
  standard_work_days int default 26,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_attendance_employee_date on attendance(employee_id, date);
create index idx_attendance_date on attendance(date);
create index idx_leaves_employee on leaves(employee_id);
create index idx_leaves_status on leaves(status);
create index idx_tasks_assigned_to on tasks(assigned_to);
create index idx_payslips_employee on payslips(employee_id, year, month);
create index idx_notifications_user on notifications(user_id, is_read);
create index idx_employees_department on employees(department_id);
create index idx_employees_user on employees(user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at before update on profiles for each row execute function update_updated_at();
drop trigger if exists trg_employees_updated_at on employees;
create trigger trg_employees_updated_at before update on employees for each row execute function update_updated_at();
drop trigger if exists trg_departments_updated_at on departments;
create trigger trg_departments_updated_at before update on departments for each row execute function update_updated_at();
drop trigger if exists trg_attendance_updated_at on attendance;
create trigger trg_attendance_updated_at before update on attendance for each row execute function update_updated_at();
drop trigger if exists trg_tasks_updated_at on tasks;
create trigger trg_tasks_updated_at before update on tasks for each row execute function update_updated_at();
drop trigger if exists trg_leaves_updated_at on leaves;
create trigger trg_leaves_updated_at before update on leaves for each row execute function update_updated_at();
drop trigger if exists trg_contracts_updated_at on contracts;
create trigger trg_contracts_updated_at before update on contracts for each row execute function update_updated_at();
drop trigger if exists trg_payslips_updated_at on payslips;
create trigger trg_payslips_updated_at before update on payslips for each row execute function update_updated_at();
drop trigger if exists trg_announcements_updated_at on announcements;
create trigger trg_announcements_updated_at before update on announcements for each row execute function update_updated_at();
drop trigger if exists trg_company_config_updated_at on company_config;
create trigger trg_company_config_updated_at before update on company_config for each row execute function update_updated_at();
drop trigger if exists trg_salary_config_updated_at on salary_config;
create trigger trg_salary_config_updated_at before update on salary_config for each row execute function update_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Tự động cập nhật used_days khi leave được approve hoặc cancel
-- Chỉ áp dụng cho loại phép có is_paid = true (nghỉ phép năm)
-- Nghỉ không lương (is_paid = false) không có allocation nên bỏ qua
create or replace function update_leave_allocation()
returns trigger as $$
declare
  v_year int := extract(year from new.start_date);
  v_is_paid boolean;
begin
  -- Check loại phép có cần quản lý allocation không
  select is_paid into v_is_paid from leave_types where id = new.leave_type_id;
  if not v_is_paid then return new; end if;

  -- Khi approve: tăng used_days
  if new.status = 'approved' and (old.status is null or old.status != 'approved') then
    update leave_allocations
    set used_days = used_days + new.days
    where employee_id = new.employee_id
      and leave_type_id = new.leave_type_id
      and year = v_year;
  end if;

  -- Khi cancel/reject từ approved: giảm used_days
  if old.status = 'approved' and new.status in ('cancelled', 'rejected') then
    update leave_allocations
    set used_days = greatest(0, used_days - old.days)
    where employee_id = new.employee_id
      and leave_type_id = new.leave_type_id
      and year = v_year;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_leave_allocation_update on leaves;
create trigger trg_leave_allocation_update
  after update on leaves
  for each row execute function update_leave_allocation();

-- ============================================================
-- AUTO NOTIFICATIONS
-- Tự tạo thông báo khi có sự kiện quan trọng
-- ============================================================

-- 1. NV tạo đơn nghỉ phép → thông báo tất cả admin
create or replace function notify_leave_created()
returns trigger as $$
declare
  v_emp_name text;
  v_admin record;
begin
  select full_name into v_emp_name from employees where id = new.employee_id;

  for v_admin in
    select p.id as user_id from profiles p where p.role = 'admin'
  loop
    insert into notifications (user_id, title, message, type)
    values (v_admin.user_id, 'Đơn nghỉ phép mới',
      v_emp_name || ' gửi đơn nghỉ ' || new.days || ' ngày (' || to_char(new.start_date, 'DD/MM') || ' - ' || to_char(new.end_date, 'DD/MM') || ')',
      'info');
  end loop;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_leave_created on leaves;
create trigger trg_notify_leave_created
  after insert on leaves
  for each row execute function notify_leave_created();

-- 2. Admin duyệt/từ chối nghỉ phép → thông báo NV
create or replace function notify_leave_status_changed()
returns trigger as $$
declare
  v_user_id uuid;
  v_title text;
  v_type text;
begin
  if old.status = new.status then return new; end if;
  if new.status not in ('approved', 'rejected') then return new; end if;

  select user_id into v_user_id from employees where id = new.employee_id;
  if v_user_id is null then return new; end if;

  if new.status = 'approved' then
    v_title := 'Đơn nghỉ phép đã duyệt';
    v_type := 'success';
  else
    v_title := 'Đơn nghỉ phép bị từ chối';
    v_type := 'error';
  end if;

  insert into notifications (user_id, title, message, type)
  values (v_user_id, v_title,
    'Đơn nghỉ ' || to_char(new.start_date, 'DD/MM') || ' - ' || to_char(new.end_date, 'DD/MM') || ' (' || new.days || ' ngày) đã được ' ||
    case when new.status = 'approved' then 'duyệt' else 'từ chối' end,
    v_type);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_leave_status on leaves;
create trigger trg_notify_leave_status
  after update on leaves
  for each row execute function notify_leave_status_changed();

-- 3. Giao task → thông báo NV được giao
create or replace function notify_task_assigned()
returns trigger as $$
declare
  v_user_id uuid;
begin
  if new.assigned_to is null then return new; end if;
  -- Chỉ notify khi mới giao hoặc đổi người
  if old is not null and old.assigned_to = new.assigned_to then return new; end if;

  select user_id into v_user_id from employees where id = new.assigned_to;
  if v_user_id is null then return new; end if;

  insert into notifications (user_id, title, message, type)
  values (v_user_id, 'Công việc mới',
    'Bạn được giao: "' || new.title || '"' ||
    case when new.due_date is not null then ' (hạn ' || to_char(new.due_date, 'DD/MM/YYYY') || ')' else '' end,
    'info');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_task_assigned on tasks;
create trigger trg_notify_task_assigned
  after insert or update on tasks
  for each row execute function notify_task_assigned();

-- 4. Thông báo nội bộ mới → thông báo tất cả NV
create or replace function notify_announcement_created()
returns trigger as $$
declare
  v_user record;
begin
  for v_user in
    select p.id as user_id from profiles p
    join employees e on e.user_id = p.id
    where e.status = 'active'
  loop
    insert into notifications (user_id, title, message, type)
    values (v_user.user_id, 'Thông báo nội bộ mới', new.title, 'info');
  end loop;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_announcement on announcements;
create trigger trg_notify_announcement
  after insert on announcements
  for each row execute function notify_announcement_created();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
create or replace function get_my_role()
returns text as $$
  select role from public.profiles where id = auth.uid()
$$ language sql security definer stable set search_path = public;

create or replace function get_my_employee_id()
returns uuid as $$
  select id from public.employees where user_id = auth.uid() limit 1
$$ language sql security definer stable set search_path = public;

create or replace function is_admin()
returns boolean as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$ language sql security definer stable set search_path = public;

create or replace function is_manager_or_admin()
returns boolean as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
$$ language sql security definer stable set search_path = public;

-- Enable RLS
alter table profiles enable row level security;
alter table employees enable row level security;
alter table departments enable row level security;
alter table holidays enable row level security;
alter table attendance enable row level security;
alter table tasks enable row level security;
alter table leave_types enable row level security;
alter table leave_allocations enable row level security;
alter table leaves enable row level security;
alter table contracts enable row level security;
alter table allowances enable row level security;
alter table deductions enable row level security;
alter table employee_allowances enable row level security;
alter table employee_deductions enable row level security;
alter table payslips enable row level security;
alter table notifications enable row level security;
alter table announcements enable row level security;
alter table company_config enable row level security;
alter table salary_config enable row level security;

-- PROFILES
create policy "Users can view own profile" on profiles for select using (id = auth.uid());
create policy "Admin can view all profiles" on profiles for select using (is_admin());
create policy "Users can update own profile" on profiles for update using (id = auth.uid());
create policy "Admin can update all profiles" on profiles for update using (is_admin());

-- EMPLOYEES
create policy "Employees can view own record" on employees for select using (user_id = auth.uid());
create policy "Manager/Admin can view all employees" on employees for select using (is_manager_or_admin());
create policy "Admin can insert employees" on employees for insert with check (is_admin());
create policy "Admin can update employees" on employees for update using (is_admin());
create policy "Admin can delete employees" on employees for delete using (is_admin());
create policy "Employee can update own record" on employees for update using (user_id = auth.uid());

-- DEPARTMENTS
create policy "All authenticated can view departments" on departments for select using (auth.uid() is not null);
create policy "Admin can manage departments" on departments for all using (is_admin());

-- HOLIDAYS
create policy "All authenticated can view holidays" on holidays for select using (auth.uid() is not null);
create policy "Admin can manage holidays" on holidays for all using (is_admin());

-- ATTENDANCE
create policy "Employee can view own attendance" on attendance for select using (employee_id = get_my_employee_id());
create policy "Manager/Admin can view all attendance" on attendance for select using (is_manager_or_admin());
create policy "Employee can insert own attendance" on attendance for insert with check (employee_id = get_my_employee_id());
create policy "Employee can update own attendance today" on attendance for update using (employee_id = get_my_employee_id() and date = current_date);
create policy "Admin can manage all attendance" on attendance for all using (is_admin());

-- TASKS
create policy "Employee can view assigned tasks" on tasks for select using (assigned_to = get_my_employee_id() or assigned_by = get_my_employee_id());
create policy "Manager/Admin can view all tasks" on tasks for select using (is_manager_or_admin());
create policy "Manager/Admin can create tasks" on tasks for insert with check (is_manager_or_admin());
create policy "Employee can update own task status" on tasks for update using (assigned_to = get_my_employee_id());
create policy "Admin/Manager can update all tasks" on tasks for update using (is_manager_or_admin());
create policy "Admin can delete tasks" on tasks for delete using (is_admin());

-- LEAVE TYPES
create policy "All authenticated can view leave types" on leave_types for select using (auth.uid() is not null);
create policy "Admin can manage leave types" on leave_types for all using (is_admin());

-- LEAVE ALLOCATIONS
create policy "Employee can view own allocations" on leave_allocations for select using (employee_id = get_my_employee_id());
create policy "Manager/Admin can view all allocations" on leave_allocations for select using (is_manager_or_admin());
create policy "Admin can manage allocations" on leave_allocations for all using (is_admin());

-- LEAVES
create policy "Employee can view own leaves" on leaves for select using (employee_id = get_my_employee_id());
create policy "Manager/Admin can view all leaves" on leaves for select using (is_manager_or_admin());
create policy "Employee can create own leave" on leaves for insert with check (employee_id = get_my_employee_id());
create policy "Employee can cancel own pending leave" on leaves for update using (employee_id = get_my_employee_id() and status = 'pending');
create policy "Manager/Admin can approve leaves" on leaves for update using (is_manager_or_admin());
create policy "Admin can delete leaves" on leaves for delete using (is_admin());

-- CONTRACTS
create policy "Employee can view own contract" on contracts for select using (employee_id = get_my_employee_id());
create policy "Manager/Admin can view all contracts" on contracts for select using (is_manager_or_admin());
create policy "Admin can manage contracts" on contracts for all using (is_admin());

-- ALLOWANCES / DEDUCTIONS
create policy "All authenticated can view allowances" on allowances for select using (auth.uid() is not null);
create policy "Admin can manage allowances" on allowances for all using (is_admin());
create policy "All authenticated can view deductions" on deductions for select using (auth.uid() is not null);
create policy "Admin can manage deductions" on deductions for all using (is_admin());
create policy "Employee can view own allowances" on employee_allowances for select using (employee_id = get_my_employee_id());
create policy "Admin can manage employee allowances" on employee_allowances for all using (is_admin());
create policy "Employee can view own deductions" on employee_deductions for select using (employee_id = get_my_employee_id());
create policy "Admin can manage employee deductions" on employee_deductions for all using (is_admin());

-- PAYSLIPS
create policy "Employee can view own payslips" on payslips for select using (employee_id = get_my_employee_id());
create policy "Admin can view all payslips" on payslips for select using (is_admin());
create policy "Admin can manage payslips" on payslips for all using (is_admin());

-- NOTIFICATIONS
create policy "Users can view own notifications" on notifications for select using (user_id = auth.uid());
create policy "Users can update own notifications" on notifications for update using (user_id = auth.uid());
create policy "Admin can insert notifications" on notifications for insert with check (is_admin());

-- ANNOUNCEMENTS
create policy "All authenticated can view announcements" on announcements for select using (auth.uid() is not null and (expires_at is null or expires_at > now()));
create policy "Admin can manage announcements" on announcements for all using (is_admin());

-- COMPANY/SALARY CONFIG
create policy "All authenticated can view company config" on company_config for select using (auth.uid() is not null);
create policy "Admin can manage company config" on company_config for all using (is_admin());
create policy "Admin can view salary config" on salary_config for select using (is_admin());
create policy "Admin can manage salary config" on salary_config for all using (is_admin());

-- ============================================================
-- REALTIME
-- ============================================================
do $$ begin
  begin alter publication supabase_realtime add table notifications; exception when others then null; end;
  begin alter publication supabase_realtime add table attendance; exception when others then null; end;
  begin alter publication supabase_realtime add table announcements; exception when others then null; end;
end $$;

-- ============================================================
-- AUTO MARK ABSENT (chạy mỗi ngày lúc 23:55)
-- Nhân viên active, ngày làm việc (T2-T6), không phải ngày lễ,
-- không có attendance record, không có leave approved → tạo record absent
-- ============================================================
create or replace function mark_absent_employees()
returns void as $$
declare
  v_today date := current_date;
  v_dow int := extract(dow from v_today)::int; -- 0=CN
begin
  -- Bỏ qua Chủ nhật
  if v_dow = 0 then return; end if;

  -- Bỏ qua ngày lễ
  if exists (select 1 from holidays where date = v_today) then return; end if;

  -- Insert absent cho NV active chưa có attendance + chưa có leave approved hôm nay
  insert into attendance (employee_id, date, status)
  select e.id, v_today, 'absent'
  from employees e
  join profiles p on p.id = e.user_id
  where e.status = 'active'
    and p.role != 'admin'  -- Admin không cần chấm công
    -- Chưa có attendance record hôm nay
    and not exists (
      select 1 from attendance a
      where a.employee_id = e.id and a.date = v_today
    )
    -- Chưa có leave approved bao trùm hôm nay
    and not exists (
      select 1 from leaves l
      where l.employee_id = e.id
        and l.status = 'approved'
        and v_today between l.start_date and l.end_date
    )
  on conflict (employee_id, date) do nothing;
end;
$$ language plpgsql security definer set search_path = public;

-- Bật pg_cron + schedule job (bỏ qua nếu pg_cron chưa khả dụng)
do $$ begin
  create extension if not exists pg_cron;
  -- Xoá job cũ nếu có
  perform cron.unschedule('mark-absent-daily');
  -- Schedule: 16:55 UTC = 23:55 ICT (giờ Việt Nam), T2-T7
  perform cron.schedule('mark-absent-daily', '55 16 * * 1-6', 'select mark_absent_employees()');
  raise notice 'pg_cron: job mark-absent-daily đã được tạo';
exception when others then
  raise notice 'pg_cron chưa khả dụng — bỏ qua. Bật extension pg_cron trong Supabase Dashboard rồi chạy lại.';
end $$;

-- ============================================================
-- SEED DATA
-- ============================================================
insert into leave_types (name, code, days_per_year, is_paid, description) values
  ('Nghỉ phép năm',    'ANNUAL',  12, true,  'Nghỉ phép hàng năm có lương, tối đa 12 ngày/năm'),
  ('Nghỉ không lương', 'UNPAID',   0, false, 'Nghỉ không hưởng lương, không giới hạn số ngày');

insert into holidays (name, date, is_recurring) values
  ('Tết Dương lịch',              '2026-01-01', true),
  ('Giỗ Tổ Hùng Vương',           '2026-04-07', false),
  ('Ngày Giải phóng miền Nam',    '2026-04-30', true),
  ('Ngày Quốc tế Lao động',       '2026-05-01', true),
  ('Ngày Quốc khánh',             '2026-09-02', true),
  ('Tết Nguyên Đán (30 Tết)',     '2026-02-16', false),
  ('Tết Nguyên Đán (Mùng 1)',     '2026-02-17', false),
  ('Tết Nguyên Đán (Mùng 2)',     '2026-02-18', false),
  ('Tết Nguyên Đán (Mùng 3)',     '2026-02-19', false),
  ('Tết Nguyên Đán (Mùng 4)',     '2026-02-20', false),
  ('Tết Nguyên Đán (Mùng 5)',     '2026-02-21', false);

insert into allowances (name, code, amount, is_taxable, description) values
  ('Phụ cấp ăn trưa',   'LUNCH',     730000, false, 'Phụ cấp ăn trưa hàng tháng'),
  ('Phụ cấp xăng xe',   'TRANSPORT', 500000, false, 'Phụ cấp đi lại'),
  ('Phụ cấp điện thoại', 'PHONE',    300000, false, 'Phụ cấp điện thoại'),
  ('Phụ cấp chức vụ',   'POSITION', 1000000, true,  'Phụ cấp chức vụ quản lý');

insert into deductions (name, code, percentage, description) values
  ('BHXH',     'SI',  8,   'Bảo hiểm xã hội 8%'),
  ('BHYT',     'HI',  1.5, 'Bảo hiểm y tế 1.5%'),
  ('BHTN',     'UI',  1,   'Bảo hiểm thất nghiệp 1%'),
  ('Thuế TNCN','PIT', 10,  'Thuế thu nhập cá nhân');

insert into company_config (
  company_name, address, phone, email,
  gps_enabled, gps_lat, gps_lng, gps_radius,
  work_start_time, work_end_time, late_after_time, standard_work_days, overtime_multiplier
) values (
  'Công Ty CP SX TM & DV Quảng Cáo Việt',
  '1A Đào Trinh Nhất, Khu phố 55, Linh Xuân, TPHCM',
  '0906862738', 'sale@trangtri360.com',
  true, 10.8625148, 106.7607988, 100,
  '08:00', '17:00', '09:00', 26, 1.5
);

insert into salary_config (
  personal_income_tax_rate, social_insurance_rate,
  health_insurance_rate, unemployment_insurance_rate,
  tax_threshold, standard_work_days
) values (10, 8, 1.5, 1, 11000000, 26);

-- ============================================================
-- TẠO ADMIN USER: admin@qcviet.vn / Admin@2026!
-- ============================================================
do $$
declare
  v_user_id uuid;
  v_email   text := 'admin@qcviet.vn';
  v_pass    text := 'Admin@2026!';
begin
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    v_user_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) values (
      v_user_id, '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', v_email,
      crypt(v_pass, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', 'Nguyễn Đức Hiệp', 'role', 'admin'),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data,
      created_at, updated_at, last_sign_in_at
    ) values (
      gen_random_uuid(), v_user_id, v_email, 'email',
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );
  end if;

  -- Profile admin
  insert into public.profiles (id, email, full_name, role)
  values (v_user_id, v_email, 'Nguyễn Đức Hiệp', 'admin')
  on conflict (id) do update set role = 'admin', full_name = 'Nguyễn Đức Hiệp', updated_at = now();

  -- Employee admin (không cần chấm công, chỉ quản lý)
  insert into public.employees (
    id, user_id, employee_code, full_name, email,
    position, status, hire_date, base_salary
  ) values (
    gen_random_uuid(), v_user_id, 'QCV001', 'Nguyễn Đức Hiệp', v_email,
    'Giám đốc (CEO)', 'active', '2020-01-01', 0
  ) on conflict (employee_code) do nothing;

end $$;
