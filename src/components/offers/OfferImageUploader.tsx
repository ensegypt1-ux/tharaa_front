"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, ImageOff, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { prepareImageForUpload, validateImageFile } from "@/lib/utils/imageUpload";
import { COMMON_AR } from "@/lib/ar/labels";

export function OfferImageUploader({
  imageUrl,
  isUploading,
  progress,
  onUpload,
  onDelete,
  onSelectPending,
  pendingOnly = false,
  disabled,
  className,
}: {
  imageUrl?: string | null;
  isUploading?: boolean;
  progress?: number | null;
  /** Immediate upload (edit mode). */
  onUpload?: (file: File) => Promise<void> | void;
  onDelete?: () => void;
  /** Stage a file for upload after create (create mode). */
  onSelectPending?: (file: File | null) => void;
  pendingOnly?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [broken, setBroken] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setBroken(false);
    if (!pendingOnly) {
      setPreviewUrl(null);
    }
  }, [imageUrl, pendingOnly]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const showUrl = previewUrl || (!broken && imageUrl) || null;

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file || disabled || isUploading) return;
      setLocalError(null);
      const validationError = validateImageFile(file);
      if (validationError) {
        setLocalError(validationError);
        return;
      }
      try {
        const prepared = await prepareImageForUpload(file);
        if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
        const local = URL.createObjectURL(prepared);
        setPreviewUrl(local);
        setBroken(false);
        if (pendingOnly) {
          onSelectPending?.(prepared);
          return;
        }
        await onUpload?.(prepared);
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : "تعذر معالجة الصورة.");
        setPreviewUrl(null);
      }
    },
    [disabled, isUploading, onUpload, onSelectPending, pendingOnly, previewUrl],
  );

  const clearPending = () => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setLocalError(null);
    onSelectPending?.(null);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "relative flex min-h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[var(--radius-xl)] border-2 border-dashed bg-cream/60 px-4 py-6 text-center transition",
          dragOver ? "border-amber-400 bg-amber-50" : "border-border-soft hover:border-amber-300",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        {showUrl ? (
          <Image
            src={showUrl}
            alt=""
            fill
            unoptimized
            className="object-cover"
            onError={() => {
              setBroken(true);
              setPreviewUrl(null);
            }}
          />
        ) : (
          <>
            <div className="mb-2 flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-amber-100 text-amber-700">
              <ImageIcon className="size-6" />
            </div>
            <p className="text-sm font-medium text-charcoal">اسحب الصورة هنا أو انقر للرفع</p>
            <p className="mt-1 text-xs text-charcoal-soft">JPG / PNG / WebP — حتى 5 ميغابايت</p>
          </>
        )}

        {(isUploading || (progress != null && progress < 100)) && (
          <div className="absolute inset-x-0 bottom-0 bg-charcoal/70 px-3 py-2">
            <div className="mb-1 text-[11px] font-medium text-cream">جارٍ الرفع…</div>
            <div className="h-1.5 overflow-hidden rounded-full bg-cream/30">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${Math.max(8, progress ?? 35)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          {showUrl ? "استبدال الصورة" : "رفع صورة"}
        </Button>
        {pendingOnly && previewUrl && (
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={clearPending}>
            <ImageOff className="size-3.5" />
            إزالة الصورة المحددة
          </Button>
        )}
        {!pendingOnly && imageUrl && onDelete && (
          <Button type="button" variant="ghost" size="sm" disabled={disabled || isUploading} onClick={onDelete}>
            <ImageOff className="size-3.5" />
            {COMMON_AR.delete} الصورة
          </Button>
        )}
      </div>

      {pendingOnly && (
        <p className="text-xs text-charcoal-soft">سيتم رفع الصورة بعد حفظ العرض.</p>
      )}

      {localError && (
        <p className="text-xs text-danger" role="alert">
          {localError}
        </p>
      )}
    </div>
  );
}
