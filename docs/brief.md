# Brief: Bathroom vanities page for biltstudio.com.au

Paste this into a new chat together with `bilt-vanity-pack.zip`, which holds `products.json` and the `img/` folder. It hands over everything decided so far, so the new chat can build the vanities page without starting from scratch.

---

## 1. The job

Build a **Bathroom** range on biltstudio.com.au, the site of **Bilt & Co** (Rockhampton kitchens and joinery). It must:

- **Match Bilt's existing look**, not the old "basin & board" mockup. It sits beside Kitchens and Kitchenettes as its own menu item, with its own hero.
- **Sell directly:** add to cart, cart drawer, checkout. Card payment comes later through Stripe or Square.
- **Sell tapware as an add-on** to each vanity, and quietly on its own.
- Work on phones first. Most traffic will come from Facebook and Marketplace.

Ask me for Bilt's site code, or read the live site, before designing. Copy its fonts, colours, header and footer.

## 2. Rules that can't be broken

- **Supply only.** Never say or imply Bilt installs. Say "Your plumber or carpenter fits it."
- **No fake proof.** No invented reviews, star ratings, customer counts or "X people viewing". Leave review slots as clearly marked placeholders until real reviews exist.
- **Tapware compliance.** A tap can't be listed for sale in Australia unless the listing shows its WELS registration number, star rating and water use, plus its WaterMark logo and licence number. The site must block checkout for any tap missing these numbers, so nothing goes live by accident.
- **Australian Consumer Law.** Terms of sale can't remove ACL rights. The checkout tick box must say so.
- **Photo rights.** The images are SHKL's catalogue renders. They can't go public until SHKL has given written permission (still pending).
- **Placeholders.** Anything not yet known shows as a clearly marked placeholder label, for example `[ETA DATE]`, never a made-up value.

## 3. Positioning and copy

- Flat-pack and factory direct, priced under local cabinetry makers. Bought direct from the factory, inspected before shipping.
- Vanities are named after Queensland places. Call each one "The [Place]" with a plain description underneath, for example "The Noosa · Terrazzo Oval · AS813109-120".
- Copy should be plain and punchy, in Australian English. Avoid jargon.
- The range can also be called "The Basin collection by Bilt" if a sub-brand is wanted (not yet decided).

## 4. Page structure (one page, the full range visible)

With only 17 vanities, one page converts best: land, scroll, tap a vanity, add it to the cart. Keep the product grid near the top.

1. **Hero:** the Noosa lifestyle photo, with a name tag that opens its product view.
2. **Shop by look:** three photo tiles with counts: Light timber (9), Dark timber (4), Painted (4).
3. **Shop by size:** Up to 810 / 900 / 1000 / 1200 / 1500 mm, each with its room type and count.
4. **Real life renovations:** the vertical video slider (spec in section 7).
5. **Favourites row** and the **full grid**, filterable by look, width, mounting and saved.
6. **Product view:** photo gallery with thumbnails, price, tags, Add to cart, Buy now, Save, **Complete the look** (taps), real specs, and previous/next buttons.
7. **Tapware band:** a discreet section with three tap models and finish swatches.
8. **Help:** measuring guide, trade block, FAQ, "Ask a question" form.
9. **Small home package:** a card linking kitchenette, vanity and tap, aimed at tiny homes, granny flats and Airbnb fit-outs.

## 5. The vanities

Full specs (finish, material, storage, top and basin, paired mirror) and image paths are in `products.json`. All prices are **examples only**, there for testing.

| Name | Code | Description | Cabinet (W × D × H) | Mounting | Look | Basin, taps needed | Example $ |
|---|---|---|---|---|---|---|---|
| The Noosa | AS813109-120 | Terrazzo Oval | 1200 × 470 × 418 | Wall-hung | Light | Vessel, 1 | 1090 |
| The Byron | AS813046A-100 | Acacia Curve | 1010 × 510 × 375 | Wall-hung | Light | Integrated, 1 | 890 |
| The Daintree | KL813024-120 | Walnut & Black Stone | 1200 × 469 × 412 | Wall-hung | Dark | Vessel, 1 | 1090 |
| The Yamba | AS813117 | Fluted Pedestal | 600 × 410 × 900 | Freestanding pedestal | Light | Integrated, 1 | 790 |
| The Whitsunday | KL810971-150 | Carrara Double | 1500 × 480 × 462 | Wall-hung | Light | Vessel, 2 | 1390 |
| The Kuranda | AS813046C-100 | Walnut Curve Floor | 1010 × 510 × 890 | Floor-standing | Light | Integrated, 1 | 1090 |
| The Hamilton | KL813023A | Bruce Blue Classic | 1200 × 559 × 870 | Floor-standing | Painted | Integrated, 1 | 1290 |
| The Coolum | AS813045-90 | Khaki Ribbed | 910 × 465 × 520 | Wall-hung | Painted | Integrated, 1 | 790 |
| The Agnes | KL813003-100 | Acacia Two-Drawer | 1000 × 520 × 510 | Wall-hung | Light | Integrated, 1 | 890 |
| The Eumundi | KL810892A-80 | Country Green Diamond | 810 × 460 × 538 | Wall-hung | Painted | Integrated, 1 | 690 |
| The Peregian | AS813050A-120 | Mist Fluted Double | 1205 × 460 × 410 | Wall-hung | Light | Integrated, 1 | 1090 |
| The Glasshouse | KL813027A-120 | Munich Black Four-Drawer | 1200 × 460 × 512 | Wall-hung | Dark | Vessel, 2 | 1090 |
| The Emu Park | AS810879A-90 | Walnut Float | 900 × 450 × 362 | Wall-hung | Light | Vessel, 1 | 790 |
| The Yeppoon | AS810879B-90 | White Float | 900 × 450 × 362 | Wall-hung | Painted | Vessel, 1 | 790 |
| The Capricorn | KL813019-100 | Acacia Three-Drawer | 1000 × 460 × 415 | Wall-hung | Light | Integrated, 1 | 890 |
| The Carnarvon | KL813001A-120 | Ancora Walnut Console | 1200 × 469 × 412 | Wall-hung | Dark | Vessel, 1 | 1090 |
| The Fitzroy | AS813050B-100 | Dark Walnut Fluted | 1005 × 460 × 410 | Wall-hung | Dark | Integrated, 1 | 890 |

**Known catalogue issues (keep these notes on the site or check with the factory):**
- **The Hamilton (KL813023A)** is wanted with the **AS003** sintered stone basin top. AS003 is 500 mm deep and the cabinet is 559 mm deep, so a custom depth is needed. Show this as a note on its product view.
- **The Glasshouse (KL813027A-120)** is the **Munich black** version. Its only photo is the black room shot. The oak photos in the catalogue belong to plain KL813027.
- **The Eumundi (KL810892A-80):** in the catalogue the A version is green and B is white. Confirm the finish with the factory.
- **Missing product shots:** The Fitzroy, The Yamba and The Carnarvon only have room photos, no plain product shot.
- **AS913117 and KL913001A are mirrors**, not vanities. They're the paired mirrors for The Yamba and The Carnarvon.

## 6. Tapware (add-on first, also sold on its own)

Three models, each in four finishes: brushed brass, gunmetal, matte black and chrome. Every finish is its own cart item. Example prices: tall vessel mixer $289, basin mixer $229, wall mixer and spout set $349.

**Matching logic:**
- A vanity with a **vessel** basin is offered the tall vessel mixer and the wall set.
- A vanity with an **integrated** or undermount basin is offered the basin mixer.
- The first finish suggested depends on the look: light timber gets brass, dark timber gets black, painted gets brass.
- Double-basin vanities (The Whitsunday, The Glasshouse) add 2 taps in one tap.

**Where taps are offered:**
1. **Complete the look**, directly under Add to cart on every vanity.
2. When a vanity is added, the cart drawer opens with "Added. Want the matching tap?"
3. At checkout, if a vanity in the cart has no tap: "Need a tap for the [name]?"
4. The discreet Tapware band, with a detail sheet showing the vanities each tap suits, a compliance box and specs.

**Toggle behaviour:** "+ Add" becomes "Added ✓". Tapping it again removes the tap. On desktop, hovering the button shows "Remove".

**Compliance gate:** each tap model has `wels.reg`, `wels.stars`, `wels.flow` and `watermark` fields. If any are empty, the tap shows placeholder labels and checkout refuses the order with a clear message.

## 7. Video slider ("Real life renovations")

- Vertical 9:16 cards, one centred at a time. Spare space at each end lets the first and last cards centre too.
- **Size follows position:** cards grow as they slide into the centre and shrink and fade as they leave, frame by frame (centre about 1.08×, sides about 0.88× at 45% opacity).
- **One card per gesture, always.**
  - Finger or mouse drag follows the pointer, capped at one card's width, then glides one step. A drag under 40 px springs back.
  - Trackpad and wheel: one step per gesture. A gesture only ends after about 240 ms of no wheel input, so momentum can't trigger a second step.
  - Arrow buttons and keyboard arrows move one step.
- **Motion:** custom ease-out over about 850 ms (`1-(1-t)^4`). It starts immediately and settles gently.
- **Touch bug already fixed:** only treat a lost pointer capture as a cancel when it fires on the slider itself (`e.target === slider`). Otherwise the phone handing the touch to a child element cancels every swipe.
- Tapping a side card centres it, and tapping the centred card opens the video.
- Videos are YouTube Shorts links, played in a lightbox. Placeholder links contain `REPLACE` and show "Video coming soon".
- Current lineup: Noosa, Kuranda, Yeppoon, Coolum, Eumundi. Each card has the vanity's name and code underneath and opens its product view.

## 8. Cart and checkout

- **Cart drawer:** quantity buttons, remove, subtotal, and a GST-included note marked `[CONFIRM]`. The cart is remembered in the browser.
- **Checkout page:**
  1. **Details:** name, mobile, email.
  2. **Pickup or delivery:** free pickup in Rockhampton `[PICKUP ADDRESS]` or Brisbane `[PICKUP ADDRESS]`, or delivery with freight worked out from the postcode zone.
  3. **Payment:** pay in full, or a deposit `[DEPOSIT %]` (example 30%) with the balance due before pickup or dispatch. A card field slot for Stripe or Square. An optional referral code. A terms tick box naming `[SELLER NAME]`, `[TERMS OF SALE]` and `[RETURNS POLICY]`, saying the items are pre-order and that ACL rights aren't affected.
- **Freight zones** (example amounts, per vanity; see `products.json`):

| Zone | Postcodes | Example per vanity |
|---|---|---|
| Central Queensland | 4700–4799 | $60 |
| South East Queensland | 4000–4299 | $120 |
| Rest of Queensland | 4300–4999 | $180 |
| NSW, ACT and VIC | 2000–3999, 0200–0299 | $240 |
| SA, WA, NT and TAS | other | Quoted after order |

- Taps ordered with a vanity ship in the same carton, free. Taps on their own pay a flat parcel rate (example $15).
- **Order summary:** lines, a tap reminder, subtotal, freight, total, GST included, and due today / balance for deposits.
- **Confirmation page:** order number. Until a payment provider is connected, it says it's test mode.
- **Payments must be server-side.** Stripe or Square needs a small backend endpoint to create the payment, so it can't be done in a static page.

## 9. Decisions still open (ask me)

1. **Seller.** Does Bilt & Co Pty Ltd sell the vanities, or the Hong Kong company? This changes the checkout seller name, invoices and the referral agreement. If Hong Kong sells, referrers (Person B) only refer: the customer accepts Hong Kong's terms and pays Hong Kong, and referrers never set prices or take payment.
2. **Real prices** for all 17 vanities and the taps.
3. **Real freight costs** per zone (the carton is 0.31 m³).
4. **Deposit percentage**, and the ETA for the next shipment.
5. **Which taps:** supplier codes, photos, and WELS and WaterMark numbers for each.
6. **SHKL's written permission** to use the photos.
7. **Sub-brand** ("the Basin collection by Bilt") or just "Bathroom".
8. **Business details:** ABN, pickup addresses, phone, warranty, returns policy, and the materials and hardware answers for the FAQ.

## 10. Files in the pack

- **`products.json`:** 17 vanities (full specs, look, basin type, taps needed, image paths, example price), 3 tap models (finishes, example prices, empty compliance fields), the finish colours, the example freight zones, the tap-only freight and the deposit example, and **65 basins and vanity tops** from the catalogue (code, kind, size, bowl size, material, colour, image). The basins can become a later "Basins" range.
- **`img/`:** web-ready WebP images. The `<vanity-id>-1.webp` file is the main room shot, then detail shots, then a product shot where one exists. The `b-*.webp` files are basins.
- **Originals:** full-resolution images are in `SHKL_selected_vanities.zip`, which went out in an earlier chat. The source catalogue is `SHKL_BATHROOM_VANITIES_2026.pdf`.

## 11. Suggested first message for the new chat

> Here's the brief and the asset pack for adding a Bathroom vanities range to biltstudio.com.au. First, look at the live site and match its design. Then build the vanities page as described: full range on one page, tapware add-ons, the video slider spec, and cart and checkout with a payment slot. Use clearly marked placeholders for anything in section 9, and ask me about the seller decision before finishing the checkout.
