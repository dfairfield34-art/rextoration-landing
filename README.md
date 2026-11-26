# Rextoration landing site

Static site for Rextoration (24/7 fire, water, smoke and flood restoration), served by GitHub Pages from the `main` branch.

| Page | File | Phone shown |
|---|---|---|
| Main (Bay Area + Central Valley) | `index.html` | Bay Area 408-528-4780, Central Valley 209-542-6261 |
| Mother Lode / Sonora | `sonora/index.html` | 209-542-6261 |
| Form thank-you | `thanks.html` | 408-528-4780 |
| Not found | `404.html` | 408-528-4780 |

## Change a phone number (one line)

All phone numbers live in **`site.config.json`**.

1. Open `site.config.json` and change the number, for example `"bayArea": "408-528-4780"`.
2. In this folder, run:
   ```bash
   node scripts/sync-phones.mjs
   ```
   It rewrites every spelling of the old number on every page (`408.528.4780`, `tel:+14085284780`, the Google structured data, and so on).
3. Commit and push. GitHub Pages republishes in a minute or two.

A GitHub check (`Phone number check`) runs on every pull request and fails if a page shows a number that is not in `site.config.json`, or if the config was changed without running the script.

Needs Node.js 18 or newer (`node -v` to check).

## Preview locally

```bash
python3 -m http.server 8000
```
Then open http://localhost:8000.

## Domain

`CNAME` points GitHub Pages at `rextoration.info`. If that domain lapses, the site still works at the GitHub Pages address, but the canonical tags, sitemap and social previews all point at `rextoration.info`, so renew it or update those before pointing ads at the site.
