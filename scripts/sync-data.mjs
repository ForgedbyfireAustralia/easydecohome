// Copies data/shipping.json and the priced parts of data/products.json into site/index.html,
// between the /*@sync:NAME*/ ... /*@end*/ markers, so the page and the payment function
// always read the same numbers. Run after editing either JSON file:
//   npm run sync          write the page
//   npm run sync -- --check   fail if the page is out of date (used by npm test)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const page = join(root, "site/index.html");

const products = read("data/products.json");
const shipping = read("data/shipping.json");

const catalog = {
  vanities: products.vanities.map(({ id, name, code, price_aud, example_price_aud }) => ({ id, name, code, price_aud, example_price_aud })),
  tap_models: products.tap_models.map(({ id, name, code, finishes, price_aud, example_price_aud, wels, watermark }) => ({
    id, name, code, finishes, price_aud, example_price_aud, wels, watermark,
  })),
  accessories: (products.accessories || []).map(({ id, group, name, code, icon, finishes, size, pairs, electrical, price_aud, example_price_aud }) => ({
    id, group, name, code, icon, finishes, size, pairs: pairs || null, electrical: electrical || null, price_aud, example_price_aud,
  })),
};
const { _help, ...ship } = shipping;

// Safe inside a <script>: no "</script>" or "<!--" can appear.
const js = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
const blocks = { shipping: `const SHIPPING=${js(ship)};`, catalog: `const CATALOG=${js(catalog)};` };

let html = readFileSync(page, "utf8");
const before = html;
for (const [name, code] of Object.entries(blocks)) {
  const re = new RegExp(`(/\\*@sync:${name}\\*/)[\\s\\S]*?(/\\*@end\\*/)`);
  if (!re.test(html)) {
    console.error(`site/index.html is missing the /*@sync:${name}*/ ... /*@end*/ markers`);
    process.exit(1);
  }
  html = html.replace(re, (_, a, b) => `${a}${code}${b}`);
}

if (process.argv.includes("--check")) {
  if (html !== before) {
    console.error("site/index.html is out of date with data/*.json. Run: npm run sync");
    process.exit(1);
  }
  console.log("sync check: site/index.html matches data/*.json");
} else {
  writeFileSync(page, html);
  console.log(html === before ? "site/index.html already up to date" : "site/index.html updated from data/*.json");
}
