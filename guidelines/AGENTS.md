# Global Agent Guidelines

## Web Research & Uncertainty
- **Search when uncertain**: If you are unsure about any information, documentation, package versions, APIs, or facts, search the web using BrowserOS Neo (`browseros_*` tools) instead of guessing.
- **BrowserOS Neo Guidelines**:
  - Browser pages and snapshots are in-memory browser tabs, **NOT files on disk**. Do not search `/tmp` or the local filesystem for `page_*.md` or `page_*.json`.
  - Use `browseros_read` to extract text/markdown, `browseros_grep` to search text in the page, and `browseros_navigate` / `browseros_run` to drive the browser.
  - **Handling "(empty page)" & Page Loading**:
    - When navigating or clicking a link on modern websites/SPAs (e.g. Google search results, financial portals, documentation), the initial diff or snapshot may momentarily say `(empty page)` while JavaScript and network requests finish rendering.
    - **NEVER assume the page is broken or empty when you see `(empty page)`!**
    - Instead, call `browseros_wait { "for": "time", "value": 2000 }` (or `browseros_wait { "for": "text" }`) or re-run `browseros_snapshot` / `browseros_read` to view the fully rendered content.
