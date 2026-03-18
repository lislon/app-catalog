# Requirements Document

## Introduction

The Screenshot Gallery feature allows users to view screenshots of applications directly within the App Catalog. When an app card is opened, the user sees a vertical list of screenshot thumbnails. Clicking any thumbnail opens a full-screen carousel (Gallery) where the user can scroll through all screenshots using mouse wheel, navigation buttons, or keyboard shortcuts. The gallery supports smooth animated transitions, a peek effect to hint at additional images, and a fullscreen image view. The feature is already implemented and this document serves as a baseline for future improvements.

## Glossary

- **App_Card**: The detail modal (`AppDetailModal`) that opens when a user selects an application from the catalog.
- **Screenshot_Preview**: The section within the App_Card that renders a vertical list of screenshot thumbnails (`ScreenshotPreview` component).
- **Gallery**: The carousel-based dialog (`Gallery` component using Embla Carousel) that displays screenshots in wide mode with navigation controls.
- **Gallery_Dialog**: The Radix UI `Dialog` wrapper (`ScreenshotGallery` component) that hosts the Gallery in a modal overlay.
- **Thumbnail**: A reduced-size preview image rendered in the Screenshot_Preview section, loaded directly from the screenshot REST endpoint.
- **Fullscreen_View**: A fixed full-viewport overlay within the Gallery that displays a single screenshot at its natural resolution with scroll support.
- **Screenshot_Asset**: A binary image asset stored in the database (`dbAsset` with `assetType = 'screenshot'`) and served via the REST endpoint `GET /api/screenshots/:id`.
- **App_Slug**: The unique URL-safe identifier for an application used to look up its associated screenshot IDs.
- **Peek_Effect**: The visual technique of rendering non-active slides at 85% width so the edge of the next/previous image is visible, indicating more images exist.
- **Carousel**: The horizontally scrollable slide container powered by Embla Carousel inside the Gallery.

---

## Requirements

### Requirement 1: Screenshot Thumbnail Display

**User Story:** As a user, I want to see screenshot thumbnails when I open an app card, so that I can quickly preview available screenshots before opening the full gallery.

#### Acceptance Criteria

1. WHEN an app card is opened and the app has one or more screenshots, THE Screenshot_Preview SHALL render a vertically stacked list of thumbnail images.
2. WHEN an app card is opened and the app has no screenshots, THE Screenshot_Preview SHALL display a placeholder message indicating no screenshots are available.
3. THE Screenshot_Preview SHALL load each thumbnail by requesting the image binary from `GET /api/screenshots/:id`.
4. WHEN a thumbnail image fails to load, THE Screenshot_Preview SHALL hide that thumbnail without disrupting the display of other thumbnails.
5. THE Screenshot_Preview SHALL render each thumbnail with a hover highlight effect to indicate it is interactive.

---

### Requirement 2: Opening the Gallery from Thumbnails

**User Story:** As a user, I want to open a full-width gallery by clicking a thumbnail, so that I can view screenshots in detail.

#### Acceptance Criteria

1. WHEN a user clicks a thumbnail in the Screenshot_Preview, THE Gallery_Dialog SHALL open displaying the Gallery starting at the index of the clicked thumbnail.
2. WHEN a user presses `Enter` or `Space` while a thumbnail is focused, THE Gallery_Dialog SHALL open at the corresponding screenshot index.
3. THE Gallery_Dialog SHALL render as a modal overlay occupying up to 85% of the viewport height and nearly the full viewport width.
4. WHEN the Gallery_Dialog is open, THE Gallery SHALL display the screenshot corresponding to `initialIndex` as the active slide.

---

### Requirement 3: Carousel Navigation

**User Story:** As a user, I want to scroll through screenshots in the gallery using buttons or mouse wheel, so that I can browse all images without leaving the gallery.

#### Acceptance Criteria

1. THE Gallery SHALL display previous and next navigation buttons below the carousel.
2. WHEN a user clicks the next button, THE Carousel SHALL animate to the next screenshot.
3. WHEN a user clicks the previous button, THE Carousel SHALL animate to the previous screenshot.
4. WHEN the user is on the last screenshot, THE Gallery SHALL disable the next navigation button. THE Carousel SHALL NOT wrap to the first screenshot.
5. WHEN the user is on the first screenshot, THE Gallery SHALL disable the previous navigation button. THE Carousel SHALL NOT wrap to the last screenshot.
6. WHEN the app has only one screenshot, THE Gallery SHALL disable both the previous and next navigation buttons.
7. THE Gallery SHALL display a counter showing the current index and total number of screenshots (e.g., "2 / 5").
8. WHEN the active slide changes, THE Gallery SHALL update the counter to reflect the new index.

---

### Requirement 4: Mouse Wheel Scrolling

**User Story:** As a user, I want to scroll through screenshots using my mouse wheel, so that I can navigate the gallery without using buttons.

#### Acceptance Criteria

1. WHEN a user scrolls the mouse wheel downward or rightward over the Gallery, THE Carousel SHALL advance to the next screenshot.
2. WHEN a user scrolls the mouse wheel upward or leftward over the Gallery, THE Carousel SHALL go back to the previous screenshot.
3. WHEN a wheel scroll event occurs over the Gallery, THE Gallery SHALL prevent the page from scrolling.
4. THE Gallery SHALL apply a 300ms debounce between wheel-triggered slide transitions to prevent unintended rapid scrolling.
5. WHEN the app has only one screenshot, THE Gallery SHALL not respond to mouse wheel events.

---

### Requirement 5: Peek Effect

**User Story:** As a user, I want to see a portion of the adjacent screenshot, so that I understand more screenshots are available.

#### Acceptance Criteria

1. WHEN the app has more than one screenshot, THE Gallery SHALL render each slide at 85% of the carousel width so the edge of the adjacent slide is visible.
2. WHEN the app has exactly one screenshot, THE Gallery SHALL render the single slide at 100% of the carousel width.
3. THE Gallery SHALL render non-active slides at reduced opacity (40%) to visually distinguish the active screenshot.

---

### Requirement 6: Keyboard Navigation

**User Story:** As a user, I want to navigate the gallery using keyboard shortcuts, so that I can browse screenshots without using a mouse.

#### Acceptance Criteria

1. WHEN the Gallery_Dialog is open and the user presses the `ArrowLeft` key, THE Carousel SHALL navigate to the previous screenshot.
2. WHEN the Gallery_Dialog is open and the user presses the `ArrowRight` key, THE Carousel SHALL navigate to the next screenshot.
3. WHEN the Gallery_Dialog is open (carousel view) and the user presses the `Escape` key, THE Gallery_Dialog SHALL close and return focus to the App_Card. THE App_Card SHALL remain open.
4. WHEN the App_Card is open and the user presses `Enter` while a thumbnail is focused, THE Gallery_Dialog SHALL open at the focused thumbnail's index.
5. WHEN the Gallery is in Fullscreen_View and the user presses `Escape`, THE Gallery SHALL exit Fullscreen_View and return to the Carousel view within the Gallery_Dialog. THE Gallery_Dialog SHALL remain open.
6. WHEN the app has only one screenshot, THE Gallery SHALL not respond to `ArrowLeft` or `ArrowRight` key presses.
7. THE `Escape` key SHALL follow a strict layered dismissal order: Fullscreen_View first, then Gallery_Dialog, then App_Card. Each `Escape` press SHALL dismiss only the innermost active layer.
8. WHEN the user is on the last screenshot and presses `ArrowRight`, THE Gallery SHALL NOT wrap to the first screenshot.
9. WHEN the user is on the first screenshot and presses `ArrowLeft`, THE Gallery SHALL NOT wrap to the last screenshot.

---

### Requirement 7: Fullscreen Image View

**User Story:** As a user, I want to open a screenshot in fullscreen mode, so that I can examine it at full resolution.

#### Acceptance Criteria

1. WHEN a user clicks the active screenshot image in the Carousel, THE Gallery SHALL enter Fullscreen_View displaying the current screenshot.
2. THE Fullscreen_View SHALL render as a fixed full-viewport overlay above all other content.
3. WHEN the screenshot image is larger than the viewport, THE Fullscreen_View SHALL allow the user to scroll to see the full image.
4. WHEN the screenshot image is loading in Fullscreen_View, THE Fullscreen_View SHALL display a loading spinner until the image is ready.
5. WHEN the screenshot image fails to load in Fullscreen_View, THE Fullscreen_View SHALL display an error state with an icon and message.
6. THE Fullscreen_View SHALL display a close button that exits Fullscreen_View and returns to the Carousel view.
7. WHEN the user presses `Escape` while in Fullscreen_View, THE Gallery SHALL exit Fullscreen_View and return to the Carousel view.

---

### Requirement 8: Image Loading States

**User Story:** As a user, I want visual feedback while screenshots are loading, so that I know the gallery is working and not broken.

#### Acceptance Criteria

1. WHEN a screenshot image is being fetched in the Carousel, THE Gallery SHALL display a loading spinner in place of the image.
2. WHEN a screenshot image has finished loading in the Carousel, THE Gallery SHALL display the image and hide the spinner.
3. WHEN a screenshot image fails to load in the Carousel, THE Gallery SHALL display an error icon and a short error message in place of the image.
4. WHEN the images array changes, THE Gallery SHALL reset all image loading states to the initial loading state.

---

### Requirement 9: Screenshot Asset Serving (Backend)

**User Story:** As a developer integrating the catalog, I want a REST endpoint to serve screenshot binaries, so that the frontend can display images efficiently.

#### Acceptance Criteria

1. WHEN a request is made to `GET /api/screenshots/:id`, THE Screenshot_Asset_Endpoint SHALL return the binary image content with the correct `Content-Type` header.
2. WHEN a `size` query parameter is provided to `GET /api/screenshots/:id`, THE Screenshot_Asset_Endpoint SHALL resize the image to fit within a square of the given pixel dimension before returning it.
3. WHEN the requested screenshot ID does not exist, THE Screenshot_Asset_Endpoint SHALL return a 404 response.
4. THE Screenshot_Asset_Endpoint SHALL set a `Cache-Control: public, max-age=86400` header on successful responses to enable client-side caching for 24 hours.
5. WHEN a request is made to `GET /api/screenshots/app/:appSlug`, THE Screenshot_Asset_Endpoint SHALL return a JSON array of screenshot metadata objects (id, name, mimeType, fileSize, width, height, createdAt) for all screenshots belonging to the app.
6. WHEN the app slug does not exist, THE Screenshot_Asset_Endpoint SHALL return a 404 response.

---

### Requirement 10: Screenshot Ordering

**User Story:** As a developer seeding the catalog, I want screenshots to be displayed in a defined order, so that the most relevant screenshots appear first.

#### Acceptance Criteria

1. THE Screenshot_Preview SHALL render thumbnails in the order defined by the `screenshotIds` array on the app entity.
2. THE Gallery SHALL display slides in the same order as the `screenshotIds` array on the app entity.
