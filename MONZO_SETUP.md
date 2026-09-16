# Monzo Business connection

Production callback: `https://jt-website-orpin.vercel.app/api/monzo/callback`.

Create a Confidential Monzo OAuth client with this exact redirect URL. Set
`MONZO_CLIENT_ID` and `MONZO_CLIENT_SECRET` in Vercel's **Production** environment;
mark the client secret sensitive. The existing `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` server variables are also
required. Redeploy after changing environment variables. Never put these secrets
in source control or chat.

Apply `supabase/jt-monzo-connection.sql` before deploying. These tables have RLS
enabled, no client policies, and no anon/authenticated grants, deliberately denying
browser access. Only server-side service credentials can read or modify them.
An informational Supabase `rls_enabled_no_policy` notice is expected for these
server-only tables.

Sign in as the Hub owner on the production domain, open Command Centre, and select
**Connect / reconnect**. Complete Monzo login in the same browser, approve access
in the Monzo app, then select **Verify connection**. Verification currently requires
exactly one open Business account named `JT Mind & Body Balance`; personal and
closed accounts cannot be selected.

**View bank activity** reads at most 100 transactions in the last 89 days. It is not
a full bank statement. No bank transaction is added to coaching revenue or matched
to a client automatically. Existing cash/Airtable/Stripe records remain independent.
The payment matching switch is disabled until a reconciler exists.

Tokens are AES-256-GCM encrypted using a purpose-specific key derived from the
Monzo client secret and bound to the owner ID. Rotating that secret requires
reconnection. State is single-use, expires after 10 minutes, and is bound to an
HttpOnly SameSite cookie. Refresh tokens rotate under a database lease. Upstream
token responses and OAuth codes are never logged or returned to the browser.

To revoke access, use Monzo's authorised-app controls. Reconnect through the Hub if
the connection expires or is revoked. No automatic background polling is deployed.

Validation: `node --test tests/monzo.test.mjs`. Tests mock Monzo and Supabase;
real-account verification must occur after production secrets and user consent.

## Daily feed and Sharon reconciliation
Apply `supabase/jt-monzo-daily.sql` once. It creates owner-only transaction storage, a historical baseline and one-use five-minute worker tickets. The connected Supabase automation calls `select private.request_monzo_sync()` and checks `jt_monzo_sync_jobs`; credentials never leave the server. `/api/monzo/job` accepts only an unused ticket. Owner-authenticated `/sync` refreshes manually. Both only read the verified Business account. Pagination is capped at 2,500; incomplete refreshes never advance the successful sync timestamp.

Sharon's existing Daily Session Brief refreshes this feed before reconciliation. Historical records are baseline, new receipts start in review. Unique Monzo IDs plus an Airtable Notes marker prevent replay; ambiguous matching, manual edits, refunds and tips require review. Bank activity is shown separately from coaching revenue. The hourly Airtable mirror remains the revenue source. No bank transfers are supported.
