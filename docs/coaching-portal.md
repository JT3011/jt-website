# Coaching portal

Login: `/performance-hub-login.html`. Signed-in members land on `/performance-hub-portal.html`.
Existing Free/Premium training content remains available via **Training Hub**. Session feedback,
credits and assigned programmes do not require a paid Hub subscription.

- JT's existing owner account manages coach approvals, parent/coach assignments and Airtable mappings in **Manage access**.
- Approved coaches see assigned player records, edit gym/nutrition plans and open the existing session dashboard.
- Clients and linked parents read published programmes, session history and credits. Drafts stay with the coaching team.
- Parents already using their child's profile keep that account. Link a separate parent account only when needed.
- New coaches use **Activate** at `/performance-hub-coach-access.html` after JT approves their email. Verification is required before access is granted. Approval itself sends no email.
- Programme content is coach-authored plain text. Dates and a review goal are optional. Publishing shares the plan with the player and linked parents; saving as a draft removes it from their view.

## Airtable connection

Base: Client Profile (`appfxqoZZWAqFgaIu`). Players: `tblLqAsqaegQarJwG`. Payments: `tblbALLdCCcML7lHG`.
Use a dedicated Airtable PAT with only `data.records:read`, restricted to this base.
Store it as **AIRTABLE_READ_TOKEN**, with type Secret, in the Vercel project's Production environment,
then redeploy. Do not put it in source code, browser storage or client JavaScript.

No Airtable writes are performed. Credits use the existing **Sessions Remaining** formula, linked
through Players → Payments and the reciprocal Client / Player link. Missing/invalid formula values
are not interpreted as zero. Separate service types are displayed separately; negative balances remain visible.

Balances refresh when the record opens if the saved snapshot is older than five minutes. JT can
also use **Sync all Airtable balances**. Without the token or during an outage, the page labels
the saved snapshot and its sync time. It does not claim the balance is current.

The initial connector import included 73 Airtable players and 10 mappings from the existing verified
Performance Hub User ID field. No name-only matches were made. Many Airtable player rows still
need Payments linked in Airtable before their balance can be shown. Match other Hub accounts in
Manage access after checking identity; a mapping is unique to one player profile.

## Security and verification

`api/hub-portal.mjs` validates each bearer token with Supabase Auth and requires a confirmed email.
Staff roles and coach/parent assignments are fetched from server-controlled database tables on every
request. User metadata is never used for permissions. Owner actions are separately checked.
Programme reads/writes also use the caller's JWT and database RLS. Credits have no authenticated
write grants. API responses use `private, no-store`; the existing service worker does not cache them.

Schema: `supabase/jt-player-portal.sql`, applied as `jt_coaching_portal_credits_programmes`.
Tests: `node --test tests/hub-portal.test.mjs` and the transactional `tests/hub-portal-rls.sql`.
The SQL tests roll back their temporary accounts and records. Browser QA uses isolated, synthetic fixtures
excluded from the repository; no example plans are assigned to real players.
