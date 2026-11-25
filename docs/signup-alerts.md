# Hub subscription confirmations

JT opens `/performance-hub-signups.html` or **Signup alerts** in the owner Hub toolbar. This page shares the existing live Stripe link: 30 days free, then GBP 12.99 per month. It does not edit prices, trials, taxes or customer subscriptions.

The existing Vercel Stripe webhook also receives `checkout.session.completed` and `checkout.session.async_payment_succeeded`. It validates the raw signature, requires live mode, retrieves the checkout from Stripe, and verifies the original Payment Link, expected price, GBP 12.99 monthly single quantity, completed checkout, active/trialing subscription and paid/no-payment-required status. Trial confirmations are labelled as trials. Hub account registration is shown separately using the existing membership claim record. Unfinished and unrelated checkouts are ignored.

Only verified accounts with `hub_staff.role = owner` can access the API. The three signup tables and delivery RPC are inaccessible to anonymous and authenticated database roles. Service role access is used after server authorization. Push endpoints are restricted to supported browser push providers. No push credentials or customer data are public.

Enable notifications on each desired device from this page, then use **Send test alert**. On iOS, install the existing JT PWA on the Home Screen first. Device consent and the final phone-delivery check must be completed on JT's device. Notifications are dispatched immediately with high urgency, but connectivity and device notification settings affect arrival. The confirmation list refreshes every five seconds while visible. It records future signups only; it does not backfill existing customers or send historical alerts.

Configuration: `HUB_PUSH_PUBLIC_KEY` and sensitive `HUB_PUSH_PRIVATE_KEY` in Vercel production, alongside existing Stripe and Supabase settings. The key pair must be stable. Apply `supabase/jt-signup-alerts.sql` before deployment; enable the two checkout event types on the existing Vercel webhook after deployment. Existing subscription access synchronization is preserved.

Delivery is idempotent per checkout/device, with a 45-second database lease. Transient push failures fail webhook processing so Stripe retries. Expired endpoints are removed. A crash after push acceptance but before persistence can cause a retry; the stable topic and notification tag coalesce that notification on the device. The alert describes checkout completion, not the customer's present billing status.

Validation: `node --test tests/signup-alerts.test.mjs tests/hub-portal.test.mjs`. SQL verification uses a transaction that rolls back synthetic rows. No real customer checkout or charge is used for testing.
