# Fixture Reference Dictionary

| Domain | ID / reference | Source | Related IDs | Mutable in UI |
|---|---|---|---|---|
| Auction | `patek-nautilus`, `SGD-260717-002` | `auctionService.ts` | `RES-PATEK-5711R` | local customer interaction only |
| Result / candidates | `RES-PATEK-5711R` | `liveOperationsService.ts` | top ranks 1–3; `PAY-••••-5711R` | read-only projection |
| Governance failure | `FAIL-PATEK-001` | `exceptionGovernanceService.ts` | Patek result | decision presentation only |
| Royal Oak | `ORQ-ROYAL-OAK-001`, `royal-oak-15500st-draft`, `APR-ROYAL-OAK-001` | `operationsService.ts` | change/cancellation IDs | local prototype controls |
| Governance | `CHG-ROYAL-OAK-001`, `CAN-ROYAL-OAK-001` | exception governance service | Royal Oak session | no persisted commit |
| Handover | `HO-5711R-2026` | `handoverService.ts` | `SGD-WIN-•••-5711R` | scenario-driven only |
| Remediation | `REM-PATEK-REVERSAL-001` | exception governance service | payment/winner/handover refs | no |
| Finance | `FIN-PKG-PATEK-5711R-V1`, `...-V2` | `financePackageService.ts` | Patek result | prototype decision presentation |
| Audit | handover/result/finance objects | `auditProjectionService.ts` | related route | no |
