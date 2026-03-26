"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useContracts,
  useCreateContract,
  useUpdateContract,
  type ContractWithEmployee,
} from "@/hooks/use-contracts";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import { contractSchema, type ContractFormValues } from "@/lib/validations/contract";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Plus, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Employee } from "@/types/database";

const statusMap = {
  active: { label: "Hiệu lực", variant: "success" as const },
  expired: { label: "Hết hạn", variant: "warning" as const },
  terminated: { label: "Chấm dứt", variant: "error" as const },
};

const typeMap: Record<string, string> = {
  full_time: "Toàn thời gian",
  part_time: "Bán thời gian",
  probation: "Thử việc",
  intern: "Thực tập",
};

const typeOptions = [
  { value: "full_time", label: "Toàn thời gian" },
  { value: "part_time", label: "Bán thời gian" },
  { value: "probation", label: "Thử việc" },
  { value: "intern", label: "Thực tập" },
];

const statusOptions = [
  { value: "active", label: "Hiệu lực" },
  { value: "expired", label: "Hết hạn" },
  { value: "terminated", label: "Chấm dứt" },
];

export default function ContractsPage() {
  const { employee, isAdmin } = useAuth();
  const supabase = createClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractWithEmployee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [terminateTarget, setTerminateTarget] = useState<ContractWithEmployee | null>(null);

  const { data: contracts = [], isLoading } = useContracts(employee?.id, isAdmin);
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    mode: "onChange",
    defaultValues: {
      employee_id: "",
      type: "full_time",
      start_date: "",
      end_date: "",
      base_salary: 0,
      allowance: 0,
      attendance_bonus: 0,
      dependents: 0,
      status: "active",
      notes: "",
    },
  });

  const watchEmployeeId = form.watch("employee_id");
  const selectedEmployee = employees.find((e) => e.id === watchEmployeeId) || null;

  useEffect(() => {
    if (isAdmin) {
      supabase
        .from("employees")
        .select("id,full_name,bank_name,bank_account,tax_code,insurance_code,status")
        .then(({ data }: { data: Employee[] | null }) => setEmployees(data || []));
    }
  }, [isAdmin]);

  function openCreate() {
    setEditingContract(null);
    form.reset({
      employee_id: "",
      type: "full_time",
      start_date: "",
      end_date: "",
      base_salary: 0,
      allowance: 0,
      attendance_bonus: 0,
      dependents: 0,
      status: "active",
      notes: "",
    });
    setModalOpen(true);
  }

  function openEdit(contract: ContractWithEmployee) {
    setEditingContract(contract);
    form.reset({
      employee_id: contract.employee_id,
      type: contract.type,
      start_date: contract.start_date,
      end_date: contract.end_date || "",
      base_salary: contract.base_salary,
      allowance: contract.allowance || 0,
      attendance_bonus: contract.attendance_bonus || 0,
      dependents: contract.dependents || 0,
      status: contract.status,
      notes: contract.notes || "",
    });
    setModalOpen(true);
  }

  function onSubmit(values: ContractFormValues) {
    if (editingContract) {
      // Nếu chuyển sang "terminated" → hỏi xác nhận trước
      if (values.status === "terminated" && editingContract.status === "active") {
        setTerminateTarget(editingContract);
        return;
      }
      doUpdate(editingContract.id, values);
    } else {
      createContract.mutate(values, {
        onSuccess: () => {
          toast.success("Tạo hợp đồng thành công");
          setModalOpen(false);
          form.reset();
        },
        onError: (err) => toast.error(err.message || "Lỗi"),
      });
    }
  }

  function doUpdate(id: string, values: ContractFormValues) {
    updateContract.mutate(
      { id, ...values },
      {
        onSuccess: () => {
          if (values.status === "terminated") {
            toast.success("Đã chấm dứt hợp đồng — nhân viên chuyển sang nghỉ việc");
          } else {
            toast.success("Cập nhật hợp đồng thành công");
          }
          setModalOpen(false);
          setTerminateTarget(null);
          form.reset();
        },
        onError: (err) => toast.error(err.message || "Lỗi"),
      }
    );
  }

  function handleTerminate() {
    if (!terminateTarget) return;
    doUpdate(terminateTarget.id, form.getValues());
  }

  // Lọc NV đã có HĐ (1 NV = 1 HĐ)
  const employeesWithContract = new Set(contracts.map((c) => c.employee_id));
  const employeeOptions = employees
    .filter((e) => !employeesWithContract.has(e.id))
    .map((e) => ({ value: e.id, label: e.full_name }));

  const columns = useMemo(() => {
    const cols: Column<ContractWithEmployee>[] = [
      {
        header: "Số HĐ",
        cell: (row) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.contract_number}
          </span>
        ),
      },
    ];

    if (isAdmin) {
      cols.push({
        header: "Nhân viên",
        cell: (row) => (
          <div>
            <p className="font-medium text-foreground">{row.employee?.full_name}</p>
            <p className="text-xs text-muted-foreground">{row.employee?.employee_code}</p>
          </div>
        ),
      });
    }

    cols.push(
      {
        header: "Loại",
        cell: (row) => (
          <span className="text-foreground">{typeMap[row.type]}</span>
        ),
      },
      {
        header: "Ngày bắt đầu",
        cell: (row) => (
          <span className="text-muted-foreground">{formatDate(row.start_date)}</span>
        ),
      },
      {
        header: "Ngày kết thúc",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.end_date ? formatDate(row.end_date) : "Không xác định"}
          </span>
        ),
      },
      {
        header: "Lương CB",
        cell: (row) => (
          <span className="font-medium text-foreground">
            {formatCurrency(row.base_salary)}
          </span>
        ),
      },
      {
        header: "Phụ cấp",
        cell: (row) => (
          <span className="text-green-600 dark:text-green-400">
            {formatCurrency(row.allowance || 0)}
          </span>
        ),
      },
      {
        header: "Chuyên cần",
        cell: (row) => (
          <span className="text-blue-600 dark:text-blue-400">
            {formatCurrency(row.attendance_bonus || 0)}
          </span>
        ),
      },
      {
        header: "Trạng thái",
        cell: (row) => (
          <Badge variant={statusMap[row.status]?.variant}>
            {statusMap[row.status]?.label}
          </Badge>
        ),
      }
    );

    if (isAdmin) {
      cols.push({
        header: "Thao tác",
        cell: (row) => (
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 hover:bg-accent rounded text-blue-500 dark:text-blue-400 transition"
          >
            <Edit2 size={14} />
          </button>
        ),
      });
    }

    return cols;
  }, [isAdmin]);

  return (
    <div className="space-y-5">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">
            Tạo hợp đồng
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={contracts}
        isLoading={isLoading}
        emptyState={{
          icon: FileText,
          title: "Chưa có hợp đồng nào",
        }}
      />

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingContract(null); }}
        title={editingContract ? "Cập nhật hợp đồng" : "Tạo hợp đồng mới"}
        size="md"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {editingContract ? (
            <FormField label="Nhân viên">
              <input
                value={editingContract.employee?.full_name || ""}
                disabled
                className="w-full px-3 py-2 text-sm border border-border bg-muted text-foreground rounded-lg cursor-not-allowed"
              />
            </FormField>
          ) : (
            <Controller
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormField
                  label="Nhân viên"
                  required
                  error={form.formState.errors.employee_id?.message}
                >
                  <Select key={`c-new-${field.value}`}
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                    placeholder="Chọn nhân viên"
                    options={[{ value: "", label: "Chọn nhân viên" }, ...employeeOptions]}
                  />
                </FormField>
              )}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormField
                  label="Loại hợp đồng"
                  required
                  error={form.formState.errors.type?.message}
                >
                  <Select key={`c-${editingContract?.id ?? "n"}`}
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                    options={typeOptions}
                  />
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormField
                  label="Trạng thái"
                  error={form.formState.errors.status?.message}
                >
                  <Select key={`c-${editingContract?.id ?? "n"}`}
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                    options={statusOptions}
                  />
                </FormField>
              )}
            />

            <FormField
              label="Ngày bắt đầu"
              required
              error={form.formState.errors.start_date?.message}
            >
              <input
                type="date"
                {...form.register("start_date")}
                className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>

            <FormField label="Ngày kết thúc" error={form.formState.errors.end_date?.message}>
              <input
                type="date"
                {...form.register("end_date")}
                className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>
          </div>

          <FormField
            label="Lương cơ bản (VNĐ)"
            required
            error={form.formState.errors.base_salary?.message}
          >
            <CurrencyInput
              value={form.watch("base_salary") || 0}
              onChange={(v) => form.setValue("base_salary", v, { shouldValidate: true })}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Phụ cấp (VNĐ)"
              error={form.formState.errors.allowance?.message}
            >
              <CurrencyInput
                value={form.watch("allowance") || 0}
                onChange={(v) => form.setValue("allowance", v, { shouldValidate: true })}
              />
            </FormField>

            <FormField
              label="Chuyên cần (VNĐ)"
              error={form.formState.errors.attendance_bonus?.message}
            >
              <CurrencyInput
                value={form.watch("attendance_bonus") || 0}
                onChange={(v) => form.setValue("attendance_bonus", v, { shouldValidate: true })}
              />
            </FormField>
          </div>

          <FormField
            label="Số người phụ thuộc"
            error={form.formState.errors.dependents?.message}
          >
            <input
              type="number"
              min={0}
              {...form.register("dependents", { valueAsNumber: true })}
              className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </FormField>

          {/* Hiển thị thông tin Ngân hàng & BH từ hồ sơ NV (read-only) */}
          {selectedEmployee && (selectedEmployee.bank_name || selectedEmployee.tax_code || selectedEmployee.insurance_code) && (
            <div className="border-t border-border pt-3 mt-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Thông tin từ hồ sơ nhân viên</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-muted/50 rounded-lg p-3">
                {selectedEmployee.bank_name && (
                  <p><span className="text-muted-foreground">Ngân hàng:</span> {selectedEmployee.bank_name}</p>
                )}
                {selectedEmployee.bank_account && (
                  <p><span className="text-muted-foreground">Số TK:</span> {selectedEmployee.bank_account}</p>
                )}
                {selectedEmployee.tax_code && (
                  <p><span className="text-muted-foreground">MST:</span> {selectedEmployee.tax_code}</p>
                )}
                {selectedEmployee.insurance_code && (
                  <p><span className="text-muted-foreground">BHXH:</span> {selectedEmployee.insurance_code}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button
              type="submit"
              loading={createContract.isPending || updateContract.isPending}
            >
              {editingContract ? "Cập nhật" : "Tạo mới"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Xác nhận chấm dứt hợp đồng */}
      <ConfirmDialog
        open={!!terminateTarget}
        onOpenChange={(open) => !open && setTerminateTarget(null)}
        title="Chấm dứt hợp đồng?"
        description={`Hợp đồng ${terminateTarget?.contract_number} của ${terminateTarget?.employee?.full_name} sẽ bị chấm dứt. Nhân viên sẽ tự động chuyển sang trạng thái "Nghỉ việc".`}
        variant="danger"
        confirmText="Chấm dứt"
        onConfirm={handleTerminate}
        loading={updateContract.isPending}
      />
    </div>
  );
}
