# Route Register

Source: `src/app/App.tsx` (static inspection, 2026-07-19). **Status: IMPLEMENTED** unless stated otherwise.

| Area | Canonical routes | Component / guard | Fixture evidence |
|---|---|---|---|
| Public | `/`, `/auctions`, `/auctions/upcoming`, `/auctions/:auctionId`, `/auctions/:auctionId/participants`, `/news`, `/help` | PublicLayout; public pages | `auctionService.ts` |
| Authentication | `/auth/login`, `/auth/register`, `/auth/recovery`, `/admin/login` | Auth pages | `demoStore.ts` |
| Customer account | `/account/dashboard`, `/account/profile`, `/account/kyc`, `/account/watchlist`, `/account/notifications`, `/account/bids`, `/account/review/:caseId` | CustomerGuard + AccountLayout | account / auction fixtures |
| Customer auction | `/auctions/:auctionId/register`, `/eligibility`, `/waiting-room`, `/live`; `/me/auctions/:auctionId/{result,candidate,winner,payment}` | CustomerGuard | Patek fixture chain |
| Customer handover | `/me/handover/:caseId` and `/schedule`, `/delivery`, `/evidence`, `/receipt`, `/completion` | CustomerGuard | `handoverService.ts` |
| Operations | `/ops`; `/ops/opening-requests/:requestId`; `/ops/auctions/:sessionId/{rules,schedule-publication}` | AdminGuard + AdminLayout | `operationsService.ts` |
| Live/result | `/ops/live/:sessionId`; `/ops/results/:resultId`; `/ops/results/:resultId/candidates` | AdminGuard | `liveOperationsService.ts` |
| Governance | `/governance/approvals/:approvalId`; failed-auctions, changes, cancellations, publication, remediation canonical paths | AdminGuard | operations + exception governance services |
| Supporting | `/ops/handover/:caseId`; `/ops/finance-packages/:packageId` | AdminGuard | handover operations / finance package services |
| Administration | `/admin`, `/admin/users`, `/admin/assets`, `/admin/auctions`, `/admin/live-ops/:auctionId`, `/admin/payments`, `/admin/audit`, `/admin/reports` | AdminGuard | audit / reports services |
| Demo | `/demo` | unguarded `DemoPage` | explicit valid fixture links |

Route ordering is React Router v6 ranked matching; the specific candidate and reauction paths outrank their parent parameter paths. Legacy `/auctions/:auctionId/result` and `/account/winner/*` redirect to `/me/*` without a loop.

Invalid-ID handling was statically verified: parameter pages call an ID-specific `get...` fixture service and return `NotFoundPage` when undefined. Browser interaction: **NOT VERIFIED**.
