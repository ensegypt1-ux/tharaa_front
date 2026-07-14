"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "./Button";
import { InlineSpinner } from "./LoadingState";

export function FileUploadButton({
  onFileSelected,
  accept = "image/jpeg,image/png,image/webp",
  isLoading,
  label = "رفع صورة",
  variant = "outline",
}: {
  onFileSelected: (file: File) => void;
  accept?: string;
  isLoading?: boolean;
  label?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant={variant}
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? <InlineSpinner /> : <Upload className="size-4" />}
        {label}
      </Button>
    </>
  );
}
