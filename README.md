# Easy Deco Home

Bathroom vanities, basins and tapware, shipped direct from the factory to the customer's door. Australia first. Live domain: easydecohome.com.au.

- `site/`: the website (index.html store, collection.html gallery, referral.html demo, js/pricing.js, img/)
- `data/`: products.json (prices in `price_aud`) and shipping.json (countries, currency, freight, lead times)
- `netlify/functions/`: Airwallex payment and webhook (keys in Netlify env vars only; see `.env.example`)
- `docs/brief.md`: original brief (reference only)
- `source/`: supplier PDFs and raw photos, NOT uploaded to GitHub (see .gitignore)

After editing anything in `data/`, run `npm run sync` to update the page, then `npm test`.

Preview locally: open site/index.html, or `npx netlify dev` to run the payment functions too.
Deploy: push to GitHub and connect the repo in Netlify (settings come from netlify.toml).
