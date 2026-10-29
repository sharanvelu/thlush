import type { ApiResponse, ApiSuccess } from "@/types/api";

/** Thrown by `api.*` when the server answers with an error envelope or the network fails. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<ApiSuccess<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError("Could not reach the server. Check your connection and try again.", 0);
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // Not JSON: fall through to the generic error below.
  }

  if (payload?.success) return payload;
  if (payload && !payload.success) throw new ApiClientError(payload.error, response.status, payload.fieldErrors);
  throw new ApiClientError("Something went wrong. Please try again.", response.status);
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body ?? {}),
  patch: <T>(url: string, body: unknown) => request<T>("PATCH", url, body),
  delete: <T>(url: string) => request<T>("DELETE", url),
};

/** A short, user-facing message for any thrown value. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
