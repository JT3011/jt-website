# Nutrition signup for Bark clients

- Public entry: `/nutrition` (rewrites to `nutrition.html`). Existing clients can sign in on the same page.
- New accounts use the existing Supabase email confirmation flow through `/performance-hub-free-profile.html`. `service_focus: nutrition` routes them to `/nutrition-programme.html` on confirmation and subsequent Hub login. This editable preference only selects a page; all server authorization and paid membership checks remain unchanged.
- The existing new-user trigger creates the client profile. Football onboarding is not required for nutrition. Existing accounts signing in on the nutrition page are taken there without altering their saved service preference.
- The nutrition workspace reuses the existing personal programme API, questionnaire, private coach drafts and publication checks. It omits football navigation and uses general activity wording. JT reviews the draft through the existing Hub programme screen.
- Creating an account takes no payment and activates no subscription. JT agrees programme scope and price with the client separately before payment and publication.
- Password recovery uses the existing reset page in update mode. Email delivery still depends on the existing Supabase mail and redirect configuration.

Validation: signup/confirmation routing, errors, login, recovery and general nutrition intake are covered in `tests/nutrition-signup.test.mjs`. The existing personal-programme suite checks privacy, coach publication and consent. No real client signup emails or AI plans are sent during these tests. The full baseline suite has an unrelated existing `calendly-sync.test.mjs` assertion failure (undefined versus null for hidden player credits), reproduced on the original main commit.


## Individual client prices

JT can open `/nutrition-pricing.html` directly, use **Nutrition prices** from the owner Hub toolbar, or use **Set client prices** in the nutrition workspace. Enter the client’s sign-up email, a GBP amount, one-off/monthly basis and a description. The same `/nutrition` link is sent to everyone. Clients see only an active quote whose email exactly matches their verified Supabase account email. Email aliases are not merged. An existing quote can be edited or hidden; changing its email requires a new quote.

The editor saves quotes only. It does not take payments, start subscriptions, change existing Stripe charges or grant paid membership. Stripe account tools reported that the connection requires reauthentication on 14 November 2026. Automated payment collection remains a separate blocked integration task; the current UI states that payment is arranged with JT.

The API is under `/api/hub-session-plans?programme=nutrition-pricing`. Owner authorization is checked on the server, without trusting browser role metadata. Direct browser reads/writes to `hub_nutrition_quotes` are revoked and RLS is enabled. The client lookup uses the server-verified email, not a supplied email parameter. Updates use a revision predicate to reject stale edits. No real client prices were created while developing this feature.

Validation: `node --test tests/nutrition-pricing.test.mjs tests/nutrition-signup.test.mjs tests/personal-programmes.test.mjs` passes 32 tests. `tests/nutrition-pricing-rls.sql` passes against the deployed schema and rolls back its synthetic row. The editor, update and client display were also exercised in a local browser fixture.
