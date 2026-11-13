// Receives payment_intent.succeeded. Set AIRWALLEX_WEBHOOK_SECRET in Netlify env vars.
const crypto = require("crypto");
exports.handler = async (event) => {
  const ts = event.headers["x-timestamp"], sig = event.headers["x-signature"];
  const expect = crypto.createHmac("sha256", process.env.AIRWALLEX_WEBHOOK_SECRET).update(ts + event.body).digest("hex");
  if (!sig || sig !== expect) return { statusCode: 401, body: "bad signature" };
  const evt = JSON.parse(event.body);
  if (evt.name === "payment_intent.succeeded") {
    // TODO: mark order paid (ignore duplicates by evt.id), email customer, send order to factory.
  }
  return { statusCode: 200, body: "ok" };
};
