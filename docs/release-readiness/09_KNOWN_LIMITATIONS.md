# Known Limitations

- Frontend-only deterministic prototype; no backend, API, database, real authentication, KYC, payment, delivery, storage, notifications, or production audit/reporting.
- Demo store currently persists UI session state using Zustand storage; this is not production authentication.
- Some legacy/customer live simulation code still uses timers, current time, or generated IDs; it is recorded in the static audit and must not be interpreted as authoritative business state.
- Audit is immutable-looking projection only; reports are non-authoritative; finance package is a supporting mock handoff.
- Browser route smoke, runtime console, screen-reader, zoom, and responsive viewport checks were not executed in this validation pass.
- Existing Vite build completes with a chunk-size warning. Existing CRLF warnings may appear in Git output.
- Fixture data is small and non-production; query demo controls and local React interaction can reset on refresh.
