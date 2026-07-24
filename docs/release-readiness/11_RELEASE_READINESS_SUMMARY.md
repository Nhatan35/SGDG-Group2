# Release Readiness Summary

## Prototype purpose

SGDG is a frontend-only auction operations prototype using deterministic fixtures for demo and review; it is not production-ready.

## Implemented areas

Public/customer auction flow, operations foundation, live/result/candidate operations, governance, handover, finance package, audit, and reports are routed in `App.tsx`.

## Key guardrails

Payment ambiguity does not trigger fallback; final-winner reversal enters remediation; publication and lifecycle are separate; handover receipt/completion remain distinct; audit/reports are non-authoritative.

## Validation status

Static inventory and invariant evidence are documented in this folder. Typecheck, lint, build, existing tests, and `git diff --check` pass; browser and viewport smoke remain not verified.

## Handoff status

**NOT READY — BLOCKERS REMAIN** under the strict release gate because remaining nondeterministic customer/legacy simulation code requires remediation or formal scope acceptance.

## How to run

`npm install` · `npm run dev` · `npm run typecheck` · `npm run lint` · `npm run build` · `npm run test`

## Key demo routes

`/demo`, `/ops`, `/ops/results/RES-PATEK-5711R`, `/governance/failed-auctions/FAIL-PATEK-001`, `/ops/handover/HO-5711R-2026`, `/admin/audit?objectType=handover&objectId=HO-5711R-2026`.
