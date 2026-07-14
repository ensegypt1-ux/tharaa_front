import type { FulfilmentType, OrderStatus } from "@/lib/types";

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "تأكيد الطلب",
  PREPARING: "بدء التجهيز",
  READY: "جاهز",
  OUT_FOR_DELIVERY: "خرج للتوصيل",
  COMPLETED: "إكمال الطلب",
  CANCELLED: "إلغاء الطلب",
};

export function nextOperationalStatus(
  status: OrderStatus,
  fulfilmentType: FulfilmentType,
): OrderStatus | null {
  if (status === "PENDING") return "CONFIRMED";
  if (status === "CONFIRMED") return "PREPARING";
  if (status === "PREPARING") return "READY";
  if (status === "READY") {
    return fulfilmentType === "DELIVERY" ? "OUT_FOR_DELIVERY" : "COMPLETED";
  }
  if (status === "OUT_FOR_DELIVERY") return "COMPLETED";
  return null;
}

export function actionLabelForStatus(status: OrderStatus): string {
  return ACTION_LABEL[status] ?? status;
}

export function canShowCancel(status: OrderStatus): boolean {
  return status !== "PENDING" && status !== "COMPLETED" && status !== "CANCELLED";
}
