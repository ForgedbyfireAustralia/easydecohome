// Order records and processed webhook ids, kept in Netlify Blobs.
// Stores are named per Airwallex environment so sandbox orders from deploy previews never mix
// with real orders (site-wide Blobs stores are shared by every deploy context).
import { getStore } from "@netlify/blobs";
import { airwallexEnv } from "./env.mts";

export interface OrderLine {
  id: string;
  kind: "vanity" | "tap";
  name: string;
  code: string;
  finish: string | null;
  qty: number;
  unit: number;
  amount: number;
}

export interface Order {
  id: string;
  env: "demo" | "prod";
  status: "pending" | "paid" | "review";
  createdAt: string;
  paidAt?: string;
  intentId?: string;
  eventId?: string;
  reviewReason?: string;
  country: string;
  currency: string;
  lines: OrderLine[];
  subtotal: number;
  freight: number;
  total: number;
  example: boolean;
  leadTimeWeeks: string;
  customer: { name: string; email: string; phone: string };
  address: { line1: string; line2: string; city: string; region: string; postcode: string; country: string };
  referral: string;
  emails: { customer: "sent" | "skipped" | null; factory: "sent" | "skipped" | null };
}

/** Minimal surface used here, so tests can swap in an in-memory store. */
export interface KV {
  get(key: string, opts: { type: "json" }): Promise<any>;
  setJSON(key: string, value: unknown, opts?: { onlyIfNew?: boolean }): Promise<{ modified: boolean }>;
}

let override: ((name: string) => KV) | null = null;
export function useStores(factory: ((name: string) => KV) | null) {
  override = factory;
}

function store(kind: "orders" | "webhook-events"): KV {
  const name = `${kind}-${airwallexEnv()}`;
  if (override) return override(name);
  return getStore({ name, consistency: "strong" }) as unknown as KV;
}

export const orders = {
  get: (id: string): Promise<Order | null> => store("orders").get(id, { type: "json" }),
  /** Returns false if the id is already taken. */
  create: async (o: Order) => (await store("orders").setJSON(o.id, o, { onlyIfNew: true })).modified,
  save: async (o: Order) => {
    await store("orders").setJSON(o.id, o);
  },
};

export const events = {
  seen: async (id: string) => (await store("webhook-events").get(id, { type: "json" })) != null,
  mark: async (id: string, info: Record<string, unknown>) => {
    await store("webhook-events").setJSON(id, { ...info, at: new Date().toISOString() });
  },
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I
export function newOrderId(now = new Date()): string {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `EDH-${d}-${s}`;
}
