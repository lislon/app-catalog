---
'@igstack/app-catalog-frontend-core': patch
---

Pressing Enter right after typing a search query opens the first result. The first row is shown focused so it is clear what Enter will open; ↑↓ still move the focus and Esc still clears the search. Previously Enter did nothing until ↓ had been pressed once (#167).
