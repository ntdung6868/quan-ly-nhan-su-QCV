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
      status: "active",
      notes: "",
    },
  });

  useEffect(() => {
    if (isAdmin) {
      supabase
        .from("employees")
        .select("id,full_name")
        .eq("status", "active")
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
      status: contract.status,
      notes: contract.notes || "",
    });
    setModalOpen(true);
  }

  function onSubmit(values: ContractFormValues) {
    if (editingContract) {
      updateContract.mutate(
        { id: editingContract.id, ...values },
        {
          onSuccess: () => {
            toast.success("Cập nhật hợp đồng thành công");
            setModalOpen(false);
            form.reset();
          },
          onError: (err) => toast.error(err.message || "Lỗi"),
        }
      );
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

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.full_name,
  }));

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
        header: "Lương",
        cell: (row) => (
          <span className="font-medium text-foreground">
            {formatCurrency(row.base_salary)}
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
          <Controller
            control={form.control}
            name="employee_id"
            render={({ field }) => (
              <FormField
                label="Nhân viên"
                required
                error={form.formState.errors.employee_id?.message}
              >
                <Select key={`c-${editingContract?.id ?? "n"}`}
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                  placeholder="Chọn nhân viên"
                  options={[{ value: "", label: "Chọn nhân viên" }, ...employeeOptions]}
                />
              </FormField>
            )}
          />

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
            error={form.formState.errors.base_salary?.message}
          >
            <CurrencyInput
              value={form.watch("base_salary") || 0}
              onChange={(v) => form.setValue("base_salary", v, { shouldValidate: true })}
            />
          </FormField>

          <FormField label="Ghi chú" error={form.formState.errors.notes?.message}>
            <textarea
              {...form.register("notes")}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </FormField>

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
    </div>
  );
}
