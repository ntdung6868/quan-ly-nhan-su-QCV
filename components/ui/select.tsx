"use client";

import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
}

// Radix Select không hỗ trợ value="", dùng sentinel thay thế
const EMPTY = "__empty__";

export function Select({
  value,
  onValueChange,
  placeholder = "Chọn...",
  options,
  className,
  disabled,
}: SelectProps) {
  // Chuyển "" → sentinel cho Radix
  const radixValue = value === "" || value == null ? EMPTY : value;

  function handleChange(v: string) {
    onValueChange?.(v === EMPTY ? "" : v);
  }

  // Tìm label hiện tại
  const currentOption = options.find((o) =>
    (o.value === "" && radixValue === EMPTY) || o.value === value
  );

  return (
    <SelectPrimitive.Root value={radixValue} onValueChange={handleChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          "inline-flex items-center justify-between w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          (!currentOption || currentOption.value === "") && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate pointer-events-none">
          {currentOption?.label || placeholder}
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown size={14} className="shrink-0 text-muted-foreground ml-2" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            "z-50 overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport className="p-1 max-h-60">
            {options.map((option) => {
              const itemValue = option.value === "" ? EMPTY : option.value;
              return (
                <SelectPrimitive.Item
                  key={itemValue}
                  value={itemValue}
                  className={cn(
                    "relative flex items-center rounded-md px-2 py-1.5 text-sm cursor-pointer select-none",
                    "outline-none",
                    "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                    "data-[disabled]:opacity-50 data-[disabled]:pointer-events-none"
                  )}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="ml-auto">
                    <Check size={14} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              );
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
