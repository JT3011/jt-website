# Calendly → player records

The existing booking queue now matches normalised booking emails to confirmed Hub accounts, approved booking aliases, or a verified parent with exactly one linked child. A shared household email, conflicting identities, unverified login or unknown delivering coach stays in **Needs linking**. Matching never creates a parent relationship or a login.

Coaches see their own delivered sessions. JT sees all coaches and can resolve the queue, choosing a player and delivering coach. “Remember email” is optional and rejected for a known multi-child household. Coach rules use the actual event name because Calendly event types can be renamed: a Billy event hosted by JT must not silently become a JT delivery.

Parents open **My Coaching**, choose their player and see a private calendar alongside credits and programmes. Parents cannot edit links, sessions, programmes or balances. The calendar uses UK time, including daylight saving changes.

## One-time connection

1. JT opens the Coach Command Centre → **Calendar connection & automatic updates**.
2. Connect a Calendly personal access token for the same verified email as the Hub login. Scopes: `scheduled_events:read`, `users:read`, `organizations:read`, `webhooks:read`, `webhooks:write`. Calendly account/plan permissions must allow webhooks.
3. The server verifies the account and organisation role, encrypts the token and registers `invitee.created` and `invitee.canceled` at the fixed production webhook URL. The UI reports whether automatic updates connected. Without webhook permissions, page-open/manual refresh still works and the setup message explains what is missing.
4. JT can separately connect an Airtable PAT with `data.records:read` for the existing coaching base under **Connect Airtable credit balances**. Existing `AIRTABLE_READ_TOKEN` remains supported.

ChatGPT app connections do not supply runtime credentials to the published website. No provider tokens were installed by the code release. Imported bookings are labelled with their last checked date until the runtime connection is made.

## Credits and delivery

Calendly booking creation never deducts a credit or marks a session completed. Airtable remains the credit source. Staff open **Player & credits → Update credits in Airtable**, adjust the linked payment's **Completed +1** after confirming delivery, then use **Refresh record** to read the latest balance. Payment formulas and service-specific balances remain intact. There is no automated financial write or retrospective deduction.

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
