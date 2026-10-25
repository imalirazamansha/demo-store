/* ================= ShopNest Themes (V3 Part A) =================
   Shared, dependency-free theme definitions. Load BEFORE script.js on the
   storefront, and before p-x7k94f.js / hq-m3d8w5.js on the admin pages
   (they reuse the same definitions for the theme pickers).

   A theme changes ONLY the LOOK (colors, fonts, card radius, hero style,
   category style) — never content or sections. Sections order/visibility
   stays in settings.data.sections_order (Homepage builder).

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
      name: "Food / Bakery / Grocery",
      nameUr: "Food / Bakery / Grocery",
      business: "Food, bakery, grocery store",
      tagline: "Warm orange + brown — khane ki dukaan ke liye mazedar look",
      palette: { primary: "#C2410C", accent: "#F59E0B", header: "#7C2D12", footer: "#431407", price: "#C2410C", badge: "#F59E0B" },
      fonts: { head: F("Poppins", "'Poppins', system-ui, sans-serif", "Poppins:wght@400;500;600;700;800"),
               body: F("Rubik", "'Rubik', system-ui, sans-serif", "Rubik:wght@400;500;600;700") },
      heroStyle: "banner", cardStyle: "soft", categoryStyle: "tiles"
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
