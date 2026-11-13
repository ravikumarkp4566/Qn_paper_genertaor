// The one place the web app talks to the server (server/, under /api).
import { toast } from "sonner";

const TOKEN_KEY = "qpgen_token";

/** Fired when the server says the session is no longer valid; AuthContext signs out. */
export const SIGNED_OUT_EVENT = "qpgen:signed-out";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Without storage the session lasts until the tab is closed.
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Sent as JSON. */
  body?: unknown;
  /** Sent as-is (images), with its own content type. */
  file?: Blob;
}

async function request(path: string, { method = "GET", body, file }: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (file) {
    headers["Content-Type"] = file.type || "application/octet-stream";
    payload = file;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError("Cannot reach the server. Check that it is running and you are online.", 0);
  }

  if (response.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(data?.error ?? `Request failed (${response.status})`, response.status);
  }
  return response;
}

/** JSON request; resolves to the parsed response (undefined for 204). */
export async function api<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
  const response = await request(path, options);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/** Binary download, e.g. an image. */
export async function apiBlob(path: string): Promise<Blob> {
  return (await request(path)).blob();
}

/**
 * Runs a save in the background. The screen has already been updated, so a
 * failure is shown as a message rather than undoing it silently.
 */
export function saveInBackground(work: Promise<unknown>, what: string): void {
  work.catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error(`Could not save ${what}:`, error);
    toast.error(`Could not save ${what}`, { description: reason });
  });
}
