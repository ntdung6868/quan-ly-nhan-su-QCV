"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, type EmployeeFormValues } from "@/lib/validations";
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  type EmployeeWithRels,
} from "@/hooks/use-employees";
import { useDepartments } from "@/hooks/use-departments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDate, formatCurrency, getInitials, generateCredentials } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Users, Plus, Search, Edit2, Trash2, Copy, Check, KeyRound } from "lucide-react";
import { toast } from "sonner";

const statusMap = {
  active: { label: "Đang làm", variant: "success" as const },
  inactive: { label: "Nghỉ việc", variant: "error" as const },
  on_leave: { label: "Đang nghỉ", variant: "warning" as const },
};

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithRels | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeWithRels | null>(null);
  const [page, setPage] = useState(1);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<EmployeeWithRels | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const { data: employeesData, isLoading } = useEmployees({
    search,
    departmentId: filterDept || undefined,
    status: filterStatus || undefined,
    page,
    pageSize: 50,
  });
  const { data: departmentsData } = useDepartments();

  const employees = employeesData?.employees ?? [];
  const total = employeesData?.total ?? 0;
  const departments = departmentsData ?? [];

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    mode: "onChange",
    defaultValues: {
      full_name: "",
      phone: "",
      date_of_birth: "",
      position: "",
      department_id: null,
      hire_date: new Date().toISOString().split("T")[0],
      base_salary: 0,
      status: "active",
      gender: undefined,
      address: "",
      bank_name: "",
      bank_account: "",
      tax_code: "",
      insurance_code: "",
    },
  });

  useEffect(() => {
    if (editingEmployee) {
      form.reset({
        full_name: editingEmployee.full_name,
        phone: editingEmployee.phone ?? "",
        date_of_birth: editingEmployee.date_of_birth ?? "",
        position: editingEmployee.position ?? "",
        department_id: editingEmployee.department_id ?? null,
        hire_date: editingEmployee.hire_date,
        base_salary: editingEmployee.base_salary,
        status: editingEmployee.status,
        gender: editingEmployee.gender ?? undefined,
        address: editingEmployee.address ?? "",
        bank_name: editingEmployee.bank_name ?? "",
        bank_account: editingEmployee.bank_account ?? "",
        tax_code: editingEmployee.tax_code ?? "",
        insurance_code: editingEmployee.insurance_code ?? "",
      });
    } else {
      form.reset({
        full_name: "",
          phone: "",
        date_of_birth: "",
        position: "",
        department_id: null,
          hire_date: new Date().toISOString().split("T")[0],
        base_salary: 0,
        status: "active",
        gender: undefined,
        address: "",
        bank_name: "",
        bank_account: "",
        tax_code: "",
        insurance_code: "",
      });
    }
  }, [editingEmployee, form]);

  function openCreate() {
    setEditingEmployee(null);
    setModalOpen(true);
  }

  function openEdit(emp: EmployeeWithRels) {
    setEditingEmployee(emp);
    setModalOpen(true);
  }

  function onSubmit(values: EmployeeFormValues) {
    if (editingEmployee) {
      // Chỉ admin (salary cũ = 0) mới được giữ salary = 0
      const isEditingAdmin = editingEmployee.base_salary === 0;
      if (!isEditingAdmin && (!values.base_salary || values.base_salary <= 0)) {
        form.setError("base_salary", { message: "Lương cơ bản phải lớn hơn 0" });
        return;
      }
      updateMutation.mutate(
        { id: editingEmployee.id, ...values },
        {
          onSuccess: () => {
            toast.success("Cập nhật nhân viên thành công");
            setModalOpen(false);
            form.reset();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      if (!values.base_salary || values.base_salary <= 0) {
        form.setError("base_salary", { message: "Lương cơ bản là bắt buộc" });
        return;
      }
      createMutation.mutate(values, {
        onSuccess: (data) => {
          setModalOpen(false);
          form.reset();
          const creds = (data as Record<string, unknown>)._credentials as { email: string; password: string } | undefined;
          if (creds) {
            setCreatedCredentials(creds);
          } else {
            toast.success("Thêm nhân viên thành công");
          }
        },
        onError: (err) => toast.error(err.message),
      });
    }
  }

  async function handleResetPassword() {
    if (!resetTarget?.user_id) return;
    setIsResetting(true);
    try {
      const { generateCredentials } = await import("@/lib/utils");
      const { email, password } = generateCredentials(resetTarget.full_name);
      const res = await fetch("/api/employees/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: resetTarget.user_id, new_password: password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResetTarget(null);
      setResetResult({ email, password });
    } catch (err) {
      toast.error((err as Error).message || "Lỗi đặt lại mật khẩu");
    } finally {
      setIsResetting(false);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const watchName = form.watch("full_name") || "";

  const deptOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments]
  );

  const columns: Column<EmployeeWithRels>[] = [
    {
      header: "Nhân viên",
      cell: (emp) => (
        <div className="flex items-center gap-3">
          {emp.avatar_url ? (
            <img src={emp.avatar_url} alt={emp.full_name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
              {getInitials(emp.full_name)}
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">{emp.full_name}</p>
            <p className="text-xs text-muted-foreground">{emp.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Mã NV",
      cell: (emp) => <span className="text-muted-foreground font-mono text-xs">{emp.employee_code}</span>,
    },
    {
      header: "Phòng ban",
      cell: (emp) => <span className="text-muted-foreground">{emp.department?.name || "\u2014"}</span>,
    },
    {
      header: "Chức vụ",
      cell: (emp) => <span className="text-muted-foreground">{emp.position || "\u2014"}</span>,
    },
    {
      header: "Ngày vào",
      cell: (emp) => <span className="text-muted-foreground">{formatDate(emp.hire_date)}</span>,
    },
    {
      header: "Lương",
      cell: (emp) => <span className="text-foreground font-medium">{formatCurrency(emp.base_salary)}</span>,
    },
    {
      header: "Trạng thái",
      cell: (emp) => (
        <Badge variant={statusMap[emp.status]?.variant || "default"}>
          {statusMap[emp.status]?.label || emp.status}
        </Badge>
      ),
    },
    {
      header: "Thao tác",
      cell: (emp) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(emp)} className="p-1.5 hover:bg-accent rounded text-primary transition" title="Sửa">
            <Edit2 size={14} />
          </button>
          <button onClick={() => setResetTarget(emp)} className="p-1.5 hover:bg-accent rounded text-orange-500 transition" title="Đặt lại mật khẩu">
            <KeyRound size={14} />
          </button>
          <button onClick={() => setDeleteTarget(emp)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive transition" title="Xoá">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-card rounded-xl ring-1 ring-border p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-40 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm nhân viên..."
            className="input pl-9! py-1.5"
          />
        </div>
        <Select
          value={filterDept}
          onValueChange={(v) => { setFilterDept(v); setPage(1); }}
          placeholder="Tất cả phòng ban"
          options={[{ value: "", label: "Tất cả phòng ban" }, ...deptOptions]}
          className="w-40"
        />
        <Select
          value={filterStatus}
          onValueChange={(v) => { setFilterStatus(v); setPage(1); }}
          placeholder="Tất cả trạng thái"
          options={[
            { value: "", label: "Tất cả trạng thái" },
            { value: "active", label: "Đang làm" },
            { value: "inactive", label: "Nghỉ việc" },
            { value: "on_leave", label: "Đang nghỉ" },
          ]}
          className="w-40"
        />
        <span className="text-sm text-muted-foreground ml-auto">{total} nhân viên</span>
        <Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">Thêm nhân viên</Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={employees}
        isLoading={isLoading}
        emptyState={{
          icon: Users,
          title: "Không có nhân viên",
          action: <Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">Thêm ngay</Button>,
        }}
        pagination={{
          page,
          pageSize: 50,
          total,
          onPageChange: setPage,
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEmployee(null); }}
        title={editingEmployee ? "Cập nhật nhân viên" : "Thêm nhân viên mới"}
        size="lg"
      >
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Họ tên" required error={form.formState.errors.full_name?.message} className="col-span-2">
              <input {...form.register("full_name")} className="input" placeholder="VD: Nguyễn Trí Dũng" />
            </FormField>
            <FormField label="Số điện thoại" error={form.formState.errors.phone?.message}>
              <input {...form.register("phone")} className="input" />
            </FormField>
            <FormField label="Ngày sinh" error={form.formState.errors.date_of_birth?.message}>
              <input type="date" {...form.register("date_of_birth")} className="input" />
            </FormField>
            <FormField label="Giới tính" error={form.formState.errors.gender?.message}>
              <Select
                key={`gender-${editingEmployee?.id ?? "new"}-${form.watch("gender") ?? ""}`}
                value={form.watch("gender") ?? ""}
                onValueChange={(v) => form.setValue("gender", (v || undefined) as EmployeeFormValues["gender"], { shouldValidate: true })}
                placeholder="Chọn giới tính"
                options={[
                  { value: "", label: "Chọn giới tính" },
                  { value: "male", label: "Nam" },
                  { value: "female", label: "Nữ" },
                  { value: "other", label: "Khác" },
                ]}
              />
            </FormField>
            <FormField label="Chức vụ" error={form.formState.errors.position?.message}>
              <input {...form.register("position")} className="input" />
            </FormField>
            <FormField label="Phòng ban">
              <Select
                key={`dept-${editingEmployee?.id ?? "new"}-${form.watch("department_id") ?? ""}`}
                value={form.watch("department_id") ?? ""}
                onValueChange={(v) => form.setValue("department_id", v || null, { shouldValidate: true })}
                placeholder="Chọn phòng ban"
                options={[{ value: "", label: "Chọn phòng ban" }, ...deptOptions]}
              />
            </FormField>
            <FormField label="Ngày vào làm" required error={form.formState.errors.hire_date?.message}>
              <input type="date" {...form.register("hire_date")} className="input" />
            </FormField>
            <FormField label="Lương cơ bản (VNĐ)" required error={
              form.formState.errors.base_salary?.message ||
              (form.formState.dirtyFields.base_salary && form.watch("base_salary") === 0 && !(editingEmployee?.base_salary === 0) ? "Lương cơ bản là bắt buộc" : undefined)
            }>
              <CurrencyInput
                value={form.watch("base_salary") || 0}
                onChange={(v) => form.setValue("base_salary", v, { shouldValidate: true })}
              />
            </FormField>
            <FormField label="Trạng thái" error={form.formState.errors.status?.message}>
              <Select
                key={`status-${editingEmployee?.id ?? "new"}-${form.watch("status") ?? ""}`}
                value={form.watch("status") ?? "active"}
                onValueChange={(v) => form.setValue("status", v as EmployeeFormValues["status"], { shouldValidate: true })}
                options={[
                  { value: "active", label: "Đang làm việc" },
                  { value: "inactive", label: "Nghỉ việc" },
                  { value: "on_leave", label: "Đang nghỉ phép" },
                ]}
              />
            </FormField>
            <FormField label="Địa chỉ" error={form.formState.errors.address?.message} className="col-span-2">
              <input {...form.register("address")} className="input" />
            </FormField>

            {/* Ngân hàng & Bảo hiểm */}
            <div className="col-span-2 border-t border-border pt-4 mt-1">
              <p className="text-sm font-medium text-muted-foreground mb-3">Ngân hàng & Bảo hiểm</p>
            </div>
            <FormField label="Ngân hàng" error={form.formState.errors.bank_name?.message}>
              <input {...form.register("bank_name")} className="input" placeholder="VD: Vietcombank" />
            </FormField>
            <FormField label="Số tài khoản" error={form.formState.errors.bank_account?.message}>
              <input {...form.register("bank_account")} className="input" />
            </FormField>
            <FormField label="Mã số thuế" error={form.formState.errors.tax_code?.message}>
              <input {...form.register("tax_code")} className="input" />
            </FormField>
            <FormField label="Mã BHXH" error={form.formState.errors.insurance_code?.message}>
              <input {...form.register("insurance_code")} className="input" />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button loading={isSaving} type="submit">
              {editingEmployee ? "Cập nhật" : "Thêm mới"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Xoá "${deleteTarget?.full_name}"?`}
        description="Tất cả dữ liệu liên quan (chấm công, nghỉ phép, hợp đồng, phiếu lương, công việc) sẽ bị xoá. Hành động này không thể hoàn tác."
        variant="danger"
        confirmText="Xoá"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget!.id, {
            onSuccess: () => {
              toast.success("Đã xoá nhân viên");
              setDeleteTarget(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />

      {/* Reset Password Confirm */}
      <ConfirmDialog
        open={!!resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        title={`Đặt lại mật khẩu "${resetTarget?.full_name}"?`}
        description="Mật khẩu sẽ được đặt lại về mặc định theo tên nhân viên."
        confirmText="Đặt lại"
        onConfirm={handleResetPassword}
        loading={isResetting}
      />

      {/* Reset Result Modal */}
      <Modal
        open={!!resetResult}
        onClose={() => setResetResult(null)}
        title="Đặt lại mật khẩu thành công"
        size="sm"
      >
        {resetResult && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
              <Check size={32} className="text-green-600 dark:text-green-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Mật khẩu đã được đặt lại
              </p>
            </div>
            <div className="space-y-3">
              <CredentialRow label="Email" value={resetResult.email} />
              <CredentialRow label="Mật khẩu" value={resetResult.password} />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setResetResult(null)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Credentials Modal */}
      <Modal
        open={!!createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        title="Tạo nhân viên thành công"
        size="sm"
      >
        {createdCredentials && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
              <Check size={32} className="text-green-600 dark:text-green-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Tài khoản đã được tạo tự động
              </p>
            </div>
            <div className="space-y-3">
              <CredentialRow label="Email" value={createdCredentials.email} />
              <CredentialRow label="Mật khẩu" value={createdCredentials.password} />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setCreatedCredentials(null)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="text-sm font-mono font-medium text-foreground flex-1 truncate">{value}</span>
      <button
        onClick={handleCopy}
        className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition shrink-0"
        title="Copy"
      >
        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
      </button>
    </div>
  );
}
