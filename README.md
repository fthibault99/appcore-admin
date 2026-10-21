# AppcoreAdmin

## App Store Connect reconnection

On `/app-store/connections`, an authenticated administrator can generate a reconnection
code for an already authorized connection. Open ChatGPT plugin settings, reconnect the
AppStoreConnect account you use, and enter that code on the pairing page. The existing
identity is reused; no terminal, private identity file or AWS allowlist edit is needed.

This requires the backend's session/CSRF-protected
`POST /api/admin/app-store-connect/connections/{subject}/pairing-code` endpoint. Codes
expire in ten minutes, are single-use, and are replaced by newly generated codes. They
remain only in component memory, with copy feedback and explicit expiration/error states.
The page does not authorize new identities or approve Apple writes.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.20.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.


## MealAgain administration

The shared header links to `/mealagain` (admin session required). The account list is paginated and supports
an exact UUID filter; `/mealagain/:userId` shows identity metadata and the balances for every stored environment.
Production and sandbox rights are kept separate. UNCLASSIFIED balances remain visible with a warning and do not
represent usable app rights. Legacy account Lifetime flags are shown separately as audit-only values.

Purchase and consumption histories have independent server pagination and an environment filter (including
UNCLASSIFIED). Purchase revocation includes administrative invalidation; historical grant amounts are not balances.
No mutation controls or application API keys are included in these pages. Failed requests never appear as empty
results, and expired admin sessions return to login.

Backend prerequisites: the MealAgain migrations and the read-only session-authenticated endpoints
`GET /api/admin/mealagain/users`, `GET /api/admin/mealagain/users/{userId}`,
`GET /api/admin/mealagain/users/{userId}/purchase-history` and `/usage-history`.

## App Store ratings

`/app-store/ratings` is available from the shared header for authenticated administrators.
It loads saved observations through `GET /api/admin/app-store/ratings`, lets the administrator
select a tracked application, and displays the server's total and weighted average alongside
country flags, counts, averages and collection dates. Sorting supports count, mean and country.
The layout follows the current light/dark theme and adapts to narrow screens.

Coverage and observation dates remain visible because countries may have different collection
dates. The aggregate is an estimate from available observations, not an official Apple worldwide
statistic. Missing means are displayed as a dash, including countries with zero ratings.
“Reload saved ratings” reloads stored data; it does not trigger an Apple collection.
“Collect from App Store” requests a background collection for the selected application across
all supported countries through the existing session/CSRF-protected POST endpoint. Acceptance
is not completion; reload saved ratings to see available observations. A conflicting collection
or unavailable worker is reported without implying a new run started.
The application management form includes an independent “Ratings enabled” checkbox for
creation and editing; save the form to persist tracking changes. Each application card shows
the saved tracking status. Manual collection is available on the ratings page.
Backend prerequisite: AppCore's ratings module and its V92 migration.

## App Store Connect connections

`/app-store/connections` is available from the shared header for authenticated
administrators. It calls `GET /api/admin/app-store-connect/connections` with the
existing admin session and shows non-revoked connections for the configured OAuth
client, their application identity, creation time in UTC and allowlist status.
Use “Copy subject” to obtain the subject for `APPCORE_APP_STORE_CONNECT_ALLOWED_SUBJECTS`.
Apply that configuration to all backend instances before retrying ChatGPT.
The page does not modify the allowlist, and allowlist status does not prove token
validity or Apple access. Loading, empty and error states are separate; expired
admin sessions return to login. The backend endpoint must be deployed and the
App Store Connect integration enabled.

## Brick Collector shared albums

The header links to `/brick-collector/shared-albums`, guarded by the admin session.
The read-only page lists album names, internal IDs, set counts and creation/update dates
in UTC with server pagination (25 rows). It uses
`GET /api/admin/brick-collector/shared-albums?page=0&size=25`.
No capability tokens or application API keys are exposed. Loading, errors and empty
results have distinct states; HTTP 401/403 returns to login.

## OpenAI usage statistics

The `/openai/usage` page provides a local date/time range (last 30 days by default), summary,
and a table grouped by every historically recorded feature/model pair. Previous/next period arrows shift
both dates by the selected elapsed duration and immediately refresh statistics and history, preserving request filters. It displays execution and failure
counts, frozen estimated USD costs, average cost per priced execution, and total/average duration.
Missing costs are counted explicitly and partial totals are labeled. Inactive pairs appear with zero executions;
features with no recorded usage are absent. Feature/status filters affect only the paginated request history.
The backend must expose `GET /api/admin/openai/usage/statistics?from=...&to=...` alongside the existing
history and summary routes. All calls use the existing administrator session.
