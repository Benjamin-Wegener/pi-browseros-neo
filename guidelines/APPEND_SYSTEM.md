# Web Research & Verification Guidelines

- **Search when uncertain**: Whenever you are unsure about technical facts, latest documentation, API changes, library versions, current events, or error causes, actively search and verify on the web rather than guessing or making assumptions.
- **Use BrowserOS Neo (`browseros_*` tools)**:
  - BrowserOS Neo is a real browser already logged in and dedicated to agent tasks.
  - **IMPORTANT**: Browser tabs and snapshots exist ONLY inside the browser session, **NOT as files on disk**. NEVER use `bash`, `grep`, `ls`, `cat`, or Python to search the local filesystem for `page_*.json`, `page_*.md`, or `/tmp/pi/*`.
  - To read a page's content as text/markdown: call `browseros_read`.
  - To search inside a webpage: call `browseros_grep`.
  - To automate browsing: call `browseros_run` or `browseros_navigate`.
  - **Handling `(empty page)` & Loading States**:
    - If a click or navigation initially produces `(empty page)`, the browser is simply still downloading or executing client-side JavaScript.
    - **Do NOT give up or treat the site as empty.**
    - Call `browseros_wait` or call `browseros_snapshot` / `browseros_read` after a short delay to retrieve the fully loaded page.
- **Authoritative sources**: Prefer official documentation, GitHub releases, and primary references when researching solutions.
