"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { MapPin, CheckCircle2, CircleCheck, CircleX, AlertCircle } from "lucide-react";
import type { Attendance, CompanyConfig } from "@/types/database";

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  currentAttendance: Attendance | null;
  onSuccess: (attendance: Attendance) => void;
}

export function CheckInModal({ open, onClose, currentAttendance, onSuccess }: CheckInModalProps) {
  const { employee } = useAuth();
  const supabase = createClient();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [todayLeave, setTodayLeave] = useState<string | null>(null);
  const [todayHoliday, setTodayHoliday] = useState<string | null>(null);
  const isCheckOut = !!(currentAttendance?.check_in && !currentAttendance?.check_out);

  useEffect(() => {
    if (open) {
      loadConfig();
      getLocation();
      checkTodayLeave();
      checkTodayHoliday();
    }
  }, [open]);

  async function checkTodayLeave() {
    if (!employee) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("leaves")
      .select("*, leave_type:leave_types(name)")
      .eq("employee_id", employee.id)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .limit(1);
    const leave = data?.[0];
    setTodayLeave(leave ? (leave.leave_type as { name: string } | null)?.name || "Nghỉ phép" : null);
  }

  async function checkTodayHoliday() {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("holidays")
      .select("name")
      .eq("date", today)
      .limit(1);
    setTodayHoliday(data?.[0]?.name ?? null);
  }

  async function loadConfig() {
    const { data } = await supabase.from("company_config").select("*").single();
    setConfig(data);
  }

  function getLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError("Không lấy được vị trí")
    );
  }

  function calcDistance(): number | null {
    if (!config?.gps_enabled || !config.gps_lat || !config.gps_lng || !location) return null;
    const R = 6371e3;
    const φ1 = (location.lat * Math.PI) / 180;
    const φ2 = (config.gps_lat * Math.PI) / 180;
    const Δφ = ((config.gps_lat - location.lat) * Math.PI) / 180;
    const Δλ = ((config.gps_lng - location.lng) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const gpsDistance = calcDistance();
  const gpsRadius = config?.gps_radius || 100;
  const isInRange = config?.gps_enabled ? (gpsDistance !== null && gpsDistance <= gpsRadius) : true;

  async function handleSubmit() {
    if (!employee) return;
    if (!isCheckOut && todayHoliday) {
      toast.error(`Hôm nay là ngày lễ (${todayHoliday}). Không cần chấm công.`);
      return;
    }
    if (!isCheckOut && todayLeave) {
      toast.error(`Hôm nay bạn đang nghỉ phép (${todayLeave}). Không thể check-in.`);
      return;
    }
    if (config?.gps_enabled && !isInRange) {
      toast.error("Bạn đang ngoài phạm vi chấm công cho phép");
      return;
    }
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const today = now.split("T")[0];

      if (!isCheckOut) {
        let status: "present" | "late" = "present";
        if (config?.late_after_time) {
          const [h, m] = config.late_after_time.split(":").map(Number);
          const currentTime = new Date();
          const lateTime = new Date();
          lateTime.setHours(h, m, 0, 0);
          if (currentTime > lateTime) status = "late";
        }

        const { data, error } = await supabase
          .from("attendance")
          .upsert({
            employee_id: employee.id,
            date: today,
            check_in: now,
            check_in_lat: location?.lat,
            check_in_lng: location?.lng,
            status,
            notes: notes || null,
          })
          .select()
          .single();
        if (error) throw error;
        toast.success("Check-in thành công!");
        onSuccess(data);
      } else {
        if (!currentAttendance) return;
        const checkInTime = new Date(currentAttendance.check_in!);
        const checkOutTime = new Date(now);
        const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        const overtime = Math.max(0, workHours - 8);

        const { data, error } = await supabase
          .from("attendance")
          .update({
            check_out: now,
            check_out_lat: location?.lat,
            check_out_lng: location?.lng,
            work_hours: Math.round(workHours * 100) / 100,
            overtime_hours: Math.round(overtime * 100) / 100,
          })
          .eq("id", currentAttendance.id)
          .select()
          .single();
        if (error) throw error;
        toast.success("Check-out thành công!");
        onSuccess(data);
      }
    } catch {
      toast.error("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isCheckOut ? "Check-out" : "Check-in"} size="sm">
      <div className="space-y-4">
        {/* Holiday warning */}
        {!isCheckOut && todayHoliday && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>Hôm nay là ngày lễ: <strong>{todayHoliday}</strong>. Không cần chấm công.</span>
          </div>
        )}

        {/* Leave warning */}
        {!isCheckOut && !todayHoliday && todayLeave && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>Hôm nay bạn đang nghỉ <strong>{todayLeave}</strong>. Không thể check-in.</span>
          </div>
        )}

        {/* Location */}
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          !location && !locationError
            ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
            : locationError
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              : config?.gps_enabled
                ? isInRange
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
        }`}>
          <MapPin size={16} className="shrink-0" />
          {location ? (
            <div className="flex-1 flex items-center justify-between gap-2">
              <span>Vị trí: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
              {config?.gps_enabled && gpsDistance !== null && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs opacity-70">{Math.round(gpsDistance)}m</span>
                  {isInRange ? (
                    <CircleCheck size={18} className="text-green-600 dark:text-green-400" />
                  ) : (
                    <CircleX size={18} className="text-red-600 dark:text-red-400" />
                  )}
                </div>
              )}
            </div>
          ) : locationError ? (
            <span>{locationError}</span>
          ) : (
            <span>Đang lấy vị trí...</span>
          )}
        </div>
        {config?.gps_enabled && location && !isInRange && (
          <p className="text-xs text-red-600 dark:text-red-400 -mt-2 ml-1">
            Ngoài phạm vi cho phép ({gpsRadius}m)
          </p>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Nhập ghi chú nếu có..."
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
          />
        </div>

        <Button
          className="w-full"
          loading={isLoading}
          onClick={handleSubmit}
          disabled={!isCheckOut && (!!todayLeave || !!todayHoliday)}
          leftIcon={<CheckCircle2 size={16} />}
        >
          {isCheckOut ? "Xác nhận Check-out" : "Xác nhận Check-in"}
        </Button>
      </div>
    </Modal>
  );
}
