---
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-backend-core': patch
---

UI improvements batch: clear search, Added date, two-step access badges, MCP export

- Clear (×) button in search input when text is present
- "Added N ago" date shown before Sources in app detail cards (backend: expose createdAt)
- Step 1 / Step 2 badges for two-step access apps (postApprovalInstructions + requestPrompt)
- Export getResourcesFromPrisma from backend-core public API (for MCP server)
