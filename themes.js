/* ================= ShopNest Themes (V3 Part A) =================
   Shared, dependency-free theme definitions. Load BEFORE script.js on the
   storefront, and before p-x7k94f.js / hq-m3d8w5.js on the admin pages
   (they reuse the same definitions for the theme pickers).

   V3.1: a theme now ALSO changes the whole storefront LAYOUT per
   business (themes.js -> layout: hero/header/grid/card/cats/deals/
   defaultOrder), inspired by big Pakistani sites (Daraz/Zeebay, Khaadi/
   Gul Ahmed, Telemart, Naheed/HumMart). It still never changes CONTENT:
   products, prices and section definitions stay the admin's. A theme's
   defaultOrder applies ONLY when the admin has NOT set a custom
   sections_order (custom order always wins); general's defaultOrder is
   null, so general keeps the exact legacy section behaviour.

   ALLOCATION SEMANTICS (stores.allowed_themes, jsonb):
     [] (empty array) or missing/null  =>  ALL themes allowed.
     ["fashion","food"]               =>  only those themes are offered.
   ACTIVE THEME precedence (storefront resolveActiveTheme):
     1) settings.data.theme   (store admin's own choice, if allowed + known)
     2) stores.theme          (super admin's default, if allowed + known)
     3) "general"             (fallback — looks exactly like today)
   An explicit settings.data.theme_color (admin Appearance) always beats
   the theme palette's accent on buttons/badges; theme fonts apply only
   when font_family is unset/default. */
(function(){
  var F = function(name, stack, google){ return { name: name, stack: stack, google: google }; };
  var THEMES = [
    {
      key: "general",
      layoutDesc: "Daraz/Zeebay style dense marketplace — 5-column grid, compact cards, slider hero",
      layout: { hero: "slider", header: "standard", grid: "dense", card: "compact", cats: "tiles", deals: "strip", defaultOrder: null },
      name: "General Store",
      nameUr: "Aam Dukaan",
      business: "General / local shopkeeper",
      tagline: "Har qisam ki dukaan ke liye — friendly aur bharosemand look",
      palette: { primary: "#0A2B4E", accent: "#22C55E", header: "#0A2B4E", footer: "#081F38", price: "#15803D", badge: "#22C55E" },
      /* general = aaj ka look: fonts EMPTY, taa ke Archivo/Oswald defaults
         hi chalein aur general theme bilkul pehle jaisa dikhe. */
      fonts: { head: F("", "", ""), body: F("", "", "") },
      heroStyle: "slider", cardStyle: "rounded", categoryStyle: "tiles"
    },
    {
      key: "fashion",
      layoutDesc: "Khaadi style editorial — full-width hero image, bari 4/5 images, centered header",
      layout: { hero: "editorial", header: "centered", grid: "large", card: "large", cats: "circles", deals: "grid", defaultOrder: ["hero", "categories", "best_sellers", "all_products", "promos", "hot", "new_arrivals", "deals", "about", "testimonials", "faq"], footer: "centered", button: "pill-gold", heading: "serif-upper" },
      name: "Fashion / Clothing",
      nameUr: "Fashion / Kapray",
      business: "Clothing, boutique, fashion store",
      tagline: "Elegant maroon + gold — kapron ki dukaan ke liye shahi look",
      palette: { primary: "#7F1D1D", accent: "#C9A227", header: "#471515", footer: "#2B0A0A", price: "#7F1D1D", badge: "#C9A227" },
      fonts: { head: F("Playfair Display", "'Playfair Display', Georgia, serif", "Playfair+Display:wght@500;600;700;800"),
               body: F("Inter", "'Inter', system-ui, sans-serif", "Inter:wght@400;500;600;700;800") },
      heroStyle: "banner", cardStyle: "rounded", categoryStyle: "tiles"
    },
    {
      key: "beauty",
      layoutDesc: "Clean beauty store — soft banner, reviews upar, pill categories",
      layout: { hero: "banner", header: "standard", grid: "standard", card: "standard", cats: "pills", deals: "strip", defaultOrder: ["hero", "categories", "best_sellers", "testimonials", "all_products", "promos", "about"], footer: "tinted", button: "pill-pink", heading: "soft" },
      name: "Beauty / Cosmetics",
      nameUr: "Beauty / Cosmetics",
      business: "Beauty, skincare, cosmetics store",
      tagline: "Soft rose + saaf white — beauty products ke liye narm look",
      palette: { primary: "#BE185D", accent: "#EC4899", header: "#9D174D", footer: "#500724", price: "#BE185D", badge: "#EC4899" },
      fonts: { head: F("Montserrat", "'Montserrat', system-ui, sans-serif", "Montserrat:wght@400;500;600;700;800"),
               body: F("Poppins", "'Poppins', system-ui, sans-serif", "Poppins:wght@400;500;600;700;800") },
      heroStyle: "banner", cardStyle: "soft", categoryStyle: "pills"
    },
    {
      key: "electronics",
      layoutDesc: "Telemart style spec store — bara search bar, spec line har card par, deals upar",
      layout: { hero: "compact", header: "search-first", grid: "standard", card: "spec", cats: "bar", deals: "grid", defaultOrder: ["hero", "deals", "categories", "best_sellers", "all_products", "hot", "about"], footer: "dark", button: "sharp", heading: "condensed-upper" },
      name: "Electronics / Mobile",
      nameUr: "Electronics / Mobile",
      business: "Tech, mobile, gadgets store",
      tagline: "Dark slate + electric blue — tech store ke liye modern look",
      palette: { primary: "#0F172A", accent: "#0EA5E9", header: "#0F172A", footer: "#020617", price: "#0284C7", badge: "#0EA5E9" },
      fonts: { head: F("Montserrat", "'Montserrat', system-ui, sans-serif", "Montserrat:wght@400;500;600;700;800"),
               body: F("Roboto", "'Roboto', system-ui, sans-serif", "Roboto:wght@400;500;700") },
      heroStyle: "minimal", cardStyle: "sharp", categoryStyle: "list"
    },
    {
      key: "food",
      layoutDesc: "Naheed/HumMart style grocery — dense grid, deals + budget upar, bar categories",
      layout: { hero: "banner", header: "standard", grid: "dense", card: "compact", cats: "bar", deals: "grid", defaultOrder: ["hero", "categories", "deals", "budget", "best_sellers", "all_products", "about"], footer: "warm", button: "rounded", heading: "bold-rounded" },
      name: "Food / Bakery / Grocery",
      nameUr: "Food / Bakery / Grocery",
      business: "Food, bakery, grocery store",
      tagline: "Warm orange + brown — khane ki dukaan ke liye mazedar look",
      palette: { primary: "#C2410C", accent: "#F59E0B", header: "#7C2D12", footer: "#431407", price: "#C2410C", badge: "#F59E0B" },
      fonts: { head: F("Poppins", "'Poppins', system-ui, sans-serif", "Poppins:wght@400;500;600;700;800"),
               body: F("Rubik", "'Rubik', system-ui, sans-serif", "Rubik:wght@400;500;600;700") },
      heroStyle: "banner", cardStyle: "soft", categoryStyle: "tiles"
    }
     , { key: "playful", layoutDesc: "FunBug-style ALAG layout — crossfade hero (static headline, badalta product), auto-slide categories + trust, swipe cards, featured + reels + blog", layout: { hero: "banner", header: "standard", grid: "standard", card: "standard", cats: "circles", deals: "grid", defaultOrder: ["hero", "categories", "trust", "best_sellers", "featured", "promos", "reels", "budget", "testimonials", "blog", "about", "how_to_order", "faq", "hot", "new_arrivals", "deals", "all_products"], footer: "dark", button: "rounded", heading: "bold-rounded" }, name: "Playful Pop", nameUr: "Playful / Rangin", business: "Gaming, toys, gifts, trendy store", tagline: "Rangin aur playful — gaming, toys aur trendy dukaan ke liye fun look", palette: { primary: "#241A4D", accent: "#FF7A1A", header: "#1B1440", footer: "#120D2E", price: "#241A4D", badge: "#FF7A1A" }, fonts: { head: F("Outfit", "'Outfit', system-ui, sans-serif", "Outfit:wght@500;600;700;800"), body: F("Inter", "'Inter', system-ui, sans-serif", "Inter:wght@400;500;600;700")}, heroStyle: "banner", cardStyle: "soft", categoryStyle: "tiles" },
     {
              key: "luxury",
              layoutDesc: "Asim Jofa style premium fashion — full-bleed editorial hero, serif headings, portrait cards, mobile swipe rows",
              layout: { hero: "editorial", header: "centered", grid: "large", card: "large", cats: "tiles", deals: "grid", defaultOrder: ["hero", "new_arrivals", "festive", "unstitched_tabs", "readytowear_tabs", "editorial", "reels", "hot", "deals", "testimonials", "trust", "all_products", "about", "faq"], footer: "dark", button: "sharp", heading: "serif-upper" },
              name: "Luxury / Premium Fashion",
              nameUr: "Luxury / Premium Fashion",
              business: "Fashion boutique, luxury lawn/velvet, premium clothing",
              tagline: "Ivory + deep green + gold — premium fashion brands jaisi elegant look",
              palette: { primary: "#0B3D2E", accent: "#B08D57", header: "#0B3D2E", footer:  "#0B3D2E", price: "#16130E", badge: "#A52A2A" },
              fonts: { head: F("Playfair Display", "'Playfair Display', Georgia, serif", "Playfair+Display:wght@500;600;700;800"),
                                     body: F("Jost", "'Jost', system-ui, sans-serif", "Jost:wght@400;500;600;700") },
              heroStyle: "banner", cardStyle: "sharp", categoryStyle: "tiles"
     }
     ];
  var byKey = {};
  THEMES.forEach(function(t){ byKey[t.key] = t; });
  window.SHOPNEST_THEMES = THEMES;
  window.SHOPNEST_THEME = function(key){ return byKey[key] || byKey["general"]; };
  window.SHOPNEST_THEME_KNOWN = function(key){ return !!byKey[key]; };
  /* allowed_themes semantics: [] / null / non-array => ALL themes. */
  window.SHOPNEST_ALLOWED_THEMES = function(allowed){
    if (!Array.isArray(allowed) || allowed.length === 0) return THEMES.slice();
    var out = THEMES.filter(function(t){ return allowed.indexOf(t.key) !== -1; });
    return out.length ? out : THEMES.slice();
  };
})();
