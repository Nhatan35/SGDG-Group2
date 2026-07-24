# Manual Regression Checklist

| Check | Result | Evidence / note |
|---|---|---|
| Canonical fixture routes render | NOT VERIFIED | code-level route mapping completed; browser smoke unavailable in this run |
| Invalid IDs show Not Found | PASS (static) | fixture getters return undefined; pages return `NotFoundPage` |
| Customer cannot reach internal routes | PASS (static) | `AdminGuard` |
| Internal actor cannot bypass customer guard | PASS (static) | `CustomerGuard` |
| Patek result/candidate guardrails | PASS (static) | `liveOperationsService.ts` |
| Handover receipt/completion gates | PASS (static) | `handoverService.ts`, handover pages |
| Audit filter/empty/loading | PASS (static) | `AuditTimelinePage.tsx` |
| Reports no-data/loading/error/stale | PASS (static) | `ReportsProjectionPage.tsx` |
| Keyboard dialog / responsive visual behavior | NOT VERIFIED | requires browser/manual viewport pass |
