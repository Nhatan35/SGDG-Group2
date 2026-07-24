# Business Invariants

| Invariant | Evidence | Status |
|---|---|---|
| Approval ≠ scheduled ≠ published | separate lifecycle/publication fixture fields | PASS |
| Official bid events are read-only | `getOfficialBidEvents` projection | PASS |
| Result top-three is unique and max rank 3 | fixed `top3` ranks 1–3 | PASS |
| One active candidate attempt | candidate scenario status mapping | PASS (fixture-level) |
| Payment ambiguous does not fallback | `ambiguous-hold` / GOV-004 copy | PASS |
| Reversal after winner goes remediation, not rank 2 | `reversal-remediation`, remediation fixture | PASS |
| Reauction creates separate lifecycle | `proposedSessionId` distinct from prior session | PASS |
| Cancellation keeps histories | cancellation copy states retained | PASS (presentation evidence) |
| Receipt / completion are distinct | handover scenario/status fields | PASS |
| Finance acceptance is not payment/winner confirmation | finance disclosure | PASS |
| Audit/reports are non-authoritative | page disclosures and services | PASS |
