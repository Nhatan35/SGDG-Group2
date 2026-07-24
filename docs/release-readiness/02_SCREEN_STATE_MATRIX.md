# Screen / State Matrix

Static implementation inventory. Viewport interaction is **NOT VERIFIED** unless noted.

| Screen | Route / scenario | Critical state / CTA | Evidence | Status |
|---|---|---|---|---|
| Opening request | `/ops/opening-requests/ORQ-ROYAL-OAK-001` | review decision dialog | `OperationsPages.tsx` | PARTIAL (no URL scenario frames) |
| Session / rules / publication | Royal Oak workspace routes | draft, governed rule proposal, schedule/publication | `OperationsPages.tsx` | IMPLEMENTED |
| Approval | `/governance/approvals/APR-ROYAL-OAK-001` | maker/checker decision | `OperationsPages.tsx`, `businessRules.ts` | PARTIAL—static review only |
| Live operations | `/ops/live/patek-nautilus?scenario=healthy|paused|stale-projection|cancelled` | high-risk action blocked by stale state | `LiveOperationsPages.tsx` | IMPLEMENTED |
| Closing / candidates | result and candidate routes | top-3, ambiguous hold, exhaustion, reversal remediation | `liveOperationsService.ts` | IMPLEMENTED |
| GOV-004..009 | canonical governance routes with `scenario=` | reason dialog; authority / stale / readiness blockers | `ExceptionGovernancePages.tsx` | PARTIAL (dialog focus trap not verified) |
| Handover operations | `/ops/handover/HO-5711R-2026?scenario=...` | schedule, failed delivery, evidence, receipt, completion, remediation | `HandoverOperationsPage.tsx` | IMPLEMENTED |
| Finance | V1/V2 with `scenario=` and `view=` | submitted, correction, accepted, superseded, loading/error | `FinancePackagePage.tsx` | IMPLEMENTED |
| Audit | `/admin/audit?...` | loading, filtered-empty, invalid context | `AuditTimelinePage.tsx` | IMPLEMENTED |
| Reports | `/admin/reports?scenario=...` | default, no-data, loading, error, stale | `ReportsProjectionPage.tsx` | IMPLEMENTED |
| Customer | Patek result/payment/winner/handover routes | candidate/payment/handover scenario fixtures | customer page + mock services | PARTIAL—manual browser regression not run |
