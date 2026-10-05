# Facility interactions

The existing Three.js scene, authentication and player metrics are preserved. The station dock starts guided travel without a separate walk mode. Door leaves react to approaching player/ambient characters. The central backing wall is removed; the original neon JT artwork is on the rear structural wall. Eight upright projections encircle the podium and can be tapped to focus.

`performance-hub-tour.js` owns routes, relaxed arm poses, gait and player activity poses. `performance-hub-interactions.js` owns zone doors, held dumbbells/drink, battle-rope deformation, sled travel and football shots. `performance-hub-amenities.js` includes the nutrition bar and canvas leaderboard. These are guided visual interactions, not multiplayer or a general physics simulation. Ambient athletes are explicitly identified as ambient. Animations never award points.

## Nightly board

`hub_facility_leaderboard()` returns only generated aliases, ranks and positive points earned before the most recent Europe/London midnight. The server cutoff advances automatically at 00:00, including DST, without depending on a browser or a cron job. The open app refreshes at the server-provided next midnight, every minute, on focus and after reconnecting. Joining/leaving is effective immediately; new points enter rankings at the next midnight. Shared results remain in memory and are not added to the service worker cache.

Players voluntarily join with an automatically generated alias. The table grants allow reading/deleting one's own membership and inserting only one's own user_id. Aliases cannot be supplied or changed by the client. The public RPC is invoker-only; its private definer helper performs the narrowly scoped aggregate and explicitly requires auth.uid(). No profile, email, coaching feedback, individual event or other user's ID is returned. Leaving removes the participant from the next refresh immediately. No players are enrolled by migration.

## Verification

Scene smoke checks: make Three.js 0.180.0 available, then run `node tests/facility-scene.mjs`. Tests cover all navigation pairs, station arrival/reselection, doors, equipment resets, hologram geometry, leaderboard rendering, return to podium and fixed-obstacle clearance. Actual donor GLB arm/scale checks and mobile/tablet/desktop camera bounds were also run during implementation. Database RLS allow/deny, opt-out, aggregate/cutoff and DST checks passed with transaction rollback.

The available verification browser had WebGL disabled. Rendered scene appearance and performance on real iPhone/Android hardware still need device review.
