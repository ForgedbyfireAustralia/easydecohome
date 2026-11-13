// Runs both Netlify Functions against a fake Airwallex API, a fake email API and an in-memory store.
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import createPayment from "../netlify/functions/create-payment.mts";
import webhook from "../netlify/functions/airwallex-webhook.mts";
import { resetTokenCache } from "../netlify/lib/airwallex.mts";
import { useStores, type KV } from "../netlify/lib/orders.mts";

const AWX = "https://awx.test";
const SECRET = "whsec_test_only";
let stores: Map<string, Map<string, any>>;
let calls: { url: string; body: any; headers: Record<string, string> }[];
let failEmail = 0;

function memStore(name: string): KV {
  if (!stores.has(name)) stores.set(name, new Map());
  const m = stores.get(name)!;
  return {
    get: async (k) => (m.has(k) ? structuredClone(m.get(k)) : null),
    setJSON: async (k, v, o) => {
      if (o?.onlyIfNew && m.has(k)) return { modified: false };
      m.set(k, structuredClone(v));
      return { modified: true };
    },
  };
}

beforeEach(() => {
  stores = new Map();
  calls = [];
  failEmail = 0;
  useStores(memStore);
  resetTokenCache();
  Object.assign(process.env, {
    AIRWALLEX_ENV: "demo", AIRWALLEX_API_BASE: AWX, AIRWALLEX_CLIENT_ID: "cid", AIRWALLEX_API_KEY: "key",
    AIRWALLEX_WEBHOOK_SECRET: SECRET, RESEND_API_KEY: "re_test", ORDER_FROM_EMAIL: "Easy Deco Home <orders@easydecohome.com.au>",
    ORDER_EMAIL: "factory@example.com",
  });
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = String(input);
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url, body, headers: init.headers || {} });
    const res = (status: number, b: unknown) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
    if (url === `${AWX}/api/v1/authentication/login`) return res(201, { token: "tok", expires_at: new Date(Date.now() + 1800e3).toISOString() });
    if (url === `${AWX}/api/v1/pa/payment_intents/create`) {
      return res(201, { id: "int_" + body.merchant_order_id, client_secret: "cs_123", amount: body.amount, currency: body.currency, status: "REQUIRES_PAYMENT_METHOD" });
    }
    if (url === "https://api.resend.com/emails") {
      if (failEmail > 0) { failEmail--; return res(500, { message: "down" }); }
      return res(200, { id: "em_1" });
    }
    throw new Error("unexpected fetch " + url);
  }) as typeof fetch;
});

const order = (over: Record<string, unknown> = {}) => ({
  country: "AU",
  items: [{ id: "as813109-120", q: 1 }, { id: "kl810892a-80", q: 2 }],
  customer: { name: "Sam Test", email: "sam@example.com", phone: "0400 000 000" },
  address: { line1: "1 Test St", line2: "", city: "Noosa Heads", region: "QLD", postcode: "4567" },
  agree: true,
  ...over,
});
const post = (fn: (r: Request) => Promise<Response>, body: unknown, headers: Record<string, string> = {}) =>
  fn(new Request("https://preview.easydecohome.com.au/.netlify/functions/x", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers }));
const awxCalls = () => calls.filter((c) => c.url.startsWith(AWX + "/api/v1/pa"));
const emails = () => calls.filter((c) => c.url.includes("resend"));
const orderStore = () => stores.get("orders-demo")!;

test("create-payment charges the server-side total, not anything the browser sends", async () => {
  const r = await post(createPayment, order({ amount: 1, total: 1 }));
  const out = await r.json();
  assert.equal(r.status, 200, JSON.stringify(out));
  const expected = 1090 + 690 * 2 + 240 * 3;
  assert.equal(out.amount, expected);
  assert.equal(out.currency, "AUD");
  assert.match(out.orderId, /^EDH-\d{6}-[A-Z2-9]{5}$/);
  const [c] = awxCalls();
  assert.equal(c.body.amount, expected);
  assert.equal(c.body.currency, "AUD");
  assert.equal(c.body.merchant_order_id, out.orderId);
  assert.match(c.body.request_id, /^[0-9a-f-]{36}$/);
  assert.equal(c.body.return_url, `https://preview.easydecohome.com.au/?order=${out.orderId}#paid`);
  assert.equal(c.headers.Authorization, "Bearer tok");
  const saved = orderStore().get(out.orderId);
  assert.equal(saved.status, "pending");
  assert.equal(saved.intentId, "int_" + out.orderId);
  assert.equal(saved.total, expected);
});

test("create-payment rejects a stale browser total without calling Airwallex", async () => {
  const r = await post(createPayment, order({ expectedTotal: 100 }));
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, "price_changed");
  assert.equal(calls.length, 0);
});

test("create-payment validates details, terms and the tap gate", async () => {
  assert.equal((await post(createPayment, order({ agree: false }))).status, 400);
  assert.equal((await post(createPayment, order({ customer: { name: "A", email: "bad", phone: "0400000000" } }))).status, 400);
  assert.equal((await post(createPayment, order({ address: { line1: "1 St", city: "X", region: "QLD", postcode: "45" } }))).status, 400);
  assert.equal((await post(createPayment, order({ address: { line1: "1 St", city: "X", region: "Narnia", postcode: "4567" } }))).status, 400);
  const tap = await post(createPayment, order({ items: [{ id: "tap:tall:brass", q: 1 }] }));
  assert.equal(tap.status, 409);
  assert.equal((await tap.json()).code, "tap_not_compliant");
  assert.equal((await post(createPayment, "not json")).status, 400);
  assert.equal(calls.length, 0);
});

test("production never charges example prices", async () => {
  process.env.AIRWALLEX_ENV = "prod";
  const r = await post(createPayment, order());
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, "no_price");
  assert.equal(calls.length, 0);
});

test("missing Airwallex keys gives a clear 503", async () => {
  delete process.env.AIRWALLEX_API_KEY;
  const r = await post(createPayment, order());
  assert.equal(r.status, 503);
  assert.equal((await r.json()).code, "payments_not_configured");
});

const sign = (raw: string, ts = String(Date.now())) => ({ "x-timestamp": ts, "x-signature": createHmac("sha256", SECRET).update(ts + raw).digest("hex") });
const succeeded = (orderId: string, amount: number, id = "evt_1", currency = "AUD") =>
  JSON.stringify({ id, name: "payment_intent.succeeded", data: { object: { id: "int_" + orderId, merchant_order_id: orderId, amount, currency, status: "SUCCEEDED" } } });

async function paidOrder() {
  const out = await (await post(createPayment, order())).json();
  calls = [];
  return out as { orderId: string; amount: number };
}

test("webhook rejects bad signatures", async () => {
  const { orderId, amount } = await paidOrder();
  const raw = succeeded(orderId, amount);
  assert.equal((await post(webhook, raw, { "x-timestamp": "1", "x-signature": "00" })).status, 401);
  assert.equal((await post(webhook, raw, {})).status, 401);
  const tampered = sign(raw);
  assert.equal((await post(webhook, raw.replace(String(amount), "1"), tampered)).status, 401);
  assert.equal(orderStore().get(orderId).status, "pending");
});

test("webhook marks paid, emails customer and factory once, and ignores the duplicate event", async () => {
  const { orderId, amount } = await paidOrder();
  const raw = succeeded(orderId, amount);
  const r = await post(webhook, raw, sign(raw));
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "ok");
  const o = orderStore().get(orderId);
  assert.equal(o.status, "paid");
  assert.ok(o.paidAt);
  assert.deepEqual(o.emails, { customer: "sent", factory: "sent" });
  const sent = emails();
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0].body.to, ["sam@example.com"]);
  assert.match(sent[0].body.subject, new RegExp(orderId));
  assert.deepEqual(sent[1].body.to, ["factory@example.com"]);
  assert.match(sent[1].body.text, /SANDBOX TEST/);
  assert.match(sent[1].body.text, /1 Test St/);

  const again = await post(webhook, raw, sign(raw));
  assert.equal(await again.text(), "duplicate");
  assert.equal(emails().length, 2);
});

test("webhook flags an amount mismatch for review instead of marking paid", async () => {
  const { orderId } = await paidOrder();
  const raw = succeeded(orderId, 1);
  assert.equal((await post(webhook, raw, sign(raw))).status, 200);
  const o = orderStore().get(orderId);
  assert.equal(o.status, "review");
  assert.equal(emails().length, 0);
});

test("a failed email returns 500 so Airwallex retries, and the retry sends only what's missing", async () => {
  const { orderId, amount } = await paidOrder();
  const raw = succeeded(orderId, amount);
  failEmail = 1;
  assert.equal((await post(webhook, raw, sign(raw))).status, 500);
  assert.equal(orderStore().get(orderId).status, "paid");
  const retry = await post(webhook, raw, sign(raw));
  assert.equal(retry.status, 200);
  const o = orderStore().get(orderId);
  assert.deepEqual(o.emails, { customer: "sent", factory: "sent" });
  assert.equal(emails().filter((c) => c.body.to[0] === "sam@example.com").length, 2); // 1 failed + 1 sent
  assert.equal(emails().filter((c) => c.body.to[0] === "factory@example.com").length, 1);
});

test("without email settings the order is still marked paid", async () => {
  delete process.env.RESEND_API_KEY;
  const { orderId, amount } = await paidOrder();
  const raw = succeeded(orderId, amount);
  assert.equal((await post(webhook, raw, sign(raw))).status, 200);
  const o = orderStore().get(orderId);
  assert.equal(o.status, "paid");
  assert.deepEqual(o.emails, { customer: "skipped", factory: "skipped" });
});

test("webhook ignores other event types and unknown orders", async () => {
  const other = JSON.stringify({ id: "evt_x", name: "payment_intent.created", data: { object: {} } });
  assert.equal(await (await post(webhook, other, sign(other))).text(), "ignored");
  const unknown = succeeded("EDH-000000-NOPE", 10, "evt_y");
  assert.equal(await (await post(webhook, unknown, sign(unknown))).text(), "unmatched");
});
