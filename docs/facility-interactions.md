# Facility interactions

The existing Three.js scene, authentication and player metrics are preserved. The station dock starts guided travel without a separate walk mode. Six enclosed rooms have full walls, ceilings, neon labels, automatic doorways and clear connecting routes. The camera retracts before crossing opaque room walls or closed doors. The central backing wall is removed; the original neon JT artwork is on the rear structural wall. Eight upright projections encircle the podium and can be tapped to focus.

`performance-hub-tour.js` owns routes, relaxed arm poses, gait and player activity poses. `performance-hub-interactions.js` owns zone doors, held dumbbells/drink, battle-rope deformation, sled travel and football shots. `performance-hub-amenities.js` includes the nutrition bar and canvas leaderboard. These are guided visual interactions, not multiplayer or a general physics simulation. Other members’ opted-in avatars are explicitly identified as ambient movement, not live online presence. Animations never award points.

## Nightly board

`hub_facility_leaderboard()` returns only generated aliases, ranks and positive points earned before the most recent Europe/London midnight. The server cutoff advances automatically at 00:00, including DST, without depending on a browser or a cron job. The open app refreshes at the server-provided next midnight, every minute, on focus and after reconnecting. Joining/leaving is effective immediately; new points enter rankings at the next midnight. Shared results remain in memory and are not added to the service worker cache.

Players voluntarily join with an automatically generated alias. The table grants allow reading/deleting one's own membership and inserting only one's own user_id. Aliases cannot be supplied or changed by the client. The public RPC is invoker-only; its private definer helper performs the narrowly scoped aggregate and explicitly requires auth.uid(). No profile, email, coaching feedback, individual event or other user's ID is returned. Leaving removes the participant from the next refresh immediately. No players are enrolled by migration.

## Verification

Scene smoke checks: make Three.js 0.180.0 available, then run `node tests/facility-scene.mjs`. Tests cover all navigation pairs, station arrival/reselection, doors, equipment resets, hologram geometry, leaderboard rendering, return to podium and fixed-obstacle clearance. Actual donor GLB arm/scale checks and mobile/tablet/desktop camera bounds were also run during implementation. Database RLS allow/deny, opt-out, aggregate/cutoff and DST checks passed with transaction rollback.

The available verification browser had WebGL disabled. Rendered scene appearance and performance on real iPhone/Android hardware still need device review.

## Member avatars and recovery

`performance-hub-crowd.js` loads up to ten randomly selected other members’ saved GLB models. The current player is always excluded. The `hub_avatar_sharing` table is opt-in and empty on migration; sharing preferences use owner-only RLS. The narrowly scoped crowd RPC returns model paths only. A storage SELECT policy allows authenticated reads only of the current, explicitly shared GLB, with ownership-path validation. The bucket remains private; no names, profile rows or personal progress accompany models. Signed links expire in 60 seconds, model fetches use `cache: no-store`, and selection refreshes every five minutes. Existing downloaded appearances disappear at the next crowd refresh after revocation. Failed model loads cannot block the user's avatar. Skeleton movement is capped at 30 updates per second for crowd characters.

Walking and rope arms are aimed in actor space instead of twisting around local export axes. Recovery offers compression, ice bath and sauna destinations with entry/exit transitions and seat-aligned pelvis positions. Compression boots follow the lower legs. The sauna door opens for approach/exit and closes once seated. Room selection first gets a seated player out of the equipment before routing onward.

Verification includes actual donor GLB hand travel (>0.47 m alternating walking travel, >0.52 m alternating rope height), three seat positions, safe body heights, entry/exit transitions, hard crowd cap, all room routes, camera wall limits and database allow/deny checks. Browser visual review is still limited by WebGL being disabled in the available browser.
