import { toast } from "sonner";
import { translateError, formatErrorForDisplay } from "@/lib/error-translator";
import { logger } from "@/lib/logger";
import { areNotificationsEnabled } from "@/lib/settings";

interface ToastOptions {
  description?: string;
  duration?: number;
  force?: boolean; // Show even if notifications are disabled
}

/**
 * Check if toast should be shown based on settings
 */
function shouldShowToast(force?: boolean): boolean {
  if (force) return true;
  return areNotificationsEnabled();
}

/**
 * Show a success toast notification
 */
export function showSuccessToast(message: string, options?: ToastOptions) {
  logger.success(message, options?.description);
  
  if (!shouldShowToast(options?.force)) return;
  
  toast.success(message, {
    description: options?.description,
    duration: options?.duration || 4000,
    position: "top-right",
  });
}

/**
 * Show an error toast with translated error message
 * Errors are always shown regardless of notification settings
 */
export function showErrorToast(error: unknown, context?: string) {
  const translated = translateError(error);
  const displayMessage = formatErrorForDisplay(translated);
  
  logger.error(
    context ? `${context}: ${translated.message}` : translated.message,
    translated.originalMessage,
    translated.code
  );

  // Errors are always shown (force: true equivalent)
  toast.error(context || "Terjadi Kesalahan", {
    description: displayMessage,
    duration: 6000,
    position: "top-right",
  });
}

/**
 * Show a warning toast notification
 */
export function showWarningToast(message: string, options?: ToastOptions) {
  logger.warning(message, options?.description);
  
  if (!shouldShowToast(options?.force)) return;
  
  toast.warning(message, {
    description: options?.description,
    duration: options?.duration || 5000,
    position: "top-right",
  });
}

/**
 * Show an info toast notification
 */
export function showInfoToast(message: string, options?: ToastOptions) {
  logger.info(message, options?.description);
  
  if (!shouldShowToast(options?.force)) return;
  
  toast.info(message, {
    description: options?.description,
    duration: options?.duration || 4000,
    position: "top-right",
  });
}

/**
 * Show a loading toast that can be updated
 */
export function showLoadingToast(message: string) {
  return toast.loading(message, {
    position: "top-right",
  });
}

/**
 * Dismiss a toast by ID
 */
export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}

/**
 * Update an existing toast
 */
export function updateToast(
  toastId: string | number,
  type: "success" | "error" | "info" | "warning",
  message: string,
  description?: string
) {
  toast.dismiss(toastId);
  
  switch (type) {
    case "success":
      showSuccessToast(message, { description });
      break;
    case "error":
      showErrorToast(message);
      break;
    case "warning":
      showWarningToast(message, { description });
      break;
    case "info":
      showInfoToast(message, { description });
      break;
  }
}
