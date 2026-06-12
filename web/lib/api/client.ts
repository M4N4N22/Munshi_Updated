import { apiBaseUrl } from "@/lib/config";

export type ApiEnvelope<T> = {
  data: T;
  meta: {
    success: boolean;
    message: string;
    statusCode?: number;
    failures?: { message?: string };
  };
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfterSec?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${apiBaseUrl}${path}`;
  let res: Response;

  try {
    res = await fetch(url, { method: "GET", cache: "no-store" });
  } catch {
    throw new ApiError(
      `Cannot reach the API at ${apiBaseUrl}. Start Munshi_Updated (port 4001) and check CORS allows http://localhost:3000.`,
      0,
    );
  }

  let json: ApiEnvelope<T>;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(
      `API returned a non-JSON response (${res.status}). Is ${apiBaseUrl} the Nest server?`,
      res.status,
    );
  }

  if (!res.ok) {
    const envelope = json as ApiEnvelope<T>;
    const msg =
      envelope.meta?.failures?.message ||
      envelope.meta?.message ||
      "Something went wrong";
    throw new ApiError(msg, res.status);
  }

  return unwrapApiData<T>(json);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${apiBaseUrl}${path}`;
  let res: Response;

  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      `Cannot reach the API at ${apiBaseUrl}. Start Munshi_Updated (port 4001) and check CORS allows http://localhost:3000.`,
      0,
    );
  }

  let json: ApiEnvelope<T>;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(
      `API returned a non-JSON response (${res.status}). Is ${apiBaseUrl} the Nest server?`,
      res.status,
    );
  }

  if (!res.ok) {
    const envelope = json as ApiEnvelope<T>;
    const msg =
      envelope.meta?.failures?.message ||
      envelope.meta?.message ||
      (typeof json === "object" &&
      json !== null &&
      "message" in json &&
      typeof (json as { message: unknown }).message === "string"
        ? (json as { message: string }).message
        : "Something went wrong");
    const retryMatch = /Wait (\d+)s/.exec(msg);
    throw new ApiError(
      msg,
      res.status,
      retryMatch ? Number(retryMatch[1]) : undefined,
    );
  }

  return unwrapApiData<T>(json);
}

export async function apiPostForm<T>(
  path: string,
  form: FormData,
): Promise<T> {
  const url = `${apiBaseUrl}${path}`;
  let res: Response;

  try {
    res = await fetch(url, { method: "POST", body: form });
  } catch {
    throw new ApiError(
      `Cannot reach the API at ${apiBaseUrl}. Start Munshi_Updated (port 4001) and check CORS allows http://localhost:3000.`,
      0,
    );
  }

  let json: ApiEnvelope<T>;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(
      `API returned a non-JSON response (${res.status}). Is ${apiBaseUrl} the Nest server?`,
      res.status,
    );
  }

  if (!res.ok) {
    const envelope = json as ApiEnvelope<T>;
    const msg =
      envelope.meta?.failures?.message ||
      envelope.meta?.message ||
      "Something went wrong";
    throw new ApiError(msg, res.status);
  }

  return unwrapApiData<T>(json);
}

/** Supports `{ data, meta }` (Nest interceptor) or a raw JSON body. */
function unwrapApiData<T>(json: ApiEnvelope<T> | T): T {
  if (
    json &&
    typeof json === "object" &&
    "data" in json &&
    "meta" in json &&
    (json as ApiEnvelope<T>).meta != null
  ) {
    const data = (json as ApiEnvelope<T>).data;
    if (data === undefined || data === null) {
      throw new ApiError("API returned empty data.", 200);
    }
    return data;
  }
  return json as T;
}
