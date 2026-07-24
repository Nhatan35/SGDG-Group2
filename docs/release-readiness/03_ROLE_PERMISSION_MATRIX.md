# Role & Permission Matrix

| Role | Area | View / input | Commit | Direct URL evidence | Status |
|---|---|---|---|---|---|
| CUSTOMER | Public, `/account`, `/me/*` | Customer flow | local prototype interactions | `CustomerGuard` | PASS |
| CUSTOMER | `/ops/*`, `/governance/*`, `/admin/*` | no | no | `AdminGuard` redirects unauthenticated users | PASS |
| CONTENT_STAFF | Ops / governance | prepare, notes, proposals | governance Decision disables commit | `ExceptionGovernancePages.tsx` outlet role | PARTIAL—route guard is coarse |
| ADMIN / MANAGER | Admin workspace | review / governed action | allowed through role presentation | `AdminLayout.tsx`, governance Decision | PARTIAL—static only |
| FINANCE | Finance package | finance review UI only | accept/correct/reject package only | `FinancePackagePage.tsx` role condition | PARTIAL |

`AdminGuard` requires an authenticated internal actor with `REPORTS` access; it is not a per-route authorization matrix. This is a prototype-level limitation. Maker/checker evidence is in approval fixture/page; direct browser bypass testing is **NOT VERIFIED**.
