import React, { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

/**
 * Choosing one thing out of a list, on the phone.
 *
 * The list slides up from the bottom of the screen and is read and tapped at the size a thumb works
 * in, rather than the browser's own chooser — which a WebView draws small, cuts short and sometimes
 * lays over the thing being chosen. The choice in hand is marked, and the row says what stands chosen
 * now, so a long list of pictures or lines is worked through without guessing.
 */
export default function PickSheet({
  value,
  options = [],
  onChange,
  title,
  description,
  ariaLabel,
  disabled = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => String(option.value) === String(value)) || options[0];

  const pick = (next) => {
    onChange?.(next);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`account-input flex items-center justify-between gap-2 text-left disabled:opacity-50 ${className}`}
      >
        <span className="min-w-0 flex-1 truncate">{current?.label || "Choose one"}</span>
        <ChevronDown className="h-4 w-4 flex-none opacity-70" aria-hidden="true" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-[16px]">{title}</DrawerTitle>
            {description ? (
              <DrawerDescription className="text-[12px] leading-snug">{description}</DrawerDescription>
            ) : (
              <DrawerDescription className="sr-only">{title}</DrawerDescription>
            )}
          </DrawerHeader>

          <div className="overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {options.map((option) => {
              const picked = String(option.value) === String(value);
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => pick(option.value)}
                  className={`flex w-full items-start gap-2 rounded-xl px-3 py-3 text-left text-[13px] leading-snug ${
                    picked ? "bg-secondary font-semibold" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">{option.label}</span>
                  {picked ? (
                    <Check className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}