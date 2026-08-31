# AppcoreAdmin

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
