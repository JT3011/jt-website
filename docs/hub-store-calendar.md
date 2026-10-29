# Store rewards, session downloads and coach calendar

The rewards page is `/performance-hub-rewards.html`; both avatar pages include a store section. The verified JT shop is `gid://shopify/Shop/106145481052`, canonical API domain `xtkzjd-5g.myshopify.com`, branded store address `jtmindbodybalance.myshopify.com`, currency GBP. Admin GraphQL is pinned to 2026-07 and its three operations are schema-validated.

## Owner setup

1. Sign into the Hub as JT and open Store & rewards → JT owner controls.
2. Connect a JT Shopify custom app using an Admin API token with `read_discounts` and `write_discounts`. Alternatively the deployment can supply `SHOPIFY_ADMIN_ACCESS_TOKEN` as a server environment secret. A ChatGPT app connection does not provision credentials to the website. Expiring tokens must be replaced here when expired.
3. Choose each milestone's percentage or fixed GBP value, minimum subtotal and validity (1–365 days). Approve the displayed terms, activate it, and save. All seven tiers ship inactive with no financial value chosen.
4. Open Coach Command Centre → Connect or reconnect Calendly. Connect the Calendly account matching the Hub login email using a personal access token. It needs `users:read` and `scheduled_events:read`; `organizations:read` enables JT's organisation connection and `availability:read` permits external busy blocks. A verified organisation owner/admin token connected by the Hub owner can read the team's calendars. Coaches may connect their own accounts.

## Behaviour and permissions

Milestones retain every condition in `get_my_reward_ladder`: lifetime points, membership days, activity, progress weeks and standards. Points are never deducted. Legacy reward claims remain recognised, preventing another reward for the same milestone. Issued codes keep their original settings if JT later changes a tier.

A database unique constraint reserves one random code per user/tier. Shopify lookup recovers that code after lost responses. Codes are revealed only after Shopify confirms issuance. Each is limited to one order, applies to one-time purchases across the store, cannot combine with other discounts and expires as configured. It is a bearer code: the player or parent can use it; anyone holding it can redeem it once. JT explicitly approves this audience in the activation form. The Hub does not create Shopify customer accounts or change existing orders.

Only verified accounts can call integration APIs. Roles come from `hub_staff`, never browser input or user-editable metadata. Only the Hub owner changes discounts or connects Shopify. Credentials use AES-256-GCM, bound to provider and user, with a key derived from `SUPABASE_SECRET_KEY`. Rotating that key requires reconnecting providers. Credential and calendar-cache tables have RLS with no client grants; only the server service role can access them. Responses are private and no-store.

Coaches see only their mapped Calendly host; owner/admin staff can switch hosts. The owner business command centre keeps its existing owner-only access. The calendar shows the selected UK day and following 27 days, merges Hub sessions without duplicates and excludes cancelled bookings. It refreshes on open or every five minutes while visible, plus a manual refresh. Provider failures show a dated snapshot and warning. Initial verified snapshots cover 29 October–25 November 2026; they are not an ongoing sync. Busy blocks are optional and cover only the remaining selected day, as permitted by Calendly's availability API. Schedule access never grants access to a player's private coaching record.

Session videos/photos download through a 60-second signed URL with an attachment filename. The current user re-reads the media row under RLS before signing; storage remains private. Only media shared with players/parents is offered on their log.

## Validation

`node --test tests/hub-integrations.test.mjs tests/hub-portal.test.mjs`

`tests/hub-store-rls.sql` exercises database access using temporary auth accounts inside a rolled-back transaction. GraphQL queries live in `server/graphql`. Browser QA uses ignored preview-only fixtures, never production accounts, financial discounts or player data. Actual Shopify issuance and automatic Calendly refresh require the runtime connections described above.
