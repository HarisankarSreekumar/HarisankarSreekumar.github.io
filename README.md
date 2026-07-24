# HarisankarSreekumar.github.io

My personal portfolio site — live at [harisankarsreekumar.github.io](https://harisankarsreekumar.github.io).

A single-page, interactive portfolio built to showcase my work as a Data Analyst transitioning into Data Science: production engineering (a local RAG agent), institutional data analytics (University of Warwick), and applied ML research (MSc dissertation forecasting work).

## What's here

- `index.html` — the full site (self-contained: HTML, CSS, and JS in one file, no build step or dependencies)
- `Harisankar_Sreekumar_Resume.pdf` — downloadable résumé, linked from the site

## Sections

- **Hero** — quick summary and current role status
- **About** — background across the full analytics lifecycle: database engineering, ETL, ML, regulatory reporting
- **Experience** — an expandable timeline covering Warwick, London Metropolitan University, City St George's, and Tata Consultancy Services
- **Projects** — three featured projects, each with a status indicator:
  - [Local RAG Agent](https://github.com/HarisankarSreekumar/Local_rag_agent) — a fully local, privacy-first document search and Q&A agent (Python, Ollama, ChromaDB)
  - Institutional Analytics Pipeline — an automated reporting pipeline and OfS-benchmarked performance review at Warwick
  - Retail Demand Forecasting — an XGBoost-based dissertation project (R² of 0.999)
- **Skills** — grouped by language/ML, BI/reporting, data engineering, and tooling
- **Education & Certifications**
- **Contact** — email, LinkedIn, GitHub, résumé download

## Design note

The small colored status dots used throughout the site are a deliberate callback to the RAG-flag (red/amber/green) system used in my institutional reporting work at Warwick — repurposed here to mark project status and my own career-transition progress.

## Running locally

No build tools required — just open `index.html` directly in a browser, or serve it locally:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deployment

This repo is configured for GitHub Pages — any push to `main` updates the live site automatically.

## Contact

- Email: sankarhari243@gmail.com
- LinkedIn: [linkedin.com/in/harisankarsreekumar](https://www.linkedin.com/in/harisankarsreekumar)
- GitHub: [github.com/HarisankarSreekumar](https://github.com/HarisankarSreekumar)
