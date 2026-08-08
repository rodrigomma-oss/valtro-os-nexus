import type { ZodTypeAny, z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest, authorize, type ApiAuthContext } from "./auth.server";
import { logApiRequest, logUnauthenticatedApiRequest } from "./audit.server";
import {
  acquireIdempotency,
  commitIdempotency,
  calculatePayloadHash,
} from "./idempotency.server";
import {
  apiErrorResponse,
  apiSuccessResponse,
  createApiRequestId,
  getApiClientRequestId,
} from "./responses.server";
import type { ApiVersion, ApiVersionStatus } from "./types";

const DEFAULT_MAX_PAYLOAD_BYTES = 1_048_576;
const DEFAULT_ABSOLUTE_MAX_PAYLOAD_BYTES = 10_485_760;

export interface ApiVersionContext {
  id: string;
  versionCode: string;
  status: ApiVersionStatus;
  releasedAt: string | null;
  deprecatedAt: string | null;
  sunsetAt: string | null;
  replacementVersionId: string | null;
}

export interface ApiPipelineContext<
  TBody = undefined,
  TQuery = Record<string, string | string[]>,
  TParams = Record<string, string>,
> {
  request: Request;
  requestId: string;
  method: string;
  pathname: string;
  startedAt: Date;
  version: Readonly<ApiVersionContext>;
  auth?: ApiAuthContext;
  scopes: readonly string[];
  ip?: string;
  userAgent?: string;
  body: TBody;
  query: TQuery;
  params: TParams;
}

export interface ApiHandlerResult<T> {
  data: T;
  status?: number;
  headers?: HeadersInit;
}

export interface ApiRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

type InferSchema<TSchema extends ZodTypeAny | undefined, TFallback> = TSchema extends ZodTypeAny
  ? z.infer<TSchema>
  : TFallback;

export interface ApiHandlerConfig<
  TData,
  TBodySchema extends ZodTypeAny | undefined = undefined,
  TQuerySchema extends ZodTypeAny | undefined = undefined,
  TParamsSchema extends ZodTypeAny | undefined = undefined,
> {
  version: `v${number}`;
  authentication: "none" | "required";
  requiredScopes?: readonly string[];
  bodySchema?: TBodySchema;
  querySchema?: TQuerySchema;
  paramsSchema?: TParamsSchema;
  payload?: {
    defaultMaxBytes?: number;
    absoluteMaxBytes?: number;
  };
  rateLimit?: false | { enabled: true };
  audit?: boolean;
  available?: () => boolean;
  handler: (
    context: ApiPipelineContext<
      InferSchema<TBodySchema, undefined>,
      InferSchema<TQuerySchema, Record<string, string | string[]>>,
      InferSchema<TParamsSchema, Record<string, string>>
    >,
  ) => Promise<ApiHandlerResult<TData>> | ApiHandlerResult<TData>;
}

export interface ApiPipelineDependencies {
  createRequestId: () => string;
  now: () => Date;
  loadVersion: (versionCode: string) => Promise<ApiVersionContext | null>;
  authenticate: typeof authenticateRequest;
  auditAuthenticated: typeof logApiRequest;
  auditUnauthenticated: typeof logUnauthenticatedApiRequest;
  checkRateLimit?: (context: ApiAuthContext) => Promise<ApiRateLimitResult>;
}

export interface ApiRouteInvocation {
  request: Request;
  params?: Record<string, string>;
}

export class ApiPipelineError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly fields?: Record<string, unknown>,
    readonly headers?: HeadersInit,
  ) {
    super(message);
    this.name = "ApiPipelineError";
  }
}

async function loadVersion(versionCode: string): Promise<ApiVersionContext | null> {
  const { data, error } = await supabaseAdmin
    .from("api_versions")
    .select(
      "id, version_code, status, released_at, deprecated_at, sunset_at, replacement_version_id",
    )
    .eq("version_code", versionCode)
    .maybeSingle();

  if (error || !data) return null;
  const version = data as Pick<
    ApiVersion,
    | "id"
    | "version_code"
    | "status"
    | "released_at"
    | "deprecated_at"
    | "sunset_at"
    | "replacement_version_id"
  >;

  return Object.freeze({
    id: version.id,
    versionCode: version.version_code,
    status: version.status,
    releasedAt: version.released_at,
    deprecatedAt: version.deprecated_at,
    sunsetAt: version.sunset_at,
    replacementVersionId: version.replacement_version_id,
  });
}

const defaultDependencies: ApiPipelineDependencies = {
  createRequestId: createApiRequestId,
  now: () => new Date(),
  loadVersion,
  authenticate: authenticateRequest,
  auditAuthenticated: logApiRequest,
  auditUnauthenticated: logUnauthenticatedApiRequest,
};

function versionHeaders(version: ApiVersionContext): Headers {
  const headers = new Headers({ "X-Valtro-API-Version": version.versionCode });
  if (version.deprecatedAt) {
    headers.set("Deprecation", new Date(version.deprecatedAt).toUTCString());
  }
  if (version.sunsetAt) {
    headers.set("Sunset", new Date(version.sunsetAt).toUTCString());
  }
  return headers;
}

function mergeHeaders(...sets: Array<HeadersInit | undefined>): Headers {
  const result = new Headers();
  for (const set of sets) {
    if (!set) continue;
    new Headers(set).forEach((value, key) => result.set(key, value));
  }
  return result;
}

function queryInput(url: URL): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    result[key] = values.length === 1 ? values[0] : values;
  }
  return result;
}

function validationFields(error: { issues: Array<{ path: Array<string | number> }> }) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    fields[issue.path.length ? issue.path.join(".") : "$request"] = "Invalid value.";
  }
  return fields;
}

function parseJsonBody(rawBody: Uint8Array): unknown {
  if (rawBody.byteLength === 0) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    throw new ApiPipelineError("VALIDATION_ERROR", 422, "Request validation failed.", {
      $body: "Malformed JSON.",
    });
  }
}

function rateLimitHeaders(result: ApiRateLimitResult): Headers {
  const headers = new Headers({
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "RateLimit-Reset": String(Math.ceil(result.resetAt.getTime() / 1000)),
  });
  if (result.retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(result.retryAfterSeconds));
  }
  return headers;
}

export function createApiHandler<
  TData,
  TBodySchema extends ZodTypeAny | undefined = undefined,
  TQuerySchema extends ZodTypeAny | undefined = undefined,
  TParamsSchema extends ZodTypeAny | undefined = undefined,
>(
  config: ApiHandlerConfig<TData, TBodySchema, TQuerySchema, TParamsSchema>,
  dependencyOverrides: Partial<ApiPipelineDependencies> = {},
) {
  const dependencies: ApiPipelineDependencies = {
    ...defaultDependencies,
    ...dependencyOverrides,
  };

  if (config.requiredScopes?.length && config.authentication !== "required") {
    throw new Error("Scopes require authentication.");
  }
  if (config.rateLimit && config.authentication !== "required") {
    throw new Error("Rate limiting requires an authenticated application.");
  }

  return async ({ request, params = {} }: ApiRouteInvocation): Promise<Response> => {
    const startedAt = dependencies.now();
    const requestId = dependencies.createRequestId();
    const url = new URL(request.url);
    const auditEnabled = config.audit !== false;
    let authContext: ApiAuthContext | undefined;
    let version: ApiVersionContext | undefined;
    let response: Response;
    let errorCode: string | undefined;

    try {
      if (config.available && !config.available()) {
        throw new ApiPipelineError("NOT_FOUND", 404, "Resource not found.");
      }

      version = (await dependencies.loadVersion(config.version)) ?? undefined;
      if (!version) {
        throw new ApiPipelineError(
          "VERSION_UNAVAILABLE",
          404,
          "API version information is unavailable.",
        );
      }

      const headers = versionHeaders(version);
      const sunsetElapsed =
        version.sunsetAt !== null &&
        new Date(version.sunsetAt).getTime() <= dependencies.now().getTime();
      if (version.status === "disabled" || sunsetElapsed) {
        throw new ApiPipelineError(
          "VERSION_UNAVAILABLE",
          503,
          "API version is unavailable.",
          undefined,
          headers,
        );
      }

      const contentLength = request.headers.get("content-length");
      const declaredLength = contentLength === null ? undefined : Number(contentLength);
      const absoluteMaxBytes =
        config.payload?.absoluteMaxBytes ?? DEFAULT_ABSOLUTE_MAX_PAYLOAD_BYTES;
      if (
        declaredLength !== undefined &&
        Number.isFinite(declaredLength) &&
        declaredLength > absoluteMaxBytes
      ) {
        throw new ApiPipelineError(
          "PAYLOAD_TOO_LARGE",
          413,
          "Request payload is too large.",
          undefined,
          headers,
        );
      }

      const needsBody =
        config.authentication === "required" ||
        Boolean(config.bodySchema) ||
        Boolean(config.payload);
      const rawBody = needsBody
        ? new Uint8Array(await request.clone().arrayBuffer())
        : new Uint8Array();
      if (rawBody.byteLength > absoluteMaxBytes) {
        throw new ApiPipelineError(
          "PAYLOAD_TOO_LARGE",
          413,
          "Request payload is too large.",
          undefined,
          headers,
        );
      }

      if (config.authentication === "required") {
        const authResult = await dependencies.authenticate(request, requestId, rawBody);
        if ("error" in authResult) {
          throw new ApiPipelineError(
            authResult.error.code,
            authResult.error.status,
            authResult.error.message,
            undefined,
            headers,
          );
        }
        authContext = authResult.context;
      }

      if (authContext && config.requiredScopes?.some((scope) => !authorize(authContext!, scope))) {
        throw new ApiPipelineError(
          "INSUFFICIENT_SCOPE",
          403,
          "The authenticated application lacks a required scope.",
          undefined,
          headers,
        );
      }

      const defaultMaxBytes = config.payload?.defaultMaxBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
      const effectiveMaxBytes = authContext?.technicalLimits.max_payload_bytes ?? defaultMaxBytes;
      if (rawBody.byteLength > Math.min(effectiveMaxBytes, absoluteMaxBytes)) {
        throw new ApiPipelineError(
          "PAYLOAD_TOO_LARGE",
          413,
          "Request payload is too large.",
          undefined,
          headers,
        );
      }

      let body: unknown = undefined;
      if (config.bodySchema) {
        const parsedBody = config.bodySchema.safeParse(parseJsonBody(rawBody));
        if (!parsedBody.success) {
          throw new ApiPipelineError(
            "VALIDATION_ERROR",
            422,
            "Request validation failed.",
            validationFields(parsedBody.error),
            headers,
          );
        }
        body = parsedBody.data;
      }

      const rawQuery = queryInput(url);
      let query: unknown = rawQuery;
      if (config.querySchema) {
        const parsedQuery = config.querySchema.safeParse(rawQuery);
        if (!parsedQuery.success) {
          throw new ApiPipelineError(
            "VALIDATION_ERROR",
            422,
            "Request validation failed.",
            validationFields(parsedQuery.error),
            headers,
          );
        }
        query = parsedQuery.data;
      }

      let validatedParams: unknown = params;
      if (config.paramsSchema) {
        const parsedParams = config.paramsSchema.safeParse(params);
        if (!parsedParams.success) {
          throw new ApiPipelineError(
            "VALIDATION_ERROR",
            422,
            "Request validation failed.",
            validationFields(parsedParams.error),
            headers,
          );
        }
        validatedParams = parsedParams.data;
      }

      let limiterHeaders: Headers | undefined;
      if (config.rateLimit) {
        if (!dependencies.checkRateLimit) {
          throw new ApiPipelineError(
            "RATE_LIMIT_UNAVAILABLE",
            503,
            "Rate limiting is temporarily unavailable.",
            undefined,
            headers,
          );
        }
        const limitResult = await dependencies.checkRateLimit(authContext!);
        limiterHeaders = rateLimitHeaders(limitResult);
        if (!limitResult.allowed) {
          throw new ApiPipelineError(
            "RATE_LIMITED",
            429,
            "Rate limit exceeded.",
            undefined,
            mergeHeaders(headers, limiterHeaders),
          );
        }
      }

      // 8. Idempotência de Negócio (Opcional, apenas POST)
      const idempotencyKey = request.headers.get("x-idempotency-key");
      const useIdempotency = request.method === "POST" && idempotencyKey && authContext;
      let payloadHash = "";

      if (useIdempotency) {
        payloadHash = calculatePayloadHash(body);
        const replay = await acquireIdempotency({
          applicationId: authContext!.applicationId,
          idempotencyKey: idempotencyKey!,
          method: request.method,
          path: url.pathname,
          payloadHash,
          requestId,
        });

        if (replay) {
          return apiSuccessResponse({
            data: replay.responseBody,
            status: replay.responseStatus,
            requestId,
            headers: mergeHeaders(headers, limiterHeaders, replay.responseHeaders, {
              "X-Idempotency-Replay": "true",
            }),
          });
        }
      }

      const result = await config.handler({
        request,
        requestId,
        method: request.method,
        pathname: url.pathname,
        startedAt,
        version,
        auth: authContext,
        scopes: authContext?.scopes ?? [],
        ip: authContext?.ip ?? request.headers.get("x-forwarded-for") ?? undefined,
        userAgent: authContext?.userAgent ?? request.headers.get("user-agent") ?? undefined,
        body: body as never,
        query: query as never,
        params: validatedParams as never,
      });
      response = apiSuccessResponse({
        data: result.data,
        status: result.status,
        requestId,
        headers: mergeHeaders(headers, limiterHeaders, result.headers),
      });

      // Commit Idempotência
      if (useIdempotency) {
        const responseData = await response.clone().json();
        await commitIdempotency({
          applicationId: authContext!.applicationId,
          idempotencyKey: idempotencyKey!,
          status: response.status >= 500 ? "failed" : "completed",
          responseStatus: response.status,
          responseBody: responseData.data,
          responseHeaders: Object.fromEntries(response.headers.entries()),
        });
      }
    } catch (error) {
      if (error instanceof ApiPipelineError) {
        errorCode = error.code;
        response = apiErrorResponse({
          code: error.code,
          message: error.message,
          status: error.status,
          requestId,
          fields: error.fields,
          headers: error.headers,
        });
      } else {
        errorCode = "INTERNAL_ERROR";
        console.error("[API_PIPELINE_INTERNAL_ERROR]", {
          requestId,
          method: request.method,
          path: url.pathname,
          error,
        });
        response = apiErrorResponse({
          code: "INTERNAL_ERROR",
          message: "An internal error occurred.",
          status: 500,
          requestId,
          headers: version ? versionHeaders(version) : undefined,
        });
      }
    }

    if (auditEnabled) {
      const durationMs = Math.max(0, dependencies.now().getTime() - startedAt.getTime());
      try {
        if (authContext) {
          await dependencies.auditAuthenticated({
            context: authContext,
            method: request.method,
            path: url.pathname,
            statusCode: response.status,
            durationMs,
            errorCode,
          });
        } else {
          await dependencies.auditUnauthenticated({
            method: request.method,
            path: url.pathname,
            statusCode: response.status,
            durationMs,
            requestId,
            errorCode,
            clientRequestId: getApiClientRequestId(request),
            ip: request.headers.get("x-forwarded-for") || undefined,
            userAgent: request.headers.get("user-agent") || undefined,
          });
        }
      } catch (auditError) {
        console.error("[API_PIPELINE_AUDIT_ERROR]", { requestId, auditError });
      }
    }

    return response;
  };
}
