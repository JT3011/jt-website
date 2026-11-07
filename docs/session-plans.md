# Apex session plans

`/performance-hub-plans.html` is the private plan library. Player records, session history and calendar bookings link into it. A session URL opens its existing plan or an editor for its authorised coach. Families see a friendly pending state until a plan is published.

## Access

- Verified `hub_staff.owner` has full read/edit access, including unmatched imports.
- A coach or administrator needs the session's delivering-coach identity. Linked players additionally require an active coach/player assignment; an unlinked booking needs no player account. Being assigned to the same player does not reveal another coach's session plans.
- A player or actively linked parent reads only published plans for that player. Clients cannot edit or import.
- Archived imported plans resolve their coach through `hub_coach_calendars`; unconnected coach logins get no access. Single-player sheets with a confirmed coach can be prepared without a Hub account. Shared or conflicting sheets remain JT-only drafts.
- PostgreSQL RLS protects direct reads. Browser roles have no direct table writes. Guarded RPCs enforce writes, optimistic revision checks, and owner-only identity linking.
- Booking ownership is checked live. Revoking an assignment removes access immediately. Changing a booking to another player never exposes the former player's plan.

## Existing Apex plans

The initial import uses the existing Airtable Session Log `APEX Coach Plan`, player links, booking URI and source date. It matches verified `hub_player_airtable_links` and exact existing booking identities. Names alone do not link accounts. Shared or conflicting records require JT review. Existing dates and proposed/delivered distinctions are preserved. No session completion, credit usage, payments or bookings are changed.

The owner can import additional saved Apex records using **Import Apex plans** after connecting the existing Airtable read token. The import is idempotent by source record ID and never overwrites a plan already edited in the Hub. Updated source versions require deliberate review in the editor. This is an explicit import; separate ChatGPT agent conversations do not send plans automatically.

Existing plans open as a single A4 coaching sheet with a graphic for every timed block. Coaches can use **Larger drill view** on a phone, tap **+** for complete drill instructions, or **Print / save one-page PDF**. Coaches can paste a new plan or import a `.txt`/`.md` sheet into the session editor. Drafts stay staff-only; publish shares that player's plan with their family. Uploaded text is parsed into timed blocks; exact known drills use setup diagrams, while bespoke drills use instruction-sequence graphics instead of guessing a pitch layout. Original notes remain available under the source disclosure. Text import does not extract graphics from a PDF.

## Verification

Run `node --test tests/session-plans.test.mjs` for source matching/API checks and `tests/session-plans-rls.sql` against Supabase for transactional allow/deny tests. The SQL fixtures roll back and cover shared-player coaches, family drafts, forged roles, revoked assignments, reassigned players, and anonymous access.

The Supabase security advisor reports the authenticated security-definer RPCs (`hub_save_session_plan`, `hub_link_session_plan`, and `hub_create_booking_plan`). These are intentional guarded entry points: anonymous execution is revoked, search paths are pinned, real user/assignment checks run inside each function, and browser roles cannot write the table directly. The allow/deny tests exercise those checks.

## Plans before signup

Every active Calendly booking can own a draft using `booking_id`, independently of `player_user_id`. Calendar links open that booking’s plan. The new-plan picker can prepare an Apex coaching draft from reviewed Airtable context, or the coach can edit the plan. Drafts are never marked delivered and do not consume credits. Today and upcoming plans appear first.

`hub_apex_context` retains reviewed identity aliases and a fallback coaching snapshot. It is service-only, with no browser grants. For each new booking plan, the server resolves the recorded Airtable player connection, then reads that player's current position and progress notes plus their latest linked session logs. A linked Hub profile supplies position/goals when Airtable has no position. An unavailable live lookup is clearly disclosed and retains the date of the saved context; a missing position is flagged instead of guessed. Name matching changes coaching content only, never family permissions, credits or account links. This is a read at plan creation, not continuous background sync or access to separate Apex conversations. Future drafts remain provisional until the coach checks readiness.

Structured drafts have timed blocks, practical setup and work/rest instructions, adaptations and football setup diagrams. Editing the plain text clears the structured sheet so the display never shows superseded content. Sharing still requires a verified player connection and explicit publication. `hub_create_booking_plan` is idempotent, checks current booking ownership in the database, and creates drafts only. Private plans for unlinked players remain visible to JT and their own coach.

## Visual coaching standard — 7 November 2026

New football drafts use JT's sequence: six ladder patterns (one in each, two in each, sideways, two feet each box, icky shuffle, two forward / one back), parachute sprints, low hurdles/agility with small plyometrics, then individual technical/position work. Timings scale to the booking; recovery and the final review remain inside it. Young-player adaptations omit resistance and forced jumping. Gym and combined sessions retain their exercise-specific structure.

The shared `apex-plan-model.mjs` upgrades the previous unedited automatic football template at display time and at generation. Bespoke/edited plans retain their exact timings and adaptations; the standard remains visible as guidance. Saved source text, history, permissions and delivery status are unchanged. Archived text below an explicit superseded-plan marker stays out of the working drill cards. All 139 existing records were checked for block extraction and graphics. Print-layout QA covered those records plus a new generated plan, with no overflowing pages or drill cards; browser PDF output itself was not available in the test environment.

Six or fewer drills use two columns; longer plans use compact illustrated rows. Print CSS always selects the one-page overview, even after opening the larger mobile view or drill details. Rendering escapes all coach/player content and never accepts arbitrary SVG from stored text.

Run `node --test tests/apex-visual-plans.test.mjs` for JT ordering, timing, young-player adaptations, text parsing, superseded content, source preservation and HTML escaping.

Run `node --test tests/*.test.mjs`. The transactional RLS tests also cover accountless plan creation, duplicate requests, cross-coach denial, private context denial, family denial, and calendar revocation.

The context table intentionally has RLS with no browser policies or grants: only the server service role may read it. Its no-policy advisor notice reflects this deliberate closed access.

## Position and session continuity — 7 November 2026

New football plans (including the football part of a combined session) use position-specific drill
banks for CB, full-back, midfield, winger, striker and goalkeeper roles. Multiple recorded positions
can contribute tasks. Unrecorded positions use general foundations with an explicit coach check;
very young players retain play-based adaptations.

The selector checks up to six earlier accessible plans and prefers drills not recently used, then
uses current goals/notes to choose relevant, complementary tasks. Actual setups and actions vary,
with further feed/decision variations per booking. Repeated generation for the same booking and
history is stable. JT's physical opening stays consistent; session novelty is not a reason to
increase workload or abandon a development objective.

Only completed, coach-confirmed session feedback is treated as delivered evidence. Planned work
may inform variety but never proves progress. Cancelled Airtable logs and future sessions are
excluded. Prior Hub plans and completed logs are read with the caller's RLS token; live Airtable
reads are limited to the resolved player's record and its linked log IDs. No new access grants,
account links, credit changes, or delivery statuses are made. Existing coach-edited plans are not
automatically overwritten. Bespoke positional tasks use exact action-sequence graphics, preserving
the one-page layout and full instructions behind each drill's + button.

Run `node --test tests/apex-player-context.test.mjs tests/apex-booking-plans.test.mjs tests/apex-visual-plans.test.mjs tests/session-plans.test.mjs tests/shared-bookings.test.mjs`.
