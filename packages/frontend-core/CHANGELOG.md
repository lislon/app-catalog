# @igstack/app-catalog-frontend-core

## 0.3.1-alpha-20260327223036

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260327034128

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260320140750

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260317225951

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260317200702

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260317183841

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260317175519

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260308004653

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260306003829

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260305175850

### Patch Changes

- Snapshot release from alpha branch

## 0.3.0

### Minor Changes

- Remove admin functionality and fix Prisma type leaks from tRPC

  **Backend changes:**
  - Removed admin chat handler and database tools
  - Removed approval method management (router and sync)
  - Removed app catalog admin router and backup/restore endpoints
  - Removed icon and screenshot tRPC routers (leaked Prisma types)
  - TRPCRouter now only contains auth and appCatalog queries (plain types only)
  - REST controllers remain for icons and screenshots

  **Frontend changes:**
  - Removed all admin routes and UI (admin chat, approval methods, app catalog admin)
  - Removed icon management UI components
  - Screenshots continue using REST endpoints (/api/screenshots/:id)

  **Prisma 7 adapter:**
  - Added @prisma/adapter-pg and @types/pg to catalog
  - Rely on transitive pg dependency from adapter-pg

## 0.2.1

## 0.2.0

## 0.1.1-alpha-20260304050203

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260303225217

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260303220950

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260303213545

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260303212813

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260303183112

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260303150843

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260302172844

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260302052404

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260302045338

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260302043803

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260302040925

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260302025010

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260228223319

### Patch Changes

- Snapshot release from alpha branch

## 2.0.1-alpha-20260224192214

### Patch Changes

- Snapshot release from alpha branch

## 2.0.1-alpha-20260224152429

### Patch Changes

- Changed readme

## 2.0.1-alpha-20260224145405

### Patch Changes

- Alpha snapshot release

## 0.0.0-alpha-20260224145132

### Patch Changes

- Alpha snapshot release
