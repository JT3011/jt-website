# Connected JT navigation

Draft theme: `207816327516` — **JT — Menu, Search & Bag**.
Copied from live theme `207790375260` (JT — Connected Website, Hub & Store) on 1 November 2026. This revision places the store menu and native Search link on the left, keeps the crest centred, and puts the bag on the right. The draft retains the live theme's templates, storefront settings and checkout behaviour.

The common header uses `jt-navigation.css` and `jt-navigation.js` from the website root. `jt-navigation.html` is the website markup reference; the Shopify section uses translated labels and native Shopify routes. The Shopify CSS copy additionally styles the store's menu/search group and Search icon. Preserve these store-specific controls when aligning shared navigation styles. Hub-specific links remain in `performance-hub-ui.js` so existing auth listeners and role-controlled tools are retained.

The original Shopify header remains disabled in `sections/header-group.json`. The shared header, native search/account/cart links, collection navigation and pre-order banner replace it. To roll back, publish the previous theme through Shopify admin.

Upload the new section and assets before `sections/header-group.json`: Shopify validates that a referenced section already exists. Theme file changes are supported on unpublished themes; publishing requires Shopify admin.

Verified: mobile/narrow website and Hub navigation, owner access dialog, native menu close/focus behaviour, signed-out entry pages, store menu and cart routes, Shopify theme validation, and the existing 78 repository tests. This is navigation integration, not shared authentication between Supabase and Shopify.
