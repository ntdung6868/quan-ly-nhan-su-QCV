-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper: get current user's role
create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Helper: get current user's employee id
create or replace function get_my_employee_id()
returns uuid as $$
  select id from employees where user_id = auth.uid() limit 1
$$ language sql security definer stable;

-- Helper: get current user's department id
create or replace function get_my_department_id()
returns uuid as $$
  select department_id from employees where user_id = auth.uid() limit 1
$$ language sql security definer stable;

-- Helper: check if user is admin
create or replace function is_admin()
returns boolean as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin')
$$ language sql security definer stable;

-- Helper: check if user is manager or admin
create or replace function is_manager_or_admin()
returns boolean as $$
  select exists(select 1 from profiles where id = auth.uid() and role in ('admin', 'manager'))
$$ language sql security definer stable;

-- ============================================================
-- PROFILES
-- ============================================================
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (id = auth.uid());
create policy "Admin can view all profiles" on profiles for select using (is_admin());
create policy "Users can update own profile" on profiles for update using (id = auth.uid());
create policy "Admin can update all profiles" on profiles for update using (is_admin());

-- ============================================================
-- EMPLOYEES
-- ============================================================
alter table employees enable row level security;
create policy "Employees can view own record" on employees for select using (user_id = auth.uid());
create policy "Manager/Admin can view all employees" on employees for select using (is_manager_or_admin());
create policy "Admin can insert employees" on employees for insert with check (is_admin());
create policy "Admin can update employees" on employees for update using (is_admin());
create policy "Admin can delete employees" on employees for delete using (is_admin());
create policy "Employee can update own record" on employees for update using (user_id = auth.uid());

-- ============================================================
-- DEPARTMENTS
-- ============================================================
alter table departments enable row level security;
create policy "All authenticated can view departments" on departments for select using (auth.uid() is not null);
create policy "Admin can manage departments" on departments for all using (is_admin());

-- ============================================================
-- SHIFTS
-- ============================================================
alter table shifts enable row level security;
create policy "All authenticated can view shifts" on shifts for select using (auth.uid() is not null);
create policy "Admin can manage shifts" on shifts for all using (is_admin());

-- ============================================================
-- HOLIDAYS
-- ============================================================
alter table holidays enable row level security;
create policy "All authenticated can view holidays" on holidays for select using (auth.uid() is not null);
create policy "Admin can manage holidays" on holidays for all using (is_admin());

-- ============================================================
-- ATTENDANCE
-- ============================================================
alter table attendance enable row level security;
create policy "Employee can view own attendance" on attendance for select
  using (employee_id = get_my_employee_id());
create policy "Manager/Admin can view all attendance" on attendance for select
  using (is_manager_or_admin());
create policy "Employee can insert own attendance" on attendance for insert
  with check (employee_id = get_my_employee_id());
create policy "Employee can update own attendance today" on attendance for update
  using (employee_id = get_my_employee_id() and date = current_date);
create policy "Admin can manage all attendance" on attendance for all using (is_admin());

-- ============================================================
-- TASKS
-- ============================================================
alter table tasks enable row level security;
create policy "Employee can view assigned tasks" on tasks for select
  using (assigned_to = get_my_employee_id() or assigned_by = get_my_employee_id());
create policy "Manager/Admin can view all tasks" on tasks for select
  using (is_manager_or_admin());
create policy "Manager/Admin can create tasks" on tasks for insert
  with check (is_manager_or_admin());
create policy "Employee can update own task status" on tasks for update
  using (assigned_to = get_my_employee_id());
create policy "Admin/Manager can update all tasks" on tasks for update using (is_manager_or_admin());
create policy "Admin can delete tasks" on tasks for delete using (is_admin());

-- ============================================================
-- LEAVE TYPES
-- ============================================================
alter table leave_types enable row level security;
create policy "All authenticated can view leave types" on leave_types for select using (auth.uid() is not null);
create policy "Admin can manage leave types" on leave_types for all using (is_admin());

-- ============================================================
-- LEAVE ALLOCATIONS
-- ============================================================
alter table leave_allocations enable row level security;
create policy "Employee can view own allocations" on leave_allocations for select
  using (employee_id = get_my_employee_id());
create policy "Manager/Admin can view all allocations" on leave_allocations for select
  using (is_manager_or_admin());
create policy "Admin can manage allocations" on leave_allocations for all using (is_admin());

-- ============================================================
-- LEAVES
-- ============================================================
alter table leaves enable row level security;
create policy "Employee can view own leaves" on leaves for select
  using (employee_id = get_my_employee_id());
create policy "Manager/Admin can view all leaves" on leaves for select
  using (is_manager_or_admin());
create policy "Employee can create own leave" on leaves for insert
  with check (employee_id = get_my_employee_id());
create policy "Employee can cancel own pending leave" on leaves for update
  using (employee_id = get_my_employee_id() and status = 'pending');
create policy "Manager/Admin can approve leaves" on leaves for update
  using (is_manager_or_admin());
create policy "Admin can delete leaves" on leaves for delete using (is_admin());

-- ============================================================
-- CONTRACTS
-- ============================================================
alter table contracts enable row level security;
create policy "Employee can view own contract" on contracts for select
  using (employee_id = get_my_employee_id());
create policy "Manager/Admin can view all contracts" on contracts for select
  using (is_manager_or_admin());
create policy "Admin can manage contracts" on contracts for all using (is_admin());

-- ============================================================
-- ALLOWANCES & DEDUCTIONS
-- ============================================================
alter table allowances enable row level security;
create policy "All authenticated can view allowances" on allowances for select using (auth.uid() is not null);
create policy "Admin can manage allowances" on allowances for all using (is_admin());

alter table deductions enable row level security;
create policy "All authenticated can view deductions" on deductions for select using (auth.uid() is not null);
create policy "Admin can manage deductions" on deductions for all using (is_admin());

alter table employee_allowances enable row level security;
create policy "Employee can view own allowances" on employee_allowances for select
  using (employee_id = get_my_employee_id());
create policy "Admin can manage employee allowances" on employee_allowances for all using (is_admin());

alter table employee_deductions enable row level security;
create policy "Employee can view own deductions" on employee_deductions for select
  using (employee_id = get_my_employee_id());
create policy "Admin can manage employee deductions" on employee_deductions for all using (is_admin());

-- ============================================================
-- PAYSLIPS
-- ============================================================
alter table payslips enable row level security;
create policy "Employee can view own payslips" on payslips for select
  using (employee_id = get_my_employee_id());
create policy "Admin can view all payslips" on payslips for select using (is_admin());
create policy "Admin can manage payslips" on payslips for all using (is_admin());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
alter table notifications enable row level security;
create policy "Users can view own notifications" on notifications for select using (user_id = auth.uid());
create policy "Users can update own notifications" on notifications for update using (user_id = auth.uid());
create policy "Admin can insert notifications" on notifications for insert with check (is_admin());

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
alter table announcements enable row level security;
create policy "All authenticated can view announcements" on announcements for select
  using (auth.uid() is not null and (expires_at is null or expires_at > now()));
create policy "Admin can manage announcements" on announcements for all using (is_admin());

-- ============================================================
-- COMPANY CONFIG
-- ============================================================
alter table company_config enable row level security;
create policy "All authenticated can view company config" on company_config for select using (auth.uid() is not null);
create policy "Admin can manage company config" on company_config for all using (is_admin());

-- ============================================================
-- SALARY CONFIG
-- ============================================================
alter table salary_config enable row level security;
create policy "Admin can view salary config" on salary_config for select using (is_admin());
create policy "Admin can manage salary config" on salary_config for all using (is_admin());

-- ============================================================
-- ENABLE REALTIME
-- ============================================================
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table attendance;
alter publication supabase_realtime add table announcements;
