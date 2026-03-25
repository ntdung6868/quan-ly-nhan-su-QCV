"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useEmployee } from "@/hooks/use-employees";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { AvatarCropModal } from "@/components/ui/avatar-crop-modal";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import {
  User, Mail, Phone, MapPin, Calendar, Building2, Lock, Camera,
  CreditCard, Shield,
} from "lucide-react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

interface PasswordFormValues {
  newPass: string;
  confirm: string;
}

export default function ProfilePage() {
  const { profile, employee, isAdmin } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Load employee with department join
  const { data: employeeDetail } = useEmployee(employee?.id ?? "");

  const deptName = (employeeDetail?.department as { name: string } | undefined)?.name;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleAvatarCrop(blob: Blob) {
    if (!employee) return;
    setIsUploading(true);
    try {
      const fileName = `avatars/${employee.id}.jpg`;
      // Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const avatarUrl = urlData.publicUrl + "?t=" + Date.now(); // cache bust

      // Update employee record
      const { error: updateErr } = await supabase
        .from("employees")
        .update({ avatar_url: avatarUrl })
        .eq("id", employee.id);
      if (updateErr) throw updateErr;

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setCropSrc(null);
      // Force reload to update avatar everywhere
      window.location.reload();
    } catch (err) {
      const { toast } = await import("sonner");
      toast.error((err as Error).message || "Upload thất bại");
    } finally {
      setIsUploading(false);
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    defaultValues: { newPass: "", confirm: "" },
  });

  async function onSubmitPassword(values: PasswordFormValues) {
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: values.newPass });
    setIsSaving(false);
    if (error) {
      toast.error("Không thể đổi mật khẩu: " + error.message);
      return;
    }
    toast.success("Đổi mật khẩu thành công");
    setIsChangingPassword(false);
    reset();
  }

  const roleLabel =
    profile?.role === "admin"
      ? "Quản trị viên"
      : profile?.role === "manager"
        ? "Quản lý"
        : "Nhân viên";

  return (
    <div className="space-y-5">
      {/* Hàng 1: Avatar + tên */}
      <div className="bg-card rounded-xl ring-1 ring-border p-6">
        <div className="flex items-start gap-5">
          <div
            className="relative w-20 h-20 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-2xl shrink-0 cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            {employee?.avatar_url ? (
              <img
                src={employee.avatar_url}
                alt=""
                className="w-20 h-20 rounded-2xl object-cover"
              />
            ) : (
              getInitials(employee?.full_name || profile?.full_name || "U")
            )}
            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <Camera size={20} className="text-white" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">
              {employee?.full_name || profile?.full_name || "\u2014"}
            </h2>
            <p className="text-muted-foreground mt-0.5">
              {employee?.position || roleLabel}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-lg font-medium">
                {roleLabel}
              </span>
              {employee?.employee_code && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-lg font-mono">
                  {employee.employee_code}
                </span>
              )}
              {employee?.status && (
                <span
                  className={`text-xs px-2 py-1 rounded-lg font-medium ${
                    employee.status === "active"
                      ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  }`}
                >
                  {employee.status === "active" ? "Đang làm việc" : "Không hoạt động"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hàng 2: 2 cột */}
      {employee && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Cột trái: Thông tin cá nhân */}
          <div className="bg-card rounded-xl ring-1 ring-border p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <User size={16} className="text-blue-500" /> Thông tin cá nhân
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={Mail} label="Email" value={employee.email} />
              <InfoRow icon={Phone} label="Điện thoại" value={employee.phone || "\u2014"} />
              <InfoRow
                icon={Calendar}
                label="Ngày sinh"
                value={employee.date_of_birth ? formatDate(employee.date_of_birth) : "\u2014"}
              />
              <InfoRow
                icon={User}
                label="Giới tính"
                value={
                  employee.gender === "male"
                    ? "Nam"
                    : employee.gender === "female"
                      ? "Nữ"
                      : employee.gender === "other"
                        ? "Khác"
                        : "\u2014"
                }
              />
              <InfoRow icon={MapPin} label="Địa chỉ" value={employee.address || "\u2014"} />
              <InfoRow icon={Building2} label="Phòng ban" value={deptName || "\u2014"} />
              <InfoRow icon={Calendar} label="Ngày vào làm" value={formatDate(employee.hire_date)} />
              {isAdmin && (
                <InfoRow
                  icon={CreditCard}
                  label="Lương cơ bản"
                  value={formatCurrency(employee.base_salary)}
                />
              )}
            </div>
          </div>

          {/* Cột phải: Ngân hàng + Đổi MK */}
          <div className="space-y-5">
            {/* Ngân hàng & bảo hiểm */}
            <div className="bg-card rounded-xl ring-1 ring-border p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <CreditCard size={16} className="text-blue-500" /> Ngân hàng & bảo hiểm
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Building2} label="Ngân hàng" value={employee.bank_name || "\u2014"} />
                <InfoRow icon={CreditCard} label="Số tài khoản" value={employee.bank_account || "\u2014"} />
                <InfoRow icon={Shield} label="Mã số thuế" value={employee.tax_code || "\u2014"} />
                <InfoRow icon={Shield} label="Mã BHXH" value={employee.insurance_code || "\u2014"} />
              </div>
            </div>

            {/* Đổi mật khẩu */}
            <div className="bg-card rounded-xl ring-1 ring-border p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Lock size={16} className="text-blue-500" /> Đổi mật khẩu
                </h3>
                {!isChangingPassword && (
                  <Button
                    onClick={() => setIsChangingPassword(true)}
                    variant="outline"
                    size="sm"
                  >
                    Đổi mật khẩu
                  </Button>
                )}
              </div>
              {isChangingPassword && (
                <form onSubmit={handleSubmit(onSubmitPassword)} className="mt-4 space-y-3">
                  <FormField
                    label="Mật khẩu mới"
                    required
                    error={errors.newPass?.message}
                  >
                    <input
                      type="password"
                      {...register("newPass", {
                        required: "Vui lòng nhập mật khẩu mới",
                        minLength: {
                          value: 6,
                          message: "Mật khẩu mới phải có ít nhất 6 ký tự",
                        },
                      })}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    />
                  </FormField>
                  <FormField
                    label="Xác nhận mật khẩu mới"
                    required
                    error={errors.confirm?.message}
                  >
                    <input
                      type="password"
                      {...register("confirm", {
                        required: "Vui lòng xác nhận mật khẩu",
                        validate: (value, formValues) =>
                          value === formValues.newPass || "Mật khẩu mới không khớp",
                      })}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    />
                  </FormField>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setIsChangingPassword(false);
                        reset();
                      }}
                    >
                      Huỷ
                    </Button>
                    <Button type="submit" loading={isSaving}>
                      Cập nhật mật khẩu
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Crop modal */}
      {cropSrc && (
        <AvatarCropModal
          open={!!cropSrc}
          imageSrc={cropSrc}
          onClose={() => setCropSrc(null)}
          onCrop={handleAvatarCrop}
          loading={isUploading}
        />
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground/70">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
