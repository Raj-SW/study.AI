import { config } from "@/lib/config";
import { HttpError } from "./errors";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // body is not JSON
    }
    throw new HttpError(response.status, response.statusText, body);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function buildUrl(path: string): string {
  return `${config.apiBaseUrl}${path}`;
}

function authHeaders(): Record<string, string> {
  return { "x-user-id": config.userId };
}

export const httpClient = {
  async get<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(buildUrl(path), {
      ...options,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...options?.headers,
      },
    });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, options?: RequestOptions): Promise<T> {
    const { body, ...rest } = options ?? {};
    const response = await fetch(buildUrl(path), {
      ...rest,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...rest.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async upload<T>(path: string, formData: FormData, options?: RequestInit): Promise<T> {
    const response = await fetch(buildUrl(path), {
      ...options,
      method: "POST",
      headers: {
        ...authHeaders(),
        ...options?.headers,
      },
      body: formData,
      // Don't set Content-Type — browser sets multipart boundary automatically
    });
    return handleResponse<T>(response);
  },

  async delete<T = void>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(buildUrl(path), {
      ...options,
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...options?.headers,
      },
    });
    return handleResponse<T>(response);
  },
};
