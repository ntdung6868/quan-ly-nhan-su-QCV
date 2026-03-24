"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { holidaySchema, type HolidayFormValues } from "@/lib/validations";
import {
  useHolidays,
  useCreateHoliday,
  useDeleteHoliday,
} from "@/hooks/use-holidays";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Holiday } from "@/types/database";

export default function HolidaysPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  const { data: holidays = [], isLoading } = useHolidays();
  const createMutation = useCreateHoliday();
  const deleteMutation = useDeleteHoliday();

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: "",
      date: "",
      is_recurring: false,
    },
  });

  function openCreate() {
    form.reset({ name: "", date: "", is_recurring: false });
    setModalOpen(true);
  }

  function onSubmit(values: HolidayFormValues) {
    createMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Đã thêm ngày lễ");
        setModalOpen(false);
        form.reset();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  const grouped = useMemo(() => {
    return holidays.reduce((acc, h) => {
      const year = new Date(h.date).getFullYear().toString();
      if (!acc[year]) acc[year] = [];
      acc[year].push(h);
      return acc;
    }, {} as Record<string, Holiday[]>);
  }, [holidays]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex justify-end">
          <Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">Thêm ngày lễ</Button>
        </div>
        <div className="bg-card rounded-xl ring-1 ring-border overflow-hidden animate-pulse">
          <div className="px-4 py-3 bg-muted border-b border-border">
            <div className="h-4 w-32 rounded bg-muted-foreground/20" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
              <div className="w-10 h-10 rounded bg-muted" />
              <div className="space-y-1 flex-1">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={openCreate} leftIcon={<Plus size={14} />} size="sm">Thêm ngày lễ</Button>
      </div>

      {holidays.length === 0 ? (
        <EmptyState icon={CalendarOff} title="Chưa có ngày lễ nào" />
      ) : (
        Object.entries(grouped)
          .sort((a, b) => Number(b[0]) - Number(a[0]))
          .map(([year, items]) => (
            <div key={year} className="bg-card rounded-xl ring-1 ring-border overflow-hidden">
              <div className="px-4 py-3 bg-muted border-b border-border">
                <h3 className="font-semibold text-foreground">Năm {year} ({items.length} ngày)</h3>
              </div>
              <div className="divide-y divide-border/50">
                {items.map((h) => (
                  <div key={h.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 text-center">
                        <p className="text-lg font-bold text-primary">{new Date(h.date).getDate()}</p>
                        <p className="text-xs text-muted-foreground">
                          Th.{new Date(h.date).getMonth() + 1}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{h.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatDate(h.date)}</span>
                          {h.is_recurring && (
                            <Badge variant="success">Hàng năm</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteTarget(h)}
                      className="p-1.5 hover:bg-destructive/10 rounded text-destructive transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Thêm ngày lễ" size="sm">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-3">
            <FormField label="Tên ngày lễ" required error={form.formState.errors.name?.message}>
              <input {...form.register("name")} className="input" />
            </FormField>
            <FormField label="Ngày" required error={form.formState.errors.date?.message}>
              <input type="date" {...form.register("date")} className="input" />
            </FormField>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...form.register("is_recurring")}
                className="rounded"
              />
              <span className="text-sm text-foreground">Lặp lại hàng năm</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button loading={createMutation.isPending} type="submit">Thêm</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Xoá "${deleteTarget?.name}"?`}
        description="Hành động này không thể hoàn tác."
        variant="danger"
        confirmText="Xoá"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget!.id, {
            onSuccess: () => {
              toast.success("Đã xoá");
              setDeleteTarget(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </div>
  );
}
