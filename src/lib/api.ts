import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError, type ZodType } from "zod";
import { appConfig } from "@/config";
import { hasAnyPermission, hasPermission, type Permission } from "@/config/permissions";
import { HttpError } from "@/lib/errors";
import { getCurrentUser } from "@/services/AuthService";
import type { ApiFailure, ApiSuccess, Pagination } from "@/types/api";
import type { SessionUser } from "@/types/user";

// ---------------------------------------------------------------------------
// Envelope helpers
// ---------------------------------------------------------------------------

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, init);
}

export function paginated<T>(
  data: T[],
  pagination: Pagination,
  init?: ResponseInit,
): NextResponse<ApiSuccess<T[]>> {
  return NextResponse.json({ success: true, data, pagination }, init);
}

export function fail(
  error: string,
  status = 400,
  fieldErrors?: Record<string, string[]>,
): NextResponse<ApiFailure> {
  const body: ApiFailure = fieldErrors ? { success: false, error, fieldErrors } : { success: false, error };
  return NextResponse.json(body, { status });
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(appConfig.pagination.maxPageSize)
    .default(appConfig.pagination.defaultPageSize),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function buildPagination(page: number, pageSize: number, total: number): Pagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/** Row offset for a page, for use with `.offset()` in queries. */
export function pageOffset({ page, pageSize }: PaginationQuery): number {
  return (page - 1) * pageSize;
}

// ---------------------------------------------------------------------------
// Request parsing
// ---------------------------------------------------------------------------

/** Parses and validates a JSON body. Throws a 400 for malformed JSON and a ZodError for bad data. */
export async function parseBody<S extends ZodType>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw HttpError.badRequest("Request body must be valid JSON.");
  }
  return schema.parse(raw);
}

/** Validates the query string. */
export function parseQuery<S extends ZodType>(req: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}

/** Parses a numeric route param. A malformed id is simply "not found". */
export function parseId(raw: string | string[] | undefined): number {
  const value = typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isSafeInteger(value) || value <= 0) throw HttpError.notFound();
  return value;
}

// ---------------------------------------------------------------------------
// Route wrapper
// ---------------------------------------------------------------------------

export interface AuthContext<P> {
  user: SessionUser;
  params: P;
}

export interface WithAuthOptions {
  /** The user must hold this permission. */
  permission?: Permission;
  /** The user must hold at least one of these permissions. */
  anyOf?: readonly Permission[];
}

type RouteParams = Record<string, string | string[]>;

/**
 * Wraps a route handler with authentication, a role check and uniform error
 * handling. Every API route must use this (or be explicitly public).
 *
 * The user is read from the database on each call, so permission changes and
 * deleted accounts are enforced immediately. Errors become the standard
 * `{ success: false, error }` envelope: `HttpError` keeps its status,
 * `ZodError` becomes 422 with per-field messages, anything else is a 500.
 */
export function withAuth<P extends RouteParams = Record<string, never>>(
  handler: (req: NextRequest, ctx: AuthContext<P>) => Promise<Response> | Response,
  options: WithAuthOptions = {},
) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }): Promise<Response> => {
    try {
      const user = await getCurrentUser();
      if (!user) return fail("You must be signed in.", 401);

      const { permission, anyOf } = options;
      if (permission && !hasPermission(user.role, permission)) {
        return fail("You do not have permission to do this.", 403);
      }
      if (anyOf && !hasAnyPermission(user.role, anyOf)) {
        return fail("You do not have permission to do this.", 403);
      }

      const params = routeCtx?.params ? await routeCtx.params : ({} as P);
      return await handler(req, { user, params });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/** Groups Zod issues by dotted field path, e.g. { "items.0.price": ["Required"] }. */
export function fieldErrorsOf(error: ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    (result[key] ??= []).push(issue.message);
  }
  return result;
}

export function toErrorResponse(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof HttpError) return fail(error.message, error.status, error.fieldErrors);
  if (error instanceof ZodError) {
    const fieldErrors = fieldErrorsOf(error);
    const first = Object.entries(fieldErrors)[0];
    const message = first ? `${first[0]}: ${first[1][0] ?? "Invalid value"}` : "Invalid request.";
    return fail(message, 422, fieldErrors);
  }
  console.error("[api] unhandled error", error);
  return fail("Something went wrong. Please try again.", 500);
}
