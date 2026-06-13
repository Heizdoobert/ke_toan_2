# Universal Accounting Data Reconciler

## Local Development (React App)

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Standalone Express App

```bash
cd localhost-project
npm install
npm start
# App loads at http://localhost:3000
```

---

## Architecture

### React App (Vite + TypeScript)

```
src/
├── context/
│   └── ReconciliationContext.tsx   — Global state (React Context + Provider)
├── hooks/
│   ├── useFileUpload.ts            — File/paste upload controller logic
│   ├── useReconciliation.ts        — Run reconciliation + export to Excel
│   └── useSchema.ts                — Schema CRUD + cache restore on mount
├── components/
│   ├── DataGrid.tsx                 — Editable data grid (view)
│   ├── SetupPanel.tsx              — Rules mapping configuration panel
│   └── ExportLocalhost.tsx         — Code exporter accordion
├── utils/
│   ├── reconciler.ts               — Core reconciliation loop (orchestration only)
│   ├── normalize.ts                — Value normalization (dates, leading zeros)
│   ├── aggregate.ts                — Group-by aggregation
│   ├── parser.ts                   — Transactional data parser (strip headers/footers)
│   ├── validator.ts                — Column type detection + key compatibility warnings
│   └── exporter.ts                 — Excel 3-sheet export (TODO)
├── types/
│   ├── source-data.ts              — SourceData interface
│   ├── schema.ts                   — ComparisonPair, ReconciliationSchema
│   ├── result.ts                   — ReconciliationResult, ReconciliationOutput
│   ├── warning.ts                  — TypeWarning interface
│   └── index.ts                    — Barrel exports
├── types.ts                        — Re-exports from types/ barrel
├── App.tsx                         — Slim orchestration (consumes context + hooks)
└── main.tsx                        — Entry point, wraps with ReconciliationProvider
```

### Standalone App (Express + vanilla JS)

```
localhost-project/
├── server.js                       — Express server (security headers, error handling)
├── public/
│   ├── index.html                  — HTML shell
│   ├── css/
│   │   └── style.css              — Premium corporate CSS overrides
│   └── js/
│       ├── database.js             — Database class (localStorage persistence)
│       ├── model.js                — Model class (in-RAM data store + parsing)
│       ├── view.js                 — View class (DOM rendering + event binding)
│       ├── controller.js           — Controller class (reconciliation engine)
│       └── app.js                  — Bootstrap (instantiate MVC, wire events)
└── tests/
    └── server.test.js              — Express endpoint tests
```
