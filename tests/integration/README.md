# Integration Tests

Test boundaries between components, data, APIs and services with controlled fixtures and explicit failure cases.

The API and database boundary is covered by the PHP suites in `backend/tests/` (`integration`, `competition`, `daily`, `concurrency`), run in CI against a disposable MariaDB and described in `backend/README.md`. The browser to API boundary is covered by the Playwright journeys in `tests/e2e`, which start the real PHP API against a fresh database.

Add a file here only for a boundary neither suite reaches, and say in this file what it covers.
