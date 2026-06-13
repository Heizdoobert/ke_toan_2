# Graph Report - .  (2026-06-13)

## Corpus Check
- Corpus is ~14,666 words - fits in a single context window. You may not need a graph.

## Summary
- 151 nodes · 173 edges · 15 communities (12 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Main React Application|Main React Application]]
- [[_COMMUNITY_MVC Client Controller & View|MVC Client Controller & View]]
- [[_COMMUNITY_Core Domain Concepts|Core Domain Concepts]]
- [[_COMMUNITY_MVC Data Model & Storage|MVC Data Model & Storage]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Package Scripts & Metadata|Package Scripts & Metadata]]
- [[_COMMUNITY_Localhost Server Package|Localhost Server Package]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_Application Metadata|Application Metadata]]
- [[_COMMUNITY_Express Server Setup|Express Server Setup]]
- [[_COMMUNITY_DataGrid UI Component|DataGrid UI Component]]
- [[_COMMUNITY_Application Identity|Application Identity]]
- [[_COMMUNITY_Gemini AI Integration|Gemini AI Integration]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `dependencies` - 11 edges
3. `View` - 10 edges
4. `devDependencies` - 9 edges
5. `React Frontend (UI)` - 9 edges
6. `Controller` - 8 edges
7. `scripts` - 6 edges
8. `Database` - 5 edges
9. `Model` - 5 edges
10. `Dual Source Reconciliation Engine` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Hash Map Full Outer Join` --semantically_similar_to--> `MVC-S Architecture (Standalone)`  [INFERRED] [semantically similar]
  src/utils/reconciler.ts → localhost-project/public/app.js
- `Dynamic Editable Data Grid` --conceptually_related_to--> `SheetJS (XLSX) Library`  [INFERRED]
  src/components/DataGrid.tsx → src/App.tsx
- `MVC-S Architecture (Standalone)` --deploys_on--> `Localhost Express Server`  [EXTRACTED]
  localhost-project/public/app.js → localhost-project/server.js

## Hyperedges (group relationships)
- **Reconciliation Pipeline** — file_folder_upload, clipboard_paste, value_normalization, composite_key_matching, hash_map_join, dual_source_reconciliation, three_sheet_excel_export [EXTRACTED 1.00]

## Communities (15 total, 3 thin omitted)

### Community 0 - "Main React Application"
Cohesion: 0.17
Nodes (13): SetupPanelProps, ComparisonPair, ReconciliationResult, ReconciliationSchema, SourceData, TypeWarning, excelSerialToDateStr(), extractCleanTransactionalData() (+5 more)

### Community 1 - "MVC Client Controller & View"
Cohesion: 0.15
Nodes (3): Controller, refreshUIRulesSetup(), View

### Community 2 - "Core Domain Concepts"
Cohesion: 0.13
Nodes (18): Aggregate Group By / SUM, Clipboard Paste CSV Input, Composite Key Matching, Dual Source Reconciliation Engine, Dynamic Editable Data Grid, Excel Serial Date Conversion, File/Folder Upload (xlsx/xls/csv), Hash Map Full Outer Join (+10 more)

### Community 3 - "MVC Data Model & Storage"
Cohesion: 0.13
Nodes (9): cachedRules, Database, exportedReport, Model, selector, wb, wsA, wsB (+1 more)

### Community 4 - "TypeScript Configuration"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+8 more)

### Community 5 - "Runtime Dependencies"
Cohesion: 0.18
Nodes (11): dependencies, dotenv, express, @google/genai, lucide-react, motion, react, react-dom (+3 more)

### Community 6 - "Package Scripts & Metadata"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, clean, dev, lint, preview (+2 more)

### Community 7 - "Localhost Server Package"
Cohesion: 0.18
Nodes (10): author, dependencies, express, description, license, main, name, scripts (+2 more)

### Community 8 - "Dev Dependencies"
Cohesion: 0.22
Nodes (9): devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/express, @types/node, typescript (+1 more)

### Community 9 - "Application Metadata"
Cohesion: 0.4
Nodes (4): description, majorCapabilities, name, requestFramePermissions

### Community 10 - "Express Server Setup"
Cohesion: 0.5
Nodes (3): app, express, path

## Knowledge Gaps
- **74 isolated node(s):** `name`, `description`, `requestFramePermissions`, `majorCapabilities`, `name` (+69 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `Package Scripts & Metadata`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `View` connect `MVC Client Controller & View` to `MVC Data Model & Storage`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Dependencies` to `Package Scripts & Metadata`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `name`, `description`, `requestFramePermissions` to the rest of the system?**
  _74 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core Domain Concepts` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `MVC Data Model & Storage` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `TypeScript Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._