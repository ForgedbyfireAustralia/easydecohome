// POST /.netlify/functions/create-payment
// Works out the order total on the server from data/products.json and data/shipping.json
// (via the same pricing code the store page uses), saves a pending order, and creates an
// Airwallex PaymentIntent for exactly that amount in the customer's currency.
// The browser's own total is only used to warn the customer if prices changed; it is never charged.
import products from "../../data/products.json" with { type: "json" };
import shipping from "../../data/shipping.json" with { type: "json" };
import pricing from "../../site/js/pricing.js";
import { AirwallexError, createPaymentIntent, keysConfigured } from "../lib/airwallex.mts";
import { airwallexEnv, allowExamples } from "../lib/env.mts";
import { newOrderId, orders, type Order } from "../lib/orders.mts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");

function readCustomer(body: any, country: any) {
  const c = body?.customer ?? {}, a = body?.address ?? {};
  const customer = { name: clean(c.name, 100), email: clean(c.email, 200), phone: clean(c.phone, 30) };
  const address = {
    line1: clean(a.line1, 150), line2: clean(a.line2, 150), city: clean(a.city, 80),
    region: clean(a.region, 60), postcode: clean(a.postcode, 12), country: country.name as string,
  };
  if (!customer.name) return { error: "Add your full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return { error: "Add a valid email for your receipt." };
  if (!/^[0-9 +()-]{8,}$/.test(customer.phone)) return { error: "Add a phone number for delivery updates." };
  if (!address.line1 || !address.city) return { error: "Add your street address and suburb or city." };
  if (country.regions?.length && !country.regions.includes(address.region)) return { error: `Choose your ${String(country.region_label || "region").toLowerCase()}.` };
  if (country.postcode_pattern && !new RegExp(country.postcode_pattern).test(address.postcode)) return { error: "Check your postcode." };
  return { customer, address };
}

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  const raw = await req.text();
  if (raw.length > 20_000) return json(413, { error: "Request too large." });
  let body: any;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return json(400, { error: "Invalid request." });
  }

  const q = pricing.quote({ country: body.country, items: body.items }, { products, shipping, allowExamples: allowExamples() });
  if (!q.ok) return json(q.status, { error: q.error, code: q.code });

  const country = pricing.findCountry(shipping, q.country);
  const who = readCustomer(body, country);
  if ("error" in who) return json(400, { error: who.error, code: "bad_details" });
  if (body.agree !== true) return json(400, { error: "Tick the box to agree to the terms of sale.", code: "not_agreed" });

  if (typeof body.expectedTotal === "number" && pricing.r2(body.expectedTotal) !== q.total) {
    return json(409, { error: "Prices have changed since you loaded the page. Check the new total and try again.", code: "price_changed", total: q.total, currency: q.currency });
  }

  if (!keysConfigured()) return json(503, { error: "Card payments aren't switched on yet.", code: "payments_not_configured" });

  const order: Order = {
    id: newOrderId(), env: airwallexEnv(), status: "pending", createdAt: new Date().toISOString(),
    country: q.country, currency: q.currency, lines: q.lines, subtotal: q.subtotal, freight: q.freight, total: q.total,
    example: q.example, leadTimeWeeks: String(q.leadTimeWeeks ?? ""), customer: who.customer, address: who.address,
    referral: clean(body.ref, 40), emails: { customer: null, factory: null },
  };
  for (let i = 0; i < 3 && !(await orders.create(order)); i++) order.id = newOrderId();

  try {
    const origin = new URL(req.url).origin;
    const intent = await createPaymentIntent({
      amount: q.total,
      currency: q.currency,
      merchantOrderId: order.id,
      returnUrl: `${origin}/?order=${encodeURIComponent(order.id)}#paid`,
      metadata: { order_id: order.id, country: q.country },
    });
    order.intentId = intent.id;
    await orders.save(order);
    return json(200, {
      orderId: order.id, intentId: intent.id, clientSecret: intent.client_secret,
      amount: q.total, subtotal: q.subtotal, freight: q.freight, lines: q.lines,
      currency: q.currency, country: q.country, env: order.env, example: q.example,
    });
  } catch (e) {
    const status = e instanceof AirwallexError ? e.status : 0;
    console.error(`create-payment: ${order.id} failed`, e instanceof Error ? e.message : "unknown error");
    return json(502, { error: "We couldn't start the payment. Please try again in a moment.", code: "gateway_error", upstream: status || undefined });
  }
};
