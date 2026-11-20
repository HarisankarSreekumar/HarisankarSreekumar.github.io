# harisankarsreekumar.github.io

My portfolio site, live at [harisankarsreekumar.github.io](https://harisankarsreekumar.github.io). I'm a Data / BI Analyst working mainly in SQL, Power BI, DAX, Python and Excel.

## What's here

| Path | What it is |
|---|---|
| `index.html` | Homepage: hero and proof points, selected work, experience, skills, education and contact |
| `projects/contracts-lifecycle-dashboard/index.html` | Case study: a Power BI contracts lifecycle and SLA performance dashboard |
| `assets/css/site.css` | Shared design tokens and components |
| `assets/js/lightbox.js` | Click or keyboard enlarge for dashboard screenshots |
| `assets/img/` | Dashboard and model screenshots |
| `Harisankar_Sreekumar_Resume.pdf` | Downloadable CV. Every link to it reads `CV_URL` in `index.html` |
| `tests/check.mjs` | Automated checks for content rules, layout and accessibility |

## Design note

The colours carry meaning across the site. **Amber** means observed or actual: real results and delivered work. **Blue** means target or predicted, and things still in progress. The hero chart and the case study use the same convention.

## Running locally

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

## Checks

The checks need Node and Playwright with Chromium:

```bash
node tests/check.mjs
```

Pass a name fragment to run a subset, e.g. `node tests/check.mjs case`.

## Deployment

GitHub Pages publishes `main`. Anything pushed to `main` goes live.

## Contact

- Email: sankarhari243@gmail.com
- LinkedIn: [linkedin.com/in/harisankarsreekumar](https://www.linkedin.com/in/harisankarsreekumar)
- GitHub: [github.com/HarisankarSreekumar](https://github.com/HarisankarSreekumar)
