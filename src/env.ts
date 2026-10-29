import { z } from "zod";

/** Treat empty strings (e.g. `OIDC_ISSUER=`) as unset. */
const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional(),
);

const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.url().optional(),
);

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
    NEXT_PUBLIC_BASE_URL: z.url().default("http://localhost:3000"),
    NEXT_PUBLIC_APP_ENV: z.enum(["local", "staging", "production"]).default("local"),
    OIDC_ISSUER: optionalUrl,
    OIDC_CLIENT_ID: optionalString,
    OIDC_CLIENT_SECRET: optionalString,
  })
  .superRefine((env, ctx) => {
    const set = [env.OIDC_ISSUER, env.OIDC_CLIENT_ID, env.OIDC_CLIENT_SECRET].filter(Boolean);
    if (set.length > 0 && set.length < 3) {
      ctx.addIssue({
        code: "custom",
        message:
          "OIDC_ISSUER, OIDC_CLIENT_ID and OIDC_CLIENT_SECRET must all be set together (or all left empty).",
        path: ["OIDC_ISSUER"],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Validated server environment. Parsed lazily on first use so that importing
 * this module never throws at build time or in the browser bundle.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}

/** True when the full OIDC trio is configured. Safe to call on the server only. */
export function isOidcEnabled(): boolean {
  const { OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET } = process.env;
  return Boolean(OIDC_ISSUER?.trim() && OIDC_CLIENT_ID?.trim() && OIDC_CLIENT_SECRET?.trim());
}

/** Public (client-safe) environment name. Inlined by Next at build time. */
export const appEnv: Env["NEXT_PUBLIC_APP_ENV"] =
  process.env.NEXT_PUBLIC_APP_ENV === "production" || process.env.NEXT_PUBLIC_APP_ENV === "staging"
    ? process.env.NEXT_PUBLIC_APP_ENV
    : "local";

export const isLocalEnv = appEnv === "local";
