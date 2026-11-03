/* ================= ShopNest Themes V4 — Theme Registry =================
   V4 Phase 1: registry + Luxury as data — NO behaviour change.
   This file is DATA, not logic: it only declares what each theme is.
   No existing global is changed; nothing here runs on its own.
   Load order (index.html, Phase 1): supabase CDN -> themes.js -> themes-v4.js -> script.js
   SHOPNEST_THEME_DEF(key) returns the def for a theme key, or null.
   Luxury is theme #1: 8 sections, 13 settings keys, fallbacks, copyProfile,
   cssScope "theme-luxury", 5-button bottom nav, PDP block.
   Sections: hero, new_arrivals, festive, unstitched_tabs, readytowear_tabs,
   editorial, reels, hot — hero and new_arrivals are declared but NOT
   dispatched in Phase 1 (renderHero / renderInto:newGrid stay direct).
   Reels dispatch to renderReels (NOT renderReelsLuxury — that stays
   inside renderReels for the Luxury path).
   showDisclaimer is LIVE since V5 Phase 2b: the storefront defines it in
   DEFAULT_SETTINGS, so the PDP toggle works (Luxury PDP only).
   onlySections: Luxury-only sections are festive, unstitched_tabs,
   readytowear_tabs, editorial; the playful stub also carries
   onlySections ["featured", "blog"].
   V5 Phase 2b completed the other 6 V3 themes as data (sections,
   defaultOrder, settingsSchema, copyProfile, cssScope, PDP block) from themes.js defaultOrder + the live rendered lists — no invented sections.
   If themes-v4.js fails to load, every Phase 1 helper in script.js
   falls back to the old literals / calls — the storefront still
   works exactly as before. */
(function(){
/* V3 entry lookup — defensive: themes.js failed to load to bhi crash nahi. */
function v3entry(key){
try { return (window.SHOPNEST_THEME ? window.SHOPNEST_THEME(key) : null); } catch (e){ return null; }
}
window.SHOPNEST_THEME_DEFS = {
luxury: {
key: "luxury",
v3: v3entry("luxury"),
sections: [
{ key: "hero", render: "renderHero" },
{ key: "new_arrivals", render: "renderInto:newGrid" },
{ key: "festive", render: "renderFestive" },
{ key: "unstitched_tabs", render: "renderUnstitchedTabs" },
{ key: "readytowear_tabs", render: "renderRtwTabs" },
{ key: "editorial", render: "renderEditorial" },
{ key: "reels", render: "renderReels" },
{ key: "hot", render: "renderTrending" }
],
onlySections: ["festive", "unstitched_tabs", "readytowear_tabs", "editorial"],
defaultOrder: ["hero", "new_arrivals", "festive", "unstitched_tabs", "readytowear_tabs", "editorial", "reels", "hot"],
settingsSchema: {
luxuryTiles: { type: "list", fields: ["label", "cat", "img"], max: 4, keep: "any" },
luxuryTabs: { type: "list", fields: ["label", "cat"], max: 4, keep: "any" },
luxuryRtwTabs: { type: "list", fields: ["label", "cat"], max: 4, keep: "any" },
luxuryBanners: { type: "list", fields: ["img", "eyebrow", "title", "button", "cat"], max: 4, keep: "img" },
luxuryBanner: { type: "object", fields: ["img", "eyebrow", "title", "button", "cat"], legacy: true },
instaHandle: { type: "string" },
instaReels: { type: "list", fields: ["user", "avatar", "video", "poster", "title"], max: null, keep: "all" },
showReels: { type: "boolean", default: true }, collectionPages: { type: "list", fields: ["cat", "title", "subtitle"], max: 12, keep: "cat" },
sectionText: { type: "map", kind: "open", fields: ["eyebrow", "title"] },
pdpText: { type: "map", kind: "fixed", keys: ["details", "related", "delivery"] },
showSizes: { type: "boolean", default: true },
showColors: { type: "boolean", default: true },
showDisclaimer: { type: "boolean", default: true }
},
fallbacks: {
luxuryTiles: "named4",
luxuryTabs: "defaultLuxTabs",
luxuryRtwTabs: "defaultLuxRtwTabs",
luxuryBanners: "legacySingle"
},
copyProfile: {
categories: ["Luxury", "Daily Wear", "Embroidered", "Pret", "Luxury Pret", "Daily Wear Pret", "Embroidered Pret"],
copyKeys: ["luxuryTiles", "luxuryTabs", "luxuryRtwTabs", "luxuryBanners", "instaHandle", "instaReels", "collectionPages", "sectionText", "pdpText", "showSizes", "showColors", "showDisclaimer"],
seedWhen: "theme==luxury AND all 5 lists empty",
orderKeys: ["festive", "unstitched_tabs", "readytowear_tabs", "editorial"],
productsNote: "12 demo products (ids 103-114) — default OFF",
sourceSlug: "shopnest",
displayName: "Luxury",
setThemeDefault: true,
copyProductsDefault: false,
reelsMp4Only: true,
productsLabel: "12 fashion products",
productsWarning: "Demo products fashion ke hain — tech/gadget store mein mix ho jayenge. Sirf test/fashion store ke liye tick karein. Products naam se skip hote hain (dobara copy par duplicate nahi bante)."
},
cssScope: "theme-luxury",
nav: { bottom: ["menu", "unstitched", "stitched", "new", "cart"] },
pdp: { fabric: true, trustBadges: 5, options: true }
},
general: { key: "general", v3: v3entry("general"), sections: [ { key: "hero", render: "renderHero" }, { key: "trust", render: "renderTrust" }, { key: "categories", render: "renderCats" }, { key: "best_sellers", render: "renderInto:bestGrid" }, { key: "all_products", render: "renderGrid" }, { key: "promos", render: null }, { key: "hot", render: "renderInto:hotTrack" }, { key: "new_arrivals", render: "renderInto:newGrid" }, { key: "deals", render: "renderInto:dealGrid" }, { key: "budget", render: "renderBudget" }, { key: "about", render: null }, { key: "how_to_order", render: "renderSteps" }, { key: "faq", render: "renderFaq" }, { key: "testimonials", render: "renderReviews" } ], defaultOrder: ["hero", "trust", "categories", "best_sellers", "all_products", "promos", "hot", "new_arrivals", "deals", "budget", "about", "how_to_order", "faq", "testimonials"], settingsSchema: { sectionText: { type: "map", kind: "open", fields: ["eyebrow", "title"] }, pdpText: { type: "map", kind: "fixed", keys: ["details", "related", "delivery"] }, showSizes: { type: "boolean", default: true }, showColors: { type: "boolean", default: true }, showDisclaimer: { type: "boolean", default: true } }, fallbacks: {}, copyProfile: { sourceSlug: "shopnest", displayName: "General", setThemeDefault: true, copyProductsDefault: false, copyKeys: ["sectionText", "pdpText", "showSizes", "showColors", "showDisclaimer"], orderKeys: [] }, cssScope: "theme-general", pdp: { fabric: false, trustBadges: 0, options: true } },
fashion: { key: "fashion", v3: v3entry("fashion"), sections: [ { key: "hero", render: "renderHero" }, { key: "trust", render: "renderTrust" }, { key: "categories", render: "renderCats" }, { key: "best_sellers", render: "renderInto:bestGrid" }, { key: "all_products", render: "renderGrid" }, { key: "promos", render: null }, { key: "hot", render: "renderInto:hotTrack" }, { key: "new_arrivals", render: "renderInto:newGrid" }, { key: "deals", render: "renderInto:dealGrid" }, { key: "budget", render: "renderBudget" }, { key: "about", render: null }, { key: "how_to_order", render: "renderSteps" }, { key: "faq", render: "renderFaq" }, { key: "testimonials", render: "renderReviews" } ], defaultOrder: ["hero", "trust", "categories", "best_sellers", "all_products", "promos", "hot", "new_arrivals", "deals", "budget", "about", "how_to_order", "faq", "testimonials"], settingsSchema: { sectionText: { type: "map", kind: "open", fields: ["eyebrow", "title"] }, pdpText: { type: "map", kind: "fixed", keys: ["details", "related", "delivery"] }, showSizes: { type: "boolean", default: true }, showColors: { type: "boolean", default: true }, showDisclaimer: { type: "boolean", default: true } }, fallbacks: {}, copyProfile: { sourceSlug: "shopnest", displayName: "Fashion", setThemeDefault: true, copyProductsDefault: false, copyKeys: ["sectionText", "pdpText", "showSizes", "showColors", "showDisclaimer"], orderKeys: [] }, cssScope: "theme-fashion", pdp: { fabric: false, trustBadges: 0, options: true } },
beauty: { key: "beauty", v3: v3entry("beauty"), sections: [ { key: "hero", render: "renderHero" }, { key: "trust", render: "renderTrust" }, { key: "categories", render: "renderCats" }, { key: "best_sellers", render: "renderInto:bestGrid" }, { key: "all_products", render: "renderGrid" }, { key: "promos", render: null }, { key: "hot", render: "renderInto:hotTrack" }, { key: "new_arrivals", render: "renderInto:newGrid" }, { key: "deals", render: "renderInto:dealGrid" }, { key: "budget", render: "renderBudget" }, { key: "about", render: null }, { key: "how_to_order", render: "renderSteps" }, { key: "faq", render: "renderFaq" }, { key: "testimonials", render: "renderReviews" } ], defaultOrder: ["hero", "trust", "categories", "best_sellers", "all_products", "promos", "hot", "new_arrivals", "deals", "budget", "about", "how_to_order", "faq", "testimonials"], settingsSchema: { sectionText: { type: "map", kind: "open", fields: ["eyebrow", "title"] }, pdpText: { type: "map", kind: "fixed", keys: ["details", "related", "delivery"] }, showSizes: { type: "boolean", default: true }, showColors: { type: "boolean", default: true }, showDisclaimer: { type: "boolean", default: true } }, fallbacks: {}, copyProfile: { sourceSlug: "shopnest", displayName: "Beauty", setThemeDefault: true, copyProductsDefault: false, copyKeys: ["sectionText", "pdpText", "showSizes", "showColors", "showDisclaimer"], orderKeys: [] }, cssScope: "theme-beauty", pdp: { fabric: false, trustBadges: 0, options: true } },
electronics: { key: "electronics", v3: v3entry("electronics"), sections: [ { key: "hero", render: "renderHero" }, { key: "trust", render: "renderTrust" }, { key: "categories", render: "renderCats" }, { key: "best_sellers", render: "renderInto:bestGrid" }, { key: "all_products", render: "renderGrid" }, { key: "promos", render: null }, { key: "hot", render: "renderInto:hotTrack" }, { key: "new_arrivals", render: "renderInto:newGrid" }, { key: "deals", render: "renderInto:dealGrid" }, { key: "budget", render: "renderBudget" }, { key: "about", render: null }, { key: "how_to_order", render: "renderSteps" }, { key: "faq", render: "renderFaq" }, { key: "testimonials", render: "renderReviews" } ], defaultOrder: ["hero", "trust", "categories", "best_sellers", "all_products", "promos", "hot", "new_arrivals", "deals", "budget", "about", "how_to_order", "faq", "testimonials"], settingsSchema: { sectionText: { type: "map", kind: "open", fields: ["eyebrow", "title"] }, pdpText: { type: "map", kind: "fixed", keys: ["details", "related", "delivery"] }, showSizes: { type: "boolean", default: true }, showColors: { type: "boolean", default: true }, showDisclaimer: { type: "boolean", default: true } }, fallbacks: {}, copyProfile: { sourceSlug: "shopnest", displayName: "Electronics", setThemeDefault: true, copyProductsDefault: false, copyKeys: ["sectionText", "pdpText", "showSizes", "showColors", "showDisclaimer"], orderKeys: [] }, cssScope: "theme-electronics", pdp: { fabric: false, trustBadges: 0, options: true } },
food: { key: "food", v3: v3entry("food"), sections: [ { key: "hero", render: "renderHero" }, { key: "trust", render: "renderTrust" }, { key: "categories", render: "renderCats" }, { key: "best_sellers", render: "renderInto:bestGrid" }, { key: "all_products", render: "renderGrid" }, { key: "promos", render: null }, { key: "hot", render: "renderInto:hotTrack" }, { key: "new_arrivals", render: "renderInto:newGrid" }, { key: "deals", render: "renderInto:dealGrid" }, { key: "budget", render: "renderBudget" }, { key: "about", render: null }, { key: "how_to_order", render: "renderSteps" }, { key: "faq", render: "renderFaq" }, { key: "testimonials", render: "renderReviews" } ], defaultOrder: ["hero", "trust", "categories", "best_sellers", "all_products", "promos", "hot", "new_arrivals", "deals", "budget", "about", "how_to_order", "faq", "testimonials"], settingsSchema: { sectionText: { type: "map", kind: "open", fields: ["eyebrow", "title"] }, pdpText: { type: "map", kind: "fixed", keys: ["details", "related", "delivery"] }, showSizes: { type: "boolean", default: true }, showColors: { type: "boolean", default: true }, showDisclaimer: { type: "boolean", default: true } }, fallbacks: {}, copyProfile: { sourceSlug: "shopnest", displayName: "Food", setThemeDefault: true, copyProductsDefault: false, copyKeys: ["sectionText", "pdpText", "showSizes", "showColors", "showDisclaimer"], orderKeys: [] }, cssScope: "theme-food", pdp: { fabric: false, trustBadges: 0, options: true } },
playful: { key: "playful", v3: v3entry("playful"), onlySections: ["featured", "blog"], sections: [ { key: "hero", render: "renderHero" }, { key: "trust", render: "renderTrust" }, { key: "categories", render: "renderCats" }, { key: "best_sellers", render: "renderInto:bestGrid" }, { key: "all_products", render: "renderGrid" }, { key: "promos", render: null }, { key: "hot", render: "renderInto:hotTrack" }, { key: "new_arrivals", render: "renderInto:newGrid" }, { key: "deals", render: "renderInto:dealGrid" }, { key: "budget", render: "renderBudget" }, { key: "about", render: null }, { key: "how_to_order", render: "renderSteps" }, { key: "faq", render: "renderFaq" }, { key: "testimonials", render: "renderReviews" }, { key: "featured", render: null }, { key: "reels", render: "renderReels" }, { key: "blog", render: null } ], defaultOrder: ["hero", "trust", "categories", "best_sellers", "all_products", "promos", "hot", "new_arrivals", "deals", "budget", "about", "how_to_order", "faq", "testimonials", "featured", "reels", "blog"], settingsSchema: { sectionText: { type: "map", kind: "open", fields: ["eyebrow", "title"] }, pdpText: { type: "map", kind: "fixed", keys: ["details", "related", "delivery"] }, instaHandle: { type: "string" }, instaReels: { type: "list", fields: ["user", "avatar", "video", "poster", "title"], max: null, keep: "all" }, showReels: { type: "boolean", default: true }, blogPosts: { type: "list", fields: ["title", "img", "href"], max: null, keep: "all" }, showBlog: { type: "boolean", default: true }, showSizes: { type: "boolean", default: true }, showColors: { type: "boolean", default: true }, showDisclaimer: { type: "boolean", default: true } }, fallbacks: {}, copyProfile: { sourceSlug: "shopnest", displayName: "Playful Pop", setThemeDefault: true, copyProductsDefault: false, copyKeys: ["sectionText", "pdpText", "instaHandle", "instaReels", "showReels", "blogPosts", "showBlog", "showSizes", "showColors", "showDisclaimer"], orderKeys: [] }, cssScope: "theme-playful", pdp: { fabric: false, trustBadges: 0, options: true } },
};
window.SHOPNEST_THEME_DEF = function(key){
var defs = window.SHOPNEST_THEME_DEFS || {};
return (key && defs[key]) ? defs[key] : null;
};
})();
