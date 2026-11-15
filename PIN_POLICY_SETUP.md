# Portal-wide employee PIN policy

Every staff/Office login and fresh-PIN submission first verifies the PIN against the selected staff/account ID. A PIN belonging only to another employee is rejected; no global PIN lookup is used to choose the actor. Confirmed linked profiles of the same person may share their original PIN.

Automatic generation, manual staff/Office changes, PIN imports and faculty creation enforce a shared staff/Office uniqueness check. Existing records, including disabled records, reserve their codes. Encrypted display values are trusted only after they agree with the authoritative PIN hash. Old, unavailable or stale display values fall back to hash verification. Trusted hash/value pairs are cached by their content and invalidate naturally on PIN changes. The final write verifies both PIN registries in one root transaction, rejecting/retrying concurrent changes. Batch imports that would assign one code to different people fail without changing records. Faculty validation and existing identity checks still apply.

**Principal Chamber → Settings → Shared PINs** and **Office PIN settings** display known conflicts only after Principal authentication. If a previously saved PIN is shared by different employees, its login/submission is blocked. Replace the conflicting PIN for the appropriate employee in Settings; the other employee can retain the original. Distributed PINs are not silently reset. Same-person linked identities do not produce a false conflict.

Some older encrypted display values may be unavailable. Settings reports these as not fully verified rather than claiming a clean live audit. Legacy-hash comparisons still protect every PIN assignment and every submitted name/PIN pair. The bounded Settings audit also checks legacy records against available display values; it does not recover or expose undisplayed PINs.

PIN audit names and identifiers are restricted to Principal Settings. Public catalogues and staff views do not receive PIN audit data, hashes or PIN values. Local verification uses synthetic accounts; actual conflicts must be reviewed in the authenticated live Settings screen after deployment.
