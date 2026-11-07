export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, unknown>;
  };
  requestId: string;
}

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
  requestId: string;
}

interface ApiResponseOptions {
  status?: number;
  headers?: HeadersInit;
}

interface ApiErrorResponseOptions extends ApiResponseOptions {
  code: string;
  message: string;
  requestId: string;
  fields?: Record<string, unknown>;
}

interface ApiSuccessResponseOptions<T> extends ApiResponseOptions {
  data: T;
  requestId: string;
}

const CLIENT_REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function createApiRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function getApiClientRequestId(request: Request): string | undefined {
  const candidate = request.headers.get("x-valtro-request-id")?.trim();
  return candidate && CLIENT_REQUEST_ID_PATTERN.test(candidate) ? candidate : undefined;
}

function apiHeaders(requestId: string, extraHeaders?: HeadersInit): Headers {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-valtro-request-id", requestId);
  return headers;
}

export function apiErrorResponse(options: ApiErrorResponseOptions): Response {
  const body: ApiErrorBody = {
    success: false,
    error: {
      code: options.code,
      message: options.message,
      ...(options.fields ? { fields: options.fields } : {}),
    },
    requestId: options.requestId,
  };

  return new Response(JSON.stringify(body), {
    status: options.status ?? 500,
    headers: apiHeaders(options.requestId, options.headers),
  });
}

export function apiSuccessResponse<T>(options: ApiSuccessResponseOptions<T>): Response {
  const body: ApiSuccessBody<T> = {
    success: true,
    data: options.data,
    requestId: options.requestId,
  };

  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers: apiHeaders(options.requestId, options.headers),
  });
}
