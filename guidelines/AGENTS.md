# Global Agent Guidelines

## Web Research & Uncertainty
- **Search when uncertain**: If you are unsure about any information, documentation, package versions, APIs, or facts, search the web using BrowserOS Neo (`browseros_*` tools) instead of guessing.
- **BrowserOS Neo**:
  - Browser pages and snapshots are in-memory browser tabs, **NOT files on disk**. Do not search `/tmp` or the local filesystem for `page_*.md` or `page_*.json`.
  - Use `browseros_read` to extract text/markdown, `browseros_grep` to search text in the page, and `browseros_navigate` / `browseros_run` to drive the browser.
