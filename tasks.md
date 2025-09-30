### Annotation Viewer — MVP Planning and Execution Tasks

---

### 1) Distilled MVP Requirements (from `PRD.md` and `schemas.md`)

- **Core user goal**: Share a lightweight web viewer to load an annotated PDF, extract and review annotations, capture feedback, and export feedback.
- **PDF rendering**: Use PDF.js; handle large PDFs (100+ pages) with smooth scrolling and lazy loading.
- **Annotation extraction**:
  - Load annotated PDFs directly (single file workflow).
  - Extract annotations using `pdf-lib` from PDF comments/highlights/bookmarks.
  - Convert to internal format with coordinate normalization.
  - Support XFDF export for round-trip compatibility.
- **Annotation visualization**:
  - Display overlays/highlights by `page` and `bbox` from extracted data.
  - Sidebar to list annotations (click → scroll/jump to annotation).
  - Toggle filters (e.g., `entity_type`, `feedback_type`/status, confidence if provided).
  - Keyboard shortcuts for navigating annotations (←/→) and toggling visibility.
- **Feedback capture**:
  - Mark per-annotation status: `correct`, `incorrect`, `needs_edit` (maps to `true_positive`, `false_positive`, `false_negative` in `schemas.md`).
  - Add free-text notes.
  - Do not change pipeline highlight colors.
- **Export**:
  - Local-first storage; export to JSON (primary), CSV (flattened), and XFDF (Adobe compatibility).
  - Optional future: API sync (HTTPS, auth) for centralized collection.
- **Non-functional**:
  - Cross-platform via pure web distribution; easy to "send to another laptop" (zip of static files) and open in a browser.
  - On-prem/desktop variants are future options.
  - Security: local-first; nothing leaves machine unless exported.

---

### 2) Solution Options (with trade-offs)

- **Option A — Pure Static Web App (recommended for MVP)**
  - Stack: React + TypeScript + Vite + Tailwind + Radix UI + PDF.js.
  - Distribution: ship `dist/` as a zip; open over `http://localhost` (tiny static server) or enable PWA install.
  - Storage: IndexedDB for session autosave; File System Access API for export when supported; graceful fallback to download.
  - Pros: smallest footprint; fastest to deliver; easy sharing; no installer.
  - Cons: direct `file://` may restrict PDF.js worker; advise running via a tiny static server or PWA install.

- **Option B — Use Mozilla PDF.js default viewer as a base**
  - Reuse the official `web/viewer.html` and customize UI panes for sidebar/feedback.
  - Pros: robust text layer, built-in find, pagination, accessibility.
  - Cons: customization complexity; higher coupling to PDF.js upstream.

- **Option C — Desktop Wrapper (Electron/Tauri)**
  - Same React + PDF.js UI, but packaged as desktop app for easy local file I/O.
  - Pros: frictionless file open/save; offline by default.
  - Cons: heavier distribution; not necessary for "send a web viewer" MVP.

- **Option D — On-Prem Web App (Docker)**
  - Serve the static app + optional API internally.
  - Pros: enterprise control, auth, audit.
  - Cons: requires IT; overkill for MVP.

Recommendation: **Option A (Pure Static Web App)** for the true MVP, with a documented tiny-server step (or PWA) to avoid `file://` worker/CORS issues.

---

### 3) Architecture Overview (MVP)

- **Frontend**: React (TS) + Vite + Tailwind + Radix.
- **PDF Rendering**: PDF.js via `pdfjs-dist` with a custom lightweight viewer component; lazy-load pages.
- **Annotation Overlay**: absolutely positioned layer per page, derived from `bbox` + current scale.
- **State Management**: Zustand (simple, scalable) or React Context + reducers. Index annotations by `page` and `annotation_id`.
- **Persistence**: IndexedDB (autosave) + explicit Export (JSON/CSV). Import external annotation JSON.
- **Accessibility**: keyboard shortcuts; ARIA roles/labels; focus management in sidebar and feedback panel.
- **Performance**: virtualize annotation list (e.g., `react-virtual`), incremental page rendering, memoized overlays.

---

### 4) Data Model and Mapping

- **PDF Annotation Extraction**:
  - Use `pdf-lib` to extract annotations from PDF comments/highlights/bookmarks.
  - Convert PDF annotation types to internal format.
  - Extract text content and bounding boxes from annotations.
- **Internal types** (conceptual):
  - `PdfDocumentMeta`: `file_name`, `num_pages`, `fingerprint`, `annotations_extracted`.
  - `Annotation`: `annotation_id`, `page`, `span_text`, `entity_type`, `bbox`, `status` (maps from `feedback_type`), `notes`, `pdf_annotation_type`.
  - `FiltersState`: `entity_types[]`, `statuses[]`, `search_term`.
  - `ViewerState`: `current_page`, `current_annotation_id`, `scale`, `is_sidebar_open`, `is_overlay_visible`.
- **Coordinate policy**:
  - Extract coordinates from PDF annotations and normalize to `(x_norm, y_norm, w_norm, h_norm) ∈ [0,1]`.
  - Store both original PDF coordinates and normalized coordinates for round-trip export.

---

### 5) UI Map (MVP)

- **Top Bar**: file open (PDF), import annotations (JSON), export (JSON/CSV), overlay toggle, filters, help.
- **Sidebar**: virtualized list of annotations; filter controls; quick counts; selection scrolls to annotation.
- **Main Canvas**: paginated infinite scroll (lazy rendering); overlay rectangles for annotations; selected annotation highlighted.
- **Feedback Panel**: status radio/group (Correct / Incorrect / Needs Edit), notes textarea; keyboard shortcuts to set status and jump next/prev.

---

### 6) Pseudocode for Core Flows (no actual code)

- `handleOpenPdf()`
  - show file picker for `.pdf`
  - read as ArrayBuffer
  - load with PDF.js → `pdfDocument`
  - extract annotations using `pdf-lib` → `annotations[]`
  - normalize coordinates and map to internal format
  - set `viewerState.num_pages`, `viewerState.current_page=1`
  - precompute page viewports for lazy rendering
  - index annotations by `page` and `annotation_id`

- `renderPage(pageIndex)`
  - obtain viewport for scale
  - render canvas via PDF.js
  - call `renderAnnotationOverlay(pageIndex, scale)`

- `renderAnnotationOverlay(pageIndex, scale)`
  - fetch annotations for page
  - for each annotation: denormalize `bbox` using viewport dims
  - draw positioned rectangles with Tailwind classes
  - attach click handlers to select annotation

- `handleSelectAnnotation(annotation_id)`
  - set current selection; scroll page into view; focus feedback controls

- `handleFeedbackChange(annotation_id, status, notes)`
  - update in-memory store; persist to IndexedDB (debounced)

- `exportJson()`
  - collect session meta + annotations
  - serialize to JSON (match `schemas.md`)
  - save via File System Access API if supported; else trigger download

- `exportCsv()`
  - flatten annotations per CSV schema; serialize
  - save using same strategy as JSON

- `exportXfdf()`
  - convert internal annotations to XFDF format
  - save for Adobe compatibility

- Keyboard shortcuts
  - ←/→ navigate previous/next annotation
  - `f` toggle overlay; `e` focus notes; `1/2/3` set status

---

### 7) Step-by-Step Execution Plan

1. Project scaffold
   - Initialize React + TS with Vite; add Tailwind and Radix UI.
   - Add ESLint/Prettier; set up path aliases; configure PDF.js worker bundling.
   - Add `pdf-lib` for annotation extraction; provide `sample_annotated.pdf`.

2. PDF rendering
   - Integrate PDF.js; render document with lazy page loading and a loading spinner per page.
   - Implement scale/zoom; store viewport dims for each page.

3. PDF annotation extraction
   - Implement PDF open (drag-and-drop + file picker).
   - Extract annotations using `pdf-lib` from comments/highlights/bookmarks.
   - Convert to internal format with coordinate normalization.

4. Annotation overlay
   - Build per-page overlay layer; selection/highlight behavior; overlay visibility toggle.
   - Maintain mapping `page → annotations[]` for fast lookup.

5. Sidebar and navigation
   - Virtualized list of annotations; click to jump; display key fields (`entity_type`, `span_text`).
   - Filters for `entity_type` and `status`; quick counts; clear filters action.

6. Feedback panel
   - Status controls (3 states) and notes; auto-focus on selection.
   - Debounced IndexedDB autosave.

7. Keyboard shortcuts and A11y
   - Implement ←/→ navigation, `1/2/3` status set, focus management, ARIA roles/labels.

8. Export flow
   - JSON + CSV + XFDF export; File System Access API when available; download fallback.
   - Include `file_id`, `reviewer_id` (optional input), `review_date` (now), and `feedback[]`.

9. Performance polish
   - Memoize overlays; virtualization; ensure smooth scrolling on 100+ pages and thousands of annotations.

10. Packaging & distribution
    - Build static assets; document running via tiny server (e.g., `python -m http.server` or `npx serve`).
    - Optional: add PWA manifest and service worker for offline install.

11. Validation & acceptance
    - Test with large annotated PDFs; verify filters, keyboard, and exports match schema.
    - Acceptance criteria below.

---

### 8) Risks and Mitigations

- `file://` restrictions for PDF.js worker
  - Mitigation: recommend tiny static server or PWA install; bundle worker correctly.
- Coordinate mismatches (absolute vs normalized)
  - Mitigation: detect and normalize at import; store both if needed.
- Large PDFs (500+ pages) performance
  - Mitigation: lazy render, virtualization, memoization, minimal reflow.
- Browser differences in File System Access API
  - Mitigation: feature-detect; provide robust download fallback.

---

### 9) Milestones and Acceptance Criteria

- Milestone 1: Render PDF and show overlays for `sample_feedback.json`.
  - Accept: Pages render; overlay toggles; click in sidebar jumps to page.

- Milestone 2: Feedback capture and persistence
  - Accept: Status and notes editable; survive reload (IndexedDB).

- Milestone 3: Export
  - Accept: JSON and CSV exports match `schemas.md` exactly; files save locally.

- Milestone 4: Navigation & usability
  - Accept: ←/→ navigate annotations; filters work; a11y labels present.

- Milestone 5: Packaging
  - Accept: Zipped `dist/` runs via tiny server on another laptop with no code changes.

---

### 10) Post-MVP Roadmap (optional)

- XFDF export for Adobe interoperability.
- Full-text search across annotations and pages.
- On-prem Docker deployment and optional FastAPI sync service (auth, audit, SFTP integration).


