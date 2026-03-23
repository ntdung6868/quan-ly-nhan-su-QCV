-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (linked to auth.users)
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

-- ============================================================
-- DEPARTMENTS
-- ============================================================
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

-- ============================================================
-- SHIFTS
-- ============================================================
create table shifts (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  start_time time not null,
  end_time time not null,
  break_minutes int default 60,
  working_days int[] default '{1,2,3,4,5}',
  is_default boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
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
  shift_id uuid references shifts(id) on delete set null,
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

-- Add manager FK to departments after employees table exists
alter table departments add foreign key (manager_id) references employees(id) on delete set null;

-- ============================================================
-- HOLIDAYS
-- ============================================================
create table holidays (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  date date not null,
  is_recurring boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
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
  check_in_photo text,
  check_out_photo text,
  status text not null default 'present' check (status in ('present', 'late', 'absent', 'half_day')),
  work_hours numeric(5,2),
  overtime_hours numeric(5,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, date)
);

-- ============================================================
-- TASKS
-- ============================================================
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

-- ============================================================
-- LEAVE TYPES
-- ============================================================
create table leave_types (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text unique not null,
  days_per_year int not null default 12,
  is_paid boolean default true,
  description text,
  created_at timestamptz default now()
);

-- ============================================================
-- LEAVE ALLOCATIONS
-- ============================================================
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

-- ============================================================
-- LEAVES
-- ============================================================
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

-- ============================================================
-- CONTRACTS
-- ============================================================
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

-- ============================================================
-- ALLOWANCES & DEDUCTIONS
-- ============================================================
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

-- ============================================================
-- PAYSLIPS
-- ============================================================
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

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
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

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
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

-- ============================================================
-- COMPANY CONFIG (singleton)
-- ============================================================
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
  photo_required boolean default false,
  work_start_time time default '08:00',
  work_end_time time default '17:00',
  standard_work_days int default 26,
  overtime_multiplier numeric(3,1) default 1.5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- SALARY CONFIG (singleton)
-- ============================================================
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
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger trg_employees_updated_at before update on employees for each row execute function update_updated_at();
create trigger trg_departments_updated_at before update on departments for each row execute function update_updated_at();
create trigger trg_attendance_updated_at before update on attendance for each row execute function update_updated_at();
create trigger trg_tasks_updated_at before update on tasks for each row execute function update_updated_at();
create trigger trg_leaves_updated_at before update on leaves for each row execute function update_updated_at();
create trigger trg_contracts_updated_at before update on contracts for each row execute function update_updated_at();
create trigger trg_payslips_updated_at before update on payslips for each row execute function update_updated_at();
create trigger trg_announcements_updated_at before update on announcements for each row execute function update_updated_at();
create trigger trg_company_config_updated_at before update on company_config for each row execute function update_updated_at();
create trigger trg_salary_config_updated_at before update on salary_config for each row execute function update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
