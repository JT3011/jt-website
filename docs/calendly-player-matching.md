# Calendly → player records

The existing booking queue now matches normalised booking emails to confirmed Hub accounts, approved booking aliases, or a verified parent with exactly one linked child. A shared household email, conflicting identities, unverified login or unknown delivering coach stays in **Needs linking**. Matching never creates a parent relationship or a login.

Coaches see their own delivered sessions. JT sees all coaches and can resolve the queue, choosing a player and delivering coach. “Remember email” is optional and rejected for a known multi-child household. Coach rules use the actual event name because Calendly event types can be renamed: a Billy event hosted by JT must not silently become a JT delivery.

Parents open **My Coaching**, choose their player and see a private calendar alongside programmes. Parents cannot edit links, sessions or programmes, and cannot see session credit balances. The calendar uses UK time, including daylight saving changes.

## One-time connection

1. JT opens the Coach Command Centre → **Calendar connection & automatic updates**.
2. Connect a Calendly personal access token for the same verified email as the Hub login. Scopes: `scheduled_events:read`, `users:read`, `organizations:read`, `webhooks:read`, `webhooks:write`. Calendly account/plan permissions must allow webhooks.
3. The server verifies the account and organisation role, encrypts the token and registers `invitee.created` and `invitee.canceled` at the fixed production webhook URL. The UI reports whether automatic updates connected. Without webhook permissions, page-open/manual refresh still works and the setup message explains what is missing.
4. JT can separately connect an Airtable PAT with `data.records:read` for the existing coaching base under **Connect Airtable credit balances**. Existing `AIRTABLE_READ_TOKEN` remains supported.

ChatGPT app connections do not supply runtime credentials to the published website. No provider tokens were installed by the code release. Imported bookings are labelled with their last checked date until the runtime connection is made.

## Credits and delivery

Calendly booking creation never deducts a credit or marks a session completed. Airtable remains the credit source. Only JT’s owner account can see session credits or payment links. JT opens **Player & credits → Update credits in Airtable**, adjust the linked payment's **Completed +1** after confirming delivery, then use **Refresh record** to read the latest balance. Payment formulas and service-specific balances remain intact. There is no automated financial write or retrospective deduction.

## Reliability and privacy

- Event + invitee identity is the unique booking key. Repeated syncs update the same session; cancellations and reschedules propagate without duplicating it.
- Incoming provider versions older than the saved version are ignored. Signed webhook notifications re-read the current event and invitee to avoid delayed notifications resurrecting a cancellation.
- Completed/no-show status and coach feedback survive subsequent provider updates. Cancellation after completion requires JT's review; it never erases delivery evidence or changes credits.
- Tokens remain AES-GCM encrypted, bound to provider and owner account. The webhook verifies HMAC SHA-256 against the raw body and rejects timestamps outside a 3-minute tolerance. Its key is derived from the server secret and connection owner; rotating the server secret requires reconnecting providers.
- Only the service role can ingest/reconcile bookings. The manual-link RPC checks actual manager access; metadata cannot grant it. Parents' schedule endpoint checks the requested player relationship before reading any session data and omits booking emails.
- Existing external queue importers also benefit from the matching trigger. No additional background job or messages are sent.
- Berkeley venues display **Berkeley, GL13 9TN** rather than the private street address.

Schema: `supabase/jt-booking-matching.sql`. Tests: `tests/hub-booking-matching.sql` (transactional, rolled back), `tests/calendly-sync.test.mjs`, existing portal and integration tests. UI checks use synthetic records, never live family accounts.

## Individual coach calendars (30 October 2026)

`hub_coach_calendars` gives JT, George, Charlie and Billy separate calendar identities and verified booking links, even before a coach finishes Hub signup. The CEO can select All coaches, each named calendar or My sessions. Coaches can select only their authorised calendar; the server rejects changed query parameters. Other approved coaches retain their own existing schedule. Upcoming lists paginate from the selected day without a four-week cutoff.

Billy’s verified booking link is hosted by JT. Named event rules assign those bookings to Billy’s calendar, and his login never takes ownership of JT’s Calendly host. The CEO’s personal football booking link is distinct. Charlie’s Calendly email is approved for signup. Billy’s email is unset until the CEO supplies it in **Coach booking links & login access**. No emails are sent by this setup.

The CEO-only `hub_set_coach_calendar_email` RPC normalises the supplied email, refuses a calendar already assigned to a different login, and activates a coach only after email verification. An auth trigger binds the verified approved account and reconciles its pending bookings. The roster is server-only with RLS enabled; account metadata cannot grant access.

Family calendars also include their own email-matched bookings while the delivering coach is awaiting signup. They return no booking email or unrelated player data. A public booking link alone cannot read private appointments: automatic sync still requires the secure Calendly connection described above.

Schema changes: `supabase/jt-coach-calendars.sql`, applied as `individual_coach_booking_calendars` plus `preserve_coach_calendar_session_insert_status` (the file contains the final corrected definition). Additional checks: `tests/coach-calendars.test.mjs` and transactional `tests/coach-calendars.sql`.

## Booking names and players (1 November 2026)

After resolving the delivering coach, each incoming or reconciled booking checks verified email/phone links, exact normalized player names, and recorded Airtable parent/child aliases in `hub_apex_context`. Unique matches can assign an existing verified Hub player to that coach. A match to an Airtable player without a Hub login is stored on the booking and displayed by player name on the coach calendar; account creation is not required to see or plan that booking. This uses the reviewed name directory, not fuzzy guesses or continuously refreshed Airtable data.

Conflicting names/contact details and duplicate names require JT review. A shared family email can be disambiguated only to a child already linked to that parent. Names never create a parent relationship, log in a client, spend credits, or mark a session delivered. Existing manual booking links and completed session history are preserved. Coaches see only their calendar, and linked players still require an active assignment.

The database applies these rules to future bookings received through the existing signed webhook or dashboard refresh. Continuous Calendly delivery requires the secure team connection in the Hub. The ChatGPT Calendly connector is separate and cannot provide a persistent website credential. A one-time import is labelled as saved data until that connection is completed.

Verification: `tests/booking-name-links.sql` rolls back its fixtures and covers exact/alias matches, accountless players, duplicate/conflicting names, family boundaries, coach assignments and cross-coach access. Run the existing booking-matching and plan RLS suites too.

## Live Airtable player names (3 November 2026)

The scheduled Airtable sync now saves both Player Name and the record Name as booking aliases and re-runs booking reconciliation. Matching uses the current Players cache alongside reviewed aliases and verified Airtable account links. The current Airtable Player Name is the schedule display name. Exact normalized matches only; unknown, duplicate or conflicting names remain for review. A blank or placeholder name cannot create a match.

Existing converted bookings receive matching display metadata without changing the session owner, coach, family relationships or session history. Coaches see the player name for a matched booking before Hub signup; only JT’s owner account receives the balance. Revoked coach assignments still hide all player names and credit data. No credits are deducted, and no Airtable profile or login is created by this sync.

Migrations: `supabase/migrations/20261103105545_live_airtable_booking_names.sql` and `supabase/migrations/20261103105933_prefer_explicit_booking_names.sql`. Explicit recorded booking aliases take precedence over ambiguous child-only names. Additional checks: `tests/live-airtable-booking-names.sql`, `tests/booking-name-links.sql`, and the coach-calendar/provider-sync tests.

### Airtable payment balances

The credit sync reads complete Players, Payments, Master log and Gym Clients tables before updating the cache. It follows reciprocal direct payment links or the reciprocal Client → Master log → Payments chain. Explicit direct links take precedence. A payment reached through multiple paths is included once. Unlinked payments can match a unique full recorded name, or a player plus a corroborated full parent/contact alias; first names alone, fuzzy matches, and ambiguous matches are never sufficient.

`Sessions Remaining` is read directly, preserving zero, negatives and formula errors. Display precision matches the Airtable field (zero decimal places); the underlying formula is unchanged. Each payment ledger stays separate, and shared family payments are labelled as shared. No totals are invented across separate payment ledgers or across players. Missing payments remain pending, not zero.

The player portal and schedule use the same complete snapshot. For the owner only, a unique existing verified-contact booking match can supply the credit record when no explicit account-credit link exists. Conflicting matches remain unlinked. This does not create account, family or coach access relationships. Refreshing a profile cannot replace a complete balance with a direct-link-only snapshot.

Checks: `tests/airtable-credit-links.test.mjs`, `tests/hub-portal.test.mjs`, `tests/provider-sync.test.mjs`, `tests/schedule-row.test.mjs`.

## Shared bookings

A booking can contain 2–10 confirmed Airtable participant IDs in `airtable_participants`. This is booking-specific and does not match unrelated future bookings by a shared contact name. Provider re-imports preserve the selected participants. The schedule keeps one appointment and lists the participants. Only the owner sees their individual credit balances; balances are never combined or deducted.

A group booking cannot be converted into a session owned by one player. Individual account links and private logs remain separate. Shared plans can be written by the coach; the single-player automatic draft is refused for groups. This avoids pretending that one player’s plan or private record covers the whole group. Existing navigation and action styling remain unchanged.

Migration: `supabase/migrations/20261103111606_shared_booking_players.sql`. Validation: `tests/shared-bookings.test.mjs`, the group cases in `tests/booking-name-links.sql`, existing calendar/plan suites, and a 390px browser fixture with separate balances and no overflow.

## Owner-only session credits

Only the verified `hub_staff` owner role may view session credits. Schedule and profile APIs omit balances, payment details, credit refresh state and Airtable payment links for administrators, coaches, players and parents. Non-owner schedule queries retrieve player names without selecting the credit JSON. Credit controls render only when the server explicitly grants visibility; sessions, plans, logs, player names and coach access otherwise remain unchanged.

`supabase/jt-owner-only-session-credits.sql` restricts direct reads of `hub_airtable_players` and `hub_player_airtable_links` to the owner, with restrictive policies to prevent another permissive policy reopening access. Background provider sync retains service access. Tests cover non-owner API responses, stale response rendering, direct database reads for each role, forged metadata and owner access.
