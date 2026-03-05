# Invoice PDF Field Highlighter

React demo that loads invoice PDFs, extracts key fields, and highlights each extracted field directly in the PDF when clicked.

## Features

- 10 generated invoice PDFs (each with 10 fields)
- Horizontal invoice card carousel for quick switching
- Split-screen UI:
  - Left: PDF viewer with highlight overlay
  - Right: extracted field list
- Click any field on the right to highlight its location in the PDF
- Download button for the currently selected invoice
- GitHub Pages ready (with GitHub Actions deployment workflow)

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Regenerate sample invoices

```bash
npm run generate:invoices
```

This writes files into `public/invoices`:

- `invoice-01.pdf` ... `invoice-10.pdf`
- `index.json` (invoice metadata + field order)

## Build

```bash
npm run build
npm run preview
```

## GitHub Pages deployment

This repo includes `.github/workflows/deploy.yml` for automatic Pages deployment on pushes to `main`.

1. Push this repository to GitHub.
2. In GitHub repo settings, open **Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main` (or re-run the workflow) to publish.

The app base path is set automatically from the GitHub repository name during build.

## Manual deploy option

If you prefer `gh-pages` branch deployment from local machine:

```bash
npm run deploy
```

