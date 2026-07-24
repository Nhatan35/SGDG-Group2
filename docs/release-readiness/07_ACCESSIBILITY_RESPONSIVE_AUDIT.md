# Accessibility & Responsive Audit

Static evidence: pages use main landmarks and H1s; audit and registration dialogs use `role="dialog"` and `aria-modal`; audit drawer restores focus; reports include accessible data tables. Tables are wrapped by the shared table containers in operations/customer views.

| Scope | Status | Notes |
|---|---|---|
| Semantics / labels | PARTIAL | static inspection only; governance dialog has no demonstrated focus trap |
| Keyboard escape / focus return | PARTIAL | audit drawer implemented; other overlays need browser verification |
| D1440 | NOT VERIFIED | no browser viewport pass performed |
| T1024 internal monitoring | NOT VERIFIED | no browser viewport pass performed |
| M390 public/customer | NOT VERIFIED | no browser viewport pass performed |
| Horizontal overflow / zoom 200% | NOT VERIFIED | visual inspection required |
