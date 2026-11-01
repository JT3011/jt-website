# Apex nutrition and gym programmes

Open `/performance-hub-programmes.html`, also linked from Hub → Plans, the Hub menu and each player's programme cards.

1. Select the player and Nutrition or Gym.
2. Complete the five-step questionnaire. Each Continue saves a private draft; Save & exit is available. Consent identifies OpenAI as the AI provider. Under-18 submissions require a parent/guardian confirmation.
3. Apex creates an individual draft using the questionnaire and existing player goal, level and position. There is no generic fallback if AI generation fails.
4. JT or the assigned coach reviews the questionnaire, Apex notes and every day of the plan, adds a note, then shares it. Parents and players cannot see unpublished drafts or approve plans.
5. Follow the Today or Week cards and record daily check-ins. A coach can see the player's check-ins. Nutrition tracks meal completion, appetite, energy, sleep and water. Gym adds session completion, soreness and actual sets/reps/load/effort.

Nutrition includes a seven-day rotation, at least six different dinners, short recipes, ingredient quantities, prep and optional alternatives. Dinner quantities scale to the household's selected servings; other meals serve one. Alternatives do not automatically change the shopping basket. Gym has a seven-day schedule and four-week progression, selected equipment and available days, warm-ups, sets/reps/rest, technique cues, easier alternatives and recovery.

## Shopping prices

Choose Check store prices in Shopping. The server researches the selected supermarket's official domain in batches, accepting a price only with a matching ingredient unit and an actually consulted official source URL. The basket shows pack price, whole packs required and line total. Missing prices remain unconfirmed and never count as a complete total. Budget fit is shown only when all lines are priced. Prices remain online estimates: local stock, checkout prices, delivery and loyalty promotions can differ. Other/custom shops produce an ingredient list with unconfirmed prices. Price refreshes are cached for 24 hours and limited to ten batches per plan/day. No orders are placed.

## Privacy and readiness

The existing owner/admin, assigned-coach, player and linked-parent rules apply. Three tables use RLS and allow authenticated SELECT only; all writes use the authenticated API, server-derived roles and relationship checks. Unrelated coaches cannot access questionnaires, plans or check-ins. Families see only shared plans. Changing a questionnaire increments its revision; both the API and a database trigger prevent approval of a stale draft. There is one in-flight generation per player/programme, four attempts per day, and a five-minute stale-job recovery.

Readiness concerns, youth weight-loss goals or unsupervised youth resistance work are referred to the coach rather than generating a plan. These are coaching plans, not clinical nutrition or rehabilitation prescriptions. A qualified professional must resolve relevant concerns; do not clear a flag merely to bypass it. Existing manually authored coach programmes remain available. Youth plans avoid calories, macros, weight-loss or body composition targets. Under-13 gym prompts require supervised movement basics.

Questionnaires are sent to OpenAI only after explicit consent to create a plan. Calls use `store:false`; names, email addresses and account IDs are excluded from the AI payload. Store searches receive ingredient names only. Requests and questionnaire contents are not logged by this feature. Database access can be revoked through the existing coach/parent relationships.

## Deployment and validation

- Apply `supabase/jt-personal-programmes.sql`, then `supabase/jt-personal-programmes-guards.sql` (both already applied to the JT project on 1 November 2026).
- Existing production `OPENAI_API_KEY` and Supabase server variables are used. Optional `APEX_PROGRAMME_MODEL` overrides `gpt-5-mini`. The function timeout is 300 seconds; upstream AI requests abort at 220 seconds.
- Run `node --test tests/*.test.mjs`. `tests/personal-programmes-rls.sql` exercises actual RLS and stale approvals inside a rollback transaction.
- Preview fixtures are local only and must not be published. UI tests use synthetic player data. The first real end-to-end AI generation requires a consented live questionnaire; the production OpenAI secret is not exposed to local tests.
