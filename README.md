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

## Concepts this repository can teach you

### 1. PDF rendering with `react-pdf` + `pdf.js`

- How to render PDFs in React using `Document` and `Page`.
- How to configure and version-match the PDF worker (`pdfjs-dist`) so the viewer works correctly.
- Where to look:
  - `src/components/PdfViewerPanel.tsx`
  - `src/App.tsx`

### 2. PDF field parsing and coordinate extraction

- How to read text content from PDFs (`getTextContent`) and normalize text items.
- How to extract values with a two-pass strategy:
  - Ordered label matching (e.g. `Invoice Number`, `Due Date`, `Total Due`).
  - Generic fallback (`Label: Value`) parsing for non-template documents.
- How to map PDF-space coordinates to screen-space overlay coordinates for highlighting.
- Validation criteria for uploaded files:
  - PDF format only
  - one-page only
  - invoice-like keyword heuristic
- Where to look:
  - `src/utils/pdfExtraction.ts`
  - `src/App.tsx`

### 3. React component architecture and state orchestration

- How to keep orchestration in one container (`App.tsx`) while splitting UI into focused components.
- How to structure shared types and utility modules for readability and reuse.
- Where to look:
  - `src/components/`
  - `src/types.ts`
  - `src/App.tsx`

### 4. Reusing existing components built by others

- How to integrate pre-built component libraries (MUI) instead of building every UI piece from scratch.
- In this project, MUI is used for common UI primitives like cards, dialogs, buttons, icons, and layout.
- Why this matters: faster delivery, better accessibility defaults, and easier consistency.
- Where to look:
  - `src/components/InvoiceCarousel.tsx`
  - `src/components/UploadInvoiceDialog.tsx`
  - `src/components/FieldsPanel.tsx`

### 5. Shipping a static React app to GitHub Pages

- How to configure Vite base path handling for Pages deployments.
- How to use GitHub Actions to build and deploy automatically on `main`.
- Where to look:
  - `.github/workflows/deploy.yml`
  - `vite.config.js`
  - `package.json` scripts (`build`, `deploy`)

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
