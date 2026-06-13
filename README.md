# Universal Accounting Data Reconciler

Compare, match, and reconcile accounting data from two sources using composite key mapping, full-outer-join alignment, and Excel export.

## Project Structure

This monorepo contains two apps:

| App | Stack | Location |
|-----|-------|----------|
| **React App** | Vite + TypeScript + React | `./src/` |
| **Standalone App** | Express + vanilla JS | `./localhost-project/` |

---

## Quick Start — React App

**Prerequisites:** Node.js

```bash
npm install
# Set GEMINI_API_KEY in .env.local
npm run dev
```

## Quick Start — Standalone App

```bash
cd localhost-project
npm install
npm start
# Opens at http://localhost:3000
```

---

## Architecture — React App

```
src/
├── context/
│   └── ReconciliationContext.tsx    — Global state (React Context + Provider)
├── hooks/
│   ├── useFileUpload.ts             — File/paste upload controller logic
│   ├── useReconciliation.ts         — Run reconciliation + export to Excel
│   └── useSchema.ts                 — Schema CRUD + localStorage cache restore
├── components/
│   ├── DataGrid.tsx                  — Editable data grid
│   ├── SetupPanel.tsx               — Rules mapping configuration
│   └── ExportLocalhost.tsx          — Code exporter accordion
├── utils/
│   ├── reconciler.ts                — Core reconciliation loop (orchestration only)
│   ├── normalize.ts                 — Value normalization (dates, leading zeros)
│   ├── aggregate.ts                 — Group-by aggregation
│   ├── parser.ts                    — Transactional data parser
│   ├── validator.ts                 — Column type detection + key compatibility
│   └── exporter.ts                  — Excel 3-sheet export
├── types/
│   ├── source-data.ts               — SourceData interface
│   ├── schema.ts                    — ComparisonPair, ReconciliationSchema
│   ├── result.ts                    — ReconciliationResult, ReconciliationOutput
│   ├── warning.ts                   — TypeWarning interface
│   └── index.ts                     — Barrel exports
├── App.tsx                          — Slim orchestration (context + hooks)
└── main.tsx                         — Entry point, wraps with ReconciliationProvider
```

## Architecture — Standalone App

```
localhost-project/
├── server.js                        — Express server (security headers, error handling)
├── public/
│   ├── index.html                   — HTML shell
│   ├── css/
│   │   └── style.css               — Premium corporate CSS
│   └── js/
│       ├── database.js              — Database class (localStorage persistence)
│       ├── model.js                 — Model class (in-RAM data store + parsing)
│       ├── view.js                  — View class (DOM rendering + event binding)
│       ├── controller.js            — Controller class (reconciliation engine)
│       └── app.js                   — Bootstrap (instantiate MVC, wire events)
└── tests/
    └── server.test.js               — Express endpoint tests
```

## Data Flow

1. **Upload**: Paste or upload two CSV/TSV datasets
2. **Map**: Select columns for composite key and comparison pairs
3. **Reconcile**: Engine normalizes, matches, and aligns records
4. **Export**: Download Excel with 3 sheets (a-only, b-only, matched)
