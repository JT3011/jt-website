# Apex session plans

`/performance-hub-plans.html` is the private plan library. Player records, session history and calendar bookings link into it. A session URL opens its existing plan or an editor for its authorised coach. Families see a friendly pending state until a plan is published.

## Access

- Verified `hub_staff.owner` has full read/edit access, including unmatched imports.
- A coach or administrator needs both the session's delivering-coach identity and an active coach/player assignment. Being assigned to the same player does not reveal another coach's session plans.
- A player or actively linked parent reads only published plans for that player. Clients cannot edit or import.
- Archived imported plans resolve their coach through `hub_coach_calendars`; unconnected coach logins get no access. Unmatched player sheets remain JT-only drafts.
- PostgreSQL RLS protects direct reads. Browser roles have no direct table writes. Guarded RPCs enforce writes, optimistic revision checks, and owner-only identity linking.
- Booking ownership is checked live. Revoking an assignment removes access immediately. Changing a booking to another player never exposes the former player's plan.

## Existing Apex plans

The initial import uses the existing Airtable Session Log `APEX Coach Plan`, player links, booking URI and source date. It matches verified `hub_player_airtable_links` and exact existing booking identities. Names alone do not link accounts. Shared or conflicting records require JT review. Existing dates and proposed/delivered distinctions are preserved. No session completion, credit usage, payments or bookings are changed.

The owner can import additional saved Apex records using **Import Apex plans** after connecting the existing Airtable read token. The import is idempotent by source record ID and never overwrites a plan already edited in the Hub. Updated source versions require deliberate review in the editor. This is an explicit import; separate ChatGPT agent conversations do not send plans automatically.

Existing plans open in a phone-readable view with a separate edit action. Coaches can paste a new plan or import a `.txt`/`.md` sheet into the session editor. Drafts stay staff-only; publish shares that player's plan with their family. PDF graphics are not uploaded by this text import.

## Verification

Run `node --test tests/session-plans.test.mjs` for source matching/API checks and `tests/session-plans-rls.sql` against Supabase for transactional allow/deny tests. The SQL fixtures roll back and cover shared-player coaches, family drafts, forged roles, revoked assignments, reassigned players, and anonymous access.

The Supabase security advisor reports the two authenticated security-definer RPCs (`hub_save_session_plan` and `hub_link_session_plan`). These are intentional guarded entry points: anonymous execution is revoked, search paths are pinned, real user/assignment checks run inside each function, and browser roles cannot write the table directly. The allow/deny tests exercise those checks.
