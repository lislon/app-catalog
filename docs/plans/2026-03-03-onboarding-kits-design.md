# Onboarding Kits - URL-Encoded App Bundles

**Date:** 2026-03-03
**Status:** Idea / Not Started

## Problem

New hires face two pain points when onboarding:

1. **Tedious process**: Must request apps one-by-one through catalog/Natero
2. **Unclear requirements**: Confluence guides list many apps, but unclear which are required vs optional

Current pattern:

- IT auto-provisions bare essentials
- Confluence guides list 15-20 role-specific apps
- New hires have consistent core needs (~5-10 apps) within same team
- Managers guide new hires through what to request

## Solution: URL-Encoded Onboarding Kits

Stateless, manager-owned app bundles encoded in shareable URLs.

### Two Modes

**1. Builder Mode** (Managers)

- UI at `/onboarding-kit-builder` in app catalog
- Search/filter apps, click "Add to Kit"
- For each app, set:
  - ✅ Required / ☐ Optional
  - 💬 Comment (e.g., "Only if working on Kafka integration")
- System generates:
  - Shareable URL (encoded kit definition)
  - Confluence markup (copy-paste ready with descriptions)

**2. Request Mode** (New Hires)

- Click URL in Confluence guide
- See categorized list (Required / Optional)
- "Request All" button submits bulk access requests

### Example URL

```
https://app-catalog.natera.com/kit?apps=datadog:req,gitlab:req,kafka:opt:onlyForBackend
```

### Generated Confluence Markup

```markdown
## Required Apps

- [Datadog](link) - Monitoring and logs
- [GitLab](link) - Source control

## Optional Apps

- [Kafka](link) - Only if working on backend integration

[Request All Required Apps](kit-url)
```

## Benefits

- ✅ No database/storage needed (stateless)
- ✅ Managers own and maintain kits in Confluence
- ✅ Reduces onboarding from 15 clicks to 1
- ✅ Clarifies required vs optional apps
- ✅ Works with existing Confluence-based onboarding workflows

## Low-Hanging Fruit

- Reuses existing app catalog data
- Simple URL encoding/decoding
- Minimal new UI (builder + request page)
- High impact for every new hire
