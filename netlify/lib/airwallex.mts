// Minimal Airwallex client: login, create a PaymentIntent, verify webhook signatures.
// Keys come only from environment variables: AIRWALLEX_CLIENT_ID, AIRWALLEX_API_KEY,
// AIRWALLEX_WEBHOOK_SECRET, AIRWALLEX_ENV ("demo" or "prod").
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { airwallexEnv, env } from "./env.mts";

export class AirwallexError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function apiBase(): string {
  return env("AIRWALLEX_API_BASE") || (airwallexEnv() === "prod" ? "https://api.airwallex.com" : "https://api-demo.airwallex.com");
}

export function keysConfigured(): boolean {
  return !!(env("AIRWALLEX_CLIENT_ID") && env("AIRWALLEX_API_KEY"));
}

// Tokens last 30 minutes; reuse one across warm invocations and refresh a little early.
let cached: { token: string; until: number; base: string } | null = null;

export async function token(): Promise<string> {
  const base = apiBase();
  if (cached && cached.base === base && cached.until > Date.now()) return cached.token;
  const r = await fetch(`${base}/api/v1/authentication/login`, {
    method: "POST",
    headers: {
      "x-client-id": env("AIRWALLEX_CLIENT_ID") || "",
      "x-api-key": env("AIRWALLEX_API_KEY") || "",
      "Content-Type": "application/json",
    },
  });
  if (!r.ok) throw new AirwallexError(`Airwallex login failed (${r.status})`, r.status);
  const body = (await r.json()) as { token: string; expires_at?: string };
  const expires = body.expires_at ? Date.parse(body.expires_at) : NaN;
  cached = { token: body.token, base, until: (isFinite(expires) ? expires : Date.now() + 30 * 60_000) - 5 * 60_000 };
  return body.token;
}

export function resetTokenCache() {
  cached = null;
}

export interface IntentInput {
  amount: number; // major units, e.g. 1090.00 (Airwallex does not use cents)
  currency: string;
  merchantOrderId: string;
  returnUrl: string;
  metadata?: Record<string, string>;
}

export interface Intent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export async function createPaymentIntent(input: IntentInput): Promise<Intent> {
  const t = await token();
  const r = await fetch(`${apiBase()}/api/v1/pa/payment_intents/create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      request_id: randomUUID(),
      amount: input.amount,
      currency: input.currency,
      merchant_order_id: input.merchantOrderId,
      return_url: input.returnUrl,
      metadata: input.metadata,
    }),
  });
  const body = (await r.json().catch(() => ({}))) as Partial<Intent> & { code?: string; message?: string };
  if (!r.ok || !body.id || !body.client_secret) {
    throw new AirwallexError(`Airwallex create intent failed (${r.status}${body.code ? " " + body.code : ""})`, r.status, body.code);
  }
  return body as Intent;
}

/** x-signature = hex HMAC-SHA256 of (x-timestamp + raw body), keyed with the webhook secret. */
export function verifySignature(rawBody: string, timestamp: string | null, signature: string | null, secret: string): boolean {
  if (!timestamp || !signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(timestamp + rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
