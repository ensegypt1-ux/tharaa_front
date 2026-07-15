"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";
import { COMMON_AR } from "@/lib/ar/labels";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "هل أنت متأكد؟",
  description,
  confirmLabel = COMMON_AR.confirm,
  cancelLabel = COMMON_AR.cancel,
  variant = "danger",
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            className="w-full sm:w-auto"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p className="text-sm text-charcoal-soft">{description}</p>}
    </Modal>
  );
}
