# [PROJECT-NAME]

- site/ — the live website (index.html store, collection.html, referral.html, img/)
- data/ — products.json and shipping.json (edit prices here)
- netlify/functions/ — Airwallex payment + webhook (keys in Netlify env vars only)
- docs/brief.md — project brief
- source/ — supplier PDFs and raw photos. NOT uploaded to GitHub (see .gitignore)

Preview locally: open site/index.html in your browser.
Deploy: push to GitHub, connect the repo in Netlify (settings come from netlify.toml).
