"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { departmentSchema, type DepartmentFormValues } from "@/lib/validations";
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  type DepartmentWithRels,
} from "@/hooks/use-departments";
import { useEmployees } from "@/hooks/use-employees";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Building2, Plus, Edit2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export default function DepartmentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentWithRels | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentWithRels | null>(null);

  const { data: departments = [], isLoading } = useDepartments();
  const { data: employeesData } = useEmployees({ status: "active", pageSize: 999 });
  const employees = employeesData?.employees ?? [];

  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      code: "",
      description: "",
      manager_id: null,
    },
  });

  useEffect(() => {
    if (editingDept) {
      form.reset({
        name: editingDept.name,
        code: editingDept.code,
        description: editingDept.description ?? "",
        manager_id: editingDept.manager_id ?? null,
      });
    } else {
      form.reset({
        name: "",
        code: "",
        description: "",
        manager_id: null,
      });
    }
  }, [editingDept, form]);

  function openCreate() {
    setEditingDept(null);
    setModalOpen(true);
  }

  function openEdit(dept: DepartmentWithRels) {
    setEditingDept(dept);
    setModalOpen(true);
  }

  function onSubmit(values: DepartmentFormValues) {
    if (editingDept) {
      updateMutation.mutate(
        { id: editingDept.id, ...values },
        {
          onSuccess: () => {
            toast.success("Cập nhật phòng ban thành công");
            setModalOpen(false);
            form.reset();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success("Thêm phòng ban thành công");
          setModalOpen(false);
          form.reset();
        },
        onError: (err) => toast.error(err.message),
      });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const employeeOptions = useMemo(
    () => employees
      .filter((e) => !editingDept || e.department_id === editingDept.id)
      .map((e) => ({ value: e.id, label: e.full_name })),
    [employees, editingDept]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex justify-end">
          <Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">Thêm phòng ban</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl ring-1 ring-border p-5 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-muted mb-3" />
              <div className="h-4 w-32 rounded bg-muted mb-2" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">Thêm phòng ban</Button>
      </div>

      {departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Chưa có phòng ban nào"
          action={<Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">Thêm ngay</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-card rounded-xl ring-1 ring-border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-primary" />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(dept)} className="p-1.5 hover:bg-accent rounded text-primary transition">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => setDeleteTarget(dept)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive transition">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-foreground">{dept.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{dept.code}</p>
              {dept.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{dept.description}</p>}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users size={14} />
                  <span>{dept.employeeCount} thành viên</span>
                </div>
                {dept.manager && (
                  <span className="text-xs text-muted-foreground">QL: {dept.manager.full_name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingDept(null); }}
        title={editingDept ? "Cập nhật phòng ban" : "Thêm phòng ban"}
        size="sm"
      >
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-3">
            <FormField label="Tên phòng ban" required error={form.formState.errors.name?.message}>
              <input {...form.register("name")} className="input" />
            </FormField>
            <FormField label="Mã phòng ban" required error={form.formState.errors.code?.message}>
              <input
                {...form.register("code", {
                  onChange: (e) => { e.target.value = e.target.value.toUpperCase(); },
                })}
                className="input font-mono"
              />
            </FormField>
            <FormField label="Mô tả" error={form.formState.errors.description?.message}>
              <textarea {...form.register("description")} rows={2} className="input resize-none" />
            </FormField>
            <FormField label="Trưởng phòng" error={form.formState.errors.manager_id?.message}>
              <Select
                key={`mgr-${editingDept?.id ?? "new"}-${form.watch("manager_id") ?? ""}`}
                value={form.watch("manager_id") ?? ""}
                onValueChange={(v) => form.setValue("manager_id", v || null, { shouldValidate: true })}
                placeholder="Chưa chọn"
                options={[{ value: "", label: "Chưa chọn" }, ...employeeOptions]}
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button loading={isSaving} type="submit">{editingDept ? "Cập nhật" : "Thêm mới"}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Xoá "${deleteTarget?.name}"?`}
        description={
          deleteTarget && deleteTarget.employeeCount > 0
            ? "Không thể xoá phòng ban còn nhân viên."
            : "Hành động này không thể hoàn tác."
        }
        variant="danger"
        confirmText="Xoá"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget && deleteTarget.employeeCount > 0) {
            toast.error("Không thể xoá phòng ban còn nhân viên");
            setDeleteTarget(null);
            return;
          }
          deleteMutation.mutate(deleteTarget!.id, {
            onSuccess: () => {
              toast.success("Đã xoá phòng ban");
              setDeleteTarget(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </div>
  );
}
