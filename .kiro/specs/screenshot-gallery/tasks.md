# Implementation Plan: Screenshot Gallery Gap Fixes

## Overview

This plan addresses 4 identified gaps in the existing screenshot gallery implementation:

1. Screenshot ordering not preserved in tRPC `getByAppSlug` query
2. Screenshot ordering not preserved in REST `GET /api/screenshots/app/:appSlug` endpoint
3. Missing thumbnail size optimization in `ScreenshotPreview`
4. Escape key not following layered dismissal order (Fullscreen → Gallery → App Card)

All gaps are targeted fixes to existing code. The feature is already implemented; these tasks ensure requirements compliance.

## Tasks

- [x] 1. Fix screenshot ordering in backend queries
  - [x] 1.1 Fix tRPC `getByAppSlug` to preserve `screenshotIds` order
    - Modify `screenshotRouter.ts` to manually sort results by `screenshotIds` array order after `findMany`
    - Use array index mapping to ensure PostgreSQL's unordered `id: { in: [...] }` results match the input order
    - _Requirements: 10.1, 10.2_
  - [x] 1.2 Fix REST `GET /api/screenshots/app/:appSlug` to preserve order
    - Modify `screenshotRestController.ts` to sort results by app's `screenshotIds` array order
    - Fetch app entity to get `screenshotIds`, then sort screenshot metadata results accordingly
    - _Requirements: 9.5, 10.1, 10.2_
  - [ ]\* 1.3 Write property test for screenshot ordering
    - **Property 19: App screenshots metadata preserves screenshotIds order**
    - **Validates: Requirements 9.5, 10.1, 10.2**
    - Generate random `screenshotIds` arrays (1-10 items), verify both tRPC and REST endpoints return results in same order
    - Use fast-check with minimum 100 iterations
    - _Requirements: 9.5, 10.1, 10.2_

- [x] 2. Add thumbnail size optimization
  - [x] 2.1 Add `size` query parameter to thumbnail image URLs in `ScreenshotPreview`
    - Modify `AppDetailModal.tsx` to append `?size=600` to thumbnail `src` URLs
    - Use 600px to match the `max-h-[600px]` CSS constraint
    - Add explicit `width` attribute calculation based on aspect ratio if available
    - _Requirements: 1.1, 1.3_
  - [ ]\* 2.2 Write unit test for thumbnail size parameter
    - Render `ScreenshotPreview` with mock screenshot IDs
    - Assert all `<img>` elements have `src` containing `?size=600`
    - _Requirements: 1.1, 1.3_

- [x] 3. Fix Escape key layered dismissal
  - [x] 3.1 Implement Escape key interception in fullscreen mode
    - Modify `Gallery.tsx` to add `keydown` event listener when `isFullscreen` is true
    - Call `event.stopPropagation()` before setting `isFullscreen = false` to prevent Radix Dialog from closing
    - Ensure event listener is cleaned up when fullscreen exits or component unmounts
    - _Requirements: 6.3, 6.5, 6.7_
  - [x]\* 3.2 Write unit test for Escape key layering
    - Render `Gallery` in fullscreen mode
    - Simulate Escape keydown event
    - Assert `isFullscreen` becomes false and event propagation was stopped
    - _Requirements: 6.3, 6.5, 6.7_
  - [x]\* 3.3 Write integration test for full dismissal chain
    - Render `AppDetailModal` with `ScreenshotGallery` open in fullscreen
    - Simulate three Escape key presses
    - Assert: first exits fullscreen, second closes gallery dialog, third closes app modal
    - _Requirements: 6.7_

- [x] 4. Checkpoint - Verify all gaps resolved
  - Run all tests to ensure fixes work correctly
  - Manually test screenshot ordering in browser dev tools
  - Verify thumbnail images load with size parameter
  - Test Escape key behavior through all three layers
  - Ask user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster delivery
- All implementation uses TypeScript (existing codebase language)
- Property tests use fast-check with minimum 100 iterations
- Focus is on gap fixes only - no new features or refactoring
- Each task references specific requirements for traceability
