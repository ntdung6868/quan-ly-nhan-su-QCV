"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { User, Mail, Phone, MapPin, Calendar, Building2, Lock } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { profile, employee, isAdmin } = useAuth();
  const supabase = createClient();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [isSaving, setIsSaving] = useState(false);

  async function handleChangePassword() {
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error("Mật khẩu mới không khớp"); return;
    }
    if (passwordForm.newPass.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự"); return;
    }
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
    setIsSaving(false);
    if (error) { toast.error("Không thể đổi mật khẩu: " + error.message); return; }
    toast.success("Đổi mật khẩu thành công");
    setIsChangingPassword(false);
    setPasswordForm({ current: "", newPass: "", confirm: "" });
  }

  const roleLabel = profile?.role === "admin" ? "Quản trị viên" : profile?.role === "manager" ? "Quản lý" : "Nhân viên";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Avatar + basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl flex-shrink-0">
            {employee?.avatar_url ? (
              <img src={employee.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              getInitials(employee?.full_name || profile?.full_name || "U")
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{employee?.full_name || profile?.full_name || "—"}</h2>
            <p className="text-gray-500 mt-0.5">{employee?.position || roleLabel}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">{roleLabel}</span>
              {employee?.employee_code && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-mono">{employee.employee_code}</span>
              )}
              {employee?.status && (
                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                  employee.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                }`}>
                  {employee.status === "active" ? "Đang làm việc" : "Không hoạt động"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal info */}
      {employee && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User size={16} className="text-blue-500" /> Thông tin cá nhân
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={Mail} label="Email" value={employee.email} />
            <InfoRow icon={Phone} label="Điện thoại" value={employee.phone || "—"} />
            <InfoRow icon={Calendar} label="Ngày sinh" value={employee.date_of_birth ? formatDate(employee.date_of_birth) : "—"} />
            <InfoRow icon={User} label="Giới tính" value={employee.gender === "male" ? "Nam" : employee.gender === "female" ? "Nữ" : employee.gender === "other" ? "Khác" : "—"} />
            <InfoRow icon={MapPin} label="Địa chỉ" value={employee.address || "—"} />
            <InfoRow icon={Building2} label="Phòng ban" value={(employee.department as { name: string } | undefined)?.name || "—"} />
            <InfoRow icon={Calendar} label="Ngày vào làm" value={formatDate(employee.hire_date)} />
            {isAdmin && <InfoRow icon={User} label="Lương cơ bản" value={formatCurrency(employee.base_salary)} />}
          </div>
        </div>
      )}

      {/* Bank info */}
      {employee && (employee.bank_name || employee.bank_account || employee.tax_code) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Thông tin ngân hàng & bảo hiểm</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {employee.bank_name && <InfoRow icon={Building2} label="Ngân hàng" value={employee.bank_name} />}
            {employee.bank_account && <InfoRow icon={User} label="Số tài khoản" value={employee.bank_account} />}
            {employee.tax_code && <InfoRow icon={User} label="Mã số thuế" value={employee.tax_code} />}
            {employee.insurance_code && <InfoRow icon={User} label="Mã BHXH" value={employee.insurance_code} />}
          </div>
        </div>
      )}

      {/* Password change */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Lock size={16} className="text-blue-500" /> Đổi mật khẩu
          </h3>
          {!isChangingPassword && (
            <Button onClick={() => setIsChangingPassword(true)} variant="outline" size="sm">Đổi mật khẩu</Button>
          )}
        </div>
        {isChangingPassword && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
              <input type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
              <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" onClick={() => setIsChangingPassword(false)}>Huỷ</Button>
              <Button loading={isSaving} onClick={handleChangePassword}>Cập nhật mật khẩu</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={14} className="text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}
