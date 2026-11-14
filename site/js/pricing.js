/* Easy Deco Home pricing.
   One copy of the order maths. The store page uses it to show prices; the create-payment
   function uses the same file to work out the amount actually charged, from data/products.json
   and data/shipping.json. The server never trusts an amount sent by the browser.
   Pure functions only: no DOM, no network. Loaded as a plain <script> (window.EDHPricing)
   and as a CommonJS module by Netlify Functions. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EDHPricing = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MAX_QTY = 20;

  function num(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function r2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }
  function stepOf(country) { var s = num(country.rounding); return s && s > 0 ? s : 0.01; }
  function roundTo(x, s) { return r2(Math.round(r2(x / s)) * s); }

  function findCountry(shipping, code) {
    var list = (shipping && shipping.countries) || [];
    for (var i = 0; i < list.length; i++) if (list[i].code === code) return list[i];
    return null;
  }

  /* A country can show prices in its own currency once it has a numeric exchange rate. */
  function pricesReady(country) { return !!country && num(country.fx_from_aud) != null && num(country.fx_from_aud) > 0; }

  /* Real price wins; the example price is used only when examples are allowed (testing). */
  function catalogPrice(entry, allowExamples) {
    if (!entry) return null;
    var real = num(entry.price_aud);
    if (real != null) return { aud: real, example: false };
    var ex = num(entry.example_price_aud);
    if (allowExamples && ex != null) return { aud: ex, example: true };
    return null;
  }

  function convert(aud, country) { return roundTo(aud * num(country.fx_from_aud), stepOf(country)); }

  function tapCompliant(t) {
    return !!(t && t.wels && t.wels.reg && t.wels.stars && t.wels.flow && t.watermark);
  }

  /* Electrical add-ons (LED mirrors, wall lights, heated rails) need their RCM registration
     and certificate of conformity numbers before they can be sold in Australia. */
  function electricalCompliant(a) {
    return !!(a && a.electrical && a.electrical.rcm_reg && a.electrical.cert_no);
  }
  function compliant(it) {
    if (it.kind === "tap") return tapCompliant(it.entry);
    if (it.kind === "accessory" && it.entry.electrical) return electricalCompliant(it.entry);
    return true;
  }

  /* Cart ids: a vanity id, "tap:<model>:<finish>", or "acc:<id>" / "acc:<id>:<finish>". */
  function resolveItem(id, products) {
    if (typeof id !== "string" || !products) return null;
    if (id.indexOf("acc:") === 0) {
      var ap = id.split(":"), accs = products.accessories || [];
      for (var k = 0; k < accs.length; k++) {
        var a = accs[k], fins = a.finishes || [];
        if (a.id !== ap[1]) continue;
        if (fins.length && ap.length === 3 && fins.indexOf(ap[2]) !== -1) return { kind: "accessory", entry: a, finish: ap[2] };
        if (!fins.length && ap.length === 2) return { kind: "accessory", entry: a, finish: null };
      }
      return null;
    }
    if (id.indexOf("tap:") === 0) {
      var parts = id.split(":"), tid = parts[1], fin = parts[2];
      var taps = products.tap_models || [];
      for (var i = 0; i < taps.length; i++) {
        var t = taps[i];
        if (t.id === tid && parts.length === 3 && (t.finishes || []).indexOf(fin) !== -1) return { kind: "tap", entry: t, finish: fin };
      }
      return null;
    }
    var vans = products.vanities || [];
    for (var j = 0; j < vans.length; j++) if (vans[j].id === id) return { kind: "vanity", entry: vans[j], finish: null };
    return null;
  }

  /* Price of one unit in the country's currency, for display. null = no price yet. */
  function itemUnit(id, country, ctx) {
    var it = resolveItem(id, ctx.products); if (!it || !pricesReady(country)) return null;
    var p = catalogPrice(it.entry, ctx.allowExamples); if (!p) return null;
    return { amount: convert(p.aud, country), currency: country.currency, example: p.example };
  }

  /* Freight in the country's own currency. Small items (taps, accessories) ride free in a
     vanity's carton; an order of small items only pays the small-parcel rate. */
  function freightFor(country, vanities, smalls, allowExamples) {
    if (!country) return { amount: null, example: false, reason: "unknown_country" };
    if (!vanities && !smalls) return { amount: 0, example: false };
    var key = vanities ? "per_vanity" : "small_parcel", units = vanities ? vanities : 1;
    var real = num((country.freight || {})[key]);
    if (real != null) return { amount: r2(real * units), example: false };
    var ex = num((country.example_freight || {})[key]);
    if (allowExamples && ex != null) return { amount: r2(ex * units), example: true };
    return { amount: null, example: false, reason: "freight_unavailable" };
  }

  /* "The Noosa" stays as is; "Basin mixer" becomes "The Basin mixer". */
  function the(name) { return /^the /i.test(name) ? name : "The " + name; }

  function fail(status, code, message) { return { ok: false, status: status, code: code, error: message }; }

  /* order = { country: "AU", items: [{ id, q }] }
     ctx   = { products, shipping, allowExamples } */
  function quote(order, ctx) {
    var country = findCountry(ctx.shipping, order && order.country);
    if (!country) return fail(400, "unknown_country", "We don't ship to that country.");
    if (!pricesReady(country)) return fail(409, "country_unavailable", "We're not taking orders for " + country.name + " yet.");
    var items = (order && order.items) || [];
    if (!Array.isArray(items) || !items.length) return fail(400, "empty", "Your cart is empty.");
    if (items.length > 50) return fail(400, "bad_item", "Too many lines in one order.");

    var seen = {}, lines = [], subtotal = 0, vanities = 0, smalls = 0, example = false;
    for (var i = 0; i < items.length; i++) {
      var row = items[i] || {}, q = row.q;
      if (typeof q !== "number" || q % 1 !== 0 || q < 1 || q > MAX_QTY) return fail(400, "bad_qty", "Quantities must be whole numbers from 1 to " + MAX_QTY + ".");
      if (seen[row.id]) return fail(400, "bad_item", "Duplicate cart line.");
      seen[row.id] = true;
      var it = resolveItem(row.id, ctx.products);
      if (!it) return fail(400, "bad_item", "One item in your cart is no longer available. Remove it and try again.");
      if (it.kind === "tap" && !tapCompliant(it.entry)) return fail(409, "tap_not_compliant", the(it.entry.name) + " can't be sold yet: its WELS and WaterMark numbers haven't been added. Remove it to place the order.");
      if (!compliant(it)) return fail(409, "electrical_not_compliant", the(it.entry.name) + " can't be sold yet: its RCM registration and electrical certificate haven't been added. Remove it to place the order.");
      var p = catalogPrice(it.entry, ctx.allowExamples);
      if (!p) return fail(409, "no_price", the(it.entry.name || row.id) + " hasn't been priced yet.");
      var unit = convert(p.aud, country), amount = r2(unit * q);
      example = example || p.example;
      if (it.kind === "vanity") vanities += q; else smalls += q;
      subtotal = r2(subtotal + amount);
      lines.push({ id: row.id, kind: it.kind, name: it.entry.name, code: it.entry.code, finish: it.finish, qty: q, unit: unit, amount: amount });
    }
    var f = freightFor(country, vanities, smalls, ctx.allowExamples);
    if (f.amount == null) return fail(409, "freight_unavailable", "Freight to " + country.name + " hasn't been set yet.");
    example = example || f.example;
    return {
      ok: true, country: country.code, currency: country.currency,
      lines: lines, subtotal: subtotal, freight: f.amount, total: r2(subtotal + f.amount),
      example: example, leadTimeWeeks: country.lead_time_weeks
    };
  }

  return {
    MAX_QTY: MAX_QTY, num: num, r2: r2, findCountry: findCountry, pricesReady: pricesReady,
    catalogPrice: catalogPrice, convert: convert, tapCompliant: tapCompliant, electricalCompliant: electricalCompliant,
    compliant: compliant, resolveItem: resolveItem,
    itemUnit: itemUnit, freightFor: freightFor, quote: quote
  };
});
