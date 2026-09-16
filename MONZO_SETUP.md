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
