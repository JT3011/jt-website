# Nutrition signup for Bark clients

- Public entry: `/nutrition` (rewrites to `nutrition.html`). Existing clients can sign in on the same page.
- New accounts use the existing Supabase email confirmation flow through `/performance-hub-free-profile.html`. `service_focus: nutrition` routes them to `/nutrition-programme.html` on confirmation and subsequent Hub login. This editable preference only selects a page; all server authorization and paid membership checks remain unchanged.
- The existing new-user trigger creates the client profile. Football onboarding is not required for nutrition. Existing accounts signing in on the nutrition page are taken there without altering their saved service preference.
- The nutrition workspace reuses the existing personal programme API, questionnaire, private coach drafts and publication checks. It omits football navigation and uses general activity wording. JT reviews the draft through the existing Hub programme screen.
- Creating an account takes no payment and activates no subscription. JT agrees programme scope and price with the client separately before payment and publication.
- Password recovery uses the existing reset page in update mode. Email delivery still depends on the existing Supabase mail and redirect configuration.

Validation: signup/confirmation routing, errors, login, recovery and general nutrition intake are covered in `tests/nutrition-signup.test.mjs`. The existing personal-programme suite checks privacy, coach publication and consent. No real client signup emails or AI plans are sent during these tests. The full baseline suite has an unrelated existing `calendly-sync.test.mjs` assertion failure (undefined versus null for hidden player credits), reproduced on the original main commit.
