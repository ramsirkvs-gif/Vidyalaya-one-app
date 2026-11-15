# Primary Wing staff setup

The Principal supplied 28 staff, from Headmaster Mr. Rohtash to Art Instructor Mr. Panjib Sarkar. The roster preserves that order and uses documented spelling aliases. Pooran and Pooran Mal Meena remain separate; Primary Sushil is not linked to PGT Sushil Kumar. Existing Mission identities, permissions, profiles and PINs are retained. Inactive profiles and disabled PINs are not reactivated.

After deployment, open **Principal Chamber → Settings → Shared PINs**. This authenticated screen automatically adds unmatched Primary profiles and creates missing temporary three-digit PINs. Select **PIN list wing → Primary Wing**, then **Show PIN** beside each name to distribute privately. Reopening this screen is idempotent. No PINs are embedded in repository files or public staff/roll-call responses. Existing legacy PINs that cannot be decrypted remain unchanged and are identified as retained; they are not reset for display.

Generation reserves codes against all stored staff and office accounts, including disabled accounts. Encrypted display values are checked directly; unavailable legacy display values are checked against their hashes. A transaction across the shared root verifies that neither PIN registry changed before saving. Concurrent registry changes trigger fresh allocation; no available three-digit code produces an explicit error rather than reuse. Existing linked identities reuse their original PIN rather than receiving a new one.

Primary staff use their existing/shared personal PIN for Roll Call, Task Manager, movement and other concerned-staff submissions. Newly added profiles do not automatically become Mission 100 team members or receive student allocations. Existing Mission members keep their participation. No class-teacher or section assignments are invented.

Task Manager now offers **Select Primary classes I–V**. These are whole-class targets, with read-only figures unprovided until the Principal supplies them. Assign concerned teachers, prepare the shared task and publish as usual. Class/section-specific Primary allocations were not supplied; the setup does not invent them. Primary-only task reports consolidate the selected Primary classes, and custom grouping can combine Primary classes with other selected task classes.

This change is code/configuration setup. Actual staff creation and private PIN generation run against the live database when the authenticated Settings screen opens; local verification uses synthetic data.
