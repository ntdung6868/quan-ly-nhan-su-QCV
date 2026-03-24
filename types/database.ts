export type Role = "admin" | "manager" | "employee";
export type AttendanceStatus = "present" | "late" | "absent";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type ContractType = "full_time" | "part_time" | "probation" | "intern";
export type ContractStatus = "active" | "expired" | "terminated";
export type PayslipStatus = "draft" | "confirmed" | "paid";
export type EmployeeStatus = "active" | "inactive" | "on_leave";

type TableDef<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      employees: TableDef<Employee>;
      departments: TableDef<Department>;
      shifts: TableDef<Shift>;
      holidays: TableDef<Holiday>;
      attendance: TableDef<Attendance>;
      tasks: TableDef<Task>;
      leave_types: TableDef<LeaveType>;
      leave_allocations: TableDef<LeaveAllocation>;
      leaves: TableDef<Leave>;
      contracts: TableDef<Contract>;
      allowances: TableDef<Allowance>;
      deductions: TableDef<Deduction>;
      employee_allowances: TableDef<EmployeeAllowance>;
      employee_deductions: TableDef<EmployeeDeduction>;
      payslips: TableDef<Payslip>;
      notifications: TableDef<Notification>;
      announcements: TableDef<Announcement>;
      company_config: TableDef<CompanyConfig>;
      salary_config: TableDef<SalaryConfig>;
    };
  };
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  user_id: string | null;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  address: string | null;
  avatar_url: string | null;
  department_id: string | null;
  shift_id: string | null;
  manager_id: string | null;
  position: string | null;
  status: EmployeeStatus;
  hire_date: string;
  termination_date: string | null;
  base_salary: number;
  bank_name: string | null;
  bank_account: string | null;
  tax_code: string | null;
  insurance_code: string | null;
  created_at: string;
  updated_at: string;
  department?: Department;
  shift?: Shift;
  manager?: Employee;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  manager_id: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  manager?: Employee;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  working_days: number[];
  is_default: boolean;
  created_at: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  is_recurring: boolean;
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_in_photo: string | null;
  check_out_photo: string | null;
  status: AttendanceStatus;
  work_hours: number | null;
  overtime_hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  assigned_by: string | null;
  department_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee?: Employee;
  assigner?: Employee;
  department?: Department;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  days_per_year: number;
  is_paid: boolean;
  description: string | null;
  created_at: string;
}

export interface LeaveAllocation {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
  created_at: string;
  employee?: Employee;
  leave_type?: LeaveType;
}

export interface Leave {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
  leave_type?: LeaveType;
  approver?: Employee;
}

export interface Contract {
  id: string;
  employee_id: string;
  contract_number: string;
  type: ContractType;
  start_date: string;
  end_date: string | null;
  base_salary: number;
  status: ContractStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface Allowance {
  id: string;
  name: string;
  code: string;
  amount: number;
  is_taxable: boolean;
  description: string | null;
  created_at: string;
}

export interface Deduction {
  id: string;
  name: string;
  code: string;
  amount: number | null;
  percentage: number | null;
  description: string | null;
  created_at: string;
}

export interface EmployeeAllowance {
  id: string;
  employee_id: string;
  allowance_id: string;
  amount: number;
  effective_date: string;
  created_at: string;
  allowance?: Allowance;
}

export interface EmployeeDeduction {
  id: string;
  employee_id: string;
  deduction_id: string;
  amount: number | null;
  percentage: number | null;
  effective_date: string;
  created_at: string;
  deduction?: Deduction;
}

export interface Payslip {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  base_salary: number;
  total_allowances: number;
  total_deductions: number;
  gross_salary: number;
  tax_amount: number;
  insurance_amount: number;
  net_salary: number;
  work_days: number;
  actual_work_days: number;
  overtime_hours: number;
  overtime_pay: number;
  breakdown: Record<string, unknown>;
  status: PayslipStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_by: string;
  is_pinned: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  author?: Employee;
}

export interface CompanyConfig {
  id: string;
  company_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  gps_enabled: boolean;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_radius: number;
  work_start_time: string;
  work_end_time: string;
  late_after_time: string;
  standard_work_days: number;
  overtime_multiplier: number;
  created_at: string;
  updated_at: string;
}

export interface SalaryConfig {
  id: string;
  personal_income_tax_rate: number;
  social_insurance_rate: number;
  health_insurance_rate: number;
  unemployment_insurance_rate: number;
  tax_threshold: number;
  standard_work_days: number;
  created_at: string;
  updated_at: string;
}
