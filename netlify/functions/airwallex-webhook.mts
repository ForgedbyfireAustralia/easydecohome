// POST /.netlify/functions/airwallex-webhook
// Subscribed to payment_intent.succeeded. Verifies the signature, ignores event ids it has
// already handled, marks the order paid, then emails the customer and the factory (ORDER_EMAIL).
// Each step is idempotent, so if an email fails we return 500 and Airwallex's retry finishes the job
// without double-marking or double-emailing.
import { verifySignature } from "../lib/airwallex.mts";
import { customerEmail, emailConfigured, factoryEmail, send } from "../lib/email.mts";
import { env } from "../lib/env.mts";
import { events, orders } from "../lib/orders.mts";

const reply = (status: number, body: string) => new Response(body, { status, headers: { "Content-Type": "text/plain" } });

export default async (req: Request) => {
  if (req.method !== "POST") return reply(405, "Use POST");
  const secret = env("AIRWALLEX_WEBHOOK_SECRET");
  if (!secret) {
    console.error("airwallex-webhook: AIRWALLEX_WEBHOOK_SECRET is not set");
    return reply(500, "not configured");
  }
  const raw = await req.text(); // verify against the exact bytes received, before parsing
  if (!verifySignature(raw, req.headers.get("x-timestamp"), req.headers.get("x-signature"), secret)) return reply(401, "bad signature");

  let evt: any;
  try {
    evt = JSON.parse(raw);
  } catch {
    return reply(400, "bad json");
  }
  if (!evt?.id) return reply(400, "no event id");
  if (evt.name !== "payment_intent.succeeded") return reply(200, "ignored");
  if (await events.seen(evt.id)) return reply(200, "duplicate");

  const pi = evt.data?.object ?? {};
  const order = pi.merchant_order_id ? await orders.get(String(pi.merchant_order_id)) : null;
  if (!order) {
    console.error(`airwallex-webhook: no order for intent ${pi.id} (${pi.merchant_order_id})`);
    await events.mark(evt.id, { result: "unmatched", intent: pi.id ?? null });
    return reply(200, "unmatched");
  }

  if (order.status === "pending") {
    const amountOk = Number(pi.amount) === order.total && String(pi.currency).toUpperCase() === order.currency;
    const intentOk = !order.intentId || order.intentId === pi.id;
    if (!amountOk || !intentOk) {
      order.status = "review";
      order.reviewReason = !amountOk ? `paid ${pi.amount} ${pi.currency}, expected ${order.total} ${order.currency}` : `intent ${pi.id} does not match ${order.intentId}`;
    } else {
      order.status = "paid";
      order.paidAt = new Date().toISOString();
    }
    order.intentId = order.intentId || pi.id;
    order.eventId = evt.id;
    await orders.save(order);
  }

  if (order.status === "paid") {
    const factoryTo = env("ORDER_EMAIL");
    try {
      if (!order.emails.customer) {
        if (emailConfigured()) await send(customerEmail(order));
        order.emails.customer = emailConfigured() ? "sent" : "skipped";
        await orders.save(order);
      }
      if (!order.emails.factory) {
        if (emailConfigured() && factoryTo) await send(factoryEmail(order, factoryTo));
        order.emails.factory = emailConfigured() && factoryTo ? "sent" : "skipped";
        await orders.save(order);
      }
    } catch (e) {
      console.error(`airwallex-webhook: email for ${order.id} failed`, e instanceof Error ? e.message : "unknown error");
      return reply(500, "email failed, retry");
    }
    if (order.emails.customer === "skipped" || order.emails.factory === "skipped") {
      console.warn(`airwallex-webhook: ${order.id} paid but email not configured (RESEND_API_KEY / ORDER_FROM_EMAIL / ORDER_EMAIL)`);
    }
  } else if (order.status === "review") {
    console.error(`airwallex-webhook: ${order.id} needs review: ${order.reviewReason}`);
  }

  await events.mark(evt.id, { result: order.status, order: order.id });
  return reply(200, "ok");
};
