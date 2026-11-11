"use client";

export type ToastType = "error" | "success" | "warning" | "info";

export interface ToastPayload {
  id: string;
  message: string;
  type: ToastType;
  durationMs?: number;
}

export const TOAST_EVENT = "oiq:toast";

export class ApiError extends Error {
  status: number;
  errorId?: string;
  payload?: unknown;

  constructor(message: string, status: number, errorId?: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorId = errorId;
    this.payload = payload;
  }
}

export function showToast(message: string, type: ToastType = "error", durationMs = 5000): void {
  if (typeof window === "undefined") return;
  const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  window.dispatchEvent(
    new CustomEvent<ToastPayload>(TOAST_EVENT, {
      detail: { id, message, type, durationMs },
    })
  );
}

/**
 * Checks a `fetch` Response; if `!res.ok`, extracts `{ error }`, triggers a toast (except 402
 * which opens the global billing modal), and throws `ApiError` so callers can roll back UI state.
 */
export async function assertResponseOk<T = Record<string, unknown>>(
  res: Response,
  fallbackMessage = "Could not save changes. Please try again.",
  opts?: { toastOnError?: boolean }
): Promise<T> {
  const shouldToast = opts?.toastOnError !== false;
  let data: Record<string, unknown> | null = null;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const serverMsg = typeof data?.error === "string" && data.error.trim() ? data.error.trim() : fallbackMessage;
    const errorId = typeof data?.errorId === "string" ? data.errorId : undefined;
    const fullMsg = errorId ? `${serverMsg} (Ref: ${errorId})` : serverMsg;
    if (shouldToast && res.status !== 402) {
      showToast(fullMsg, "error");
    }
    throw new ApiError(serverMsg, res.status, errorId, data);
  }

  return (data ?? ({} as Record<string, unknown>)) as T;
}

/**
 * Shared client fetch wrapper that parses JSON, throws `ApiError` on non-2xx responses,
 * and surfaces user-visible error toasts automatically.
 */
export async function apiFetch<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts?: { toastOnError?: boolean; fallbackMessage?: string }
): Promise<T> {
  const shouldToast = opts?.toastOnError !== false;
  const fallback = opts?.fallbackMessage || "Network request failed. Please check your connection and try again.";

  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    if (shouldToast) {
      showToast(fallback, "error");
    }
    throw err instanceof Error ? err : new Error(fallback);
  }

  return assertResponseOk<T>(res, fallback, { toastOnError: shouldToast });
}

/**
 * Reports caught ErrorBoundary crashes or unhandled client exceptions to `/api/client-error`.
 */
export async function reportClientError(
  error: Error & { digest?: string },
  boundary = "error-boundary"
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        name: error?.name || "ClientError",
        message: error?.message || "Unhandled client error",
        stack: error?.stack?.slice(0, 4000),
        digest: error?.digest,
        url: window.location.href,
        boundary,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { errorId?: string };
    return json.errorId || null;
  } catch {
    return null;
  }
}
