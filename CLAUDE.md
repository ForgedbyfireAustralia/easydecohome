# CLAUDE.md: Easy Deco Home cross-border store (easydecohome.com.au)

Read this whole file before changing anything. Keep replies short. Do the work, then say what changed in a line or two.

## 1. The job
A direct-to-consumer online store selling bathroom vanities, basins and tapware.
- **Seller:** a separate Hong Kong company `[HK COMPANY NAME]`.
- **Fulfilment:** ships direct from the factory in China to the customer's door.
- **Markets:** Australia first, then `[OTHER COUNTRIES]`. Most products cost under A$1,000.
- **Stack:** static HTML/CSS/JS in `site/`. Netlify Functions in `netlify/functions/`. Payments through Airwallex.
- **Repo and hosting:** private GitHub repo `[OWNER/REPO]`, hosted on Netlify. `netlify.toml` publishes `site/`.

This is not Bilt Studio. Don't carry over Bilt names, pickup addresses or ABN/GST wording.

## 2. Repo layout
```
site/index.html        store: landing, grid, product view, tapware, cart drawer, checkout (hash routes)
site/collection.html   gallery of all vanities and the basin library (read-only catalogue view)
site/referral.html     affiliate/referrer demo (in-memory only; optional)
site/img/              117 WebP images (vanity id + "-1.webp", "-2.webp", ...)
site/js/pricing.js     THE order maths (prices, currency, rounding, freight, tap gate). Used by the page AND the payment function
data/products.json     17 vanities, 3 tap models, 21 accessories, finishes, 65 basins. price_aud = real price (null = unset), example_price_aud = testing only
data/shipping.json     countries: currency, fx_from_aud, rounding, freight, example_freight, lead time, postcode/regions
scripts/sync-data.mjs  `npm run sync` copies data/*.json into site/index.html (the /*@sync:...*/ blocks). Never hand-edit those blocks
netlify/functions/create-payment.mts     server total via pricing.js -> pending order in Blobs -> Airwallex PaymentIntent
netlify/functions/airwallex-webhook.mts  signature check, duplicate-event guard, mark paid, email customer + factory
netlify/lib/           airwallex.mts (login/intent/signature), orders.mts (Blobs stores "orders-<env>"), email.mts (Resend), env.mts (BRAND, SELLER)
tests/                 `npm test`: sync check + pricing + both functions against a fake Airwallex/Resend
docs/brief.md          original Bilt brief: full specs, slider and tapware logic (reference only)
source/                supplier PDFs and raw photos, git-ignored, never published
```

## 3. Rules that can't be broken
- **Secrets:**
  - Airwallex keys exist only in Netlify environment variables: `AIRWALLEX_CLIENT_ID`, `AIRWALLEX_API_KEY`, `AIRWALLEX_WEBHOOK_SECRET` and `AIRWALLEX_ENV` (`demo` for previews, `prod` for production). Anything other than `prod` is treated as sandbox, and only the sandbox may charge example prices or example freight.
  - Order emails: `RESEND_API_KEY`, `ORDER_FROM_EMAIL` (sender on a domain verified in Resend) and `ORDER_EMAIL` (the factory inbox). Without them orders are still marked paid, but no email goes out. `AIRWALLEX_API_BASE` is for tests only; never set it on Netlify.
  - Never put keys in code, commits, chat or logs. If a key leaks, delete it and recreate it.
- **Git:** work on a new branch and open a pull request. Never push to `main`; the owner merges.
- **Prices are server-side:** the function works out the amount from `data/products.json` and `data/shipping.json`. Never trust an amount sent by the browser.
- **No fake proof:** no invented reviews, ratings, sales counts or "X people viewing". Review slots stay as marked placeholders.
- **Placeholders:** anything unknown shows a clearly marked label, like `[ETA]` or `[FREIGHT AUD]`. Never make up a value.
- **Tapware compliance (Australia):**
  - Each tap needs `wels.reg`, `wels.stars`, `wels.flow` and a `watermark` licence number.
  - Checkout must block any Australian order with a tap that's missing them. The gate is in `checkCo()` on the page and in `pricing.js` `quote()` on the server (it currently applies to every country); keep both.
- **Consumer law:** the terms tick box must not remove statutory consumer rights (the Australian Consumer Law in Australia).
- **Photo rights:** images are SHKL catalogue renders. Written permission is still pending, so don't promote them publicly until it arrives.
- **Business structure and GST:** out of scope. Don't add GST/VAT logic or wording unless asked.

## 4. What already works (in `site/index.html`, don't break it)
- **Warm Yabby-style landing:**
  - Promo bar, then the Noosa hero, then the trust bar.
  - Shop by look and Shop by size.
  - "Real life renovations" vertical video slider.
  - Favourites, a filterable grid and the product view.
  - Tapware band, FAQ, Ask a question, newsletter.
- **Data constants in the script:**
  - Vanity data: `IMG`, `PIECES`, `NAMES`, `FEATURED`, `VIDEOS`.
  - Pricing: `SHIPPING` and `CATALOG` (synced from data/, don't hand-edit), `PRICES` (derived), `SHOW_EXAMPLE_PRICES=true`, `PX` = `window.EDHPricing`.
  - Taps: `TAPS` (look and specs; price, code, WELS and WaterMark come from `CATALOG`), `FINISH`, `BASIN`, `LOOK_FINISH`.
  - Ship-to country: `shipTo` (localStorage `edh-ship-to`), `setShipTo()`. Prices show in that country's currency once it has `fx_from_aud`; otherwise in AUD, and checkout is closed for it.
  - `SELLER="[HK COMPANY NAME]"` (page) and `SELLER` in `netlify/lib/env.mts` (emails): change both.
- **Video slider:**
  - Always one card per gesture, with an `850 ms` ease-out `1-(1-t)^4`.
  - Wheel input is locked until 240 ms of quiet, and drags are capped at one card.
  - A lost pointer capture only counts as a cancel when `e.target === slider`. This is the touch-swipe fix; keep it.
- **Tapware:**
  - Offered as an add-on in four places: Complete the look, the cart drawer after a vanity is added, the checkout reminder, and the Tapware band.
  - Also sold on its own.
  - Taps are matched to the basin type. The add button toggles: Added ✓, then Remove.
- **Finishing touches (`#accessories`):**
  - Bathroom-only range (no kitchens): bathroom accessories, handles and knobs, shelving, lighting and heated rails, mirrors, hinges and runners. Data is `accessories` in products.json; cart ids are `acc:<id>` or `acc:<id>:<finish>`.
  - Codes, sizes and prices are placeholders. Unpriced items show "Price coming soon" and "Ask about it" (prefills the enquiry form); once `price_aud` is set and synced they get Add to cart.
  - Electrical items (`electrical` block) need `rcm_reg` and `cert_no` before checkout accepts them, on the page and on the server.
  - Small items (taps and accessories) ship free in a vanity carton; on their own they pay `small_parcel` freight.
- **Cart:**
  - Stored in localStorage `bb-cart`; saved items in `bb-saved-v2`.
  - Checkout has three steps: details, delivery (country + address), payment. "Continue to payment" calls create-payment, then mounts the Airwallex Drop-in (cards, Apple Pay, Google Pay). Order numbers look like `EDH-261113-K7QPX`.
  - On a local static preview (no functions) checkout offers "Place test order (no payment)" instead.

## 4b. Status (branch `cross-border-checkout`)
- Done: section 5 steps 1–6 in sandbox form, with placeholders where values are unknown. The Apple Pay domain file is still missing (owner downloads it from Airwallex).
- Not done: step 7 (policy pages), step 8 (real prices), and a real sandbox payment, which needs Airwallex sandbox keys on a Netlify deploy preview.

## 5. What to change for this project
1. **Branding:** replace the brand name, logo text, promo bar, footer, emails and SEO tags with `[BRAND NAME]` and `[DOMAIN]`.
2. **Delivery:**
   - Remove the Rockhampton and Brisbane pickup options and the Australian postcode zones.
   - Replace them with country select → freight from `data/shipping.json`.
   - Show the lead time ("Ships from our factory, delivered in `[3–6]` weeks") on the product view, cart and checkout.
3. **Currency:**
   - Show prices in the customer's currency (AUD default; NZD, USD and so on from `shipping.json`).
   - Charge in that same currency through Airwallex.
4. **Deposit:** remove it unless asked. Direct ship means paying in full.
5. **GST:** remove the "GST included" wording.
6. **Payments:**
   - Finish `create-payment.js`: login → create a PaymentIntent with `request_id`, `amount`, `currency`, `merchant_order_id` and `return_url`.
   - On the checkout page, load Airwallex.js (`@airwallex/components-sdk`): Drop-in for cards, plus Apple Pay and Google Pay buttons.
   - Finish the webhook: verify the signature, ignore duplicate event ids, mark the order paid, then email the customer and send the order to the factory (`[ORDER EMAIL]`).
   - Apple Pay needs the domain file at `site/.well-known/apple-developer-merchantid-domain-association`, downloaded from the Airwallex dashboard.
7. **Trust and policies:**
   - Pages for shipping, returns, warranty, privacy, terms and contact, with a real business address `[ADDRESS]`.
   - Airwallex's website review needs these, plus real prices.
8. **Real prices:** fill `price_aud` in `data/products.json` and real freight, exchange rates and rounding in `data/shipping.json`, run `npm run sync`, then set `SHOW_EXAMPLE_PRICES=false`.

## 6. Airwallex setup (owner does this in the dashboard)
- **Account details:** the account entity, the seller name on the site and the card-statement name must all match `[HK COMPANY NAME]` / `[STATEMENT NAME]`.
- **Payment methods:** turn on Cards, Apple Pay and Google Pay. Add the domain for Apple Pay.
- **Keys:** create sandbox keys first and put them in the Netlify Deploy Preview variables. Live keys go in the Production variables only.
- **Webhook:** point it at `https://[DOMAIN]/.netlify/functions/airwallex-webhook` and subscribe to `payment_intent.succeeded`.

## 7. Known catalogue issues
- **The Hamilton (KL813023A):** pairs with the AS003 stone top, which is 500 mm deep against a 559 mm cabinet. It needs a custom depth; show a note.
- **The Glasshouse (KL813027A-120):** this is the Munich black version, and the only photo is a room shot.
- **The Eumundi (KL810892A-80):** confirm the finish (green or white).
- **Room shots only:** The Fitzroy, The Yamba and The Carnarvon have no plain product photo.
- **Mirrors, not vanities:** AS913117 and KL913001A.

## 8. Testing
- `npm test` must pass before every commit (sync check, pricing and both functions against fakes).
- Preview: open `site/index.html`, or run `npx netlify dev` to test the functions locally with a `.env` (copy `.env.example`) that never gets committed.
- Test on a phone-width viewport (390 px): no sideways scroll, the hero shows, and finger swipes on the slider move exactly one card.
- Payments: complete an order in sandbox with an Airwallex test card and Apple Pay, then confirm the webhook marks it paid.

## 9. Open decisions (ask the owner)
1. ~~Brand name and domain.~~ Easy Deco Home, easydecohome.com.au.
2. Launch countries and their freight rates and lead times.
3. Real prices and currency rounding.
4. Who processes orders after payment: the factory's email, a spreadsheet or something else? (Built for now: a Resend email to `ORDER_EMAIL`, plus the order record in Netlify Blobs.)
5. The tap supplier's WELS and WaterMark numbers.
6. Written permission from SHKL to use the photos.
7. Keep or drop `referral.html`.

## 10. First message to send the new chat
> Read CLAUDE.md. Create a branch called `cross-border-checkout`. Do section 5 steps 1–5 with placeholders, then finish the Airwallex functions and checkout (step 6) in sandbox mode. Open a PR and tell me in two lines what's left.
