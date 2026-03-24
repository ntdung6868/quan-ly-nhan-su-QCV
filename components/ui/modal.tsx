"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-200"
        onClick={onClose}
      />
      <div className={cn(
        "relative bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        sizeMap[size]
      )}>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
            <h3 className="font-semibold">{title}</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
