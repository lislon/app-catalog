# Requirements Document

## Introduction

This feature introduces end-to-end (e2e) tests covering the happy path workflow of the app-catalog application. The tests exercise the full stack — frontend (React/Vite) and backend (Express/tRPC) — using a real PostgreSQL database seeded at backend startup. Infrastructure is managed automatically via Testcontainers: a PostgreSQL container is spun up, and the backend and frontend dev servers are started programmatically as part of Playwright's global setup, then torn down after the suite completes. The only prerequisite is having Docker available. Tests run locally via a single command (`pnpm run test:e2e`) and are integrated into the existing CI/CD pipeline (GitHub Actions PR and CI workflows). The test suite lives in a new `e2e/` workspace package and uses Playwright as the browser automation framework.

## Glossary

- **E2E_Test_Suite**: The Playwright-based test package located at `e2e/app-catalog-e2e` within the monorepo.
- **Backend**: The Express + tRPC server at `examples/backend-example`, started programmatically during global setup and connected to the Testcontainers-managed database.
- **Frontend**: The Vite + React application at `examples/frontend-example`, started programmatically as a dev server during global setup.
- **Testcontainers**: The `testcontainers` npm package used to spin up a PostgreSQL container automatically as part of the Playwright global setup, with the container torn down in global teardown.
- **Global_Setup**: The Playwright `globalSetup` script responsible for starting the PostgreSQL container via Testcontainers, starting the Backend process connected to that container, and starting the Frontend dev server process.
- **Global_Teardown**: The Playwright `globalTeardown` script responsible for stopping the Backend process, the Frontend dev server process, and the PostgreSQL container.
- **Seeded_Data**: The catalog apps (`car-shop-sales`, `billing-app`, `pet-shop-app`), environments (`dev`, `staging`, `uat`, `prod`), and resource jumps bootstrapped automatically when the Backend starts.
- **Happy_Path**: The primary user workflow: load the app, authenticate, browse the catalog, select an app, and navigate to an app page.
- **CI_Pipeline**: The GitHub Actions workflows defined in `.github/workflows/pr.yml` and `.github/workflows/ci.yml`.
- **Test_User**: A pre-created email/password account used exclusively by the E2E_Test_Suite.
- **App_Catalog_Page**: The frontend route `/_layout/` and `/_layout/catalog/apps/` that displays the list of catalog apps.
- **App_Detail_Panel**: The right-side panel that opens when a user clicks an app row in the App_Catalog_Page.

---

## Requirements

### Requirement 1: E2E Package Setup

**User Story:** As a developer, I want a dedicated e2e package in the monorepo, so that e2e tests are isolated from unit tests and can be run independently.

#### Acceptance Criteria

1. THE E2E_Test_Suite SHALL be located at `e2e/app-catalog-e2e` and registered as a pnpm workspace package.
2. THE E2E_Test_Suite SHALL declare Playwright (`@playwright/test`) as its primary test dependency.
3. THE E2E_Test_Suite SHALL expose a `test:e2e` Nx target so that `nx run app-catalog-e2e:test:e2e` executes the full suite.
4. THE E2E_Test_Suite SHALL be excluded from the `build:all` and `test:unit` Nx targets to avoid interfering with package builds.
5. WHEN the developer runs `pnpm run test:pr` from the monorepo root, THE CI_Pipeline SHALL include the `test:e2e` target via the existing `nx affected` mechanism.

---

### Requirement 2: Test Environment Configuration

**User Story:** As a developer, I want the e2e tests to connect to services started automatically by the test suite, so that I can run them against a real stack without mocking or manual setup.

#### Acceptance Criteria

1. THE Global_Setup SHALL start a PostgreSQL container via Testcontainers and expose the connection details to the Backend process via environment variables.
2. THE Global_Setup SHALL start the Backend process connected to the Testcontainers-managed database and resolve the Backend base URL dynamically from the started process.
3. THE Global_Setup SHALL start the Frontend dev server and resolve the Frontend base URL dynamically from the started process.
4. THE E2E_Test_Suite SHALL pass the dynamically resolved Backend and Frontend base URLs to Playwright tests via the global setup output (e.g., written to a shared file or Playwright's `use.baseURL`).
5. THE E2E_Test_Suite SHALL read test credentials from `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` environment variables.
6. THE E2E_Test_Suite SHALL provide an `.env.example` file documenting all required and optional environment variables.
7. WHERE a CI environment is detected (`CI=true`), THE E2E_Test_Suite SHALL disable Playwright's browser download retry and set a deterministic timeout of 30 seconds per test.

---

### Requirement 3: Service Readiness

**User Story:** As a developer, I want the e2e tests to wait for all services to be ready before running, so that tests do not fail due to race conditions during startup.

#### Acceptance Criteria

1. THE Global_Setup SHALL wait for the PostgreSQL container to be ready to accept connections before starting the Backend process.
2. THE Global_Setup SHALL wait for the Backend to be reachable by polling `GET /api/health` until a 200 response is received or a 60-second timeout elapses.
3. THE Global_Setup SHALL wait for the Frontend dev server to be reachable by polling its base URL until a 200 response is received or a 60-second timeout elapses.
4. IF the Backend does not become reachable within 60 seconds, THEN THE Global_Setup SHALL abort the test run with a descriptive error message.
5. IF the Frontend does not become reachable within 60 seconds, THEN THE Global_Setup SHALL abort the test run with a descriptive error message.
6. THE Global_Teardown SHALL stop the Frontend dev server process, the Backend process, and the PostgreSQL container in that order after all tests complete.

---

### Requirement 4: Test User Provisioning

**User Story:** As a developer, I want a dedicated test user to exist before tests run, so that authentication tests are deterministic and do not depend on manual setup.

#### Acceptance Criteria

1. THE E2E_Test_Suite SHALL include a global setup script that creates the Test_User via the Better Auth email/password registration endpoint before any test runs.
2. IF the Test_User already exists, THEN THE E2E_Test_Suite SHALL skip creation and proceed without error.
3. THE E2E_Test_Suite SHALL use the `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` environment variables as the Test_User credentials.
4. IF the Test_User creation fails for a reason other than "already exists", THEN THE E2E_Test_Suite SHALL abort the test run with a descriptive error message.

---

### Requirement 5: Authentication Happy Path

**User Story:** As a user, I want to sign in with email and password, so that I can access the app catalog.

#### Acceptance Criteria

1. WHEN the user navigates to `/_layout/login`, THE Frontend SHALL display a sign-in dialog containing an email input, a password input, and a submit button.
2. WHEN the user submits valid credentials, THE Frontend SHALL redirect the user to the App_Catalog_Page within 5 seconds.
3. WHEN the user submits invalid credentials, THE Frontend SHALL display an error message without redirecting.
4. AFTER a successful sign-in, THE Frontend SHALL not display the login dialog.
5. THE E2E_Test_Suite SHALL store the authenticated browser session state to disk so that subsequent tests can reuse it without re-authenticating.

---

### Requirement 6: App Catalog Page Load

**User Story:** As an authenticated user, I want to see the list of catalog apps on the main page, so that I can find the app I need.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to `/_layout/catalog/apps/`, THE Frontend SHALL display the App_Catalog_Page within 3 seconds.
2. THE App_Catalog_Page SHALL display at least the three Seeded_Data apps: `Car Shop Sales`, `Billing App`, and `Pet Shop App`.
3. WHEN the App_Catalog_Page is loaded, THE Frontend SHALL display a table with at minimum an "Application" column header.
4. WHEN the App_Catalog_Page is loaded with no search query, THE Frontend SHALL display all non-deprecated Seeded_Data apps.

---

### Requirement 7: App Search

**User Story:** As an authenticated user, I want to search for apps by name, so that I can quickly find a specific app.

#### Acceptance Criteria

1. WHEN the user types a search query into the search input, THE App_Catalog_Page SHALL filter the displayed apps to those matching the query within 1 second.
2. WHEN the user searches for `billing`, THE App_Catalog_Page SHALL display `Billing App` and SHALL NOT display `Car Shop Sales` or `Pet Shop App`.
3. WHEN the user clears the search input, THE App_Catalog_Page SHALL restore the full list of non-deprecated apps.
4. WHEN the search query matches no apps, THE App_Catalog_Page SHALL display a "No apps found" message.

---

### Requirement 8: App Detail Panel

**User Story:** As an authenticated user, I want to click on an app to see its details, so that I can learn more about it and navigate to it.

#### Acceptance Criteria

1. WHEN the user clicks on an app row, THE App_Catalog_Page SHALL open the App_Detail_Panel for that app within 1 second.
2. WHEN the App_Detail_Panel is open, THE Frontend SHALL display the app's display name in the panel header.
3. WHEN the App_Detail_Panel is open for `Car Shop Sales`, THE Frontend SHALL display at least one page link (e.g., `Cars` or `Customers`).
4. WHEN the user presses the Escape key while the App_Detail_Panel is open, THE Frontend SHALL close the App_Detail_Panel.

---

### Requirement 9: CI/CD Integration

**User Story:** As a developer, I want e2e tests to run automatically in CI, so that regressions are caught before merging.

#### Acceptance Criteria

1. THE CI_Pipeline SHALL have Docker available so that Testcontainers can start the PostgreSQL container during the test run.
2. WHEN the E2E_Test_Suite completes, THE CI_Pipeline SHALL upload Playwright's HTML report as a build artifact regardless of test outcome.
3. WHEN any e2e test fails, THE CI_Pipeline SHALL mark the workflow job as failed.
4. THE CI_Pipeline SHALL install Playwright browsers using `playwright install --with-deps chromium` before running tests.

---

### Requirement 10: Local Developer Experience

**User Story:** As a developer, I want to run e2e tests locally with a single command, so that I can verify my changes before pushing.

#### Acceptance Criteria

1. THE E2E_Test_Suite SHALL provide a `README.md` documenting the prerequisites (Docker) and the exact command to execute the tests.
2. WHEN the developer runs `pnpm run test:e2e` from the `e2e/app-catalog-e2e` directory, THE E2E_Test_Suite SHALL automatically start all required infrastructure via Testcontainers and execute all tests without any manual pre-start steps.
3. THE E2E_Test_Suite SHALL support running in headed mode via the `PWDEBUG=1` environment variable for local debugging.
4. WHEN tests fail locally, THE E2E_Test_Suite SHALL generate a Playwright HTML report in `e2e/app-catalog-e2e/playwright-report/` for inspection.
