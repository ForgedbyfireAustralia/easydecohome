// Order emails, sent through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// Needs RESEND_API_KEY, ORDER_FROM_EMAIL (a sender on a domain verified in Resend, e.g.
// "Easy Deco Home <orders@easydecohome.com.au>") and ORDER_EMAIL (where the factory receives orders).
// If they aren't set, sending is skipped and the order is still marked paid.
import { BRAND, DOMAIN, SELLER, env } from "./env.mts";
import type { Order } from "./orders.mts";

export function emailConfigured(): boolean {
  return !!(env("RESEND_API_KEY") && env("ORDER_FROM_EMAIL"));
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function money(v: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(v);
}

function lineText(o: Order) {
  return o.lines.map((l) => `${l.qty} × ${l.name}${l.finish ? ` (${l.finish})` : ""} [${l.code}]  ${money(l.amount, o.currency)}`);
}

function addressText(o: Order) {
  const a = o.address;
  return [a.line1, a.line2, `${a.city} ${a.region} ${a.postcode}`.trim(), a.country].filter(Boolean);
}

export function customerEmail(o: Order) {
  const text = [
    `Hi ${o.customer.name},`,
    "",
    `Thanks for your order with ${BRAND}. Your payment has been received.`,
    "",
    `Order ${o.id}`,
    ...lineText(o),
    `Freight  ${money(o.freight, o.currency)}`,
    `Total paid  ${money(o.total, o.currency)} ${o.currency}`,
    "",
    "Delivering to:",
    ...addressText(o),
    "",
    `Your order ships direct from our factory. Delivery usually takes ${o.leadTimeWeeks} weeks; we'll email tracking once it's on its way.`,
    "",
    `Sold by ${SELLER}. Your rights under the Australian Consumer Law are not affected.`,
    `${BRAND} · https://${DOMAIN}`,
  ].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#222">
<p>Hi ${esc(o.customer.name)},</p>
<p>Thanks for your order with ${esc(BRAND)}. Your payment has been received.</p>
<h2 style="font-size:18px">Order ${esc(o.id)}</h2>
<table cellpadding="6" style="border-collapse:collapse">${o.lines
    .map((l) => `<tr><td>${l.qty} ×</td><td>${esc(l.name)}${l.finish ? ` (${esc(l.finish)})` : ""}<br><small>${esc(l.code)}</small></td><td align="right">${esc(money(l.amount, o.currency))}</td></tr>`)
    .join("")}
<tr><td></td><td>Freight</td><td align="right">${esc(money(o.freight, o.currency))}</td></tr>
<tr><td></td><td><b>Total paid</b></td><td align="right"><b>${esc(money(o.total, o.currency))} ${esc(o.currency)}</b></td></tr></table>
<p><b>Delivering to</b><br>${addressText(o).map(esc).join("<br>")}</p>
<p>Your order ships direct from our factory. Delivery usually takes ${esc(o.leadTimeWeeks)} weeks; we'll email tracking once it's on its way.</p>
<p style="color:#666;font-size:13px">Sold by ${esc(SELLER)}. Your rights under the Australian Consumer Law are not affected.<br>${esc(BRAND)} · https://${esc(DOMAIN)}</p></div>`;
  return { to: o.customer.email, subject: `Order ${o.id} confirmed – ${BRAND}`, text, html };
}

export function factoryEmail(o: Order, to: string) {
  const text = [
    `PAID ORDER ${o.id}${o.env === "demo" ? "  [SANDBOX TEST – DO NOT SHIP]" : ""}`,
    `Paid: ${o.paidAt}  Airwallex: ${o.intentId}`,
    "",
    ...lineText(o),
    `Freight ${money(o.freight, o.currency)}  Total ${money(o.total, o.currency)} ${o.currency}`,
    "",
    "Ship to:",
    o.customer.name,
    ...addressText(o),
    `Phone: ${o.customer.phone}`,
    `Email: ${o.customer.email}`,
    o.referral ? `Referral code: ${o.referral}` : "",
  ].join("\n");
  return { to, subject: `${o.env === "demo" ? "[TEST] " : ""}Paid order ${o.id} – ${o.address.country}`, text, html: `<pre style="font:14px/1.5 ui-monospace,monospace">${esc(text)}</pre>` };
}

export async function send(msg: { to: string; subject: string; text: string; html: string }): Promise<void> {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env("ORDER_FROM_EMAIL"), to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
  });
  if (!r.ok) throw new Error(`Email send failed (${r.status})`);
}
