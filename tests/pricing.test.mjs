import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const P = require("../site/js/pricing.js");
const products = JSON.parse(readFileSync(new URL("../data/products.json", import.meta.url)));
const shipping = JSON.parse(readFileSync(new URL("../data/shipping.json", import.meta.url)));
const clone = (o) => JSON.parse(JSON.stringify(o));
const ctx = (over = {}) => ({ products, shipping, allowExamples: true, ...over });
const compliant = (p) => {
  const c = clone(p);
  c.tap_models.forEach((t) => Object.assign(t, { wels: { reg: "T12345", stars: "5", flow: "4.5" }, watermark: "WMKA12345" }));
  return c;
};

test("AU order with example prices: vanity lines plus example freight per vanity", () => {
  const q = P.quote({ country: "AU", items: [{ id: "as813109-120", q: 2 }, { id: "kl810892a-80", q: 1 }] }, ctx());
  assert.equal(q.ok, true);
  assert.equal(q.currency, "AUD");
  assert.equal(q.subtotal, 1090 * 2 + 690);
  assert.equal(q.freight, 240 * 3);
  assert.equal(q.total, 1090 * 2 + 690 + 720);
  assert.equal(q.example, true);
  assert.equal(q.lines[0].name, "The Noosa");
});

test("production (no examples) refuses unpriced items and placeholder freight", () => {
  const q = P.quote({ country: "AU", items: [{ id: "as813109-120", q: 1 }] }, ctx({ allowExamples: false }));
  assert.equal(q.ok, false);
  assert.equal(q.code, "no_price");
  const priced = clone(products);
  priced.vanities[0].price_aud = 999;
  const q2 = P.quote({ country: "AU", items: [{ id: "as813109-120", q: 1 }] }, ctx({ products: priced, allowExamples: false }));
  assert.equal(q2.code, "freight_unavailable");
});

test("real price wins over the example price", () => {
  const priced = clone(products);
  priced.vanities[0].price_aud = 1234.5;
  const q = P.quote({ country: "AU", items: [{ id: "as813109-120", q: 1 }] }, ctx({ products: priced }));
  assert.equal(q.subtotal, 1234.5);
});

test("taps without WELS and WaterMark numbers are blocked", () => {
  const q = P.quote({ country: "AU", items: [{ id: "tap:tall:brass", q: 1 }] }, ctx());
  assert.equal(q.ok, false);
  assert.equal(q.code, "tap_not_compliant");
});

test("accessories: ids with and without finishes, price gate, small-parcel freight", () => {
  const p = clone(products);
  const set = p.accessories.find((a) => a.id === "acc-set");
  const shelf = p.accessories.find((a) => a.id === "floating-shelf");
  assert.equal(P.resolveItem("acc:acc-set:black", p).finish, "black");
  assert.equal(P.resolveItem("acc:acc-set", p), null); // finish required
  assert.equal(P.resolveItem("acc:floating-shelf:black", p), null); // no finishes offered
  assert.equal(P.resolveItem("acc:floating-shelf", p).kind, "accessory");
  assert.equal(P.quote({ country: "AU", items: [{ id: "acc:acc-set:black", q: 1 }] }, ctx({ products: p })).code, "no_price");
  set.price_aud = 149;
  shelf.price_aud = 59;
  const alone = P.quote({ country: "AU", items: [{ id: "acc:acc-set:black", q: 1 }, { id: "acc:floating-shelf", q: 2 }] }, ctx({ products: p }));
  assert.equal(alone.subtotal, 149 + 59 * 2);
  assert.equal(alone.freight, 15);
  assert.equal(alone.lines[0].kind, "accessory");
  const withVanity = P.quote({ country: "AU", items: [{ id: "as813109-120", q: 1 }, { id: "acc:acc-set:black", q: 1 }] }, ctx({ products: p }));
  assert.equal(withVanity.freight, 240);
});

test("electrical add-ons are blocked until RCM and certificate numbers are filled in", () => {
  const p = clone(products);
  const light = p.accessories.find((a) => a.id === "vanity-wall-light");
  light.price_aud = 199;
  const q = P.quote({ country: "AU", items: [{ id: "acc:vanity-wall-light:black", q: 1 }] }, ctx({ products: p }));
  assert.equal(q.code, "electrical_not_compliant");
  light.electrical.rcm_reg = "RCM-123";
  light.electrical.cert_no = "COC-456";
  assert.equal(P.quote({ country: "AU", items: [{ id: "acc:vanity-wall-light:black", q: 1 }] }, ctx({ products: p })).ok, true);
});

test("compliant taps: free in a vanity carton, parcel rate on their own", () => {
  const p = compliant(products);
  const withVanity = P.quote({ country: "AU", items: [{ id: "as813109-120", q: 1 }, { id: "tap:tall:brass", q: 1 }] }, ctx({ products: p }));
  assert.equal(withVanity.freight, 240);
  assert.equal(withVanity.subtotal, 1090 + 289);
  const alone = P.quote({ country: "AU", items: [{ id: "tap:basin:black", q: 2 }] }, ctx({ products: p }));
  assert.equal(alone.freight, 15);
  assert.equal(alone.total, 229 * 2 + 15);
  assert.equal(alone.lines[0].finish, "black");
});

test("New Zealand is closed until it has an exchange rate", () => {
  const q = P.quote({ country: "NZ", items: [{ id: "as813109-120", q: 1 }] }, ctx());
  assert.equal(q.code, "country_unavailable");
});

test("currency conversion and rounding per country", () => {
  const s = clone(shipping);
  const nz = s.countries.find((c) => c.code === "NZ");
  Object.assign(nz, { fx_from_aud: 1.0937, rounding: 1, freight: { per_vanity: 199, small_parcel: 25 } });
  const q = P.quote({ country: "NZ", items: [{ id: "as813109-120", q: 1 }] }, ctx({ shipping: s, allowExamples: true }));
  assert.equal(q.currency, "NZD");
  assert.equal(q.subtotal, Math.round(1090 * 1.0937)); // 1192
  assert.equal(q.freight, 199);
  Object.assign(nz, { rounding: "[ROUNDING]" });
  const q2 = P.quote({ country: "NZ", items: [{ id: "as813109-120", q: 1 }] }, ctx({ shipping: s }));
  assert.equal(q2.subtotal, 1192.13); // cents when rounding isn't set
});

test("rejects bad input", () => {
  const bad = (items, code, country = "AU") => assert.equal(P.quote({ country, items }, ctx()).code, code);
  bad([], "empty");
  bad([{ id: "nope", q: 1 }], "bad_item");
  bad([{ id: "tap:tall:gold", q: 1 }], "bad_item");
  bad([{ id: "as813109-120", q: 0 }], "bad_qty");
  bad([{ id: "as813109-120", q: 1.5 }], "bad_qty");
  bad([{ id: "as813109-120", q: 21 }], "bad_qty");
  bad([{ id: "as813109-120", q: "2" }], "bad_qty");
  bad([{ id: "as813109-120", q: 1 }, { id: "as813109-120", q: 1 }], "bad_item");
  bad([{ id: "as813109-120", q: 1 }], "unknown_country", "US");
});

test("display price matches the charged unit price", () => {
  const au = P.findCountry(shipping, "AU");
  const u = P.itemUnit("as813046c-100", au, ctx());
  assert.deepEqual(u, { amount: 1090, currency: "AUD", example: true });
  assert.equal(P.itemUnit("as813046c-100", au, ctx({ allowExamples: false })), null);
});
