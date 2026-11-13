// Creates an Airwallex PaymentIntent. Keys come ONLY from Netlify environment variables.
// AIRWALLEX_CLIENT_ID, AIRWALLEX_API_KEY, AIRWALLEX_ENV ("demo" or "prod")
const BASE = () => process.env.AIRWALLEX_ENV === "prod" ? "https://api.airwallex.com" : "https://api-demo.airwallex.com";
const products = require("../../data/products.json");

async function token() {
  const r = await fetch(`${BASE()}/api/v1/authentication/login`, { method: "POST",
    headers: { "x-client-id": process.env.AIRWALLEX_CLIENT_ID, "x-api-key": process.env.AIRWALLEX_API_KEY } });
  if (!r.ok) throw new Error("auth failed");
  return (await r.json()).token;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "" };
  // TODO: recompute the amount server-side from products.json — never trust a price sent by the browser.
  const { items = [], currency = "AUD", orderId } = JSON.parse(event.body || "{}");
  const amount = 0; // [CALCULATE FROM items + data/products.json + data/shipping.json]
  const t = await token();
  const r = await fetch(`${BASE()}/api/v1/pa/payment_intents/create`, { method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ request_id: crypto.randomUUID(), amount, currency, merchant_order_id: orderId,
      return_url: `${process.env.URL}/?paid=${orderId}` }) });
  const pi = await r.json();
  return { statusCode: r.ok ? 200 : 400, body: JSON.stringify({ id: pi.id, client_secret: pi.client_secret }) };
};
