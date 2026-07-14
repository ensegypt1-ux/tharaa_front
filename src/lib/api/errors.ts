import axios from "axios";
import { COMMON_AR } from "../ar/labels";

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errorCode?: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

export class ApiError extends Error {
  statusCode: number;
  errorCode?: string;
  details?: unknown;

  constructor(payload: ApiErrorResponse) {
    super(payload.message);
    this.name = "ApiError";
    this.statusCode = payload.statusCode;
    this.errorCode = payload.errorCode;
    this.details = payload.details;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: COMMON_AR.validationError,
  401: COMMON_AR.unauthorized,
  403: COMMON_AR.forbidden,
};

/**
 * Maps backend / network errors to Arabic-safe UI messages.
 * Never surfaces raw exception stacks.
 */
export function getErrorMessage(
  error: unknown,
  fallback: string = COMMON_AR.somethingWentWrong,
): string {
  if (error instanceof ApiError) {
    if (error.statusCode && STATUS_MESSAGES[error.statusCode]) {
      return STATUS_MESSAGES[error.statusCode];
    }
    if (error.errorCode) {
      return humanizeErrorCode(error.errorCode) ?? fallback;
    }
    // Prefer short safe Arabic fallback over raw English backend text
    return fallback;
  }
  if (axios.isAxiosError(error)) {
    if (!error.response) return COMMON_AR.networkError;
    const status = error.response.status;
    if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
    const data = error.response?.data as Partial<ApiErrorResponse> | undefined;
    if (data?.errorCode) {
      return humanizeErrorCode(data.errorCode) ?? fallback;
    }
    return fallback;
  }
  if (error instanceof Error && (error as { code?: string }).code === "NOT_STAFF") {
    return COMMON_AR.notStaff;
  }
  return fallback;
}

function humanizeErrorCode(code: string): string | undefined {
  const map: Record<string, string> = {
    PEXELS_MISSING_API_KEY: "مفتاح Pexels غير مُعد على الخادم.",
    PEXELS_RATE_LIMITED: "تم تجاوز حد طلبات Pexels. حاول لاحقًا.",
    PEXELS_UNAVAILABLE: "خدمة Pexels غير متاحة حاليًا.",
    IMAGE_DOWNLOAD_FAILED: "تعذر تنزيل الصورة المحددة.",
    INVALID_IMAGE: "الملف المحدد ليس صورة صالحة.",
  };
  return map[code];
}

export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof ApiError) return error.errorCode;
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Partial<ApiErrorResponse> | undefined;
    return data?.errorCode;
  }
  return undefined;
}

export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as Partial<ApiErrorResponse>;
    return new ApiError({
      success: false,
      statusCode: data.statusCode ?? error.response.status ?? 500,
      message: data.message ?? COMMON_AR.somethingWentWrong,
      errorCode: data.errorCode,
      details: data.details,
      timestamp: data.timestamp ?? new Date().toISOString(),
      path: data.path ?? "",
    });
  }
  return new ApiError({
    success: false,
    statusCode: 500,
    message: COMMON_AR.somethingWentWrong,
    timestamp: new Date().toISOString(),
    path: "",
  });
}
