"use client";

import { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Camera, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const isCheckOut = !!(currentAttendance?.check_in && !currentAttendance?.check_out);

  useEffect(() => {
    if (open) {
      loadConfig();
      getLocation();
    }
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);

  async function loadConfig() {
    const { data } = await supabase.from("company_config").select("*").single();
    setConfig(data);
    if (data?.photo_required) startCamera();
  }

  async function startCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch {
      toast.error("Không thể mở camera");
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    setPhotoData(canvasRef.current.toDataURL("image/jpeg", 0.8));
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  function getLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError("Không lấy được vị trí")
    );
  }

  function checkGpsDistance(): boolean {
    if (!config?.gps_enabled || !config.gps_lat || !config.gps_lng) return true;
    if (!location) return false;
    const R = 6371e3;
    const φ1 = (location.lat * Math.PI) / 180;
    const φ2 = (config.gps_lat * Math.PI) / 180;
    const Δφ = ((config.gps_lat - location.lat) * Math.PI) / 180;
    const Δλ = ((config.gps_lng - location.lng) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return distance <= (config.gps_radius || 100);
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoData || !employee) return null;
    const blob = await (await fetch(photoData)).blob();
    const fileName = `${employee.id}/${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from("attendance-photos")
      .upload(fileName, blob, { contentType: "image/jpeg" });
    if (error) return null;
    const { data: urlData } = supabase.storage.from("attendance-photos").getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  async function handleSubmit() {
    if (!employee) return;
    if (config?.gps_enabled && !checkGpsDistance()) {
      toast.error("Bạn đang ngoài phạm vi chấm công cho phép");
      return;
    }
    if (config?.photo_required && !photoData) {
      toast.error("Vui lòng chụp ảnh xác nhận");
      return;
    }
    setIsLoading(true);
    try {
      const photoUrl = await uploadPhoto();
      const now = new Date().toISOString();
      const today = now.split("T")[0];

      if (!isCheckOut) {
        const { data, error } = await supabase
          .from("attendance")
          .upsert({
            employee_id: employee.id,
            date: today,
            check_in: now,
            check_in_lat: location?.lat,
            check_in_lng: location?.lng,
            check_in_photo: photoUrl,
            status: "present",
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
        const standardHours = 8;
        const overtime = Math.max(0, workHours - standardHours);

        const { data, error } = await supabase
          .from("attendance")
          .update({
            check_out: now,
            check_out_lat: location?.lat,
            check_out_lng: location?.lng,
            check_out_photo: photoUrl,
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
        {/* Camera */}
        {(config?.photo_required || stream || photoData) && (
          <div className="rounded-xl overflow-hidden bg-gray-900 aspect-video relative">
            {!photoData ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {stream && (
                  <button
                    onClick={capturePhoto}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition"
                  >
                    <Camera size={20} className="text-gray-800" />
                  </button>
                )}
                {!stream && config?.photo_required && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button onClick={startCamera} leftIcon={<Camera size={14} />}>
                      Bật camera
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <img src={photoData} alt="Ảnh chấm công" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setPhotoData(null); startCamera(); }}
                  className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded"
                >
                  Chụp lại
                </button>
              </>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Location */}
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          location ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
        }`}>
          <MapPin size={16} />
          {location ? (
            <span>Vị trí: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
          ) : locationError ? (
            <span>{locationError}</span>
          ) : (
            <span>Đang lấy vị trí...</span>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Nhập ghi chú nếu có..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <Button
          className="w-full"
          loading={isLoading}
          onClick={handleSubmit}
          leftIcon={<CheckCircle2 size={16} />}
        >
          {isCheckOut ? "Xác nhận Check-out" : "Xác nhận Check-in"}
        </Button>
      </div>
    </Modal>
  );
}
