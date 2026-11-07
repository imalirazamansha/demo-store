/* ================= CONFIG =================
   Supabase project keys — admin dashboard isi database se chalta hai.
   (anon key public hoti hai; asal security database policies (RLS) se hai.) */
const SUPABASE_URL = "https://vyiwiqcbituttdjgsuwe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXdpcWNiaXR1dHRkamdzdXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTQ0MTYsImV4cCI6MjEwODA5MDQxNn0.fQDW8_b27GzTpu5XBi_Nqw12mmJlJodE0yB3Ei1KLNo";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => "Rs." + Number(n || 0).toLocaleString("en-PK");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
/* V3 Part B security: escapeHtml = esc (wahi naam jo admin files mein hai).
   safeUrl: sirf http(s) ya relative URLs ko jaane deta hai — javascript:,
   data:text/html, vbscript: jaise schemes ko khaali kar deta hai, taa ke
   admin se aayi image/link values se XSS na ho. */
const escapeHtml = esc;
function safeUrl(u){
  const t = String(u || "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/") || t.startsWith("./") || t.startsWith("../")) return t;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) return t; /* relative path, koi scheme nahi */
  return "";
}

/* ---------- SVG icons (sprite index.html mein hai: #i-* stroke, #b-* brand) ---------- */
const icon = (name, cls) => `<svg class="ic ${cls || ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const brandIcon = name => `<svg class="ic" aria-hidden="true"><use href="#b-${name}"/></svg>`;
/* Admin (Part A) ke FONTS ka mirror — legacy string font_family resolve karne ke liye. */
const STORE_FONTS = {
  "": { name: "", stack: "", google: "" },
  "Poppins": { name: "Poppins", stack: "'Poppins', system-ui, sans-serif", google: "Poppins:wght@400;500;600;700;800" },
  "Inter": { name: "Inter", stack: "'Inter', system-ui, sans-serif", google: "Inter:wght@400;500;600;700;800" },
  "Roboto": { name: "Roboto", stack: "'Roboto', system-ui, sans-serif", google: "Roboto:wght@400;500;700" },
  "Montserrat": { name: "Montserrat", stack: "'Montserrat', system-ui, sans-serif", google: "Montserrat:wght@400;500;600;700;800" },
  "Playfair Display": { name: "Playfair Display", stack: "'Playfair Display', Georgia, serif", google: "Playfair+Display:wght@500;600;700;800" },
  "Rubik": { name: "Rubik", stack: "'Rubik', system-ui, sans-serif", google: "Rubik:wght@400;500;600;700" }
};
/* ---------- V3.2 Style Editor validation ----------
   Color values sirf tab style mein lagti hain jab ye validator pass kare:
   #RRGGBB hex ya chhoti allowlist ke named colors. javascript:, data:,
   url(...) ya koi aur raw string yahan se kabhi style mein nahi jaati. */
const STYLE_NAMED_COLORS = ["white", "black", "red", "green", "blue", "pink", "orange", "purple", "navy", "teal", "maroon", "gold", "cream", "beige", "grey", "gray", "brown", "yellow", "transparent"];
function validStyleColor(v){
  const t = String(v || "").trim();
  if (!t) return "";
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t;
  const low = t.toLowerCase();
  return STYLE_NAMED_COLORS.indexOf(low) !== -1 ? low : "";
}
function clampStyleRadius(v){
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return "";
  return Math.min(30, Math.max(0, n));
}
const STYLE_SHADOWS = ["", "none", "soft", "strong"];
const STYLE_SHADOW_VALUES = { none: "none", soft: "0 10px 26px rgba(10,43,78,.10)", strong: "0 22px 46px rgba(10,43,78,.22)" };
const STYLE_FONT_SIZES = { S: "12px", M: "14px", L: "16px" };
/* Style Editor wale section keys (SECTION_NODE_IDS ka subset — trust strip
   is list mein nahi, us ka style theme se hi aata hai). */
const STYLE_SECTION_KEYS = ["hero", "categories", "best_sellers", "all_products", "promos", "hot", "new_arrivals", "deals", "budget", "about", "how_to_order", "faq", "testimonials"];
/* Hex color ko halka/gahra karna (theme hover shades ke liye). amt: -1..1 */
function shade(hex, amt){
  const n = parseInt(String(hex).slice(1), 16);
  if (!Number.isFinite(n)) return hex;
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p) + r; g = Math.round((t - g) * p) + g; b = Math.round((t - b) * p) + b;
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/* Storefront defaults. Admin Settings in values ko settings table se override kar sakta hai. */
const DEFAULT_SETTINGS = {
  store_name: "ShopNest",
  announcements: [
    "{STORE} — PAKISTAN KA SMART STORE",
    "CASH ON DELIVERY ALL OVER PAKISTAN",
    "FAST DELIVERY 3–5 DAYS",
    "HOT DEALS — LIMITED STOCK"
  ],
  hero: [
    {
      pill: "MEGA SALE — 50% TAK OFF",
      title: "SMART GADGETS, SMART LIFE!",
      subtitle: "Pakistan ke best smart gadgets — quality checked, Cash on Delivery ke saath, seedha aapke ghar tak.",
      button: "SHOP BEST SELLERS",
      image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=80",
      visible: true
    },
    {
      pill: "AUDIO, WEARABLES & MORE",
      title: "HAR GHAR KI ZAROORAT!",
      subtitle: "Headphones, smart watches aur roz-marra ke useful products — honest prices aur fast dispatch.",
      button: "SHOP DEALS",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
      visible: true
    }
  ],
  /* Homepage sections on/off — admin Settings se toggle hote hain. */
  sections: { best: true, hot: true, arrivals: true, deals: true, budget: true, about: true, howto: true, faq: true, reviews: true, promos: true },
  /* Footer policy pages — admin Settings se text edit hota hai; khaali ho to built-in default text. */
  policies: { shipping: "", refund: "", privacy: "", terms: "", contact: "" },
  /* Store profile — logo image + footer contact lines. */
  profile: { logo_url: "", email: "", phone: "", address: "" },
  promo: [
    {
      kicker: "HOME ESSENTIALS",
      heading: "GHAR KE LIYE SMART CHOICE",
      text: "Waqt aur mehnat dono bachayein — smart home products jo roz ka kaam asaan kar dein.",
      category: "Home & Living"
    },
    {
      kicker: "STYLE & FASHION",
      heading: "LOOK BHI, COMFORT BHI",
      text: "Trending fashion essentials — quality checked aur Cash on Delivery ke saath.",
      category: "Fashion"
    }
  ],
  about_heading: "PAKISTAN KA SMART STORE",
  about_text: "ShopNest par hum sirf wohi products rakhte hain jo pehle test kiye jayein. Har order dispatch se pehle quality-check hota hai aur payment Cash on Delivery hai — pehle product aapke haath mein, phir paisay. Poore Pakistan mein fast dispatch, aur damaged ya wrong product par easy exchange. Smart shopping, bina tension!",
  /* --- V3.3 Content (admin "Content" tab; key maujood na ho to ye defaults) --- */
  howSteps: [
    { title: "PRODUCT CHUNEIN", text: "Apni pasand ka product select karein aur details achi tarah parhein." },
    { title: "ORDER FORM BHAREIN", text: "Naam, mobile number, city aur mukammal address likhein." },
    { title: "CONFIRMATION CALL", text: "Humari team call karke order aur address confirm karegi." },
    { title: "DELIVERY PE PAYMENT", text: "Product milne par Cash on Delivery mein payment karein." }
  ],
  faqs: [
    { q: "Kya Cash on Delivery available hai?", a: "Ji haan, poore Pakistan mein Cash on Delivery available hai. Product milne ke baad payment karein." },
    { q: "Delivery kitne din mein hoti hai?", a: "Aam taur par delivery 3–5 working days mein ho jati hai. Kuch shehron mein is se jaldi bhi mil sakti hai." },
    { q: "Order confirm kaise hoga?", a: "Order place karne ke baad humari team aapko call karke naam, address aur product details confirm karegi." },
    { q: "Agar product damaged ya wrong aa jaye to?", a: "Damaged ya wrong product ki soorat mein hum se foran rabta karein. Policy ke mutabiq easy exchange ki sahulat available hai." },
    { q: "Kya products original aur tested hain?", a: "Har product dispatch se pehle quality-check aur test kiya jata hai taa ke aapko sahi aur working product mile." }
  ],
  reviews: [
    { product: "Luxury Perfume — 100ml", name: "Ahmed Raza", city: "Lahore", rating: 4.8, text: "Product bilkul tasveer jaisa mila. Quality boht achi hai aur delivery bhi time par ho gayi." },
    { product: "Wireless Noise-Cancelling Headphones", name: "Fatima Khan", city: "Karachi", rating: 4.8, text: "Cash on Delivery ki wajah se bina tension order kiya. Packing aur product dono zabardast thay." },
    { product: "Running Sneakers — Lightweight", name: "Usman Ali", city: "Islamabad", rating: 4.7, text: "Price ke hisaab se quality boht behtar hai. Main apni family ko bhi recommend karoon ga." },
    { product: "Mechanical Keyboard — RGB", name: "Ayesha Noor", city: "Faisalabad", rating: 4.7, text: "Order confirm karne ke liye call aayi aur do din mein parcel mil gaya. Boht satisfied hoon." }
  ],
  budgetTiles: [
    { label: "UNDER", amount: "Rs.1,499", note: "Choti price, smart choice", budget: "1499" },
    { label: "UNDER", amount: "Rs.1,999", note: "Roz-marra ki essentials", budget: "1999" },
    { label: "UNDER", amount: "Rs.2,999", note: "Value picks, zyada faida", budget: "2999" },
    { label: "★ TOP PICKS", amount: "HIGHEST RATED", note: "Customers ki pehli pasand", budget: "top" }
  ],
  trustItems: [
    { title: "CASH ON DELIVERY", sub: "Pay when it arrives" },
    { title: "FAST DELIVERY", sub: "3–5 days, all Pakistan" },
    { title: "QUALITY CHECKED", sub: "Tested before dispatch" },
    { title: "EASY EXCHANGE", sub: "On damaged items" }
  ],
  whatsapp_number: "",
  /* --- V3.6 Playful Pop layout: Instagram reels + blog (Content tab se) --- */ instaHandle: "", instaReels: [], blogPosts: [], showReels: true, showBlog: true, /* --- V3.9 Fashion options + editable section/PDP text --- */ showSizes: true, showColors: true, showDisclaimer: true, sectionText: {}, pdpText: { details: "", related: "", delivery: "" }, /* --- V3.10 Luxury theme content (Festive tiles, Collection tabs, Editorial banner) --- */ luxuryTiles: [], luxuryTabs: [], luxuryBanner: { img: "", eyebrow: "", title: "", button: "", cat: "" }, /* --- V3.11 Luxury: Ready To Wear tabs + Editorial slider --- */ luxuryRtwTabs: [], luxuryBanners: [], collectionPages: [], /* --- V5 Phase 4: custom pages (har theme, menu + SEO) --- */ customPages: [], /* --- V5 Phase 5: Meta (Pixel + CAPI) + custom code (har theme) --- */ meta: { pixelId: "", capiEnabled: false, testEventCode: "", hasCapiToken: false, capiTokenLast4: "" }, customCode: { head: "", body: "" }, /* --- V2 keys (Part A admin contract) --- */
  font_family: { name: "", stack: "", google: "" },
  theme_color: "",
  logo_url: "",
  socials: { facebook: "", instagram: "", tiktok: "", youtube: "", x: "", whatsapp: "" },
  menu_links: [],
  footer_links: [],
  footer_text: "",
  sections_order: null,
  custom_sections: [],
  checkout_fields: [],
  product_fields: [],
  animations: true,
  /* --- V3 theme (store admin ki choice; settings.data.theme) --- */
  theme: "",
  /* --- V3.2 Style Editor (admin "Style" tab; khaali = theme default) --- */
  style: {
    card: { radius: "", bg: "", border: "", shadow: "", titleColor: "", priceColor: "" },
    sections: {},
    buttons: { primaryBg: "", primaryColor: "", radius: "", secondaryColor: "", fontSize: "" },
    page: { headerBg: "", footerBg: "", marqueeBg: "", pageBg: "", textColor: "" },
    socialProof: { enabled: true, intervalSec: 20, durationSec: 5, entries: [] },
    sectionStyles: {},
  }
};
let SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

/* ---------- Multi-tenant state ----------
   STORE = storefront_stores view se resolved row { id, slug, name, status }.
   STORE_ID null ho to SINGLE-TENANT FALLBACK hai (platform migration abhi
   nahi chali / stores lookup fail) — saari queries baghair store filter ke
   chalti hain taa ke live shop kabhi band na ho. */
const PLATFORM_HOSTS = ["localhost", "127.0.0.1", "imalirazamansha.github.io"];
let STORE = null;
let STORE_ID = null;
let STORE_SLUG = "shopnest";

let PRODUCTS = [];
let CATEGORIES = []; /* categories table ki rows (name/image/visible/sort); fail ho to [] = products se derive */
let CAT_LIST = [];
let HERO_SLIDES = []; /* applySettings mein visible hero slides */
let appliedCoupon = null; /* { code, pct } — checkout par ek waqt mein ek hi coupon */
let activeCat = "All";
let maxPrice = null; /* V3.10 Luxury Filters sheet state (sirf Luxury toolbar se set hota hai; khaali = koi filter nahi — doosre themes par be-asar). */ let luxMinPrice = null, luxMaxPrice = null, luxOnSale = false, luxInStock = false, luxSize = null, luxCat = null, luxPcs = null, luxFabric = null;
/* Cart har store ka alag: key boot mein resolve ke baad banti hai
   ("shopnest_cart_<slug>"). Us se pehle cart khaali object hai. */
let CART_KEY = "shopnest_cart";
let cart = {};
let checkoutState = null;
let pdpId = null;
let pdpQty = 1;
let heroIndex = 0;
let heroTimer = null;

function stars(r){
  const f = Math.max(0, Math.min(5, Math.round(Number(r) || 0)));
  return "★".repeat(f) + "☆".repeat(5 - f);
}
function findP(id){ return PRODUCTS.find(x => x.id === +id); }
function ratingOf(p){ return Number(p && p.rating) || 0; }
function reviewsOf(p){ return Number(p && p.reviews) || 0; }
function discountOf(p){
  return p && Number(p.old) > Number(p.price) ? Math.round((1 - Number(p.price) / Number(p.old)) * 100) : 0;
}
/* Card/PDP par nazar aane wala discount %: admin ne discount_pct set kiya ho to wohi,
   warna price/old_price se auto hisaab. */
function effectivePct(p){
  const custom = p ? Number(p.discount_pct) : NaN;
  if (Number.isFinite(custom) && custom > 0) return Math.min(90, Math.round(custom));
  return discountOf(p);
}
/* Description text ko paragraphs mein render karna: khali line = naya paragraph,
   single line break = <br>. Pehle HTML escape hota hai (XSS safe). */
function descHtml(text){
  const t = String(text || "").trim();
  if (!t) return "<p>Quality checked product — dispatch se pehle test kiya jata hai.</p>";
  return t.split(/\n\s*\n/).map(block => `<p>${esc(block.trim()).replace(/\n/g, "<br>")}</p>`).join("");
}
/* Har product ki apni delivery fee (admin se set hoti hai). 0 = FREE delivery.
   Fee product par EK dafa lagti hai — quantity jitni bhi ho. */
function feeOf(p){ return Math.max(0, Number(p && p.delivery_fee) || 0); }
function deliveryTotal(entries){ return entries.reduce((sum, [k]) => sum + feeOf(findP(parseCartKey(k).id)), 0); }
function delivText(p){
  const f = feeOf(p);
  return f === 0 ? `${icon("truck", "ic-inline")} FREE Delivery` : `${icon("truck", "ic-inline")} Delivery: ${fmt(f)}`;
}

/* ---------- V3.6 Playful Pop layout helpers ---------- */ function isPlayful(){ return !!(ACTIVE_THEME && ACTIVE_THEME.key === "playful"); } function isLuxury(){ return !!(ACTIVE_THEME && ACTIVE_THEME.key === "luxury"); } /* ---------- V4 Phase 1: theme registry helpers (def-driven gating/dispatch) ----------    isLuxury() / isPlayful() thin wrappers rehte hain; koi branch Phase 1 mein nahi hat-ti. */ function getThemeDef(){ var key = (typeof ACTIVE_THEME !== "undefined" && ACTIVE_THEME && ACTIVE_THEME.key) ? ACTIVE_THEME.key : ""; try { return (key && window.SHOPNEST_THEME_DEF) ? (window.SHOPNEST_THEME_DEF(key) || null) : null; } catch (e){ return null; } } /* Theme-only section lists def se; na mile to purani literal values. */ function v4OnlySections(themeKey, fallback){ var d = null; try { d = window.SHOPNEST_THEME_DEF ? window.SHOPNEST_THEME_DEF(themeKey) : null; } catch (e){ d = null; } if (d && Array.isArray(d.onlySections) && d.onlySections.length) return d.onlySections.slice(); return fallback.slice(); } /* Section render dispatch table — def ke `render` naam se function. */ var THEME_SECTION_RENDERERS = { renderFestive: renderFestive, renderUnstitchedTabs: renderUnstitchedTabs, renderRtwTabs: renderRtwTabs, renderEditorial: renderEditorial, renderReels: renderReels, renderFeatured: renderFeatured, renderBlog: renderBlog, renderTrending: renderTrending }; /* Def ka renderer chalao; def/section/render na mile to purana call (fallback). */ function renderThemeSection(key, fallbackFn){ var def = getThemeDef(); var sec = null; if (def && Array.isArray(def.sections)){ for (var i = 0; i < def.sections.length; i++){ if (def.sections[i] && def.sections[i].key === key){ sec = def.sections[i]; break; } } } var fn = (sec && sec.render) ? THEME_SECTION_RENDERERS[sec.render] : null; if (typeof fn === "function") fn(); else if (typeof fallbackFn === "function") fallbackFn(); } /* V4 schema sanitizers — def ke parameters se; V3 lines jaisi values. */ function v4CleanStr(v){ return String(v || ""); } function v4SanitizeList(rawList, fields, max, keep){ if (!Array.isArray(rawList)) return null; /* null = raw khaali/ghalat type: V3 line bhi default rehne deti hai */ var out = rawList.filter(function(x){ return x && typeof x === "object"; }).map(function(x){ var o = {}; fields.forEach(function(f){ o[f] = v4CleanStr(x[f]); }); return o; }).filter(function(o){ if (keep === "all") return true; if (keep === "img") return !!o.img; if (keep === "cat") return !!o.cat; return fields.some(function(f){ return !!o[f]; }); /* keep "any" */ }); return (typeof max === "number") ? out.slice(0, max) : out; } function v4SanitizeObject(rawObj, fields){ if (!rawObj || typeof rawObj !== "object") return null; var o = {}; fields.forEach(function(f){ if (typeof rawObj[f] === "string") o[f] = rawObj[f]; }); return o; } /* V4 schema loop — def ki keys whitelist mein. ADDITIVE: V3 lines upar rehti hain aur same values likhti hain; loop unhein dobara same tarah likhta hai. Sirf `deferred` keys skip hoti hain (showDisclaimer — storefront par aaj dead hai; usay chherna behaviour change hoga, Phase 2+ ka kaam). */ function applyThemeSchema(out, raw){ var defs = window.SHOPNEST_THEME_DEFS || {}; Object.keys(defs).forEach(function(dk){ var def = defs[dk]; var schema = def && def.settingsSchema; if (!schema) return; Object.keys(schema).forEach(function(key){ var spec = schema[key]; if (!spec || spec.deferred) return; if (spec.type === "list"){ var list = v4SanitizeList(raw[key], spec.fields, spec.max, spec.keep); if (list !== null) out[key] = list; } else if (spec.type === "string"){ if (typeof raw[key] === "string") out[key] = raw[key].trim(); } else if (spec.type === "boolean"){ if (typeof raw[key] === "boolean") out[key] = raw[key]; } else if (spec.type === "object"){ var obj = v4SanitizeObject(raw[key], spec.fields); if (obj !== null && out[key] && typeof out[key] === "object"){ Object.keys(obj).forEach(function(f){ out[key][f] = obj[f]; }); } } else if (spec.type === "map"){ if (raw[key] && typeof raw[key] === "object"){ if (!out[key] || typeof out[key] !== "object") out[key] = {}; if (spec.kind === "open"){ Object.keys(raw[key]).forEach(function(k){ if (typeof raw[key][k] === "string") out[key][k] = raw[key][k]; }); } else if (spec.kind === "fixed"){ spec.keys.forEach(function(k){ if (typeof raw[key][k] === "string") out[key][k] = raw[key][k]; }); } } } }); }); } /* Product ki gallery: Supabase products.gallery (jsonb array) ya comma wali string — dono support, taa ke purana data bhi chale. */ function galleryOf(p){ const g = p && p.gallery; if (Array.isArray(g)) return g.map(v => String(v || "").trim()).filter(Boolean); if (typeof g === "string") return g.split(",").map(s => s.trim()).filter(Boolean); return []; } /* Fun-hero ke products: Featured pehle, warna top-reviewed; max 4. */ function funHeroItems(){ const live = PRODUCTS.filter(p => p.active !== false); const feats = live.filter(p => p.featured).sort((a, b) => reviewsOf(b) - reviewsOf(a)); const pool = feats.length ? feats : [...live].sort((a, b) => reviewsOf(b) - reviewsOf(a)); return pool.slice(0, 4); } let PLAYFUL_HERO = false; let funHeroTimer = null; let funHeroIndex = 0; function stopFunHero(){ if (funHeroTimer){ clearInterval(funHeroTimer); funHeroTimer = null; } } function showFunHero(i){ const items = document.querySelectorAll("#heroTrack .fh-item"); if (!items.length) return; funHeroIndex = (i + items.length) % items.length; items.forEach((el, j) => el.classList.toggle("active", j === funHeroIndex)); document.querySelectorAll("#heroDots [data-fh-dot]").forEach((b, j) => b.classList.toggle("active", j === funHeroIndex)); const bg = document.querySelector("#heroTrack .fun-hero-bg"); if (bg) bg.className = "fun-hero-bg fh-bg-" + (funHeroIndex % 4); } function startFunHero(){ stopFunHero(); if (SETTINGS.animations === false || REDUCED_MOTION) return; funHeroTimer = setInterval(() => { if (!document.hidden) showFunHero(funHeroIndex + 1); }, 3500); } /* ---------- Settings ---------- */
/* ---------- V5 Phase 2a: per-section style controls (settings.sectionStyles) ----------
   ADDITIVE sixth subtree: settings.sectionStyles.<sectionKey> = {
     cardsDesktop, cardsMobile, total, heightDesktop, heightMobile,
     widthMode, maxWidth, align, bold, italic,
     colors: { heading, text, buttonBg, buttonText, price, badge, badgeText, bannerText },
     bg, padding, margin }.
   Har field optional hai; khaali/ghalat value = aaj ka behaviour (koi override nahi).
   Merge sirf maujood keys likhta hai; render sirf set values lagata hai. */
const SECTION_STYLE_KEYS = ["hero", "trust", "categories", "best_sellers", "featured", "festive", "unstitched_tabs", "readytowear_tabs", "editorial", "all_products", "promos", "reels", "hot", "new_arrivals", "deals", "budget", "about", "how_to_order", "faq", "testimonials", "blog"];
const SECTION_STYLE_GRIDS = { best_sellers: "bestGrid", new_arrivals: "newGrid", deals: "dealGrid", all_products: "grid" };
const SECTION_STYLE_DEFAULT_TOTAL = { best_sellers: 8, hot: 10, new_arrivals: 20, deals: 8, all_products: 0 };
var APPLIED_SEC_INLINE = {};
function clampStyleInt(v, lo, hi){ const n = parseInt(v, 10); if (!Number.isFinite(n)) return 0; return Math.max(lo, Math.min(hi, n)); }
function sanitizeSectionStyle(raw){
  if (!raw || typeof raw !== "object") return null;
  const o = {};
  const cd = clampStyleInt(raw.cardsDesktop, 1, 6); if (cd) o.cardsDesktop = cd;
  const cm = clampStyleInt(raw.cardsMobile, 1, 3); if (cm) o.cardsMobile = cm;
  const tt = clampStyleInt(raw.total, 1, 50); if (tt) o.total = tt;
  const hd = clampStyleInt(raw.heightDesktop, 0, 1200); if (hd) o.heightDesktop = hd;
  const hm = clampStyleInt(raw.heightMobile, 0, 1200); if (hm) o.heightMobile = hm;
  if (["full", "boxed", "narrow"].indexOf(String(raw.widthMode || "")) !== -1) o.widthMode = String(raw.widthMode);
  const mw = clampStyleInt(raw.maxWidth, 320, 1600); if (mw) o.maxWidth = mw;
  if (["left", "center", "right"].indexOf(String(raw.align || "")) !== -1) o.align = String(raw.align);
  if (raw.bold === true) o.bold = true;
  if (raw.italic === true) o.italic = true;
  const cols = {};
  if (raw.colors && typeof raw.colors === "object"){
    ["heading", "text", "buttonBg", "buttonText", "price", "badge", "badgeText", "bannerText"].forEach(function(f){ const c = validStyleColor(raw.colors[f]); if (c) cols[f] = c; });
  }
  if (Object.keys(cols).length) o.colors = cols;
  const bg = validStyleColor(raw.bg); if (bg) o.bg = bg;
  const pd = clampStyleInt(raw.padding, 0, 120); if (pd) o.padding = pd;
  const mg = clampStyleInt(raw.margin, 0, 120); if (mg) o.margin = mg;
  return Object.keys(o).length ? o : null;
}
function mergeSectionStyles(out, raw){
  if (!raw || !raw.sectionStyles || typeof raw.sectionStyles !== "object") return;
  if (!out.sectionStyles || typeof out.sectionStyles !== "object") out.sectionStyles = {};
  SECTION_STYLE_KEYS.forEach(function(k){
    const s = sanitizeSectionStyle(raw.sectionStyles[k]);
    if (s) out.sectionStyles[k] = s;
  });
}
function secStyle(key){
  const all = (typeof SETTINGS !== "undefined" && SETTINGS && SETTINGS.sectionStyles) || {};
  return (all && all[key] && typeof all[key] === "object") ? all[key] : {};
}
function secTotal(key, defTotal){
  const s = secStyle(key);
  if (Number.isFinite(s.total) && s.total > 0) return Math.max(1, Math.min(50, s.total));
  return defTotal;
}
function applySectionStyles(){
  /* Container overrides (bg, heading rang) inline lagte hain — applyStyleSettings()
     ke BAAD chalte hain, is liye set value jeet-ti hai. APPLIED_SEC_INLINE yaad
     rakhta hai ke hum ne kya lagaya tha, taa ke clear karne par sirf apni value
     hatayein (Style-tab ki value ko chhoote nahi). Descendant colors + grid cols
     + heights generated <style> rules se lagte hain (re-render se mehfooz). */
  if (typeof document === "undefined") return;
  const all = (typeof SETTINGS !== "undefined" && SETTINGS && SETTINGS.sectionStyles) || {};
  let css = "";
  Object.keys(SECTION_NODE_IDS).forEach(function(key){
    const el = document.getElementById(SECTION_NODE_IDS[key]);
    if (!el) return;
    const s = (all[key] && typeof all[key] === "object") ? all[key] : {};
    const c = s.colors || {};
    const id = SECTION_NODE_IDS[key];
    const prev = APPLIED_SEC_INLINE[key] || {};
    if (s.bg){ el.style.background = s.bg; prev.bg = true; }
    else if (prev.bg){ el.style.background = ""; prev.bg = false; }
    const h = el.querySelector(".section-title, h1");
    if (c.heading){ if (h) h.style.color = c.heading; prev.heading = true; }
    else if (prev.heading){ if (h) h.style.color = ""; prev.heading = false; }
    APPLIED_SEC_INLINE[key] = prev;
    el.style.paddingTop = s.padding ? s.padding + "px" : "";
    el.style.paddingBottom = s.padding ? s.padding + "px" : "";
    el.style.marginTop = s.margin ? s.margin + "px" : "";
    el.style.marginBottom = s.margin ? s.margin + "px" : "";
    if (s.widthMode === "boxed"){ el.style.maxWidth = (s.maxWidth || 1180) + "px"; el.style.marginLeft = "auto"; el.style.marginRight = "auto"; }
    else if (s.widthMode === "narrow"){ el.style.maxWidth = (s.maxWidth || 900) + "px"; el.style.marginLeft = "auto"; el.style.marginRight = "auto"; }
    else if (s.widthMode === "full"){ el.style.maxWidth = "none"; el.style.marginLeft = ""; el.style.marginRight = ""; }
    else { el.style.maxWidth = ""; el.style.marginLeft = ""; el.style.marginRight = ""; }
    el.style.textAlign = s.align || "";
    el.style.fontWeight = s.bold ? "700" : "";
    el.style.fontStyle = s.italic ? "italic" : "";
    if (s.heightDesktop) css += "#" + id + "{min-height:" + s.heightDesktop + "px}";
    if (s.heightMobile) css += "@media(max-width:760px){#" + id + "{min-height:" + s.heightMobile + "px}}";
    const gridId = SECTION_STYLE_GRIDS[key];
    if (gridId){
      if (s.cardsDesktop) css += "#" + gridId + "{grid-template-columns:repeat(" + s.cardsDesktop + ",1fr)}";
      if (s.cardsMobile) css += "@media(max-width:760px){#" + gridId + "{grid-template-columns:repeat(" + s.cardsMobile + ",1fr)}}";
    }
    if (c.text) css += "#" + id + " .section-sub{color:" + c.text + "}";
    if (c.buttonBg) css += "#" + id + " .btn,#" + id + " .mini-btn{background:" + c.buttonBg + "}";
    if (c.buttonText) css += "#" + id + " .btn,#" + id + " .mini-btn{color:" + c.buttonText + "}";
    if (c.price) css += "#" + id + " .price strong{color:" + c.price + "}";
    if (c.badge) css += "#" + id + " .discount-badge,#" + id + " .sale-off-badge{background:" + c.badge + "}";
    if (c.badgeText) css += "#" + id + " .discount-badge,#" + id + " .sale-off-badge{color:" + c.badgeText + "}";
    if (c.bannerText) css += "#" + id + " .editorial-overlay h3,#" + id + " .editorial-eyebrow,#" + id + " .ed-btn,#" + id + " .hero-content h1,#" + id + " .hero-content p,#" + id + " .hero-pill{color:" + c.bannerText + "}";
  });
  let st = document.getElementById("secStyleRules");
  if (!st){ st = document.createElement("style"); st.id = "secStyleRules"; document.head.appendChild(st); }
  st.textContent = css;
}
function mergeSettings(raw){
  const out = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (!raw || typeof raw !== "object") return out;
  if (typeof raw.store_name === "string" && raw.store_name.trim()) out.store_name = raw.store_name.trim();
  if (Array.isArray(raw.announcements)) out.announcements = out.announcements.map((d, i) => typeof raw.announcements[i] === "string" && raw.announcements[i].trim() ? raw.announcements[i] : d);
  /* Hero ab dynamic ARRAY hai (1–4 slides, har slide par visible flag).
     Purana fixed 2-slide shape bhi isi branch se theek render ho jata hai. */
  if (Array.isArray(raw.hero) && raw.hero.length){
    out.hero = raw.hero.slice(0, 4).map(s => {
      const d = { pill: "", title: "", subtitle: "", button: "", image: "", visible: true };
      if (!s || typeof s !== "object") return d;
      ["pill", "title", "subtitle", "button", "image"].forEach(k => { if (typeof s[k] === "string") d[k] = s[k]; });
      d.visible = s.visible !== false;
      return d;
    });
  }
  if (Array.isArray(raw.promo)) out.promo = out.promo.map((d, i) => ({ ...d, ...(raw.promo[i] && typeof raw.promo[i] === "object" ? raw.promo[i] : {}) }));
  if (typeof raw.about_heading === "string" && raw.about_heading.trim()) out.about_heading = raw.about_heading.trim();
  if (typeof raw.about_text === "string" && raw.about_text.trim()) out.about_text = raw.about_text.trim();
  /* V3.3 Content lists — key maujood ho to wahi (khaali array = admin ne sab
     delete kiye); key na ho to DEFAULT_SETTINGS wale defaults rehte hain. */
  const cleanStr = v => String(v || "");
  if (Array.isArray(raw.howSteps)) out.howSteps = raw.howSteps.filter(x => x && typeof x === "object").map(x => ({ title: cleanStr(x.title), text: cleanStr(x.text) }));
  if (Array.isArray(raw.faqs)) out.faqs = raw.faqs.filter(x => x && typeof x === "object").map(x => ({ q: cleanStr(x.q), a: cleanStr(x.a) }));
  if (Array.isArray(raw.reviews)) out.reviews = raw.reviews.filter(x => x && typeof x === "object").map(x => {
    const r = parseFloat(x.rating);
    return { product: cleanStr(x.product), name: cleanStr(x.name), city: cleanStr(x.city), rating: Number.isFinite(r) ? Math.min(5, Math.max(1, r)) : 5, text: cleanStr(x.text) };
  });
  if (Array.isArray(raw.budgetTiles)) out.budgetTiles = raw.budgetTiles.filter(x => x && typeof x === "object").map(x => ({ label: cleanStr(x.label), amount: cleanStr(x.amount), note: cleanStr(x.note), budget: cleanStr(x.budget) }));
  if (Array.isArray(raw.trustItems)) out.trustItems = raw.trustItems.filter(x => x && typeof x === "object").map(x => ({ title: cleanStr(x.title), sub: cleanStr(x.sub) })); /* V3.6: Instagram reels + blog — key maujood ho to wahi (khaali = delete). */ if (typeof raw.instaHandle === "string") out.instaHandle = raw.instaHandle.trim(); if (Array.isArray(raw.instaReels)) out.instaReels = raw.instaReels.filter(x => x && typeof x === "object").map(x => ({ user: cleanStr(x.user), avatar: cleanStr(x.avatar), video: cleanStr(x.video), poster: cleanStr(x.poster), title: cleanStr(x.title) })); if (Array.isArray(raw.blogPosts)) out.blogPosts = raw.blogPosts.filter(x => x && typeof x === "object").map(x => ({ title: cleanStr(x.title), excerpt: cleanStr(x.excerpt), img: cleanStr(x.img), link: cleanStr(x.link) })); if (typeof raw.showReels === "boolean") out.showReels = raw.showReels; if (typeof raw.showBlog === "boolean") out.showBlog = raw.showBlog; /* V3.9: fashion toggles + section/PDP text. */ if (typeof raw.showSizes === "boolean") out.showSizes = raw.showSizes; if (typeof raw.showColors === "boolean") out.showColors = raw.showColors; if (raw.sectionText && typeof raw.sectionText === "object"){ Object.keys(raw.sectionText).forEach(k => { const v = raw.sectionText[k]; if (v && typeof v === "object") out.sectionText[k] = { eyebrow: String(v.eyebrow || ""), title: String(v.title || "") }; }); } if (raw.pdpText && typeof raw.pdpText === "object"){ ["details", "related", "delivery"].forEach(k => { if (typeof raw.pdpText[k] === "string") out.pdpText[k] = raw.pdpText[k]; }); } const luxStr = v => String(v || ""); if (Array.isArray(raw.luxuryTiles)) out.luxuryTiles = raw.luxuryTiles.filter(x => x && typeof x === "object").map(x => ({ label: luxStr(x.label), cat: luxStr(x.cat), img: luxStr(x.img) })).filter(x => x.label || x.cat || x.img).slice(0, 4); if (Array.isArray(raw.luxuryTabs)) out.luxuryTabs = raw.luxuryTabs.filter(x => x && typeof x === "object").map(x => ({ label: luxStr(x.label), cat: luxStr(x.cat) })).filter(x => x.label || x.cat).slice(0, 4); if (raw.luxuryBanner && typeof raw.luxuryBanner === "object"){ ["img", "eyebrow", "title", "button", "cat"].forEach(k => { if (typeof raw.luxuryBanner[k] === "string") out.luxuryBanner[k] = raw.luxuryBanner[k]; }); } if (Array.isArray(raw.luxuryRtwTabs)) out.luxuryRtwTabs = raw.luxuryRtwTabs.filter(x => x && typeof x === "object").map(x => ({ label: luxStr(x.label), cat: luxStr(x.cat) })).filter(x => x.label || x.cat).slice(0, 4); if (Array.isArray(raw.luxuryBanners)) out.luxuryBanners = raw.luxuryBanners.filter(x => x && typeof x === "object").map(x => ({ img: luxStr(x.img), eyebrow: luxStr(x.eyebrow), title: luxStr(x.title), button: luxStr(x.button), cat: luxStr(x.cat) })).filter(x => x.img).slice(0, 4); if (Array.isArray(raw.collectionPages)) out.collectionPages = raw.collectionPages.filter(x => x && typeof x === "object").map(x => ({ cat: luxStr(x.cat), title: luxStr(x.title), subtitle: luxStr(x.subtitle), img: luxStr(x.img) })).filter(x => x.cat).slice(0, 12); if (Array.isArray(raw.customPages)) out.customPages = raw.customPages.filter(x => x && typeof x === "object").map(x => ({ slug: String(x.slug || "").trim().toLowerCase(), title: luxStr(x.title), body: String(x.body || "").slice(0, 20000), seoTitle: luxStr(x.seoTitle), showInHeader: x.showInHeader === true, showInFooter: x.showInFooter === true })).filter(x => x.slug).slice(0, 20); /* V5 Phase 5: Meta + custom code — whitelist rebuild; capiToken yahan KABHI nahi aata (wo store_meta_secrets mein hai, Part B). */ if (raw.meta && typeof raw.meta === "object"){ out.meta = { pixelId: String(raw.meta.pixelId || "").replace(/[^0-9]/g, "").slice(0, 20), capiEnabled: raw.meta.capiEnabled === true, testEventCode: String(raw.meta.testEventCode || "").slice(0, 64), hasCapiToken: raw.meta.hasCapiToken === true, capiTokenLast4: String(raw.meta.capiTokenLast4 || "").slice(-4) }; } if (raw.customCode && typeof raw.customCode === "object"){ out.customCode = { head: String(raw.customCode.head || "").slice(0, 50000), body: String(raw.customCode.body || "").slice(0, 50000) }; }
  if (typeof raw.whatsapp_number === "string") out.whatsapp_number = raw.whatsapp_number.trim();
  /* Deep merge: sections toggles */
  if (raw.sections && typeof raw.sections === "object")
    Object.keys(out.sections).forEach(k => { if (typeof raw.sections[k] === "boolean") out.sections[k] = raw.sections[k]; });
  /* Deep merge: policy texts */
  if (raw.policies && typeof raw.policies === "object")
    Object.keys(out.policies).forEach(k => { if (typeof raw.policies[k] === "string") out.policies[k] = raw.policies[k]; });
  /* Deep merge: store profile */
  if (raw.profile && typeof raw.profile === "object")
    Object.keys(out.profile).forEach(k => { if (typeof raw.profile[k] === "string") out.profile[k] = raw.profile[k].trim(); });
  /* --- V2 keys (Part A contract — admin ke merge se match) --- */
  if (raw.font_family && typeof raw.font_family === "object")
    out.font_family = { name: String(raw.font_family.name || ""), stack: String(raw.font_family.stack || ""), google: String(raw.font_family.google || "") };
  else if (typeof raw.font_family === "string" && STORE_FONTS[raw.font_family])
    out.font_family = { ...STORE_FONTS[raw.font_family] };
  if (typeof raw.theme_color === "string") out.theme_color = raw.theme_color;
  if (typeof raw.logo_url === "string") out.logo_url = raw.logo_url;
  if (raw.socials && typeof raw.socials === "object")
    Object.keys(out.socials).forEach(k => { if (typeof raw.socials[k] === "string") out.socials[k] = raw.socials[k]; });
  const cleanLinks = arr => Array.isArray(arr) ? arr.filter(l => l && typeof l === "object").map(l => ({ label: String(l.label || ""), url: String(l.url || "") })) : [];
  out.menu_links = cleanLinks(raw.menu_links);
  out.footer_links = cleanLinks(raw.footer_links);
  if (typeof raw.footer_text === "string") out.footer_text = raw.footer_text;
  if (Array.isArray(raw.sections_order))
    out.sections_order = raw.sections_order.filter(e => e && typeof e.key === "string").map(e => ({ key: e.key, visible: e.visible !== false }));
  if (Array.isArray(raw.custom_sections))
    out.custom_sections = raw.custom_sections.filter(c => c && c.id).map(c => ({ id: String(c.id), heading: String(c.heading || ""), text: String(c.text || ""), img: String(c.img || ""), btn_label: String(c.btn_label || ""), btn_link: String(c.btn_link || "") }));
  const cleanFields = arr => Array.isArray(arr) ? arr.filter(f => f && typeof f === "object" && String(f.label || "").trim()).map(f => ({
    id: String(f.id || ("f" + Math.random().toString(36).slice(2, 9))),
    label: String(f.label || ""),
    type: ["text", "number", "select", "textarea"].includes(f.type) ? f.type : "text",
    options: Array.isArray(f.options) ? f.options.map(x => String(x)).filter(Boolean) : String(f.options || "").split(",").map(x => x.trim()).filter(Boolean),
    required: !!f.required
  })) : [];
  out.checkout_fields = cleanFields(raw.checkout_fields);
  out.product_fields = cleanFields(raw.product_fields);
  if (typeof raw.animations === "boolean") out.animations = raw.animations;
  if (typeof raw.theme === "string") out.theme = raw.theme.trim().toLowerCase();
  /* V3.2 Style Editor — har value validate ho kar aati hai; ghalat value
     khaali (theme default) ban jati hai, kabhi raw style mein nahi jaati. */
  if (raw.style && typeof raw.style === "object"){
    const st = raw.style;
    if (st.card && typeof st.card === "object"){
      out.style.card.radius = clampStyleRadius(st.card.radius);
      out.style.card.bg = validStyleColor(st.card.bg);
      out.style.card.border = validStyleColor(st.card.border);
      out.style.card.shadow = STYLE_SHADOWS.indexOf(String(st.card.shadow || "")) !== -1 ? String(st.card.shadow) : "";
      out.style.card.titleColor = validStyleColor(st.card.titleColor);
      out.style.card.priceColor = validStyleColor(st.card.priceColor);
    }
    if (st.sections && typeof st.sections === "object"){
      STYLE_SECTION_KEYS.forEach(k => {
        if (st.sections[k] && typeof st.sections[k] === "object")
          out.style.sections[k] = { bg: validStyleColor(st.sections[k].bg), heading: validStyleColor(st.sections[k].heading) };
      });
    }
    if (st.buttons && typeof st.buttons === "object"){
      out.style.buttons.primaryBg = validStyleColor(st.buttons.primaryBg);
      out.style.buttons.primaryColor = validStyleColor(st.buttons.primaryColor);
      out.style.buttons.radius = clampStyleRadius(st.buttons.radius);
      out.style.buttons.secondaryColor = validStyleColor(st.buttons.secondaryColor);
      out.style.buttons.fontSize = ["", "S", "M", "L"].indexOf(String(st.buttons.fontSize || "")) !== -1 ? String(st.buttons.fontSize) : "";
    }
    if (st.page && typeof st.page === "object"){
      ["headerBg", "footerBg", "marqueeBg", "pageBg", "textColor"].forEach(k => { out.style.page[k] = validStyleColor(st.page[k]); });
    }
    if (st.socialProof && typeof st.socialProof === "object"){
      const sp = st.socialProof;
      if (typeof sp.enabled === "boolean") out.style.socialProof.enabled = sp.enabled;
      /* V3.3: popups sirf owner ke likhe entries se — purana demo flag yahan
         parha hi nahi jata, aur na hi aage save hota hai. */
      if (Array.isArray(sp.entries)) out.style.socialProof.entries = sp.entries.filter(e => e && typeof e === "object").map(e => ({ name: String(e.name || ""), product: String(e.product || ""), city: String(e.city || ""), amount: String(e.amount || ""), timeText: String(e.timeText || "") })).filter(e => e.name || e.product);
      const iv = parseInt(sp.intervalSec, 10);
      if (Number.isFinite(iv)) out.style.socialProof.intervalSec = Math.max(5, iv);
      const du = parseInt(sp.durationSec, 10);
      if (Number.isFinite(du)) out.style.socialProof.durationSec = Math.max(1, du);
    }
  }
  /* V3 Part B: SEO — Settings tab se (admin). */
  if (typeof raw.seo_title === "string") out.seo_title = raw.seo_title.trim();
  if (typeof raw.seo_description === "string") out.seo_description = raw.seo_description.trim();   /* V5 Phase 2a: per-section style controls (additive). */ mergeSectionStyles(out, raw); /* V4 Phase 1: theme schema loop (additive — V3 lines upar rehti hain). */   applyThemeSchema(out, raw);
  return out;
}
let __customPageOpened = false; /* V5 Phase 4: ?page= sirf aik dafa khulta hai. */
async function loadSettings(){
  try {
    /* Module 4: fail-closed — store ID ke baghair settings query na karein;
       defaults use hon (kisi aur store ki settings nahi). */
    if (!STORE_ID){
      SETTINGS = mergeSettings(null);
    } else {
      /* Module 1: settings come from the get_public_storefront RPC result
         (cached by resolveStore for this STORE_ID). No direct settings read.
         Cache mismatch ho to defaults (kisi aur store ki settings nahi). */
      const cached = (__publicStorefront && __publicStorefront.store && __publicStorefront.store.id === STORE_ID) ? __publicStorefront.settings : null;
      const raw = cached || null;
      const isEmpty = !raw || (typeof raw === "object" && Object.keys(raw).length === 0);
      /* Settings khaali hon to store ka naam stores table wale name se —
         header/footer mein client ka asal naam nazar aaye. */
      SETTINGS = mergeSettings(isEmpty && STORE && STORE.name ? { store_name: STORE.name } : raw);
    }
  } catch (e) {
    console.warn("Settings load nahi huye; defaults use ho rahe hain.", e);
    SETTINGS = mergeSettings(null);
  }
  applySettings();
  /* V5 Phase 4: shareable page link (?page=<slug>) — settings load ke baad, sirf aik dafa. */
  if (!__customPageOpened){ __customPageOpened = true; try { var pg = new URLSearchParams(location.search).get("page"); if (pg) openCustomPage(pg); } catch (e){} }
  initMetaTracking(); /* V5 Phase 5: Pixel + custom code init (settings load ke baad, ?page= ke baad — taa ke pehli view sahi ho). */
}
function applySettings(){
  const name = SETTINGS.store_name || DEFAULT_SETTINGS.store_name;
  /* V3 Part B SEO: admin ka seo_title ho to wohi title; warna default. */
  document.title = (SETTINGS.seo_title && SETTINGS.seo_title.trim()) ? SETTINGS.seo_title.trim() : name + " — Pakistan Ka Smart Store";
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc){ metaDesc = document.createElement("meta"); metaDesc.name = "description"; document.head.appendChild(metaDesc); }
  metaDesc.content = (SETTINGS.seo_description && SETTINGS.seo_description.trim()) ? SETTINGS.seo_description.trim() : (name + " — Pakistan ka smart online store. Cash on Delivery, fast delivery 3–5 days.");
  $("#logoName").textContent = name;
  $("#footerLogoName").textContent = name;
  $("#copyStoreName").textContent = name;
  /* Logo: V2 top-level logo_url pehle, warna legacy profile.logo_url.
     Image ke saath store name bhi rehta hai (image ~36px, name us ke saath). */
  const logoUrl = (SETTINGS.logo_url || (SETTINGS.profile && SETTINGS.profile.logo_url) || "").trim();
  const logoImg = $("#logoImg");
  if (logoImg){
    if (logoUrl){ logoImg.src = safeUrl(logoUrl); logoImg.alt = name; logoImg.hidden = false; $("#logoHome").classList.add("has-logo"); }
    else { logoImg.hidden = true; logoImg.removeAttribute("src"); $("#logoHome").classList.remove("has-logo"); }
  }
  const footLogoImg = $("#footerLogoImg");
  if (footLogoImg){
    if (logoUrl){ footLogoImg.src = safeUrl(logoUrl); footLogoImg.alt = name; footLogoImg.hidden = false; }
    else { footLogoImg.hidden = true; footLogoImg.removeAttribute("src"); }
    const bag = $("#footerBagIcon"); if (bag) bag.hidden = !!logoUrl;
  }
  /* V3: pehle theme (ACTIVE_THEME resolve + classes/vars), phir font
     (explicit font_family ho to wohi, warna theme ka font). */
  applyTheme();
  applyFont();
  applyAnimations();
  renderSocials();
  renderNav();
  renderFooterLinks();
  const messages = SETTINGS.announcements.map(t => esc(String(t).replaceAll("{STORE}", name).replaceAll("{Store}", name)));
  const group = `<div class="marquee-group">${messages.map(m => `<span>${m}</span>`).join("")}</div>`;
  $("#announceTrack").innerHTML = group + group;
  /* Sirf visible slides render hoti hain; koi slide na ho to hero section hide. */
  HERO_SLIDES = SETTINGS.hero.filter(s => s.visible !== false); renderHero();
  
  $("#promoGrid").innerHTML = SETTINGS.promo.map((p, i) => `
    <article class="promo-card reveal"><small>${esc(p.kicker)}</small><h3>${esc(p.heading)}</h3><p>${esc(p.text)}</p><button class="btn white" type="button" data-promo-cat="${esc(p.category)}">SHOP NOW</button></article>`).join("");
  $$("[data-promo-cat]").forEach(b => b.onclick = () => {
    const cat = CAT_LIST.includes(b.dataset.promoCat) ? b.dataset.promoCat : "All";
    setFilter({ cat, maxPrice: null, sort: "popular" });
  });
  $("#aboutHeading").textContent = SETTINGS.about_heading;
  $("#aboutText").textContent = SETTINGS.about_text;
  /* footer_text set ho to footer blurb us se; warna about_text hi rehta hai. */
  $("#footerAbout").textContent = (SETTINGS.footer_text && SETTINGS.footer_text.trim()) ? SETTINGS.footer_text : SETTINGS.about_text;
  const wa = $("#waFloat");
  /* V3.12: WhatsApp float dikhe jab bhi koi WhatsApp/phone number ho — whatsapp_number, warna profile.phone, warna store phone. */
  const digits = String(SETTINGS.whatsapp_number || (SETTINGS.profile && SETTINGS.profile.phone) || (STORE && STORE.phone) || "").replace(/\D/g, "");
  if (digits){ wa.href = "https://wa.me/" + digits; wa.hidden = false; } else { wa.hidden = true; wa.removeAttribute("href"); }
  /* Homepage sections: sections_order (V2) ho to wohi order + visibility; na ho to legacy settings.sections toggles wala purana behaviour. */ applySections(); applySectionText();
  /* Footer contact lines (profile se) — jo field bhara ho sirf wohi line. */
  const fc = $("#footerContact");
  if (fc){
    const prof = SETTINGS.profile || {};
    const lines = [];
    if (prof.email) lines.push(`<p>${icon("mail", "ic-inline")} <a href="mailto:${esc(prof.email)}">${esc(prof.email)}</a></p>`);
    if (prof.phone) lines.push(`<p>${icon("phone", "ic-inline")} ${esc(prof.phone)}</p>`);
    if (prof.address) lines.push(`<p>${icon("pin", "ic-inline")} ${esc(prof.address)}</p>`);
    fc.innerHTML = lines.join("");
    fc.hidden = lines.length === 0;
  }
  /* V3.3: settings-driven content sections (static HTML ko overwrite karte hain).
     renderFaq/renderReviews yahan LAZMI hain: neechay wali akeli renderFaq()
     call settings load hone se PEHLE chalti hai (is liye FAQ hamesha
     defaults dikhata tha), aur reviews bhi products/settings race mein
     defaults par atak sakte thay — applySettings har settings load par
     dobara chalta hai, is liye yahan re-render hi sahi source hai. */
  renderTrust();
  renderBudget();
  renderSteps(); renderFeatured();
  renderFaq();
  renderReviews(); renderReels(); renderBlog();
  watchReveals();
  syncHeaderOffset();
  applyStyleSettings();
  applySectionStyles();   
  startSocialProof(); /* R6 (§14): render race — products pehle load hon to Luxury sections (festive/tabs/editorial/trending) theme=general samajh kar early-return kar dete hain; settings aane ke baad applySections unhein dikhata hai lekin dobara render nahi karta (headings only, khaali). Products tayyar hon to yahin se dobara render kar dein — renderHero ki tarah (V3.6 "boot race fix" precedent), jo dono paths se chalta hai. Products na aaye hon to kuch nahi (loadProducts baad mein render karega). */ if (PRODUCTS.length && isLuxury()) renderProductSections();
}

/* ---------- V3: Themes (look) + Appearance (font / accent) ----------
   ACTIVE THEME precedence:
     1) settings.data.theme (store admin ki choice) — agar allowed + known
     2) STORE.theme (super admin ka default)      — agar allowed + known
     3) "general" (fallback — aaj ka look, palette/fonts default jaisay)
   allowed_themes: [] / missing = SAB themes allowed.
   Explicit settings.data.theme_color hamesha theme palette ke accent par
   jeet-ta hai (buttons/badges par). */
let ACTIVE_THEME = null;
function resolveActiveTheme(){
  var getTheme = window.SHOPNEST_THEME;
  var getAllowed = window.SHOPNEST_ALLOWED_THEMES;
  var known = window.SHOPNEST_THEME_KNOWN;
  if (!getTheme || !known){
    ACTIVE_THEME = null;
    return null;
  }
  var allowedKeys = getAllowed ? getAllowed(STORE ? STORE.allowed_themes : null).map(function(t){ return t.key; }) : ["general", "fashion", "beauty", "electronics", "food", "playful", "luxury"];
  var pick = function(k){ return (k && allowedKeys.indexOf(k) !== -1 && known(k)) ? k : null; };
  var key = pick(SETTINGS.theme) || pick(STORE && STORE.theme) || "general";
  ACTIVE_THEME = getTheme(key);
  return ACTIVE_THEME;
}
function applyTheme(){
  var root = document.documentElement;
  var t = resolveActiveTheme();
  /* Body classes: pichli theme ki classes saaf, nayi lagayen. */
  ["general", "fashion", "beauty", "electronics", "food", "playful", "luxury"].forEach(function(k){ document.body.classList.remove("theme-" + k); });
  ["slider", "banner", "minimal"].forEach(function(x){ document.body.classList.remove("hero-" + x); });
  ["rounded", "sharp", "soft"].forEach(function(x){ document.body.classList.remove("cards-" + x); });
  ["tiles", "pills", "list"].forEach(function(x){ document.body.classList.remove("cats-" + x); });
  /* V3.1 layout classes (purani classes backward compat ke liye rehti hain). */
  ["slider", "banner", "compact", "editorial"].forEach(function(x){ document.body.classList.remove("layout-hero-" + x); });
  ["standard", "centered", "search-first"].forEach(function(x){ document.body.classList.remove("layout-header-" + x); });
  ["dense", "standard", "large"].forEach(function(x){ document.body.classList.remove("layout-grid-" + x); });
  ["compact", "standard", "large", "spec"].forEach(function(x){ document.body.classList.remove("layout-card-" + x); });
  ["tiles", "circles", "pills", "bar"].forEach(function(x){ document.body.classList.remove("layout-cats-" + x); });
  ["strip", "grid"].forEach(function(x){ document.body.classList.remove("layout-deals-" + x); });
  /* V3.2 layout axes: footer/button/heading — sirf tab lagte hain jab theme
     ki layout mein woh key ho. General ki layout mein ye keys nahi hain,
     is liye general par koi nayi class nahi lagti (zero layout change). */
  ["centered", "tinted", "dark", "warm"].forEach(function(x){ document.body.classList.remove("layout-footer-" + x); });
  ["pill-gold", "pill-pink", "sharp", "rounded"].forEach(function(x){ document.body.classList.remove("layout-button-" + x); });
  ["serif-upper", "soft", "condensed-upper", "bold-rounded"].forEach(function(x){ document.body.classList.remove("layout-heading-" + x); });
  if (t){
    document.body.classList.add("theme-" + t.key, "hero-" + t.heroStyle, "cards-" + t.cardStyle, "cats-" + t.categoryStyle);
    /* Layout: themes.js -> layout; missing ho to standard look. */
    var L = t.layout || {};
    document.body.classList.add("layout-hero-" + (L.hero || "slider"), "layout-header-" + (L.header || "standard"), "layout-grid-" + (L.grid || "standard"), "layout-card-" + (L.card || "standard"), "layout-cats-" + (L.cats || "tiles"), "layout-deals-" + (L.deals || "grid"));
    if (L.footer) document.body.classList.add("layout-footer-" + L.footer);
    if (L.button) document.body.classList.add("layout-button-" + L.button);
    if (L.heading) document.body.classList.add("layout-heading-" + L.heading);
    /* search-first: search bar hamesha nazar aaye (boot par; toggle baad
       mein phir bhi kaam karta hai). [hidden] rule class se nahi tootta,
       is liye JS se hidden hatana zaroori hai. */
    var sbEl = $("#searchBar");
    if (sbEl) sbEl.hidden = (L.header !== "search-first");
    var p = t.palette || {};
    var setOrRemove = function(v, val){ if (val) root.style.setProperty(v, val); else root.style.removeProperty(v); };
    setOrRemove("--theme-primary", p.primary);
    setOrRemove("--theme-accent", p.accent);
    setOrRemove("--theme-header", p.header);
    setOrRemove("--theme-footer", p.footer);
    setOrRemove("--theme-price", p.price);
    setOrRemove("--theme-badge", p.badge);
  } else {
    ["--theme-primary", "--theme-accent", "--theme-header", "--theme-footer", "--theme-price", "--theme-badge"].forEach(function(v){ root.style.removeProperty(v); });
  }
  /* Accent: explicit theme_color jeetta hai, warna theme palette ka accent.
     (theme_color na ho to purana behaviour: stylesheet defaults.) */
  var tc = String(SETTINGS.theme_color || "").trim();
  var accent = (/^#[0-9a-fA-F]{6}$/.test(tc)) ? tc : (t && t.palette ? t.palette.accent : "");
  if (accent){
    root.style.setProperty("--green", accent);
    root.style.setProperty("--mint", shade(accent, 0.3));
    root.style.setProperty("--green-dark", shade(accent, -0.3));
    root.style.setProperty("--accent", accent);
  } else {
    ["--green", "--mint", "--green-dark", "--accent"].forEach(function(v){ root.style.removeProperty(v); });
  }
}
function setFontLink(id, google){
  var link = document.getElementById(id);
  if (!google){
    if (link) link.remove();
    return;
  }
  if (!link){
    link = document.createElement("link");
    link.id = id; link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = "https://fonts.googleapis.com/css2?family=" + google + "&display=swap";
}
/* Font precedence: explicit font_family > theme fonts > stylesheet defaults.
   Theme ke head/body alag ho sakte hain (e.g. Playfair head + Inter body). */
function applyFont(){
  var root = document.documentElement;
  var explicit = SETTINGS.font_family || {};
  var bodyF = null, headF = null;
  if (explicit.name){
    bodyF = explicit; headF = explicit;
  } else if (ACTIVE_THEME && ACTIVE_THEME.fonts){
    bodyF = ACTIVE_THEME.fonts.body; headF = ACTIVE_THEME.fonts.head;
  }
  setFontLink("storeFontLink", bodyF && bodyF.google ? bodyF.google : "");
  setFontLink("storeFontHeadLink", (headF && headF.google && headF.google !== (bodyF && bodyF.google)) ? headF.google : "");
  if (bodyF && bodyF.stack) root.style.setProperty("--font-body", bodyF.stack);
  else root.style.removeProperty("--font-body");
  if (headF && headF.stack) root.style.setProperty("--font-head", headF.stack);
  else root.style.removeProperty("--font-head");
}
/* ---------- V3.2: Style Editor — theme ke BAAD apply (style > theme) ----------
   CSS vars body par INLINE lagti hain, is liye stylesheet ki theme layout
   classes se bhi jeet-ti hain; var clear ho to theme value wapis aa jati
   hai. Khaali style = aaj ka look bilkul waisa hi (saare vars clear). */
function applyStyleSettings(){
  const st = (SETTINGS && SETTINGS.style) || {};
  const card = st.card || {}, btns = st.buttons || {}, page = st.page || {};
  const b = document.body;
  const set = (name, val) => { if (val) b.style.setProperty(name, val); else b.style.removeProperty(name); };
  const rad = v => { const r = clampStyleRadius(v); return r === "" ? "" : r + "px"; };
  set("--card-radius", rad(card.radius));
  set("--card-bg", validStyleColor(card.bg));
  set("--card-border", validStyleColor(card.border));
  set("--card-shadow", STYLE_SHADOW_VALUES[card.shadow] || "");
  set("--card-title", validStyleColor(card.titleColor));
  set("--card-price", validStyleColor(card.priceColor));
  set("--btn-primary-bg", validStyleColor(btns.primaryBg));
  set("--btn-primary-color", validStyleColor(btns.primaryColor));
  set("--btn-radius", rad(btns.radius));
  set("--btn-secondary-color", validStyleColor(btns.secondaryColor));
  set("--btn-font-size", STYLE_FONT_SIZES[btns.fontSize] || "");
  set("--page-bg", validStyleColor(page.pageBg));
  set("--text-color", validStyleColor(page.textColor));
  /* Header/footer/marquee: var + direct background (dono wahi validated
     value; khaali ho to dono clear = theme look wapis). */
  const bgPair = (varName, selector, val) => {
    set(varName, val);
    const el = document.querySelector(selector);
    if (el) el.style.background = val || "";
  };
  bgPair("--header-bg", ".site-header", validStyleColor(page.headerBg));
  bgPair("--footer-bg", ".footer", validStyleColor(page.footerBg));
  bgPair("--marquee-bg", ".marquee", validStyleColor(page.marqueeBg));
  /* Per-section bg + heading color, SECTION_NODE_IDS se (khali = clear). */
  const secs = st.sections || {};
  STYLE_SECTION_KEYS.forEach(k => {
    const el = document.getElementById(SECTION_NODE_IDS[k]);
    if (!el) return;
    const s = secs[k] || {};
    el.style.background = validStyleColor(s.bg) || "";
    const h = el.querySelector(".section-title, h1");
    if (h) h.style.color = validStyleColor(s.heading) || "";
  });
}
/* settings.animations === false ho to marquee + reveals band. */
function applyAnimations(){
  const off = SETTINGS.animations === false;
  document.body.classList.toggle("no-anim", off);
  if (off) $$(".reveal").forEach(el => el.classList.add("in"));
  setupCatRail();
}

/* ---------- V2: Socials (footer icon buttons) ---------- */
const SOCIAL_DEFS = [["facebook", "Facebook"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["x", "X"], ["whatsapp", "WhatsApp"]];
function renderSocials(){
  const wrap = $("#footerSocials");
  if (!wrap) return;
  const s = SETTINGS.socials || {};
  const html = SOCIAL_DEFS.map(([key, label]) => {
    const u = String(s[key] || "").trim();
    return u ? `<a class="soc-btn" href="${safeUrl(u)}" target="_blank" rel="noopener" aria-label="${label}">${brandIcon(key)}</a>` : "";
  }).join("");
  wrap.innerHTML = html;
  wrap.hidden = !html;
}

/* ---------- V2: Header nav (menu_links) + Footer links ----------
   menu_links khaali hon to header nav = categories (default behaviour).
   "#id" wali url in-page anchor scroll hai; baaki external link. */
function navLinkHTML(l){
  const url = String(l.url || "").trim();
  const label = esc(l.label || url);
  if (!url) return "";
  /* V5 Phase 4: page:<slug> — custom page kholta hai (menu_links/footer_links se). */
  if (url.toLowerCase().startsWith("page:")){ const pg = (SETTINGS.customPages || []).find(p => p && p.slug === url.slice(5).trim().toLowerCase()); if (!pg) return ""; return `<button type="button" data-custompage="${esc(pg.slug)}">${esc(l.label || pg.title)}</button>`; }
  if (url.startsWith("#")) return `<button type="button" data-menu-anchor="${esc(url.slice(1))}">${label}</button>`;
  return `<a href="${safeUrl(url) || "#"}">${label}</a>`;
}
function bindAnchors(root){
  if (!root) return;
  root.querySelectorAll("[data-menu-anchor]").forEach(b => b.onclick = () => {
    const t = document.getElementById(b.dataset.menuAnchor);
    if (t){ showPage("homeView"); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
}
function renderNav(){
  const nav = $("#catNav");
  if (!nav) return;
  const links = (SETTINGS.menu_links || []).filter(l => l && (l.label || l.url));
  if (links.length){
    nav.innerHTML = links.map(navLinkHTML).join("") + customPageNavHTML("header");
    bindAnchors(nav);
    bindCustomPageNav(nav);
    return;
  }
  const cats = ["All", ...CAT_LIST];
  nav.innerHTML = cats.map(c => `<button type="button" class="${c === activeCat ? "active" : ""}" data-nav-cat="${esc(c)}">${esc(c)}</button>`).join("") + customPageNavHTML("header");
  nav.querySelectorAll("[data-nav-cat]").forEach(b => b.onclick = () => setFilter({ cat: b.dataset.navCat, maxPrice: null }));
  bindCustomPageNav(nav);
}
function renderFooterLinks(){
  const box = $("#footerHelpLinks");
  const title = $("#footerHelpTitle");
  if (!box) return;
  const links = (SETTINGS.footer_links || []).filter(l => l && (l.label || l.url));
  if (links.length){
    if (title) title.textContent = "Quick Links";
    box.innerHTML = links.map(navLinkHTML).join("") + customPageNavHTML("footer");
    bindAnchors(box);
    bindCustomPageNav(box);
  } else {
    if (title) title.textContent = "Help & Policies";
    box.innerHTML = DEFAULT_HELP_HTML + customPageNavHTML("footer");
    bindPolicyButtons(box);
    bindCustomPageNav(box);
  }
  /* V5 Phase 4: Luxury footer ne accordions bana liye hon to page links wahan le jao. */
  syncLuxFooterPages();
}

/* ---------- V2: Homepage sections order + custom sections ---------- */
const SECTION_NODE_IDS = { hero: "heroSection", trust: "trustSection", categories: "categoriesSection", best_sellers: "bestSection", featured: "featuredSection", reels: "reelsSection", blog: "blogSection", all_products: "shop", promos: "promoSection", hot: "hotSection", new_arrivals: "newSection", deals: "dealsSection", budget: "budgetSection", about: "aboutSection", how_to_order: "howSection", faq: "faqSection", testimonials: "reviewsSection", festive: "festiveSection", unstitched_tabs: "unstitchedSection", readytowear_tabs: "rtwSection", editorial: "editorialSection" }; /* V3.6: ye 3 sections sirf Playful Pop theme ka hissa hain — doosre theme par in ka content chhupa rehta hai, chahe Homepage builder mein visible hon. */ const PLAYFUL_ONLY_SECTIONS = v4OnlySections("playful", ["featured", "blog"]); /* V4 Phase 1: theme-only lists def se (same values, source badla). */ const LUXURY_ONLY_SECTIONS = v4OnlySections("luxury", ["festive", "unstitched_tabs", "readytowear_tabs", "editorial"]);
const SECTION_DEFAULT_KEYS = Object.keys(SECTION_NODE_IDS);
function buildCustomSection(def){
  const sec = document.createElement("section");
  sec.className = "section wrap custom-section reveal";
  sec.dataset.customSection = String(def.id);
  const btn = def.btn_label ? `<a class="btn primary" href="${safeUrl(def.btn_link) || "#"}">${esc(def.btn_label)}</a>` : "";
  sec.innerHTML = `${def.img ? `<div class="custom-media"><img src="${safeUrl(def.img)}" alt="${esc(def.heading || "")}" loading="lazy"></div>` : ""}
    <div class="custom-body">${def.heading ? `<h2 class="section-title left">${esc(def.heading)}</h2>` : ""}${def.text ? `<p>${esc(def.text)}</p>` : ""}${btn}</div>`;
  if (def.img) sec.classList.add("has-img");
  return sec;
}
function applySections(){
  const home = $("#homeView");
  if (!home) return;
  /* Purane custom sections hamesha saaf — settings se dobara bante hain. */
  home.querySelectorAll(".custom-section").forEach(el => el.remove());
  let order = Array.isArray(SETTINGS.sections_order) && SETTINGS.sections_order.length ? SETTINGS.sections_order : null;
  if (!order){
    /* V3.1: admin ne custom order NAHI set kiya to active theme ka
       defaultOrder use ho (general ka null hai -> legacy behaviour).
       Custom order set ho to ye kabhi nahi chalta — admin ki pasand
       hamesha theme se upar hai. */
    if (!ACTIVE_THEME) resolveActiveTheme();
    const dflt = ACTIVE_THEME && ACTIVE_THEME.layout && ACTIVE_THEME.layout.defaultOrder;
    if (Array.isArray(dflt) && dflt.length) order = dflt.map(k => ({ key: k, visible: true }));
  }
  if (!order){
    /* Legacy: settings.sections toggles (hero sirf slides par depend karta hai). */
    const SECTION_IDS = { best: "bestSection", hot: "hotSection", arrivals: "newSection", deals: "dealsSection", budget: "budgetSection", about: "aboutSection", howto: "howSection", faq: "faqSection", reviews: "reviewsSection", promos: "promoSection" };
    Object.entries(SECTION_IDS).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) el.hidden = SETTINGS.sections[key] === false || PLAYFUL_ONLY_SECTIONS.includes(key); /* V3.6: legacy path par bhi Playful-only sections hamesha chhupi rahein. */
  }); const luxuryOnLegacy = document.body.classList.contains("theme-luxury"); const playfulOnLegacy = document.body.classList.contains("theme-playful"); LUXURY_ONLY_SECTIONS.forEach(k => { const el = document.getElementById(SECTION_NODE_IDS[k]); if (el) el.hidden = !luxuryOnLegacy; }); const reelsElLegacy = document.getElementById(SECTION_NODE_IDS.reels); if (reelsElLegacy) reelsElLegacy.hidden = !playfulOnLegacy && !luxuryOnLegacy;
    return;
  }
  /* sections_order precedence: order + visibility yahi se. Jo key list mein
     nahi, woh default order ke end par, visible rehti hai. */
  const seen = new Set();
  const seq = []; const playfulOn = document.body.classList.contains("theme-playful"); const luxuryOn = document.body.classList.contains("theme-luxury"); /* V3.11: Luxury mein order mein na likha section khud nahi aata (admin likhe to aata hai). */ const themeOrder = (ACTIVE_THEME && ACTIVE_THEME.layout && Array.isArray(ACTIVE_THEME.layout.defaultOrder)) ? ACTIVE_THEME.layout.defaultOrder : null;
  order.forEach(e => {
    if (typeof e.key !== "string") return;
    /* V3.12: Luxury mein saved order ki woh keys jo luxury defaultOrder mein nahi — ignore (no appending). */
    if (luxuryOn && themeOrder && !themeOrder.includes(e.key) && !String(e.key).startsWith("custom:")) return;
    if (e.key.startsWith("custom:")){
      const def = (SETTINGS.custom_sections || []).find(c => String(c.id) === e.key.slice(7));
      if (!def) return;
      const el = buildCustomSection(def);
      el.hidden = e.visible === false;
      seq.push(el); seen.add(e.key);
      return;
    }
    const el = document.getElementById(SECTION_NODE_IDS[e.key] || "");
    if (!el || seen.has(e.key)) return;
    el.hidden = e.visible === false || (e.key === "hero" && HERO_SLIDES.length === 0 && !PLAYFUL_HERO) || (PLAYFUL_ONLY_SECTIONS.includes(e.key) && !playfulOn) || (LUXURY_ONLY_SECTIONS.includes(e.key) && !luxuryOn) || (e.key === "reels" && !playfulOn && !luxuryOn);
    seq.push(el); seen.add(e.key);
  });
  SECTION_DEFAULT_KEYS.forEach(k => {
    if (seen.has(k)) return;
    const el = document.getElementById(SECTION_NODE_IDS[k]);
    if (!el) return;
    el.hidden = (k === "hero" && HERO_SLIDES.length === 0 && !PLAYFUL_HERO) || (PLAYFUL_ONLY_SECTIONS.includes(k) && !playfulOn) || (LUXURY_ONLY_SECTIONS.includes(k) && !luxuryOn) || (k === "reels" && !playfulOn && !luxuryOn) || (luxuryOn && themeOrder && !themeOrder.includes(k));
    seq.push(el);
  });
  seq.forEach(el => home.appendChild(el)); applySectionText(); } /* ---------- V3.9: editable section titles (Content tab -> settings.sectionText) ---------- Khaali ho to asal HTML heading rehta hai; sirf bhara hua eyebrow/title badalta hai. */ const SECTION_TEXT_DEFAULTS = { categories: { eyebrow: "Apni Pasand Chunein", title: "SHOP BY CATEGORY" }, best: { eyebrow: "SAB SE ZYADA ORDER HONE WALE PRODUCTS", title: "BEST SELLERS" }, all_products: { eyebrow: "Complete Collection", title: "ALL PRODUCTS" }, hot: { eyebrow: "Trending Now", title: "Hot Selling This Week" }, arrivals: { eyebrow: "JUST LAUNCHED", title: "New Arrivals" }, deals: { eyebrow: "LIMITED TIME", title: "MEGA DEALS — HAR GHAR KI ZAROORAT" }, budget: { eyebrow: "Har Budget Ke Liye", title: "SHOP BY BUDGET" }, howto: { eyebrow: "Asaan Tareeqa", title: "HOW TO ORDER" }, faq: { eyebrow: "Aksar Sawalat", title: "FAQ" }, reviews: { eyebrow: "Customer Love", title: "HAPPY CUSTOMERS" }, festive: { eyebrow: "THE FESTIVE EDIT", title: "Festive Couture Edit" }, unstitched_tabs: { eyebrow: "SHOP BY COLLECTION", title: "Unstitched" }, readytowear_tabs: { eyebrow: "SHOP BY COLLECTION", title: "Ready To Wear" } }; const SECTION_TEXT_KEY = { categories: "categories", best_sellers: "best", hot: "hot", new_arrivals: "arrivals", deals: "deals", budget: "budget", how_to_order: "howto", faq: "faq", testimonials: "reviews", festive: "festive", unstitched_tabs: "unstitched_tabs", readytowear_tabs: "readytowear_tabs", all_products: "all_products" }; function applySectionText(){ const custom = (SETTINGS && SETTINGS.sectionText && typeof SETTINGS.sectionText === "object") ? SETTINGS.sectionText : {}; Object.keys(SECTION_TEXT_KEY).forEach(sec => { const el = document.querySelector(`[data-section="${sec}"]`); if (!el) return; const d = SECTION_TEXT_DEFAULTS[SECTION_TEXT_KEY[sec]] || {}; const c = custom[SECTION_TEXT_KEY[sec]] || {}; const eyebrow = String(c.eyebrow || d.eyebrow || "").trim(), title = String(c.title || d.title || "").trim(); const eb = el.querySelector(".eyebrow"), ti = el.querySelector(".section-title"); if (eb && eyebrow) eb.textContent = eyebrow; if (ti && title) ti.textContent = title; }); }
/* V3.6: hero render (applySettings + products load dono se chalta hai, taa ke Fun-hero ko products ka wait na karna pare — boot race fix). */ function renderHero(){ PLAYFUL_HERO = false; stopFunHero(); if (isPlayful() && funHeroItems().length){ PLAYFUL_HERO = true; clearInterval(heroTimer); const items = funHeroItems(); const head = HERO_SLIDES[0] || {}; const hTitle = (head.title || "").trim() || (SETTINGS.store_name || "ShopNest"); const hSub = (head.subtitle || "").trim() || "Quality checked products — Cash on Delivery ke saath, poore Pakistan mein."; $("#heroSection").hidden = false; $("#heroTrack").innerHTML = `<article class="fun-hero"><div class="fun-hero-bg fh-bg-0"></div><div class="fun-hero-inner"><div class="fun-hero-copy"><h1>${esc(hTitle)}</h1><p>${esc(hSub)}</p></div><div class="fh-stage">${items.map((p, i) => `<div class="fh-item ${i === 0 ? "active" : ""}"><img src="${safeUrl(p.img || "")}" alt="${esc(p.name)}"><div class="fh-meta"><strong>${esc(p.name)}</strong><span>${fmt(p.price)}</span></div></div>`).join("")}</div><div class="fh-ctas"><button class="btn primary" type="button" data-hero-target="bestSection">Shop Now</button><button class="btn outline-light" type="button" data-hero-target="budgetSection">Shop by Budget</button></div></div></article>`; $("#heroDots").innerHTML = items.map((_, i) => `<button type="button" data-fh-dot="${i}" class="${i === 0 ? "active" : ""}" aria-label="Hero product ${i + 1}"></button>`).join(""); $$("[data-fh-dot]").forEach(b => b.onclick = () => showFunHero(+b.dataset.fhDot)); $$("[data-hero-target]").forEach(b => b.onclick = () => scrollToId(b.dataset.heroTarget)); $$("#heroTrack .fh-item").forEach((el, i) => el.onclick = () => openProduct(items[i].id)); funHeroIndex = 0; startFunHero(); } else if (isLuxury()) { $("#heroSection").hidden = HERO_SLIDES.length === 0; $("#heroTrack").innerHTML = HERO_SLIDES.map((s, i) => `<article class="hero-slide"><img class="hero-img" src="${safeUrl(s.image)}" alt="${esc(s.title)}"></article>`).join(""); $("#heroDots").innerHTML = HERO_SLIDES.map((_, i) => `<button type="button" data-hero-dot="${i}" class="${i === heroIndex ? "active" : ""}" aria-label="Hero slide ${i + 1}"></button>`).join(""); $$("[data-hero-dot]").forEach(b => b.onclick = () => setHero(+b.dataset.heroDot)); if (HERO_SLIDES.length){ setHero(Math.min(heroIndex, HERO_SLIDES.length - 1)); startHero(); } bindHeroSwipe(); } else { $("#heroSection").hidden = HERO_SLIDES.length === 0; $("#heroTrack").innerHTML = HERO_SLIDES.map((s, i) => `<article class="hero-slide ${i % 2 === 1 ? "alt" : ""}"><div class="hero-inner"><div class="hero-content"><span class="hero-pill">${esc(s.pill)}</span><h1>${esc(s.title)}</h1><p>${esc(s.subtitle)}</p><button class="btn primary" type="button" data-hero-target="${i === 0 ? "bestSection" : "dealsSection"}">${esc(s.button)}</button></div><img class="hero-img" src="${safeUrl(s.image)}" alt="${esc(s.title)}"></div></article>`).join(""); $("#heroDots").innerHTML = HERO_SLIDES.map((_, i) => `<button type="button" data-hero-dot="${i}" class="${i === heroIndex ? "active" : ""}" aria-label="Hero slide ${i + 1}"></button>`).join(""); $$("[data-hero-dot]").forEach(b => b.onclick = () => setHero(+b.dataset.heroDot)); $$("[data-hero-target]").forEach(b => b.onclick = () => scrollToId(b.dataset.heroTarget)); if (HERO_SLIDES.length){ setHero(Math.min(heroIndex, HERO_SLIDES.length - 1)); startHero(); } } } /* ROUND 4 (§15): hero finger swipe. #heroTrack transform slider hai (scroll container nahi) — finger swipe ka koi handler nahi tha, sirf dots + 5.2s auto. touch-action:pan-y (CSS C-S1) se horizontal drag JS ko milta hai, vertical page scroll ko jata hai. Drag ke dauran auto pause (clearInterval), chhorne par startHero() se resume. */ function bindHeroSwipe(){ const track = document.getElementById("heroTrack"); if (!track || track.dataset.heroSwipe) return; track.dataset.heroSwipe = "1"; let down = false, startX = 0, moved = 0; track.addEventListener("pointerdown", e => { if (!HERO_SLIDES.length) return; down = true; moved = 0; startX = e.clientX; clearInterval(heroTimer); try { track.setPointerCapture(e.pointerId); } catch (err) {} }); track.addEventListener("pointermove", e => { if (!down) return; const dx = e.clientX - startX; moved = dx; if (Math.abs(dx) > 8){ track.style.transition = "none"; track.style.transform = `translateX(calc(${-heroIndex * 100}% + ${dx}px))`; } }); const endSwipe = commit => { if (!down) return; down = false; track.style.transition = ""; if (commit && Math.abs(moved) > 50) setHero(heroIndex + (moved < 0 ? 1 : -1)); else setHero(heroIndex); startHero(); }; track.addEventListener("pointerup", () => endSwipe(true)); track.addEventListener("pointercancel", () => endSwipe(false)); } function setHero(i){
  if (!HERO_SLIDES.length) return;
  heroIndex = (i + HERO_SLIDES.length) % HERO_SLIDES.length;
  $("#heroTrack").style.transform = `translateX(-${heroIndex * 100}%)`;
  $$(".hero-slide").forEach((s, j) => s.classList.toggle("active-slide", j === heroIndex));
  $$("[data-hero-dot]").forEach((b, j) => b.classList.toggle("active", j === heroIndex));
}
function startHero(){
  clearInterval(heroTimer);
  heroTimer = setInterval(() => setHero(heroIndex + 1), 5200);
}

/* ---------- Load products + categories ---------- */
let categoriesReady = null;
async function loadCategories(){
  /* Module 4: fail-closed — store ID ke baghair categories query na karein. */
  if (!STORE_ID) return;
  try {
    /* Module 1: categories come from the get_public_storefront RPC result
       (cached by resolveStore for this STORE_ID). No direct categories read. */
    const cachedCats = (__publicStorefront && __publicStorefront.store && __publicStorefront.store.id === STORE_ID && Array.isArray(__publicStorefront.categories)) ? __publicStorefront.categories : null;
    if (!cachedCats) throw new Error("Categories cache nahi mila");
    CATEGORIES = cachedCats;
  } catch (e) {
    /* Table na ho / fail ho to purana behaviour: products se categories derive. */
    console.warn("Categories table load nahi hui; products se derive hoga.", e);
    CATEGORIES = [];
  }
}
async function loadProducts(){
  /* Module 4: fail-closed — store ID ke baghair products query na karein. */
  if (!STORE_ID) return;
  /* Module 1: products come from the get_public_storefront RPC result
     (cached by resolveStore; ACTIVE products for this store only).
     No direct products table read. */
  const cachedProducts = (__publicStorefront && __publicStorefront.store && __publicStorefront.store.id === STORE_ID && Array.isArray(__publicStorefront.products)) ? __publicStorefront.products : null;
if (!cachedProducts){
    console.error("Products cache nahi mila; storefront reload karein.");
    $("#loadError").hidden = false;
    $("#resultsText").textContent = "";
    return;
  }
  PRODUCTS = cachedProducts;
  if (!categoriesReady) categoriesReady = loadCategories();
  await categoriesReady;
  /* Visible categories table se; hidden categories nav/tiles/footer se gayab
     (un ke products All Products grid mein phir bhi aate hain). */
  const visibleCats = CATEGORIES.filter(c => c.visible !== false).map(c => c.name).filter(Boolean);
  CAT_LIST = visibleCats.length ? visibleCats : [...new Set(PRODUCTS.map(p => p.cat).filter(Boolean))];
  renderCats(); renderHero(); applySections(); renderProductSections(); renderGrid(); renderLuxFooter(); renderCart();
  startSocialProof();
}
function renderCats(){
  renderNav();
  /* Categories rail: tiles do dafa render hote hain (seamless marquee loop ke
     liye). setupCatRail tay karta hai ke auto-scroll chale ya manual scroll. */
  const tiles = CAT_LIST.map(c => {
    const row = CATEGORIES.find(x => x.name === c);
    const p = PRODUCTS.find(x => x.cat === c);
    const tileImg = (row && row.image) || (p ? p.img : "");
    return `<button class="cat-tile reveal ${c === activeCat ? "active" : ""}" type="button" data-tile-cat="${esc(c)}"><img src="${safeUrl(tileImg)}" alt="${esc(c)}"><span>${esc(c)}</span></button>`;
  }).join("");
  $("#catTiles").innerHTML = `<div class="cat-rail">${tiles}${tiles}</div>`;
  $$("[data-tile-cat]").forEach(b => b.onclick = () => setFilter({ cat: b.dataset.tileCat, maxPrice: null }));
  setupCatRail();
  watchReveals();
  $("#footerCats").innerHTML = CAT_LIST.map(c => `<button type="button" data-footer-cat="${esc(c)}">${esc(c)}</button>`).join("");
  $$("[data-footer-cat]").forEach(b => b.onclick = () => setFilter({ cat: b.dataset.footerCat, maxPrice: null }));
}
/* Categories marquee: content viewport se bara ho AUR animations on hon to
   auto-scroll; warna duplicate set hata kar purana manual-scroll behaviour.
   prefers-reduced-motion par bhi auto-scroll nahi chalta. */
function setupCatRail(){
  const vp = $("#catTiles");
  const rail = vp && vp.querySelector(".cat-rail");
  if (!vp || !rail) return;
  vp.classList.remove("marquee-on");
  rail.style.animationDuration = "";
  const off = SETTINGS.animations === false || REDUCED_MOTION; /* V3.6: Playful Pop par categories hamesha auto-slide (chahe content viewport se bara ho ya na ho) — FunBug wali manual swipe nahi. */ if (!off && document.body.classList.contains("theme-playful") && CAT_LIST.length > 1){ vp.classList.add("marquee-on"); rail.style.animationDuration = Math.max(14, Math.round(rail.scrollWidth / 2 / 55)) + "s"; return; }
  const half = rail.scrollWidth / 2;
  if (!off && half > vp.clientWidth + 10){
    vp.classList.add("marquee-on");
    rail.style.animationDuration = Math.max(14, Math.round(half / 55)) + "s";
  } else {
    /* Marquee nahi — dusra (duplicate) set hata dein. */
    const tiles = rail.querySelectorAll(".cat-tile");
    tiles.forEach((t, i) => { if (i >= CAT_LIST.length) t.remove(); });
  }
}

/* ---------- Product cards & sections ---------- */
function cardHTML(p, opts = {}){
  const off = effectivePct(p);
  const out = p.stock === "out";
  const badge = (opts.newBadge || (isLuxury() && isNewP(p))) ? `<span class="new-badge">NEW</span>` : (off > 0 ? `<span class="discount-badge">-${off}%</span>` : "");
  const oosBadge = out ? `<span class="oos-badge">OUT OF STOCK</span>` : "";
  const actions = out
    ? `<button class="mini-btn oos" type="button" disabled>OUT OF STOCK</button>`
    : (opts.buyOnly
      ? `<button class="mini-btn order" type="button" data-order="${p.id}">BUY NOW</button>`
      : `<button class="mini-btn add" type="button" data-add="${p.id}">Add to Cart</button><button class="mini-btn order" type="button" data-order="${p.id}">Order Now</button>`);
  /* V3.1 spec line: sirf card-spec layout (electronics) par, desc ke pehle
     ~60 chars, escaped; desc khaali ho to line hi nahi banti. */
  const spec = (ACTIVE_THEME && ACTIVE_THEME.layout && ACTIVE_THEME.layout.card === "spec" && String(p.desc || "").trim())
    ? `<p class="card-spec">${esc(String(p.desc).slice(0, 60))}</p>` : "";
  /* V3.6: gallery ho (main + extra images) to card image swipeable carousel banti hai — dots + touch swipe + auto-rotate. */ const imgs = [String(p.img || "").trim(), ...galleryOf(p)].filter(Boolean); const imgArea = imgs.length > 1 ? `<div class="card-gallery" data-gallery><div class="cg-track">${imgs.map((u, i) => `<img src="${safeUrl(u)}" alt="${esc(p.name)}" loading="lazy" class="${i === 0 ? "on" : ""}">`).join("")}</div><div class="cg-dots">${imgs.map((_, i) => `<button type="button" data-cg-dot="${i}" class="${i === 0 ? "on" : ""}" aria-label="Image ${i + 1}"></button>`).join("")}</div></div>` : `<img src="${safeUrl(p.img || "")}" alt="${esc(p.name)}" loading="lazy">`; return `<article class="card reveal ${out ? "is-oos" : ""}">
    <div class="card-imgwrap" data-view="${p.id}">${imgArea}${badge}${oosBadge}${out ? "" : `<button type="button" class="lux-plus" data-add="${p.id}" aria-label="Add to cart">+</button>`}</div>
    <div class="card-body">
      <p class="card-fabric${p.fabric ? " has-fabric" : ""}">${esc(p.fabric || "")}</p> <h3 class="card-title" data-view="${p.id}">${esc(p.name)}</h3>${spec}
      <p class="stars">${stars(p.rating)} <small>${ratingOf(p).toFixed(1)} (${reviewsOf(p)})</small></p>
      <div class="price"><strong>${fmt(p.price)}</strong>${Number(p.old) > Number(p.price) ? `<del>${fmt(p.old)}</del>` : ""}${off > 0 ? `<span class="sale-off-badge">-${off}%</span>` : ""}</div>
      <p class="deliv ${feeOf(p) ? "paid" : ""}">${delivText(p)}</p>
      <div class="card-actions">${actions}</div>
    </div></article>`;
}
function cgShow(g, i){ const imgs = g.querySelectorAll(".cg-track img"); if (!imgs.length) return; const n = (i + imgs.length) % imgs.length; imgs.forEach((im, j) => im.classList.toggle("on", j === n)); g.querySelectorAll("[data-cg-dot]").forEach((d, j) => d.classList.toggle("on", j === n)); g.dataset.cg = String(n); } /* V3.6: saari card galleries ka EK shared auto-rotate timer (sirf nazar aane wali galleries, sirf jab tab khula ho aur animations on hon). */ let cgTimer = null; function startCardGalleries(){ if (cgTimer) return; cgTimer = setInterval(() => { if (document.hidden || SETTINGS.animations === false || REDUCED_MOTION) return; document.querySelectorAll("[data-gallery]").forEach(g => { const r = g.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return; cgShow(g, +(g.dataset.cg || 0) + 1); }); }, 3500); } function bindCards(root){
  if (!root) return;
  root.querySelectorAll("[data-add]").forEach(b => b.onclick = e => { e.stopPropagation(); addToCart(+b.dataset.add, 1); });
  root.querySelectorAll("[data-order]").forEach(b => b.onclick = e => { e.stopPropagation(); buyNow(+b.dataset.order, 1); });
  root.querySelectorAll("[data-view]").forEach(el => el.onclick = () => openProduct(+el.dataset.view)); /* V3.6 card gallery: dots + touch swipe (click card kholne se nahi takrata). */ root.querySelectorAll("[data-gallery]").forEach(g => { g.querySelectorAll("[data-cg-dot]").forEach(d => d.onclick = e => { e.stopPropagation(); cgShow(g, +d.dataset.cgDot); }); let sx = null; g.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true }); g.addEventListener("touchend", e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 30) cgShow(g, +(g.dataset.cg || 0) + (dx < 0 ? 1 : -1)); sx = null; }, { passive: true }); });
}
function renderInto(id, list, opts){
  const el = document.getElementById(id);
  el.innerHTML = list.map(p => cardHTML(p, opts)).join("");
  bindCards(el); /* V3.12 FIX B1/B3: cardHTML gives every card class "reveal" (opacity:0 until the IntersectionObserver adds "in"). watchReveals() only ran at boot / in renderGrid / renderProductSections — any later re-render (tab switch, Trending pause, filters) left the new cards unobserved and permanently invisible. Observe them here, the one place every grid render passes through. */ watchReveals();
}
function renderProductSections(){
  /* Best Sellers: featured products pehle, phir reviews ke hisaab se. */
  renderInto("bestGrid", [...PRODUCTS].sort((a,b) => ((b.featured ? 1 : 0) - (a.featured ? 1 : 0)) || reviewsOf(b) - reviewsOf(a)).slice(0, secTotal("best_sellers", 8)));
  /* V3.11: Luxury mein Hot = Trending Products grid (renderTrending), baaqi themes mein carousel. */ renderThemeSection("hot", function(){ renderInto("hotTrack", [...PRODUCTS].sort((a,b) => ratingOf(b) - ratingOf(a) || reviewsOf(b) - reviewsOf(a)).slice(0, secTotal("hot", 10))); });
  renderInto("newGrid", [...PRODUCTS].sort((a,b) => b.id - a.id).slice(0, secTotal("new_arrivals", 20)), { newBadge: true }); if (isLuxury()){ appendViewAll("newGrid", "DAILY NEW IN", "All"); ensureSwipeWrap(document.getElementById("newGrid")); }
  renderInto("dealGrid", PRODUCTS.filter(p => effectivePct(p) >= 20).sort((a,b) => effectivePct(b) - effectivePct(a) || reviewsOf(b) - reviewsOf(a)).slice(0, secTotal("deals", 8))); renderThemeSection("featured", renderFeatured); renderThemeSection("reels", renderReels); renderThemeSection("blog", renderBlog); renderThemeSection("festive", renderFestive); renderThemeSection("unstitched_tabs", renderUnstitchedTabs); renderThemeSection("readytowear_tabs", renderRtwTabs); renderThemeSection("editorial", renderEditorial); updateLuxNav(); startCardGalleries();
  renderReviews();
  const hot = [...PRODUCTS].sort((a,b) => ratingOf(b) - ratingOf(a) || reviewsOf(b) - reviewsOf(a))[0];
  $("#hotOrderBtn").disabled = !hot;
  $("#hotOrderBtn").onclick = () => { if (hot) openProduct(hot.id); };
  watchReveals();
  /* V3.4: hot + reviews auto-slide (pehli render par setup; dataset
     guard dobara timer nahi banne deta). */
  if (!isLuxury()) setupTrackAutoSlide($("#hotTrack"), $("#hotPrev"), $("#hotNext"));
  setupTrackAutoSlide($("#reviewTrack"), $("#revPrev"), $("#revNext")); /* ROUND 4 (§15): Luxury swipe rows — finger drag + auto-slide. newGrid/unstitched/rtw par R8 touch-action:pan-y hai, is liye native touch scroll blocked hai — bindRowDrag JS se drag deta hai; setupTrackAutoSlide 4s auto deta hai (touch/hover par pause, sirf jab row overflow kare — desktop grid par no-op). bestGrid: native touch chalta hai (is rule par pan-y nahi), sirf auto-slide add — drag nahi. */ if (isLuxury()){ bindRowDrag($("#newGrid")); bindRowDrag($("#unstitchedGrid")); bindRowDrag($("#rtwGrid")); setupTrackAutoSlide($("#newGrid"), null, null); setupTrackAutoSlide($("#unstitchedGrid"), null, null); setupTrackAutoSlide($("#rtwGrid"), null, null); setupTrackAutoSlide($("#bestGrid"), null, null); }
}
function currentList(){
  const q = $("#searchInput").value.trim().toLowerCase();
  let list = PRODUCTS.filter(p =>
    (activeCat === "All" || p.cat === activeCat) &&
    (maxPrice === null || Number(p.price) <= maxPrice) && (luxMinPrice === null || Number(p.price) >= luxMinPrice) && (luxMaxPrice === null || Number(p.price) <= luxMaxPrice) && (!luxOnSale || effectivePct(p) > 0) && (!luxInStock || p.stock !== "out") && (!luxSize || (productOptions(p).sizes || []).includes(luxSize)) && (!luxCat || p.cat === luxCat) && (!luxFabric || String(p.fabric || "").trim() === luxFabric) && (!luxPcs || pcsOf(p) === luxPcs) &&
    (!q || String(p.name).toLowerCase().includes(q) || String(p.cat).toLowerCase().includes(q) || String(p.desc || "").toLowerCase().includes(q)));
  const s = $("#sortSelect").value;
  if (s === "price-low") list = [...list].sort((a,b) => a.price - b.price);
  if (s === "price-high") list = [...list].sort((a,b) => b.price - a.price);
  if (s === "rating") list = [...list].sort((a,b) => ratingOf(b) - ratingOf(a));
  if (s === "popular") list = [...list].sort((a,b) => reviewsOf(b) - reviewsOf(a));
  return list;
}
function renderGrid(){
  const _allList = currentList(); const _cap = secTotal("all_products", 0); const list = _cap ? _allList.slice(0, _cap) : _allList;
  $("#resultsText").textContent = PRODUCTS.length ? list.length + " products" : "";
  $("#emptyMsg").hidden = !(PRODUCTS.length && list.length === 0);
  const _all = activeCat === "All"; $("#shopTitle").textContent = _all ? "ALL PRODUCTS" : activeCat.toUpperCase(); if (_all) applySectionText();
  $("#filterNote").textContent = `${activeCat === "All" ? "Saari categories" : activeCat}${maxPrice !== null ? " • Under " + fmt(maxPrice) : " • Har price range"}`;
  const grid = $("#grid");
  if (luxActiveCount()) document.getElementById("filterNote").textContent += " " + String.fromCharCode(8226) + " " + luxActiveCount() + " filter" + (luxActiveCount() > 1 ? "s" : ""); const luxBtn = document.getElementById("luxFilterBtn"), luxCount = document.getElementById("luxFilterCount"); if (luxBtn) luxBtn.hidden = !isLuxury(); if (luxCount){ luxCount.hidden = !luxActiveCount(); luxCount.textContent = luxActiveCount();} grid.innerHTML = list.map(p => cardHTML(p)).join("");
  bindCards(grid);
  watchReveals();
}
function setFilter({ cat = activeCat, maxPrice: nextMax = maxPrice, sort, label} = {}){ activeCat = cat; maxPrice = nextMax; if (sort) $("#sortSelect").value = sort; /* V3.12 FIX (collection pages): tile / VIEW ALL clicks open a dedicated collection page under Luxury — the old renderGrid() path updated the hidden All Products grid. (Item 2's Trending re-render is superseded by this page navigation; F4's Filters sheet APPLY -> renderTrending stays as-is.) */ if (isLuxury()){ openCollection({ cat, label: label || (cat === "All"? "All Products": cat), maxPrice: nextMax, sort}); return;}


  showPage("homeView");
  renderCats(); renderGrid();
  requestAnimationFrame(() => scrollToId("shop"));
}
function resetFilters(label, sort){ document.getElementById("searchInput").value = ""; luxMinPrice = null; luxMaxPrice = null; luxOnSale = false; luxInStock = false; luxSize = null; luxCat = null; luxPcs = null; luxFabric = null; setFilter({ cat: "All", maxPrice: null, sort: sort || "popular", label: label || "All Products" }); } function luxActiveCount(){ return (luxMinPrice !== null ? 1 : 0) + (luxMaxPrice !== null ? 1 : 0) + (luxOnSale ? 1 : 0) + (luxInStock ? 1 : 0) + (luxSize ? 1 : 0) + (luxCat ? 1 : 0) + (luxPcs ? 1 : 0) + (luxFabric ? 1 : 0);}
function scrollToId(id){
  showPage("homeView");
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* V3.3: Reviews ab SETTINGS.reviews se aate hain (admin Content tab).
   Product image naam se match karke lagti hai; match na ho to glyph. */
function renderReviews(){
  const list = (SETTINGS && Array.isArray(SETTINGS.reviews)) ? SETTINGS.reviews : [];
  $("#reviewTrack").innerHTML = list.map(r => {
    const p = PRODUCTS.find(x => x.name === r.product);
    const media = (p && p.img) ? `<img src="${safeUrl(p.img)}" alt="${esc(r.product)}">` : `<span class="review-glyph">${icon("bag")}</span>`;
    const who = r.city ? `${esc(r.name)} — ${esc(r.city)}` : esc(r.name);
    const rt = Number(r.rating) || 0;
    return `<article class="review-card reveal">
    <div class="review-product">${media}<strong>${esc(r.product)}</strong></div>
    <p class="stars">${stars(rt)} <small>${rt.toFixed(1)}</small></p>
    <p>${esc(r.text)}</p>
    <p class="verified">✓ Verified Purchase</p><p class="reviewer">${who}</p>
  </article>`;
  }).join("");
}
/* ---------- V3.6: Featured pick + Instagram reels + Blog ---------- */ function renderFeatured(){ const el = document.getElementById("featuredSection"); if (!el) return; if (!isPlayful()){ el.hidden = true; return; } const pool = PRODUCTS.filter(p => p.active !== false); const pick = pool.find(p => p.featured) || [...pool].sort((a, b) => reviewsOf(b) - reviewsOf(a))[0]; if (!pick){ el.hidden = true; return; } el.hidden = false; const bullets = String(pick.desc || "").split(String.fromCharCode(10)).map(s => s.trim()).filter(Boolean).slice(0, 4); document.getElementById("featuredBand").innerHTML = `<div class="fb-band"><div class="fb-media"><img src="${safeUrl(pick.img || "")}" alt="${esc(pick.name)}"></div><div class="fb-body"><p class="eyebrow">FEATURED PICK</p><h3>${esc(pick.name)}</h3>${bullets.length ? `<ul>${bullets.map(b => `<li>✓ ${esc(b)}</li>`).join("")}</ul>` : ""}<p class="stars">${stars(pick.rating)} <small>${ratingOf(pick).toFixed(1)} (${reviewsOf(pick)})</small></p><div class="price"><strong>${fmt(pick.price)}</strong>${Number(pick.old) > Number(pick.price) ? `<del>${fmt(pick.old)}</del>` : ""}</div><p class="deliv">${delivText(pick)}</p><div class="fb-actions"><button class="btn primary" type="button" data-fb-add="${pick.id}">Add to Cart</button><button class="btn" type="button" data-fb-view="${pick.id}">See full details →</button></div></div></div>`; const add = document.querySelector("[data-fb-add]"); const view = document.querySelector("[data-fb-view]"); if (add) add.onclick = () => addToCart(pick.id, 1); if (view) view.onclick = () => openProduct(pick.id); } function renderReels(){ const el = document.getElementById("reelsSection"); if (!el) return; const list = (SETTINGS && Array.isArray(SETTINGS.instaReels)) ? SETTINGS.instaReels : []; const show = (isPlayful() || isLuxury()) && SETTINGS.showReels !== false && list.length > 0; el.hidden = !show; if (!show) return; /* V3.12: Luxury par section "Spotted Wearing Asim Jofa" kehlata hai — left-aligned, no eyebrow. */ if (isLuxury()){ const ti = el.querySelector(".section-title"); if (ti){ ti.textContent = "Spotted Wearing Asim Jofa"; ti.classList.add("left"); } } const handle = String(SETTINGS.instaHandle || "").replace(/^@/, "").trim(); /* V3.11: Luxury mein Spotted IG-post card hota hai (neechay). */ if (isLuxury()){ renderReelsLuxury(list, handle); return;} document.getElementById("reelsFollow").innerHTML = handle ? `<a class="btn outline-light" href="https://instagram.com/${encodeURIComponent(handle)}" target="_blank" rel="noopener">Follow @${esc(handle)}</a>` : ""; document.getElementById("reelsRow").innerHTML = list.map(r => { const v = String(r.video || "").trim(); const media = /\.mp4(\?|$)/i.test(v) ? `<video src="${safeUrl(v)}" poster="${safeUrl(r.poster || "")}" muted loop playsinline preload="metadata"></video>` : `<a href="${safeUrl(v) || "#"}" target="_blank" rel="noopener"><img src="${safeUrl(r.poster || "")}" alt="${esc(r.title || "")}"></a>`; return `<article class="reel-card">${media}<p>${esc(r.title || "")}</p></article>`; }).join(""); document.querySelectorAll("#reelsRow video").forEach(v => { try { const pr = v.play(); if (pr) pr.catch(() => {}); } catch (e) {} }); bindReelsDrag(); } function renderBlog(){ const el = document.getElementById("blogSection"); if (!el) return; const list = (SETTINGS && Array.isArray(SETTINGS.blogPosts)) ? SETTINGS.blogPosts : []; const show = isPlayful() && SETTINGS.showBlog !== false && list.length > 0; el.hidden = !show; if (!show) return; document.getElementById("blogGrid").innerHTML = list.map(b => `<article class="blog-card">${b.img ? `<img src="${safeUrl(b.img)}" alt="${esc(b.title)}">` : ""}<h3>${esc(b.title)}</h3><p>${esc(b.excerpt)}</p>${b.link ? `<a href="${safeUrl(b.link)}" target="_blank" rel="noopener">Read more →</a>` : ""}</article>`).join(""); } /* ---------- V3.12 helpers ---------- */
function isNewP(p){ return [...PRODUCTS].sort((a, b) => b.id - a.id).slice(0, 20).some(x => x.id === p.id); }
function pcsOf(p){ const t = String((p.name || "") + " " + (p.desc || "")).toLowerCase(); if (/3\s?pc/.test(t)) return "3pc"; if (/2\s?pc/.test(t)) return "2pc"; if (/1\s?pc/.test(t)) return "1pc"; return null; }
function luxFabricOptions(){ const set = new Set(); PRODUCTS.forEach(p => { const f = String(p.fabric || "").trim(); if (f) set.add(f); }); return [...set]; }
function luxPcsOptions(){ const set = new Set(); PRODUCTS.forEach(p => { const v = pcsOf(p); if (v) set.add(v); }); return ["1pc", "2pc", "3pc"].filter(v => set.has(v)); }
/* V3.12 FIX B2: row arrows that do nothing must not ship — New Arrivals is a vertical grid at desktop (>900px), so its ‹ › arrows scroll nothing. Hide both arrows when the row cannot scroll; at the edges disable the arrow that has nowhere to go. Re-synced on scroll, on resize, and after every re-render (ensureSwipeWrap runs on each one). */ let rowArrowResizeBound = false; function syncRowArrows(grid){ if (!grid) return; const wrap = grid.parentElement; if (!wrap ||!wrap.classList.contains("swipe-wrap")) return; const prev = wrap.querySelector(".row-arrow.prev"), next = wrap.querySelector(".row-arrow.next"); const can = grid.scrollWidth > grid.clientWidth + 4; if (prev) prev.hidden =!can; if (next) next.hidden =!can; if (can){ if (prev) prev.disabled = grid.scrollLeft <= 4; if (next) next.disabled = grid.scrollLeft >= grid.scrollWidth - grid.clientWidth - 4;}} function ensureSwipeWrap(grid){ if (!grid ||!isLuxury()) return; if (!(grid.parentElement && grid.parentElement.classList.contains("swipe-wrap"))){ const wrap = document.createElement("div"); wrap.className = "swipe-wrap"; grid.parentNode.insertBefore(wrap, grid); wrap.appendChild(grid); const mk = (cls, label, dir) => { const b = document.createElement("button"); b.type = "button"; b.className = "row-arrow " + cls; b.textContent = label; b.setAttribute("aria-label", label === "‹" ? "Previous" : "Next"); b.onclick = () => grid.scrollBy({ left: dir * grid.clientWidth * 0.8, behavior: "smooth" }); wrap.appendChild(b); }; mk("prev", "‹", -1); mk("next", "›", 1); if (!grid.dataset.arrowScroll){ grid.dataset.arrowScroll = "1"; grid.addEventListener("scroll", () => syncRowArrows(grid), { passive: true});} if (!rowArrowResizeBound){ rowArrowResizeBound = true; window.addEventListener("resize", () => { document.querySelectorAll(".swipe-wrap >.grid").forEach(syncRowArrows);});}} syncRowArrows(grid);}
/* ---------- V3.10: Luxury Complete (Asim Jofa) ---------- */ function luxCats(){ const seen = []; PRODUCTS.filter(p => p.active !== false).forEach(p => { if (p.cat && !seen.includes(p.cat)) seen.push(p.cat); }); return seen; } function catFirstImg(cat){ const p = PRODUCTS.find(x => x.cat === cat && x.img); return p ? p.img : ""; } function luxuryTiles(){ const saved = (SETTINGS && Array.isArray(SETTINGS.luxuryTiles)) ? SETTINGS.luxuryTiles : []; if (saved.length) return saved; return [{ label: "Festive Wear", cat: "Festive Wear", img: "" }, { label: "Festive Luxe", cat: "Festive Luxe", img: "" }, { label: "Premium Festive Vol 1", cat: "Premium Festive Vol 1", img: "" }, { label: "Premium Festive Vol 2", cat: "Premium Festive Vol 2", img: "" }]; } function luxuryTabs(){ const saved = (SETTINGS && Array.isArray(SETTINGS.luxuryTabs)) ? SETTINGS.luxuryTabs : []; if (saved.length) return saved; return defaultLuxTabs(); } function renderFestive(){ const el = document.getElementById("festiveSection"); if (!el) return; if (!isLuxury()){ el.hidden = true; return; } const tiles = luxuryTiles(); if (!tiles.length){ el.hidden = true; return; } el.hidden = false; document.getElementById("festiveGrid").innerHTML = tiles.map(t => { const img = t.img || catFirstImg(t.cat); return "<button type=\"button\" class=\"festive-tile\" data-festive-cat=\"" + esc(t.cat) + "\" data-festive-label=\"" + esc(t.label) + "\">" + (img ? "<img src=\"" + safeUrl(img) + "\" alt=\"" + esc(t.label) + "\" loading=\"lazy\">" : "") + "<span>" + esc(t.label) + "</span></button>"; }).join(""); document.querySelectorAll("#festiveGrid [data-festive-cat]").forEach(b => b.onclick = () => setFilter({ cat: b.dataset.festiveCat, label: b.dataset.festiveLabel, maxPrice: null })); } let luxTabState = { unstitched: 0, rtw: 0}; function renderTabSection(secId, tabsId, gridId, tabs, stateKey){ const el = document.getElementById(secId); if (!el) return; if (!isLuxury()){ el.hidden = true; return;} if (!tabs.length){ el.hidden = true; return;} el.hidden = false; if (luxTabState[stateKey] >= tabs.length) luxTabState[stateKey] = 0; document.getElementById(tabsId).innerHTML = tabs.map((t, i) => `<button type="button" class="lux-tab${i === luxTabState[stateKey]? " on": ""}" data-luxtab="${i}">${esc(t.label)}</button>`).join(""); const tab = tabs[luxTabState[stateKey]]; const list = PRODUCTS.filter(p => p.active!== false && (!tab.cat || p.cat === tab.cat)); renderInto(gridId, list); appendViewAll(gridId, tab.label.toUpperCase() + " - " + (stateKey === "rtw" ? "PRET" : "UNSTITCHED"), tab.cat); ensureSwipeWrap(document.getElementById(gridId)); $$("#" + tabsId + " [data-luxtab]").forEach(b => b.onclick = () => { luxTabState[stateKey] = +b.dataset.luxtab; renderTabSection(secId, tabsId, gridId, tabs, stateKey);});} function renderUnstitchedTabs(){ renderTabSection("unstitchedSection", "unstitchedTabs", "unstitchedGrid", luxuryTabs(), "unstitched");} function renderRtwTabs(){ renderTabSection("rtwSection", "rtwTabs", "rtwGrid", luxuryRtwTabs(), "rtw");} /* V3.11: VIEW ALL tile (Luxury) — row ke end par "VIEW ALL IN {GROUP}". */ function viewAllTile(label, cat){ const n = (!cat || cat === "All")? PRODUCTS.filter(p => p.active!== false).length: PRODUCTS.filter(p => p.active!== false && p.cat === cat).length; return `<button type="button" class="view-all-tile" data-viewall-cat="${esc(cat || "All")}" data-viewall-label="${esc(label)}"><span>VIEW ALL IN</span><strong>${esc(label)}</strong><small>${n} Products →</small></button>`;} function appendViewAll(gridId, label, cat){ const grid = document.getElementById(gridId); if (!grid) return; grid.insertAdjacentHTML("beforeend", viewAllTile(label, cat)); grid.querySelectorAll("[data-viewall-cat]").forEach(b => b.onclick = () => setFilter({ cat: b.dataset.viewallCat, label: b.dataset.viewallLabel, maxPrice: null}));} /* V3.11: Luxury tab defaults — pehle Luxury / Daily Wear / Embroidered naam wali categories, phir baaqi categories (tab label hamesha Asim Jofa jaisa). */ function defaultLuxTabs(){ const cats = luxCats(); const out = []; [["Luxury", /luxury/i], ["Daily Wear", /daily/i], ["Embroidered", /embroider/i]].forEach(([label, re]) => { const c = cats.find(x => re.test(x)); out.push({ label, cat: c || label }); }); return out.slice(0, 3); } function defaultLuxRtwTabs(){ const cats = luxCats(); const out = []; [["Luxury", /luxury/i], ["Daily Wear", /daily/i], ["Embroidered", /embroider/i]].forEach(([label, re]) => { const c = cats.find(x => /pret|stitched/i.test(x) && re.test(x)) || cats.find(x => /pret|stitched/i.test(x)); out.push({ label, cat: c || (label + " Pret") }); }); return out.slice(0, 3); } function luxuryRtwTabs(){ const saved = (SETTINGS && Array.isArray(SETTINGS.luxuryRtwTabs))? SETTINGS.luxuryRtwTabs: []; if (saved.length) return saved; return defaultLuxRtwTabs();} /* V3.11: Editorial slider (Asim Jofa fabric banners — Silk, Cambric...) — dots + 4s auto-rotate. Banners: admin list, warna purana single banner, warna hero slides. */ let editorialTimer = null, editorialIdx = 0; function luxuryBanners(){ const saved = (SETTINGS && Array.isArray(SETTINGS.luxuryBanners))? SETTINGS.luxuryBanners.filter(x => x && String(x.img || "").trim()): []; if (saved.length) return saved; const single = (SETTINGS && SETTINGS.luxuryBanner && typeof SETTINGS.luxuryBanner === "object")? SETTINGS.luxuryBanner: {}; if (String(single.img || "").trim()) return [{ img: single.img, eyebrow: single.eyebrow || "", title: single.title || "", button: single.button || "", cat: single.cat || ""}]; return []; } /* ROUND 4 (§15): editorial finger swipe. #editorialBanner single-img rotator hai — finger swipe ka koi handler nahi tha, sirf dots + 4s auto. touch-action:pan-y (CSS C-S1) se horizontal drag JS ko milta hai. Drag ke dauran timer pause (clearInterval). NOTE: pointerup par renderEditorial() SIRF tab call hota hai jab swipe hua ho (|dx|>50) — tap par re-render innerHTML badal dega aur dot/img ka click swallow ho jayega; tap par sirf timer restart hota hai, DOM nahi badalta. */ function bindEditorialSwipe(){ const ban = document.getElementById("editorialBanner"); if (!ban || ban.dataset.edSwipe) return; ban.dataset.edSwipe = "1"; let down = false, startX = 0, moved = false; const restartTimer = () => { const b = luxuryBanners(); if (b.length > 1 && !editorialTimer) editorialTimer = setInterval(() => { editorialIdx = (editorialIdx + 1) % b.length; renderEditorial(); }, 4000); }; ban.addEventListener("pointerdown", e => { down = true; moved = false; startX = e.clientX; if (editorialTimer){ clearInterval(editorialTimer); editorialTimer = null;}}); ban.addEventListener("pointermove", e => { if (!down) return; if (Math.abs(e.clientX - startX) > 4){ if (!moved){ moved = true; try { ban.setPointerCapture(e.pointerId);} catch (err) {}}}}); ban.addEventListener("pointerup", e => { if (!down) return; down = false; const dx = e.clientX - startX; if (Math.abs(dx) > 50){ const b = luxuryBanners(); if (b.length > 1) editorialIdx = (editorialIdx + (dx < 0 ? 1 : -1) + b.length) % b.length; renderEditorial(); } else restartTimer(); }); ban.addEventListener("pointercancel", () => { down = false; restartTimer(); }); ban.addEventListener("click", e => { if (moved){ e.preventDefault(); e.stopPropagation(); moved = false; } }, true); } function renderEditorial(){ const el = document.getElementById("editorialSection"); if (!el) return; if (editorialTimer){ clearInterval(editorialTimer); editorialTimer = null;} if (!isLuxury()){ el.hidden = true; return;} const banners = luxuryBanners(); if (!banners.length){ el.hidden = true; return;} el.hidden = false; if (editorialIdx >= banners.length) editorialIdx = 0; const b = banners[editorialIdx]; const cat = String(b.cat || "").trim() || "All"; const eb = String(b.eyebrow || "").trim(); const ti = String(b.title || "").trim(); const bt = String(b.button || "").trim(); document.getElementById("editorialBanner").innerHTML = `<img src="${safeUrl(b.img)}" alt="${esc(String(b.alt || b.title || ""))}" loading="lazy" data-ed-cat="${esc(cat)}">${(eb || ti || bt) ? `<div class="editorial-overlay">${eb ? `<p class="editorial-eyebrow">${esc(eb)}</p>` : ""}${ti ? `<h3>${esc(ti)}</h3>` : ""}${bt ? `<button type="button" class="ed-btn" data-ed-btn="${esc(cat)}">${esc(bt)}</button>` : ""}</div>` : ""}<div class="editorial-dots">${banners.map((_, i) => `<button type="button" data-ed-dot="${i}" class="${i === editorialIdx? "on": ""}" aria-label="Banner ${i + 1}"></button>`).join("")}</div>`; const imgEl = document.querySelector("#editorialBanner img"); if (imgEl) imgEl.onclick = () => setFilter({ cat: imgEl.dataset.edCat, label: imgEl.dataset.edCat === "All"? "All Products": imgEl.dataset.edCat, maxPrice: null}); const btnEl = document.querySelector("#editorialBanner [data-ed-btn]"); if (btnEl) btnEl.onclick = () => setFilter({ cat: btnEl.dataset.edBtn, label: btnEl.dataset.edBtn === "All"? "All Products": btnEl.dataset.edBtn, maxPrice: null}); $$("#editorialBanner [data-ed-dot]").forEach(d => d.onclick = () => { editorialIdx = +d.dataset.edDot; renderEditorial();}); bindEditorialSwipe(); if (banners.length > 1) editorialTimer = setInterval(() => { editorialIdx = (editorialIdx + 1) % banners.length; renderEditorial();}, 4000);} function luxSizeOptions(){ const set = new Set(); PRODUCTS.forEach(p => (productOptions(p).sizes || []).forEach(s => set.add(s))); return [...set]; } /* V3.11: Spotted — Instagram post jaisa card (avatar, @username, caption, video, like/share, Shop Now) + Visit Instagram button. Sirf Luxury. */ function renderReelsLuxury(list, handle){ const follow = document.getElementById("reelsFollow"); if (follow) follow.innerHTML = ""; const visit = document.getElementById("reelsVisit"); if (visit) visit.innerHTML = handle? `<a class="btn lux-visit-ig" href="https://instagram.com/${encodeURIComponent(handle)}" target="_blank" rel="noopener"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg> Visit Instagram</a>`: ""; document.getElementById("reelsRow").innerHTML = list.map(r => { const v = String(r.video || "").trim(); const user = String(r.user || "").trim() || handle || "instagram"; const ava = String(r.avatar || "").trim() ? `<img class="ig-ava" src="${safeUrl(r.avatar)}" alt="">` : `<span class="ig-ava-txt">${esc((user || "A")[0].toUpperCase())}</span>`; const media = /\.mp4(\?|$)/i.test(v) ? `<video src="${safeUrl(v)}" poster="${safeUrl(r.poster || "")}" muted loop playsinline preload="metadata"></video>` : `<a href="${safeUrl(v) || "#"}" target="_blank" rel="noopener"><img src="${safeUrl(r.poster || "")}" alt="${esc(r.title || "")}"></a>`; return `<article class="reel-card ig"><div class="ig-head">${ava}<div><strong>@${esc(user)}</strong><span>${esc(r.title || "")}</span></div></div><div class="ig-media">${media}</div><div class="ig-foot"><button type="button" class="ig-like" data-ig-like aria-label="Like"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></button><a class="ig-act" href="${safeUrl(v) || "#"}" target="_blank" rel="noopener" aria-label="Comment"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></a><button type="button" class="ig-act" data-ig-share="${esc(v)}" aria-label="Share"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button><a class="ig-shop" href="${safeUrl(v) || "#"}" target="_blank" rel="noopener">Shop Now</a></div></article>`; }).join(""); document.querySelectorAll("#reelsRow video").forEach(v => { try { const pr = v.play(); if (pr) pr.catch(() => {});} catch (e) {}}); $$("#reelsRow [data-ig-like]").forEach(b => b.onclick = () => b.classList.toggle("liked")); $$("#reelsRow [data-ig-share]").forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.igShare); toast("Reel link copy ho gaya");} catch (e) { toast(b.dataset.igShare);}}); bindReelsDrag();} /* ROUND 4 (§15): unified pointer-drag for swipe rows — B4 generalised. R8 (§14) ne #newGrid/#unstitchedGrid/#rtwGrid/#reelsRow par touch-action:pan-y lagaya: browser horizontal touch scroll nahi karta, drag JS ko milta hai. B4 sirf mouse handle karta tha (touch skip) — is liye finger swipe dead thi. Ye binder SAB pointer types (touch + mouse + pen) handle karta hai; vertical drag par browser pointercancel bhejta hai aur page scroll karta hai (R8 intact). scroll-snap-type:x mandatory release par nearest card par snap karta hai. */ function bindRowDrag(row){ if (!row || row.dataset.dragBound) return; row.dataset.dragBound = "1"; let down = false, startX = 0, startLeft = 0, moved = false; row.addEventListener("pointerdown", e => { down = true; moved = false; startX = e.clientX; startLeft = row.scrollLeft; row.classList.add("dragging");}); row.addEventListener("pointermove", e => { if (!down) return; const dx = e.clientX - startX; if (Math.abs(dx) > 4){ if (!moved){ moved = true; try { row.setPointerCapture(e.pointerId);} catch (err) {}} row.scrollLeft = startLeft - dx;}}); const endDrag = () => { down = false; row.classList.remove("dragging"); }; row.addEventListener("pointerup", endDrag); row.addEventListener("pointercancel", endDrag); row.addEventListener("click", e => { if (moved){ e.preventDefault(); e.stopPropagation(); moved = false; } }, true); } /* V3.12 FIX B4: Spotted row is overflow-x:auto, so touch swipe works — but a mouse drag does nothing on a plain scroll container, and there are no arrows, so reels 2–4 are unreachable at desktop. Pointer-drag scrolling for mouse (touch pointers skip, keeping native touch scrolling). A drag swallows the click that follows it so a dragged reel does not navigate. */ /* V3.12 FIX B4 (ROUND 4 §15 — comment corrected): Spotted row overflow-x:auto hai, lekin R8 (§14) ne is par touch-action:pan-y lagaya — browser horizontal touch scroll NAHI karta, is liye "touch swipe works" wali baat ab ghalat hai. B4 ka mouse-only drag bhi touch skip karta tha. Ab unified bindRowDrag (touch + mouse) + setupTrackAutoSlide (4s auto, touch/hover par pause) — dono isi function se. */ function bindReelsDrag(){ const row = document.getElementById("reelsRow"); if (!row) return; bindRowDrag(row); setupTrackAutoSlide(row, null, null); } /* V3.11: Trending Products — Asim Jofa jaisa grid + toolbar (collection dropdown, pause, sort, filter). Sirf Luxury; baaqi themes carousel. */ let trendCat = "All", trendSort = "newest", trendOffset = 0, trendPaused = false, trendTimer = null; function trendPool(){ let pool = PRODUCTS.filter(p => p.active!== false); if (trendCat!== "All") pool = pool.filter(p => p.cat === trendCat); /* V3.12 FIX F4: Filters sheet state must apply to the Trending pool too — previously trendPool ignored every lux filter, so APPLY could never change the visible grid. Same conditions as currentList(). */ if (luxMinPrice!== null) pool = pool.filter(p => Number(p.price) >= luxMinPrice); if (luxMaxPrice!== null) pool = pool.filter(p => Number(p.price) <= luxMaxPrice); if (luxOnSale) pool = pool.filter(p => effectivePct(p) > 0); if (luxInStock) pool = pool.filter(p => p.stock!== "out"); if (luxSize) pool = pool.filter(p => (productOptions(p).sizes || []).includes(luxSize)); if (luxCat) pool = pool.filter(p => p.cat === luxCat); if (luxFabric) pool = pool.filter(p => String(p.fabric || "").trim() === luxFabric); if (luxPcs) pool = pool.filter(p => pcsOf(p) === luxPcs); if (trendSort === "newest") pool = [...pool].sort((a,b) => b.id - a.id); else if (trendSort === "price-low") pool = [...pool].sort((a,b) => a.price - b.price); else if (trendSort === "price-high") pool = [...pool].sort((a,b) => b.price - a.price); else if (trendSort === "rating") pool = [...pool].sort((a,b) => ratingOf(b) - ratingOf(a)); else pool = [...pool].sort((a,b) => ratingOf(b) - ratingOf(a) || reviewsOf(b) - reviewsOf(a)); return pool;} function renderTrending(){ const el = document.getElementById("hotSection"); if (!el) return; if (!isLuxury()) return; const customHot = SETTINGS.sectionText && SETTINGS.sectionText.hot && String(SETTINGS.sectionText.hot.title || "").trim(); if (!customHot){ const ti = el.querySelector(".section-title"); if (ti) ti.textContent = "Trending Products"; } const tb = document.getElementById("trendToolbar"); if (tb) tb.hidden = false; const catBtn = document.getElementById("trendCatBtn"); if (catBtn) catBtn.textContent = (trendCat === "All" ? "All Collections" : trendCat) + " ⌄"; const catMenu = document.getElementById("trendCatMenu"); if (catMenu){ const cats = ["All", ...luxCats()]; catMenu.innerHTML = cats.map(c => `<button type="button" data-trendcat="${esc(c)}">${c === "All" ? "All Collections" : esc(c)}</button>`).join(""); catMenu.querySelectorAll("[data-trendcat]").forEach(b => b.onclick = () => { trendCat = b.dataset.trendcat; trendOffset = 0; catMenu.hidden = true; renderTrending(); }); } const sortBtn = document.getElementById("trendSortBtn"); if (sortBtn){ const labels = { newest: "Newest", "price-low": "Price: Low to High", "price-high": "Price: High to Low", popular: "Most Popular" }; sortBtn.textContent = "Sort: " + (labels[trendSort] || "Newest") + " ⌄"; } const pool = trendPool(); renderInto("hotTrack", secTotal("hot", 0) ? pool.slice(0, secTotal("hot", 0)) : pool); const pb = document.getElementById("trendPause"); if (pb) pb.textContent = trendPaused ? "▶" : "⏸"; if (trendTimer){ clearInterval(trendTimer); trendTimer = null; } } /* V3.12 FIX (collection pages): Luxury tile / VIEW ALL clicks open a dedicated collection page instead of filtering the hidden All Products grid. The page reads its title/subtitle from settings.collectionPages (admin Content tab), defaulting to the collection's name + product count. */ let collCat = "All", collLabel = "All Products", collMaxPrice = null, collSort = "newest", collCats = null; function collTitleOf(label){ const s = String(label || "").trim(); if (s && s === s.toUpperCase()) return s.toLowerCase().split(" ").map(w => w? w[0].toUpperCase() + w.slice(1): w).join(" "); return s;} function collPageText(cat, label){ const rows = (SETTINGS && Array.isArray(SETTINGS.collectionPages))? SETTINGS.collectionPages: []; const row = rows.find(x => String(x.cat || "").trim().toLowerCase() === String(cat || "").trim().toLowerCase()); const title = row && String(row.title || "").trim()? row.title.trim(): collTitleOf(label); return { title, subtitle: row && String(row.subtitle || "").trim()? row.subtitle.trim(): "", img: row && String(row.img || "").trim()? row.img.trim(): ""};} function collPool(){ let pool = PRODUCTS.filter(p => p.active!== false); if (collCats && collCats.length) pool = pool.filter(p => collCats.includes(p.cat)); else if (collCat!== "All") pool = pool.filter(p => p.cat === collCat); if (collMaxPrice!== null) pool = pool.filter(p => Number(p.price) <= collMaxPrice); /* Filters sheet state — same conditions as currentList()/trendPool(). */ if (luxMinPrice!== null) pool = pool.filter(p => Number(p.price) >= luxMinPrice); if (luxMaxPrice!== null) pool = pool.filter(p => Number(p.price) <= luxMaxPrice); if (luxOnSale) pool = pool.filter(p => effectivePct(p) > 0); if (luxInStock) pool = pool.filter(p => p.stock!== "out"); if (luxSize) pool = pool.filter(p => (productOptions(p).sizes || []).includes(luxSize)); if (luxCat) pool = pool.filter(p => p.cat === luxCat); if (luxFabric) pool = pool.filter(p => String(p.fabric || "").trim() === luxFabric); if (luxPcs) pool = pool.filter(p => pcsOf(p) === luxPcs); if (collSort === "price-low") pool = [...pool].sort((a,b) => a.price - b.price); else if (collSort === "price-high") pool = [...pool].sort((a,b) => b.price - a.price); else if (collSort === "popular") pool = [...pool].sort((a,b) => ratingOf(b) - ratingOf(a) || reviewsOf(b) - reviewsOf(a)); else pool = [...pool].sort((a,b) => b.id - a.id); return pool;} function renderCollection(){ const pool = collPool(); const t = collPageText(collCat, collLabel); const ti = document.getElementById("collTitle"); if (ti) ti.textContent = t.title; const sub = document.getElementById("collSub"); if (sub) sub.textContent = t.subtitle || (pool.length + (pool.length === 1? " Product": " Products")); const im = document.getElementById("collImg"); if (im){ if (t.img){ im.src = safeUrl(t.img); im.hidden = false; } else { im.hidden = true; im.removeAttribute("src"); } } const sel = document.getElementById("collSort"); if (sel) sel.value = collSort; renderInto("collectionGrid", pool); if (!pool.length){ const g = document.getElementById("collectionGrid"); if (g) g.innerHTML = `<p class="hint" style="grid-column:1/-1;text-align:center;padding:24px 0">Is collection mein abhi koi product nahi.</p>`;}} function openCollection({ cat = "All", label = "All Products", maxPrice = null, sort, cats} = {}){ collCat = cat; collLabel = label; collMaxPrice = maxPrice; collCats = (cats && cats.length)? cats.slice(): null; /* R9 (§14): bottom-nav group pages — Unstitched = Unstitched tab collections (luxuryTabs: Luxury / Daily Wear / Embroidered), Stitched = RTW/Pret tab collections (luxuryRtwTabs: Luxury Pret / Daily Wear Pret / Embroidered Pret). openCollection ka `cats` array (collCats) ek se zyada categories ka pool banata hai; single-cat pages (tiles / VIEW ALL) pehle jaisi hi hain. */ if (sort && ["newest", "price-low", "price-high", "popular"].includes(sort)) collSort = sort; renderCollection(); showPage("collectionPage");}
/* ---------- V5 Phase 4: Custom Pages (SIMPLE) ----------
  Data: SETTINGS.customPages[] = { slug, title, body (safe HTML),
  seoTitle, showInHeader, showInFooter }. Har theme par chalta hai —
  theme-independent content hai (custom_sections / menu_links jaisi),
  is liye kisi theme def mein nahi hai (F13 note §1 D3).
  Body mein sirf whitelist tags chalte hain — sanitizePageHtml baaki
  sab strip karta hai (script/style/img/iframe/on* attributes). */
function sanitizePageHtml(html){
  var allowed = { B: 1, STRONG: 1, I: 1, EM: 1, A: 1, UL: 1, OL: 1, LI: 1, P: 1, BR: 1, H2: 1, H3: 1 };
  var drop = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, FORM: 1, INPUT: 1, BUTTON: 1, IMG: 1, VIDEO: 1, AUDIO: 1 };
  var div = document.createElement("div");
  div.innerHTML = String(html || "");
  var walk = function(node){
    var i = 0;
    while (i < node.childNodes.length){
      var ch = node.childNodes[i];
      if (ch.nodeType === 3){ i++; continue; }
      if (ch.nodeType !== 1){ ch.remove(); continue; }
      if (drop[ch.tagName]){ ch.remove(); continue; }
      /* Disallowed tag: unwrap — children move up to this spot and are
        re-scanned in place (a <script> inside a <div> must not survive
        the unwrap — the first draft only walked the snapshot). */
      if (!allowed[ch.tagName]){ while (ch.firstChild) node.insertBefore(ch.firstChild, ch); ch.remove(); continue; }
      if (ch.tagName === "A"){
        var href = (ch.getAttribute("href") || "").trim();
        if (!/^(https?:|mailto:|page:)/i.test(href)) ch.removeAttribute("href");
        else if (!/^page:/i.test(href)){ ch.setAttribute("target", "_blank"); ch.setAttribute("rel", "noopener"); }
      }
      Array.prototype.slice.call(ch.attributes).forEach(function(a){ if (a.name !== "href" && a.name !== "target" && a.name !== "rel") ch.removeAttribute(a.name); });
      walk(ch);
      i++;
    }
  };
  walk(div);
  return div.innerHTML;
}
function customPageNavHTML(where){
  var list = (SETTINGS.customPages || []).filter(function(p){ return p && p.slug && (where === "header" ? p.showInHeader : p.showInFooter); });
  return list.map(function(p){ return `<button type="button" data-custompage="${esc(p.slug)}">${esc(p.title)}</button>`; }).join("");
}
function bindCustomPageNav(root){
  if (!root) return;
  root.querySelectorAll("[data-custompage]").forEach(function(b){ b.onclick = function(){ openCustomPage(b.dataset.custompage); }; });
}
function findCustomPage(slug){
  slug = String(slug || "").trim().toLowerCase();
  return (SETTINGS.customPages || []).find(function(p){ return p && p.slug === slug; }) || null;
}
function openCustomPage(slug){
  var pg = findCustomPage(slug);
  if (!pg) return false;
  renderCustomPage(pg);
  showPage("customPage");
  return true;
}
function renderCustomPage(pg){
  var t = document.getElementById("customPageTitle");
  if (t) t.textContent = pg.title || "Page";
  var b = document.getElementById("customPageBody");
  if (b) b.innerHTML = sanitizePageHtml(pg.body);
  var name = SETTINGS.store_name || DEFAULT_SETTINGS.store_name;
  document.title = (pg.seoTitle && pg.seoTitle.trim() ? pg.seoTitle.trim() : (pg.title || "Page")) + " — " + name;
  var metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc){ var tmp = document.createElement("div"); tmp.innerHTML = sanitizePageHtml(pg.body); var txt = (tmp.textContent || "").replace(/\s+/g, " ").trim(); metaDesc.content = txt ? txt.slice(0, 160) : ((pg.title || "Page") + " — " + name); }
}
/* V5 Phase 4: Luxury footer — page links Information accordion mein.
  renderFooterLinks dobara chale (settings reload) to accordion ban chuka
  hota hai; ye sync tab bhi links ko sahi jagah le jata hai — pehle purane
  page links hatata hai, phir naye lagata hai (duplicate nahi bante). */
function syncLuxFooterPages(){
  if (!isLuxury()) return;
  var acc = document.getElementById("luxInfoLinks");
  if (!acc) return;
  acc.querySelectorAll("[data-custompage]").forEach(function(b){ b.remove(); });
  document.querySelectorAll("#footerHelpLinks [data-custompage]").forEach(function(b){ if (b.parentNode) b.parentNode.removeChild(b); acc.appendChild(b); });
}
/* §16 FIX: openLuxGroup MUST be top-level — R9 (§14) ne isay openCollection ke ANDAR likh diya tha, is liye nav handler ko global scope mein ye mila hi nahi aur click par ReferenceError throw hota tha (kuch bhi nahi hota tha). */ function openLuxGroup(kind){ const tabs = kind === "stitched"? luxuryRtwTabs(): luxuryTabs(); const cats = tabs.map(t => t.cat).filter(Boolean); openCollection({ cat: kind === "stitched"? "Stitched": "Unstitched", cats, label: kind === "stitched"? "Stitched": "Unstitched"}); } /* V3.12: Luxury footer — logo FIRST (centred), then newsletter, then 4 accordions
   (Contact / Information / Customer Care / Policies). Contact shows the STORE's own
   profile lines (settings.profile) — never another brand's details. Policy buttons are
   MOVED (not cloned) so their handlers survive. */ function renderLuxFooter(){ if (!isLuxury()) return; const footIn = document.querySelector(".footer-in"); if (!footIn) return; if (footIn.dataset.luxDone) return; footIn.dataset.luxDone = "1"; const cols = footIn.querySelectorAll(":scope > div"); if (cols[0]) cols[0].classList.add("lux-logo-col"); const newsCol = document.getElementById("subForm") ? document.getElementById("subForm").closest("div") : null; if (newsCol){ newsCol.classList.add("lux-news-col"); const h = document.createElement("h2"); h.className = "lux-news-h"; h.textContent = "Join Our Newsletter"; const sub = document.createElement("p"); sub.className = "lux-news-sub"; sub.textContent = "Never miss a drop, a sale, or an exclusive offer."; newsCol.insertBefore(sub, newsCol.firstChild); newsCol.insertBefore(h, sub); } const catsCol = document.getElementById("footerCats") ? document.getElementById("footerCats").parentElement : null; if (catsCol) catsCol.hidden = true; const helpCol = document.getElementById("footerHelpLinks") ? document.getElementById("footerHelpLinks").parentElement : null; if (helpCol) helpCol.hidden = true; const pick = sel => { const b = document.querySelector(sel); if (b && b.parentNode) b.parentNode.removeChild(b); return b; }; const mkAcc = (title, nodes) => { const d = document.createElement("div"); d.className = "lux-acc"; const h3 = document.createElement("h3"); h3.textContent = title; h3.onclick = () => d.classList.toggle("open"); const body = document.createElement("div"); body.className = "lux-acc-body"; nodes.forEach(x => { if (x) body.appendChild(x); }); d.appendChild(h3); d.appendChild(body); footIn.appendChild(d); return d; }; const fc = document.getElementById("footerContact"); let contactNodes = []; if (fc && fc.innerHTML.trim()){ const wrap = document.createElement("div"); wrap.className = "footer-contact"; wrap.innerHTML = fc.innerHTML; contactNodes = [wrap]; } else { const p = document.createElement("p"); p.textContent = "Contact us via WhatsApp or email."; contactNodes = [p]; } const waNum = String((SETTINGS && SETTINGS.whatsapp_number) || "").replace(/\D/g, ""); if (waNum){ const a = document.createElement("a"); a.href = "https://wa.me/" + waNum; a.target = "_blank"; a.rel = "noopener"; a.textContent = "WhatsApp Channel"; contactNodes.push(a); } const infoLinks = document.createElement("div"); infoLinks.className = "footer-links"; infoLinks.id = "luxInfoLinks"; const bContact = pick('[data-policy="contact"]'), bTrack = pick("#trackOrderLink"); if (bContact) infoLinks.appendChild(bContact); if (bTrack) infoLinks.appendChild(bTrack); const careLinks = document.createElement("div"); careLinks.className = "footer-links"; const bShip = pick('[data-policy="shipping"]'), bRefund = pick('[data-policy="refund"]'); if (bShip) careLinks.appendChild(bShip); if (bRefund) careLinks.appendChild(bRefund); const polLinks = document.createElement("div"); polLinks.className = "footer-links"; const bPriv = pick('[data-policy="privacy"]'), bTerms = pick('[data-policy="terms"]'); if (bPriv) polLinks.appendChild(bPriv); if (bTerms) polLinks.appendChild(bTerms); mkAcc("Contact", contactNodes); mkAcc("Information", [infoLinks]); mkAcc("Customer Care", [careLinks]); mkAcc("Policies", [polLinks]); /* V5 Phase 4: footer ke custom-page links Information accordion mein. */ syncLuxFooterPages(); } /* V3.11: Collections popup (bottom-nav Menu). */ function openLuxMenu(){ const sheet = $("#luxMenuSheet"), back = $("#luxMenuBackdrop"); if (!sheet) return; document.getElementById("luxMenuGrid").innerHTML = luxCats().map(c => { const img = catFirstImg(c); return `<button type="button" class="menu-tile" data-menu-cat="${esc(c)}">${img? `<img src="${safeUrl(img)}" alt="${esc(c)}" loading="lazy">`: ""}<span>${esc(c)}</span></button>`; }).join("") || `<p class="hint">Abhi koi category nahi — pehle Products mein categories likhein.</p>`; /* V5 Phase 4: Menu sheet mein pages (header-menu wale) — sheet khula rehta to page dhak jata, is liye click par pehle closeLuxMenu(). */ const mp = document.getElementById("luxMenuPages"); if (mp){ const pages = (SETTINGS.customPages || []).filter(function(p){ return p && p.slug && p.showInHeader; }); mp.innerHTML = pages.length ? "<h4>Pages</h4>" + pages.map(function(p){ return `<button type="button" data-custompage="${esc(p.slug)}">${esc(p.title)}</button>`; }).join("") : ""; mp.querySelectorAll("[data-custompage]").forEach(function(b){ b.onclick = function(){ closeLuxMenu(); openCustomPage(b.dataset.custompage); }; }); } $$("#luxMenuGrid [data-menu-cat]").forEach(b => b.onclick = () => { closeLuxMenu(); setFilter({ cat: b.dataset.menuCat, label: b.dataset.menuCat, maxPrice: null});}); sheet.hidden = false; if (back) back.hidden = false;} function closeLuxMenu(){ const sheet = $("#luxMenuSheet"), back = $("#luxMenuBackdrop"); if (sheet) sheet.hidden = true; if (back) back.hidden = true;} function openLuxSheet(){ const sheet = document.querySelector("#luxSheet"), back = document.querySelector("#luxSheetBackdrop"); if (!sheet) return; document.querySelector("#luxFOnSale").checked = luxOnSale; document.querySelector("#luxFInStock").checked = luxInStock; document.querySelector("#luxFMin").value = luxMinPrice === null ? "" : luxMinPrice; document.querySelector("#luxFMax").value = luxMaxPrice === null ? "" : luxMaxPrice; const pillRow = (id, values, current, attr, hint) => { const box = document.querySelector(id); if (!box) return; box.innerHTML = values.length ? values.map(v => "<button type=\"button\" class=\"size-pill" + (current === v ? " on" : "") + "\" data-" + attr + "=\"" + esc(v) + "\">" + esc(v) + "</button>").join("") : "<span class=\"hint\">" + hint + "</span>"; }; pillRow("#luxFCatPills", luxCats(), luxCat, "luxcat", "Koi category nahi."); pillRow("#luxFPcsPills", luxPcsOptions(), luxPcs, "luxpcs", "Kisi product mein pcs nahi likha."); pillRow("#luxFFabricPills", luxFabricOptions(), luxFabric, "luxfabric", "Kisi product mein fabric nahi likha."); const sizes = luxSizeOptions(); document.querySelector("#luxFSizePills").innerHTML = sizes.length ? sizes.map(s => "<button type=\"button\" class=\"size-pill" + (luxSize === s ? " on" : "") + "\" data-luxsize=\"" + esc(s) + "\">" + esc(s) + "</button>").join("") : "<span class=\"hint\">Kisi product mein sizes nahi likhe — pehle Product form se sizes likhein.</span>"; const bindPills = (sel, attr, set) => { document.querySelectorAll(sel).forEach(b => b.onclick = () => { const v = b.dataset[attr]; set(v === (attr === "luxcat" ? luxCat : attr === "luxpcs" ? luxPcs : attr === "luxfabric" ? luxFabric : luxSize) ? null : v); document.querySelectorAll(sel).forEach(x => x.classList.toggle("on", x.dataset[attr] === (attr === "luxcat" ? luxCat : attr === "luxpcs" ? luxPcs : attr === "luxfabric" ? luxFabric : luxSize))); }); }; bindPills("#luxFCatPills [data-luxcat]", "luxcat", v => { luxCat = v; }); bindPills("#luxFPcsPills [data-luxpcs]", "luxpcs", v => { luxPcs = v; }); bindPills("#luxFFabricPills [data-luxfabric]", "luxfabric", v => { luxFabric = v; }); document.querySelectorAll("#luxFSizePills [data-luxsize]").forEach(b => b.onclick = () => { luxSize = (luxSize === b.dataset.luxsize) ? null : b.dataset.luxsize; document.querySelectorAll("#luxFSizePills [data-luxsize]").forEach(x => x.classList.toggle("on", x.dataset.luxsize === luxSize)); }); sheet.hidden = false; if (back) back.hidden = false; } function closeLuxSheet(){ const sheet = document.querySelector("#luxSheet"), back = document.querySelector("#luxSheetBackdrop"); if (sheet) sheet.hidden = true; if (back) back.hidden = true; } function applyLuxFilters(){ luxOnSale = document.querySelector("#luxFOnSale").checked; luxInStock = document.querySelector("#luxFInStock").checked; const mn = parseInt(document.querySelector("#luxFMin").value, 10), mx = parseInt(document.querySelector("#luxFMax").value, 10); luxMinPrice = Number.isFinite(mn) && mn > 0 ? mn : null; luxMaxPrice = Number.isFinite(mx) && mx > 0 ? mx : null; closeLuxSheet(); if (isLuxury() &&!document.getElementById("collectionPage").hidden){ renderCollection();} else if (isLuxury()){ renderTrending(); scrollToId("hotSection");} else { renderGrid(); scrollToId("shop");}} function clearLuxFilters(){ luxMinPrice = null; luxMaxPrice = null; luxOnSale = false; luxInStock = false; luxSize = null; luxCat = null; luxPcs = null; luxFabric = null; if (isLuxury() &&!document.getElementById("collectionPage").hidden) renderCollection(); else if (isLuxury()) renderTrending(); else renderGrid(); openLuxSheet();} function updateLuxNav(){ const nav = document.getElementById("luxBottomNav"); if (!nav) return; const onPdp = !document.querySelector("#productPage").hidden; nav.hidden = !isLuxury() || onPdp; const badge = document.getElementById("luxNavCartCount"); if (badge){ const n = cartCount(); badge.hidden = n === 0; badge.textContent = n; } const pkr = document.getElementById("luxPkrChip"); if (pkr) pkr.hidden = !isLuxury() || onPdp; } function recentKey(){ return "shopnest_recent_" + (STORE_SLUG || "default"); } function recordRecent(id){ try { let arr = JSON.parse(localStorage.getItem(recentKey()) || "[]"); arr = [id, ...arr.filter(x => x !== id)].slice(0, 8); localStorage.setItem(recentKey(), JSON.stringify(arr)); } catch (e) {} } function renderRecent(currentId){ const box = document.getElementById("recentSection"); if (!box) return; if (!isLuxury()){ box.hidden = true; return; } let arr = []; try { arr = JSON.parse(localStorage.getItem(recentKey()) || "[]"); } catch (e) {} const list = arr.filter(id => id !== currentId).map(id => findP(id)).filter(Boolean).slice(0, 4); if (!list.length){ box.hidden = true; return; } box.hidden = false; document.getElementById("recentWrap").innerHTML = list.map(x => cardHTML(x, { buyOnly: true })).join(""); bindCards(document.getElementById("recentWrap")); } (function bindLuxuryUI(){ const fb = document.querySelector("#luxFilterBtn"); if (fb) fb.onclick = () => openLuxSheet(); const sc = document.querySelector("#luxSheetClose"); if (sc) sc.onclick = () => closeLuxSheet(); const sb = document.querySelector("#luxSheetBackdrop"); if (sb) sb.onclick = () => closeLuxSheet(); const ap = document.querySelector("#luxFApply"); if (ap) ap.onclick = () => applyLuxFilters(); const cl = document.querySelector("#luxFClear"); if (cl) cl.onclick = () => clearLuxFilters(); document.addEventListener("keydown", e => { if (e.key === "Escape") closeLuxSheet(); }); /* R9 (§14): bottom nav = Menu / Unstitched / Stitched / New In / Cart — Home aur Search hata diye (user spec). "new" ab sirf section par scroll nahi karta, New Arrivals collection page kholta hai (viewNewBtn jaisa). Nav markup index.html mein script tags se PEHLE hai, is liye ye binding parse par attach hoti hai. */ document.querySelectorAll("#luxBottomNav [data-luxnav]").forEach(b => b.onclick = () => { const k = b.dataset.luxnav; if (k === "menu") openLuxMenu(); if (k === "unstitched") openLuxGroup("unstitched"); if (k === "stitched") openLuxGroup("stitched"); if (k === "new") resetFilters("New Arrivals", "newest");  if (k === "cart"){ renderCart(); showPage("cartPage"); } }); const mc = $("#luxMenuClose"); if (mc) mc.onclick = () => closeLuxMenu(); const mb = $("#luxMenuBackdrop"); if (mb) mb.onclick = () => closeLuxMenu(); const pk = $("#luxPkrChip"); if (pk) pk.onclick = () => toast("Prices PKR mein hain"); /* V3.12: Trending toolbar BUTTON bindings (no native selects). */ const tcb = $("#trendCatBtn"); if (tcb) tcb.onclick = e => { e.stopPropagation(); const m = $("#trendCatMenu"); if (m) m.hidden = !m.hidden; const sm = $("#trendSortMenu"); if (sm) sm.hidden = true; }; const tsb = $("#trendSortBtn"); if (tsb) tsb.onclick = e => { e.stopPropagation(); const m = $("#trendSortMenu"); if (m) m.hidden = !m.hidden; const cm = $("#trendCatMenu"); if (cm) cm.hidden = true; }; $$("#trendSortMenu [data-trendsort]").forEach(b => b.onclick = () => { trendSort = b.dataset.trendsort; trendOffset = 0; const m = $("#trendSortMenu"); if (m) m.hidden = true; renderTrending(); }); document.addEventListener("click", e => { if (!e.target.closest(".trend-drop")){ const cm = $("#trendCatMenu"), sm = $("#trendSortMenu"); if (cm) cm.hidden = true; if (sm) sm.hidden = true; } }); const tp = $("#trendPause"); if (tp) tp.onclick = () => { trendPaused = !trendPaused; renderTrending(); }; /* V3.12 FIX (§12 A): under Luxury the Filters sheet opens WITHOUT scrolling — "shop" is the hidden All Products grid. Non-Luxury keeps the scroll. */ const tf = $("#trendFilterBtn"); if (tf) tf.onclick = () => { openLuxSheet(); if (!isLuxury()) scrollToId("shop");}; const mt = $("#menuToggle"); if (mt) mt.onclick = () => openLuxMenu(); /* V3.12 FIX (collection pages): back / sort / filter bindings. Filter kholne par scroll nahi — Trending toolbar wale button ka scrollToId("shop") yahan nahi lagta. */ const cb = $("#collBack"); if (cb) cb.onclick = () => showHome(); /* V5 Phase 4: custom page back + body ke page: links. */ const cpb = $("#customPageBack"); if (cpb) cpb.onclick = () => showHome(); const cpBody = document.getElementById("customPageBody"); if (cpBody) cpBody.onclick = (e) => { const a = e.target.closest('a[href^="page:"]'); if (a){ e.preventDefault(); openCustomPage(a.getAttribute("href").slice(5)); } }; const cs = $("#collSort"); if (cs) cs.onchange = () => { collSort = cs.value; renderCollection();}; const cf = $("#collFilterBtn"); if (cf) cf.onclick = () => openLuxSheet(); /* V3.12 FIX R2: the Filters + Menu sheets live INSIDE #homeView, so on any other page (collection, PDP, cart...) the hidden homeView hides them too and the Filter/Menu buttons do nothing. Reparent both sheets + backdrops to <body> once at boot — they are position:fixed, so DOM location does not affect layout, and every binding uses getElementById, so they keep working. (An index.html move was rejected: the sheet blocks are ~2,000-char collapsed anchors, far too fragile to paste.) */ ["luxSheet", "luxSheetBackdrop", "luxMenuSheet", "luxMenuBackdrop"].forEach(id => { const el = document.getElementById(id); if (el) document.body.appendChild(el);});})(); /* V3.3: Trust strip, budget tiles, how-to steps — sab settings-driven. */
const TRUST_ICONS = ["cash", "truck", "shield", "returns"];
function renderTrust(){
  const wrap = document.querySelector("#trustSection .trust-grid");
  if (!wrap) return;
  const list = (SETTINGS && Array.isArray(SETTINGS.trustItems)) ? SETTINGS.trustItems : [];
  const html = list.map((t, i) => `<div>${icon(TRUST_ICONS[i % TRUST_ICONS.length])}<strong>${esc(t.title)}</strong><span>${esc(t.sub)}</span></div>`).join(""); /* V3.6: Playful Pop par trust strip auto-scrolling marquee hai (seamless loop ke liye items do dafa); baaqi themes par wahi purana grid. */ wrap.innerHTML = (isPlayful() && list.length > 1) ? html + html : html;
}
function bindBudgetTiles(){
  $$("#budgetSection [data-budget]").forEach(b => b.onclick = () => {
    if (b.dataset.budget === "top") setFilter({ cat: "All", maxPrice: null, sort: "rating" });
    else { const v = Number(b.dataset.budget); setFilter({ cat: "All", maxPrice: Number.isFinite(v) ? v : null, sort: "price-low" }); }
  });
}
function renderBudget(){
  const wrap = document.querySelector("#budgetSection .budget-grid");
  if (!wrap) return;
  const list = (SETTINGS && Array.isArray(SETTINGS.budgetTiles)) ? SETTINGS.budgetTiles : [];
  const html = list.map(b => `<button class="budget-tile${b.budget === "top" ? " top-pick" : ""}" type="button" data-budget="${esc(b.budget)}"><span>${b.budget === "top" ? icon("star", "ic-inline") + " " : ""}${esc(b.label)}</span><strong>${esc(b.amount)}</strong><small>${esc(b.note)}</small></button>`).join("");
  bindBudgetTiles();
}
function renderSteps(){
  const wrap = document.querySelector("#howSection .steps-grid");
  if (!wrap) return;
  const list = (SETTINGS && Array.isArray(SETTINGS.howSteps)) ? SETTINGS.howSteps : [];
  const html = list.map((st, i) => `<div><span>${String(i + 1).padStart(2, "0")}</span><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p></div>`).join("");
}

/* ---------- Scroll-reveal animations ----------
   body par "anim" class sirf tab lagti hai jab motion allowed ho aur
   IntersectionObserver available ho — warna sab content foran visible rehta hai. */
const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
let revealObs = null;
if (!REDUCED_MOTION && "IntersectionObserver" in window){
  document.body.classList.add("anim");
  revealObs = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting){ e.target.classList.add("in"); revealObs.unobserve(e.target); }
  }), { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });
}
function watchReveals(){
  $$(".reveal").forEach(el => {
    if (el.dataset.rv) return;
    el.dataset.rv = "1";
    if (revealObs) revealObs.observe(el); else el.classList.add("in");
  });
}
/* Static homepage sections ko bhi reveal mein shamil karein. */
$$("#homeView > section, #homeView > main").forEach(s => s.classList.add("reveal"));

/* ---------- FAQ (V3.3: SETTINGS.faqs se, admin Content tab) ---------- */
function renderFaq(){
  const list = (SETTINGS && Array.isArray(SETTINGS.faqs)) ? SETTINGS.faqs : [];
  $("#faqWrap").innerHTML = list.map((f, i) => `<div class="faq-item ${i === 0 ? "open" : ""}"><button class="faq-q" type="button">${esc(f.q)}${icon("chevron", "faq-caret")}</button><div class="faq-a">${esc(f.a)}</div></div>`).join("");
  $$(".faq-item").forEach(item => item.querySelector(".faq-q").onclick = () => item.classList.toggle("open"));
}

/* ---------- Analytics: visits tracking ----------
   Har session mein har page (home/product/cart/checkout) sirf EK dafa count
   hota hai (sessionStorage flag). Insert fire-and-forget hai — fail ho jaye
   to store par koi asar nahi parta, kabhi render block nahi hota. */
function visitSessionId(){
  try {
    let sid = sessionStorage.getItem("sn_sid");
    if (!sid){
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("sn_sid", sid);
    }
    return sid;
  } catch (e) { return null; }
}
function trackPage(page){
  try {
    const flag = "sn_v_" + page;
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
    let refHost = "direct";
    try { if (document.referrer) refHost = new URL(document.referrer).hostname || "direct"; } catch (e) {}
    let utm = null;
    try { utm = new URLSearchParams(window.location.search).get("utm_source"); } catch (e) {}
    const ua = navigator.userAgent || "";
    const device = (window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(ua)) ? "mobile" : "desktop";
    const row = { page, referrer_host: refHost, utm_source: utm, device, session_id: visitSessionId() };
    if (STORE_ID) row.store_id = STORE_ID;
    /* await nahi — result/error dono ignore; tracking kabhi store ko nahi rok sakti. */
    /* Module 7: visits go through the rate-limited track_visit RPC. */
     sb.rpc("track_visit", { p_store_id: row.store_id || null, p_page: row.page, p_referrer_host: row.referrer_host, p_utm_source: row.utm_source, p_device: row.device, p_session_id: row.session_id }).then(() => {}, () => {});
  } catch (e) { /* tracking fail = silent */ }
}

/* ---------- Pages ---------- */
const PAGE_IDS = ["homeView", "productPage", "collectionPage", "customPage", "cartPage", "checkoutPage", "successPage"];
const PAGE_TRACK = { homeView: "home", productPage: "product", collectionPage: "collection", customPage: "custom", cartPage: "cart", checkoutPage: "checkout" };
/* ================= V5 Phase 5: Meta Pixel + Conversions API + custom code =================
   Data model: SETTINGS.meta { pixelId, capiEnabled, testEventCode, hasCapiToken, capiTokenLast4 }
   + SETTINGS.customCode { head, body }. CAPI TOKEN kabhi settings.data mein nahi — wo
   store_meta_secrets table mein hai (Part B); storefront ko sirf hasCapiToken pata hota hai.
   Fail-open rule: tracking ki koi bhi ghalti kabhi checkout/store ko nahi rokegi. */
const META_CAPI_URL = SUPABASE_URL + "/functions/v1/meta-capi";
const META_LOG_KEY = "sn_meta_log_v1";
let __metaInit = false;
function metaEventId(){ try { if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID(); } catch (e){} return "evt_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10); }
function metaFbpFbc(){ const out = {}; try { const m = document.cookie.match(/(?:^|; )_fbp=([^;]*)/); if (m) out.fbp = decodeURIComponent(m[1]); const c = document.cookie.match(/(?:^|; )_fbc=([^;]*)/); if (c) out.fbc = decodeURIComponent(c[1]); } catch (e){} return out; }
function metaLog(entry){ try { const arr = JSON.parse(localStorage.getItem(META_LOG_KEY) || "[]"); if (!Array.isArray(arr)) throw 0; arr.unshift({ t: new Date().toISOString(), ...entry }); localStorage.setItem(META_LOG_KEY, JSON.stringify(arr.slice(0, 20))); } catch (e){} }
function metaPixelId(){ const m = (SETTINGS && SETTINGS.meta) || {}; return String(m.pixelId || "").replace(/[^0-9]/g, ""); }
function metaCapiOn(){ const m = (SETTINGS && SETTINGS.meta) || {}; return m.capiEnabled === true && m.hasCapiToken === true; }
async function sendCapiEvent(payload){
  try {
    const ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
    const to = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch (e){} }, 8000) : null;
    const r = await fetch(META_CAPI_URL, { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY }, body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined });
    if (to) clearTimeout(to);
    const j = await r.json().catch(() => ({}));
    metaLog({ kind: "capi", name: payload.event_name, ok: !!j.events_received, detail: j.events_received ? ("events_received=" + j.events_received) : (j.error || ("http " + r.status)) });
  } catch (e){ metaLog({ kind: "capi", name: payload.event_name, ok: false, detail: "send fail: " + (e && e.message ? e.message : "network") }); }
}
function metaTrack(name, params, opts){
  opts = opts || {};
  try {
    const eid = opts.eventId || metaEventId();
    const m = (SETTINGS && SETTINGS.meta) || {};
    /* Browser Pixel (agar load hai aur ID save hai). */
    if (typeof window.fbq === "function" && metaPixelId()){ try { window.fbq("track", name, params || {}, { eventID: eid }); } catch (e){} }
    /* Server CAPI (agar ON hai + token save hai) — fire-and-forget, checkout kabhi nahi rukta. */
    if (metaCapiOn()){
      const payload = { store_slug: STORE_SLUG, event_name: name, event_time: Math.floor(Date.now() / 1000), event_id: eid, action_source: "website", user_data: metaFbpFbc(), custom_data: params || {} };
      if (opts.phone) payload.user_data.ph = opts.phone;
      if (m.testEventCode) payload.test_event_code = m.testEventCode;
      sendCapiEvent(payload);
    }
    const channels = (metaPixelId() ? "pixel " : "") + (metaCapiOn() ? "capi" : "");
    metaLog({ kind: "event", name: name, ok: true, detail: channels ? channels : "no tracking configured" });
  } catch (e){}
}
function metaPageView(){ if (!metaPixelId() && !metaCapiOn()) return; metaTrack("PageView", {}); }
function metaViewContent(p){ if (!p || (!metaPixelId() && !metaCapiOn())) return; metaTrack("ViewContent", { content_ids: [String(p.id)], content_type: "product", content_name: p.name, value: Number(p.price) || 0, currency: "PKR" }); }
function metaAddToCart(id, qty){ const p = findP(id); if (!p || (!metaPixelId() && !metaCapiOn())) return; metaTrack("AddToCart", { content_ids: [String(p.id)], content_type: "product", content_name: p.name, value: (Number(p.price) || 0) * (Number(qty) || 1), currency: "PKR" }); }
function metaInitiateCheckout(){ if (!metaPixelId() && !metaCapiOn()) return; const t = checkoutTotals(); const entries = checkoutState ? checkoutState.entries : []; const ids = entries.map(([k]) => String(parseCartKey(k).id)); metaTrack("InitiateCheckout", { content_ids: ids, num_items: entries.reduce((a,[,q]) => a + Number(q || 0), 0), value: Number(t.sub) || 0, currency: "PKR" }); }
function metaPurchase(total, lines, phone){ if (!metaPixelId() && !metaCapiOn()) return; const contents = (lines || []).map(l => ({ id: String(l.id), quantity: Number(l.qty) || 1, item_price: Number(l.price) || 0 })); metaTrack("Purchase", { content_ids: contents.map(c => c.id), contents: contents, num_items: contents.reduce((a,c) => a + c.quantity, 0), value: Number(total) || 0, currency: "PKR" }, { phone: phone || "" }); }
function injectRawHtml(target, html){
  if (!target || !html || !String(html).trim()) return;
  try {
    const tpl = document.createElement("template");
    tpl.innerHTML = String(html);
    const frag = tpl.content || tpl;
    const nodes = Array.from(frag.childNodes || []);
    nodes.forEach(n => {
      if (n.nodeType === 1 && n.tagName === "SCRIPT"){
        const sc = document.createElement("script");
        /* Attribute-based (hasAttribute/getAttribute) — IDL reflection (n.src/n.async)
           par depend nahi karte; fake DOM aur real browser dono mein chalta hai. */
        if (n.getAttribute("src")) sc.src = n.getAttribute("src");
        if (n.hasAttribute("async")) sc.async = true;
        if (n.hasAttribute("defer")) sc.defer = true;
        if (n.getAttribute("type")) sc.type = n.getAttribute("type");
        sc.textContent = n.textContent || "";
        target.appendChild(sc);
      } else {
        target.appendChild(n);
      }
    });
  } catch (e){}
}
function initMetaTracking(){
  if (__metaInit) return; __metaInit = true;
  try {
    const cc = (SETTINGS && SETTINGS.customCode) || {};
    if (cc.head) injectRawHtml(document.head, cc.head);
    if (cc.body) injectRawHtml(document.body, cc.body);
    const pid = metaPixelId();
    if (pid && typeof window.fbq !== "function"){
      /* Meta Pixel base code (Meta ka official snippet — verbatim). */
      !function(f,b,e,v,n,t,s){ if(f.fbq) return; n=f.fbq=function(){ n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments); }; if(!f._fbq) f._fbq=n; n.push=n; n.loaded=!0; n.version="2.0"; n.queue=[]; t=b.createElement(e); t.async=!0; t.src=v; s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      try { window.fbq("init", pid); } catch (e){}
    }
    /* Pehli view ka PageView — loadSettings mein ?page= ke baad chalta hai, is liye current view settled hai. */
    metaPageView();
  } catch (e){}
}
function showPage(id){
  PAGE_IDS.forEach(pid => { document.getElementById(pid).hidden = pid !== id; }); /* V3.12 FIX F5: PDP par transparent header ke peeche koi hero nahi — white-on-white. lux-pdp class se header ko solid white + dark text milta hai (CSS). Collection page par bhi koi hero nahi, is liye wahi class wahan bhi lagti hai. */ document.body.classList.toggle("lux-pdp", id === "productPage" || id === "collectionPage" || id === "customPage" || id === "cartPage" || id === "checkoutPage" || id === "successPage");
  if (id !== "homeView") window.scrollTo({ top: 0 });
  if (typeof updatePdpSticky === "function") updatePdpSticky();
  if (PAGE_TRACK[id]) trackPage(PAGE_TRACK[id]);
  metaPageView(); /* V5 Phase 5: Meta PageView (har view par). */
}
function showHome(){ showPage("homeView"); window.scrollTo({ top: 0 }); updateLuxNav(); }

/* ---------- Product page ---------- */
function dateText(days){
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" });
}
function openProduct(id){
  const p = findP(id); if (!p) return;
  pdpId = id; pdpQty = 1;
  $("#pdpImg").src = safeUrl(p.img || ""); $("#pdpImg").alt = p.name;
  $("#pdpThumb").src = safeUrl(p.img || ""); $("#pdpThumb").alt = p.name;
  /* V3.12: PDP thumbnails products.gallery se (pehli #pdpThumb rehti hai — lightbox binding barkarar). */
  const galImgs = [String(p.img || "").trim(), ...galleryOf(p)].filter(Boolean);
  const thumbsBox = document.querySelector(".pdp-thumbs");
  if (thumbsBox){ thumbsBox.querySelectorAll("[data-gal-thumb]").forEach(x => x.remove()); galImgs.slice(1).forEach(u => { const im = document.createElement("img"); im.src = safeUrl(u); im.alt = ""; im.dataset.galThumb = "1"; im.onclick = () => { $("#pdpImg").src = safeUrl(u); }; thumbsBox.appendChild(im); }); }
  $("#pdpCrumbCat").textContent = p.cat;
  $("#pdpCrumbName").textContent = p.name;
  $("#pdpTitle").textContent = p.name;
  $("#pdpRating").innerHTML = `${stars(p.rating)} <small>${ratingOf(p).toFixed(1)} (${reviewsOf(p)}+ Reviews)</small>`;
  const pct = effectivePct(p);
  const save = Number(p.old) > Number(p.price) ? Number(p.old) - Number(p.price) : 0;
  let pill = "";
  if (save) pill = `<span class="save-pill">Save ${fmt(save)}${pct ? ` (-${pct}%)` : ""}</span>`;
  else if (pct) pill = `<span class="save-pill">-${pct}% OFF</span>`;
  const isOut = p.stock === "out";
  $("#pdpPrice").innerHTML = `<strong>${fmt(p.price)}</strong>${save ? `<del>${fmt(p.old)}</del>` : ""}${pill}${isOut ? `<span class="save-pill oos-pill">OUT OF STOCK</span>` : ""}`;
  const pdpAddBtn = $("#pdpAdd"), pdpOrderBtn = $("#pdpOrder");
  pdpAddBtn.disabled = isOut; pdpAddBtn.textContent = isOut ? "OUT OF STOCK" : "ADD TO CART";
  pdpOrderBtn.disabled = isOut; pdpOrderBtn.innerHTML = isOut ? "OUT OF STOCK" : `${icon("lock", "ic-inline")} ORDER NOW`;
  $("#pdpFee").innerHTML = `${delivText(p)} <span class="pdp-fee-days">• 2–4 working days</span>`;
  /* Stock indicator (products.stock field se). */
  const stockEl = $("#pdpStock");
  if (stockEl){
    stockEl.className = "pdp-stock " + (isOut ? "out" : "in");
    stockEl.innerHTML = `<span class="stock-dot"></span> ${isOut ? "Out of Stock" : "In Stock"}`;
  }
  /* Share row: is store ke link ke saath share (SPA hai — store slug wala base link). */
  const shareUrl = location.origin + location.pathname + "?store=" + encodeURIComponent(STORE_SLUG);
  const shareText = `${p.name} — ${fmt(p.price)} | ${SETTINGS.store_name}`;
  const waShare = $("#shareWa"); if (waShare) waShare.href = "https://wa.me/?text=" + encodeURIComponent(shareText + " " + shareUrl);
  const fbShare = $("#shareFb"); if (fbShare) fbShare.href = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(shareUrl);
  const copyBtn = $("#shareCopy");
  if (copyBtn) copyBtn.onclick = async () => {
    try { await navigator.clipboard.writeText(shareUrl); toast("Product link copy ho gaya"); }
    catch (e) { toast(shareUrl); }
  };
  /* product_fields: values sirf product.custom?.[id] se — na hon to khamoshi se skip. */
  renderPdpCustomFields(p); /* V3.9: sizes/colors (products.options) + PDP texts (settings.pdpText). */ renderPdpOptions(p); /* V3.10: Recently Viewed (Luxury PDP). */ recordRecent(p.id); renderRecent(p.id); const pdpT = (SETTINGS && SETTINGS.pdpText) || {}; if (String(pdpT.delivery || "").trim()){ const dEl = document.querySelector("#pdpFee .pdp-fee-days"); if (dEl) dEl.textContent = "• " + String(pdpT.delivery).trim();} const pdDet = document.querySelector(".pdp-details .section-title"); if (pdDet && String(pdpT.details || "").trim()) pdDet.textContent = String(pdpT.details).trim(); const pdRel = document.querySelector(".related .section-title"); if (pdRel && String(pdpT.related || "").trim()) pdRel.textContent = String(pdpT.related).trim(); /* V3.11: Luxury PDP defaults (admin ka custom pdpText ho to wahi). */ if (isLuxury()){ if (!String(pdpT.delivery || "").trim()){ const dEl = document.querySelector("#pdpFee .pdp-fee-days"); if (dEl) dEl.textContent = "• Local 5–7 working days • International 10–14 days";} if (!String(pdpT.related || "").trim() && pdRel) pdRel.textContent = "Most In Demand";}
  /* Mobile sticky buy bar ki values. */
  const stPrice = $("#pdpStickyPrice"); if (stPrice) stPrice.textContent = fmt(p.price);
  const stName = $("#pdpStickyName"); if (stName) stName.textContent = p.name;
  const stAdd = $("#pdpStickyAdd"), stOrder = $("#pdpStickyOrder");
  if (stAdd) stAdd.disabled = isOut;
  if (stOrder) stOrder.disabled = isOut;
  $("#pdpQty").textContent = "1";
  $("#pdpEtaText").textContent = `Get it by ${dateText(3)} – ${dateText(4)}`;
  $("#pdpD1").textContent = dateText(0);
  $("#pdpD2").textContent = dateText(1);
  $("#pdpD3").textContent = `${dateText(3)} – ${dateText(4)}`;
  $("#pdpDesc").innerHTML = descHtml(p.desc);
  const related = PRODUCTS.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4);
  const wrap = $("#relatedWrap");
  wrap.innerHTML = related.map(x => cardHTML(x, { buyOnly: true })).join("");
  bindCards(wrap);
  /* V3.12: Luxury PDP par Disclaimer + delivery lines + badges dikhayein (admin toggle showDisclaimer, default ON). */
  if (isLuxury()){ const showDisc = SETTINGS.showDisclaimer !== false; document.body.classList.toggle("lux-no-disclaimer", !showDisc); ["pdpDisclaimer", "pdpDeliveryLines", "pdpBadges"].forEach(id => { const el = document.getElementById(id); if (el) el.hidden = !showDisc; }); }
  showPage("productPage"); updateLuxNav();
  metaViewContent(p); /* V5 Phase 5: Meta ViewContent. */
  watchReveals();
}
/* V3.12: fabricated live counters (liveSold/liveVisiting) DELETE — Asim Jofa par koi live counter nahi. */
/* product_fields (admin-defined) — product record mein `custom` object ho to
   usi se values; storage na ho to section chhupa rehta hai (koi error nahi). */
function renderPdpCustomFields(p){
  const box = $("#pdpCustomFields");
  if (!box) return;
  const fields = Array.isArray(SETTINGS.product_fields) ? SETTINGS.product_fields : [];
  const custom = p && p.custom && typeof p.custom === "object" ? p.custom : {};
  const rows = fields.map(f => {
    const v = custom[f.id];
    if (v === undefined || v === null || String(v).trim() === "") return "";
    return `<div class="pdp-field-row"><span>${esc(f.label)}</span><strong>${esc(String(v))}</strong></div>`;
  }).join("");
  box.innerHTML = rows;
  box.hidden = !rows;
}
/* ---------- PDP image zoom (desktop hover) + lightbox ---------- */
(function initPdpZoom(){
  const wrap = document.querySelector(".pdp-imgwrap");
  const img = $("#pdpImg");
  if (!wrap || !img) return;
  wrap.addEventListener("mousemove", e => {
    if (!window.matchMedia || !window.matchMedia("(hover: hover)").matches) return;
    const r = wrap.getBoundingClientRect();
    img.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + "% " + ((e.clientY - r.top) / r.height * 100) + "%";
    img.classList.add("zooming");
  });
  wrap.addEventListener("mouseleave", () => img.classList.remove("zooming"));
  const openLb = () => {
    const lb = $("#pdpLightbox"), li = $("#pdpLightboxImg");
    if (!lb || !li || !img.src) return;
    li.src = img.src; li.alt = img.alt || "";
    lb.hidden = false;
  };
  img.addEventListener("click", openLb);
  const thumb = $("#pdpThumb");
  if (thumb) thumb.addEventListener("click", openLb);
  const closeLb = () => { const lb = $("#pdpLightbox"); if (lb) lb.hidden = true; };
  const lbEl = $("#pdpLightbox");
  if (lbEl) lbEl.addEventListener("click", closeLb);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeLb(); });
})();
/* ---------- PDP sticky buy bar (mobile) ---------- */
$("#pdpStickyAdd").onclick = () => { if (pdpId !== null) addToCart(pdpId, pdpQty, pdpVariant); };
$("#pdpStickyOrder").onclick = () => { if (pdpId !== null) buyNow(pdpId, pdpQty, pdpVariant); };
function updatePdpSticky(){
  const bar = $("#pdpSticky");
  if (!bar) return;
  const show = !$("#productPage").hidden && window.scrollY > 560;
  bar.classList.toggle("show", show);
  /* V3.3: buy bar aate hi dikhta hua popup hata do (timers chalte rehte hain,
     agli cycle waise hi aayegi) — popup kabhi buy buttons par nahi chadhega. */
  if (show && typeof spEl !== "undefined" && spEl) spEl.classList.remove("show");
}
window.addEventListener("scroll", updatePdpSticky, { passive: true });

$("#pdpBack").onclick = showHome;
$("#crumbHome").onclick = showHome;
$("#pdpCrumbCat").onclick = () => { const p = findP(pdpId); if (p) setFilter({ cat: p.cat, maxPrice: null }); };
$("#pdpMinus").onclick = () => { pdpQty = Math.max(1, pdpQty - 1); $("#pdpQty").textContent = pdpQty; };
$("#pdpPlus").onclick = () => { pdpQty++; $("#pdpQty").textContent = pdpQty; };
$("#pdpAdd").onclick = () => { if (pdpId !== null) addToCart(pdpId, pdpQty, pdpVariant); };
$("#pdpOrder").onclick = () => { if (pdpId !== null) buyNow(pdpId, pdpQty, pdpVariant); };

/* ---------- V3.9: per-product sizes/colors (products.options) ---------- options = { sizes: ["S","M","L","XL"], colors: [{name, hex}] }. Cart keys variant-aware hain: "id" (purani cart, bina variant) ya "id|size|color" — purani cart entries bina toote chalti rehti hain. */ let pdpVariant = { size: null, color: null }; function productOptions(p){ const o = (p && p.options && typeof p.options === "object") ? p.options : {}; const sizes = Array.isArray(o.sizes) ? o.sizes.map(s => String(s).trim()).filter(Boolean).slice(0, 12) : []; const colors = Array.isArray(o.colors) ? o.colors.filter(c => c && typeof c === "object" && String(c.name || "").trim()).map(c => ({ name: String(c.name).trim(), hex: /^#[0-9a-fA-F]{6}$/.test(String(c.hex || "")) ? String(c.hex) : "#8A8A8A" })).slice(0, 12) : []; return { sizes, colors }; } function cartKey(id, v){ const s = (v && v.size) ? String(v.size) : ""; const c = (v && v.color) ? String(v.color) : ""; return (s || c) ? (id + "|" + s + "|" + c) : String(id); } function parseCartKey(k){ const parts = String(k).split("|"); return { id: +parts[0], size: parts[1] || null, color: parts[2] || null }; } function variantText(v){ const parts = []; if (v && v.size) parts.push("Size: " + v.size); if (v && v.color) parts.push(v.color); return parts.join(" • "); } function renderPdpOptions(p){ let box = document.getElementById("pdpOptions"); if (!box){ box = document.createElement("div"); box.id = "pdpOptions"; const qtyRow = document.querySelector(".pdp-info .qty-row"); if (qtyRow && qtyRow.parentNode) qtyRow.parentNode.insertBefore(box, qtyRow); else return; } const { sizes, colors } = productOptions(p); const showSizes = SETTINGS.showSizes !== false && sizes.length > 0; const showColors = SETTINGS.showColors !== false && colors.length > 0; pdpVariant = { size: showSizes ? sizes[0] : null, color: showColors ? colors[0].name : null }; let h = ""; if (showSizes) h += `<div class="opt-block"><span class="opt-label">Size: <strong>${esc(pdpVariant.size)}</strong></span><div class="size-pills">${sizes.map(s => `<button type="button" class="size-pill${s === pdpVariant.size ? " on" : ""}" data-size="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>`; if (showColors) h += `<div class="opt-block"><span class="opt-label">Color: <strong>${esc(pdpVariant.color)}</strong></span><div class="color-swatches">${colors.map(c => `<button type="button" class="color-swatch${c.name === pdpVariant.color ? " on" : ""}" data-color="${esc(c.name)}" style="background:${c.hex}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join("")}</div></div>`; box.innerHTML = h; box.hidden = !h; box.querySelectorAll("[data-size]").forEach(b => b.onclick = () => { pdpVariant.size = b.dataset.size; b.closest(".opt-block").querySelectorAll("[data-size]").forEach(x => x.classList.toggle("on", x === b)); b.closest(".opt-block").querySelector(".opt-label strong").textContent = b.dataset.size; }); box.querySelectorAll("[data-color]").forEach(b => b.onclick = () => { pdpVariant.color = b.dataset.color; b.closest(".opt-block").querySelectorAll("[data-color]").forEach(x => x.classList.toggle("on", x === b)); b.closest(".opt-block").querySelector(".opt-label strong").textContent = b.dataset.color; }); } /* ---------- Cart ---------- */
function saveCart(){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function cartCount(){ return Object.values(cart).reduce((a,b) => a + Number(b || 0), 0); }
function cartEntries(){ return Object.entries(cart).map(([k,q]) => [k, Number(q)]).filter(([,q]) => q > 0); }
function cartSubtotal(){ return cartEntries().reduce((sum,[k,q]) => { const p = findP(parseCartKey(k).id); return p ? sum + Number(p.price) * q : sum; }, 0); }
function addToCart(id, qty, variant){
   const k = cartKey(id, variant); cart[k] = (Number(cart[k]) || 0) + qty;
  saveCart(); renderCart();
  const p = findP(id); if (p) toast(`Added: ${p.name}`);
   metaAddToCart(id, qty); /* V5 Phase 5: Meta AddToCart. */
  /* V3.2 cart bump: icon ek dafa uchhalta hai, animationend par class hat
     jati hai taa ke agla add dobara bump kare. */
  const cb = document.getElementById("cartBtn");
  if (cb){
    cb.classList.remove("bump");
    void cb.offsetWidth;
    cb.classList.add("bump");
    cb.addEventListener("animationend", function h(){ cb.classList.remove("bump"); cb.removeEventListener("animationend", h); });
  }
}
function setQty(key, q){
  if (q <= 0) delete cart[key]; else cart[key] = q;
  saveCart(); renderCart();
}
function renderCart(){
  const n = cartCount();
  $("#cartCount").textContent = n;
  const entries = cartEntries();
  $("#cartEmptyMsg").hidden = n !== 0;
  $("#cartRows").innerHTML = entries.map(([k,q]) => { const { id, size, color } = parseCartKey(k); const p = findP(id); if (!p) return ""; const vt = variantText({ size, color });
    return `<div class="cart-row">
      <img src="${safeUrl(p.img || "")}" alt="${esc(p.name)}">
      <div><h3>${esc(p.name)}</h3><p>${fmt(p.price)} each • ${delivText(p)}</p>${vt ? `<p class="cart-variant">${esc(vt)}</p>` : ""}
        <div class="cart-controls"><button class="qty-btn" type="button" data-cdec="${esc(k)}">−</button><strong>${q}</strong><button class="qty-btn" type="button" data-cinc="${esc(k)}">+</button><button class="remove-link" type="button" data-crem="${esc(k)}">Remove</button></div>
      </div><strong class="line-total">${fmt(Number(p.price) * q)}</strong>
    </div>`;
  }).join("");
  $$("[data-cinc]").forEach(b => b.onclick = () => setQty(b.dataset.cinc, Number(cart[b.dataset.cinc]) + 1));
  $$("[data-cdec]").forEach(b => b.onclick = () => setQty(b.dataset.cdec, Number(cart[b.dataset.cdec]) - 1));
  $$("[data-crem]").forEach(b => b.onclick = () => setQty(b.dataset.crem, 0));
  const sub = cartSubtotal();
  const fee = deliveryTotal(entries);
  $("#cpSubtotal").textContent = fmt(sub);
  $("#cpDelivery").textContent = n === 0 ? "—" : (fee === 0 ? "FREE" : fmt(fee));
  $("#cpTotal").textContent = fmt(sub + fee);
  $("#cpCheckoutBtn").disabled = !n; updateLuxNav();
}
$("#cartBtn").onclick = () => { renderCart(); showPage("cartPage"); };
$("#backFromCart").onclick = showHome;
$("#cpCheckoutBtn").onclick = () => {
  if (!cartCount()) return;
  checkoutState = { source: "cart", entries: cartEntries() };
  showCheckoutPage();
};

/* ---------- Checkout page ---------- */
function checkoutTotals(){
  const entries = checkoutState ? checkoutState.entries : [];
  const sub = entries.reduce((sum,[k,q]) => { const p = findP(parseCartKey(k).id); return p ? sum + Number(p.price) * q : sum; }, 0);
  const fee = deliveryTotal(entries);
  /* Coupon discount sirf products subtotal par — delivery par nahi. */
  const discount = appliedCoupon ? Math.round(sub * Math.min(90, Math.max(0, appliedCoupon.pct)) / 100) : 0;
  return { sub, fee, discount, total: sub + fee - discount };
}
function renderCheckoutSummary(){
  const entries = checkoutState ? checkoutState.entries : [];
  $("#coItems").innerHTML = entries.map(([k,q]) => { const { id, size, color } = parseCartKey(k); const p = findP(id); if (!p) return ""; const vt = variantText({ size, color });
    return `<div class="co-item"><img src="${safeUrl(p.img || "")}" alt=""><div class="co-item-info"><h4>${esc(p.name)}</h4><p>${fmt(p.price)} × ${q} • ${delivText(p)}</p>${vt ? `<p class="cart-variant">${esc(vt)}</p>` : ""}</div><strong>${fmt(Number(p.price) * q)}</strong></div>`;
  }).join("");
  const { sub, fee, discount, total } = checkoutTotals();
  $("#coSubtotal").textContent = fmt(sub);
  $("#coDelivery").textContent = fee === 0 ? "FREE" : fmt(fee);
  const dRow = $("#coDiscountRow");
  if (dRow){
    dRow.hidden = !(appliedCoupon && discount > 0);
    if (appliedCoupon) $("#coCouponCode").textContent = appliedCoupon.code;
    $("#coDiscount").textContent = "−" + fmt(discount);
  }
  $("#coTotal").textContent = fmt(total);
  $("#checkoutError").textContent = "";
}
/* ---------- Coupon (checkout) ---------- */
function renderCouponUI(){
  const applied = $("#couponApplied");
  if (!applied) return;
  applied.hidden = !appliedCoupon;
  if (appliedCoupon) $("#couponAppliedText").textContent = `${appliedCoupon.code} — ${appliedCoupon.pct}% OFF laga diya gaya hai`;
  $("#couponInput").disabled = !!appliedCoupon;
  $("#couponApplyBtn").disabled = !!appliedCoupon;
}
async function applyCoupon(){
  const msg = $("#couponMsg");
  const code = $("#couponInput").value.trim().toUpperCase();
  msg.className = "coupon-msg"; msg.textContent = "";
  if (!code){ msg.textContent = "Pehle coupon code likhein."; msg.classList.add("err"); return; }
  const btn = $("#couponApplyBtn");
  btn.disabled = true; btn.textContent = "Check ho raha hai…";
  try {
    /* check_coupon RPC — codes ki list public nahi hoti, sirf yahi verify hota hai.
       Tenant mode mein RPC store-scoped hai (p_store lazmi); fallback mein purana signature. */
    const { data, error } = await sb.rpc("check_coupon", STORE_ID ? { p_code: code, p_store: STORE_ID } : { p_code: code });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const pct = row ? Number(row.pct) : NaN;
    if (!Number.isFinite(pct) || pct <= 0) throw new Error("invalid");
    appliedCoupon = { code, pct };
    msg.textContent = `Coupon ${code} lag gaya — ${pct}% discount!`;
    msg.classList.add("ok");
  } catch (e) {
    appliedCoupon = null;
    msg.textContent = "Coupon valid nahi hai";
    msg.classList.add("err");
  } finally {
    btn.disabled = false; btn.textContent = "APPLY";
    renderCouponUI();
    renderCheckoutSummary();
  }
}
function removeCoupon(){
  appliedCoupon = null;
  $("#couponInput").value = "";
  const msg = $("#couponMsg");
  msg.className = "coupon-msg"; msg.textContent = "";
  renderCouponUI();
  renderCheckoutSummary();
}
/* ---------- V2: Checkout custom fields (settings.checkout_fields) ---------- */
function renderCheckoutFields(){
  const wrap = $("#coCustomFields");
  if (!wrap) return;
  const fields = Array.isArray(SETTINGS.checkout_fields) ? SETTINGS.checkout_fields : [];
  wrap.innerHTML = fields.map(f => {
    const req = f.required ? " required" : "";
    const name = "cf_" + esc(f.id);
    const label = esc(f.label) + (f.required ? ' <span class="req-star">*</span>' : "");
    if (f.type === "textarea") return `<label>${label}<textarea name="${name}" rows="2"${req}></textarea><small class="field-err" data-ferr="${esc(f.id)}" hidden>Ye field lazmi hai</small></label>`;
    if (f.type === "select") return `<label>${label}<select name="${name}"${req}><option value="">— Select karein —</option>${(f.options || []).map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select><small class="field-err" data-ferr="${esc(f.id)}" hidden>Ye field lazmi hai</small></label>`;
    return `<label>${label}<input name="${name}" type="${f.type === "number" ? "number" : "text"}"${req}><small class="field-err" data-ferr="${esc(f.id)}" hidden>Ye field lazmi hai</small></label>`;
  }).join("");
  wrap.hidden = fields.length === 0;
}
function showCheckoutPage(){ renderCheckoutFields(); renderCheckoutSummary(); showPage("checkoutPage"); metaInitiateCheckout(); /* V5 Phase 5: Meta InitiateCheckout. */ }
function buyNow(id, qty, variant){
  if (!findP(id)) return;
  checkoutState = { source: "buynow", entries: [[cartKey(id, variant), qty]] };
  showCheckoutPage();
}
$("#backToShop").onclick = showHome;
$("#continueBtn").onclick = showHome;
$("#couponApplyBtn").onclick = applyCoupon;
$("#couponRemoveBtn").onclick = removeCoupon;
$("#couponInput").addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); applyCoupon(); } });
/* Idempotency helpers — one key per checkout attempt; the SAME key is reused
   when the same checkout is submitted again (retry), so a duplicate insert is
   rejected by the DB unique index instead of creating a second order. */
/* Idempotency (production): duplicate-order prevention. A UUID key identifies one
   checkout attempt-set. The key is stored in sessionStorage (survives a page
      refresh in the same tab) until the order is confirmed, then cleared. A retry
         reuses the SAME key; a new checkout generates a NEW key. The server enforces
            uniqueness on (store_id, idempotency_key) — a second insert with the same key
               is rejected with HTTP 409. A 409 is NEVER treated as success on its own: the
                  client verifies the existing order via get_order_by_idempotency_key and
                     confirms the total AND the line items match the submitted purchase. */
function idemKeyName(){ return "shopnest_idem_" + (STORE_ID || "default"); }
function idemNewKey(){
     if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
     return "idem-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10) + "-" + Math.random().toString(36).slice(2, 10);
}
function idemGetKey(){ try { return sessionStorage.getItem(idemKeyName()) || ""; } catch (e) { return ""; } }
function idemSetKey(k){ try { sessionStorage.setItem(idemKeyName(), k); } catch (e) {} }
function idemClearKey(){ try { sessionStorage.removeItem(idemKeyName()); } catch (e) {} }
function idemLinesEqual(a, b){
     if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
     const norm = arr => arr.map(l => [l.id, l.qty, l.price, l.size || "", l.color || "", l.delivery_fee || 0].join("|")).sort().join(";");
     return norm(a) === norm(b);
}
async function idemVerifyOrder(storeId, key, total, lines){
     /* Returns the existing order if it matches this purchase (total + lines),
          otherwise null. The RPC returns NO customer PII (id/status/total/items/
               created_at only) and filters by BOTH store_id and key. */
     try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_order_by_idempotency_key`, {
                     method: "POST",
                     headers: {
                                apikey: SUPABASE_ANON_KEY,
                                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                                "Content-Type": "application/json"
                     },
                     body: JSON.stringify({ p_store_id: storeId, p_key: key })
            });
            if (!res.ok) return null;
            const rows = await res.json().catch(() => null);
            const row = Array.isArray(rows) ? rows[0] : null;
            if (!row) return null;
            if (Number(row.total) !== Number(total)) return null;
            const rowLines = (row.items && Array.isArray(row.items.lines)) ? row.items.lines : (Array.isArray(row.items) ? row.items : null);
            if (!rowLines || !idemLinesEqual(rowLines, lines)) return null;
            return row;
     } catch (e) { return null; }
}
/* ---------- Module 6: server-authoritative checkout helpers ---------- */
/* Map a create_order RPC error code to a user-friendly message. */
function m6CheckoutErrorMessage(code){
     switch (String(code || "")){
        case "INVALID_COUPON": return "Coupon valid nahi hai — dobara check karein ya coupon hata dein.";
        case "INVALID_PRODUCT":
        case "INVALID_VARIANT": return "Kuch products ab available nahi hain — cart refresh karein.";
        case "INVALID_QTY": return "Quantity theek nahi hai — dobara check karein.";
        case "STORE_NOT_ACTIVE": return "Store load nahi ho saka — internet check karke dobara try karein.";
        case "RATE_LIMITED": return "Bohat zyada koshishein ho gayi hain — kuch der baad dobara try karein.";
        case "INVALID_CUSTOMER":
        case "INVALID_KEY":
        case "EMPTY_CART":
        case "TOO_MANY_LINES":
        case "INVALID_TOTAL":
        default: return "Order save nahi ho saka — internet check karke dobara try karein.";
     }
}
/* Verify a duplicate order returned by create_order is THIS purchase.
   Compares purchase IDENTITY only (product ids, quantities, variants,
      coupon code) — NOT prices or the total, because the server's total wins
         when a price changed between page load and checkout. */
function m6OrderMatchesCart(serverOrder, rpcLines, couponCode){
     const items = serverOrder && serverOrder.items;
     const storedLines = (items && Array.isArray(items.lines)) ? items.lines : null;
     if (!storedLines || storedLines.length !== rpcLines.length) return false;
     const norm = ls => ls.map(l => [Number(l.id), Number(l.qty), String(l.size || ""), String(l.color || "")].join("|")).sort().join(";");
     if (norm(storedLines) !== norm(rpcLines)) return false;
     const storedCoupon = (items && items.coupon) ? String(items.coupon).toUpperCase() : null;
     const wantCoupon = couponCode ? String(couponCode).toUpperCase() : null;
     return storedCoupon === wantCoupon;
}

$("#checkoutForm").onsubmit = async e => {
  e.preventDefault();
  if (!checkoutState || !checkoutState.entries.length) return;
  const btn = $("#placeOrderBtn");
  /* V3 Part B: double-submit guard + honeypot (bot bhara to chupchaap rok dein). */
  if (btn.disabled) return;
  if (String(new FormData(e.target).get("website") || "").trim() !== ""){ btn.disabled = false; btn.textContent = "ORDER PLACE KAREIN"; return; }
  const err = $("#checkoutError");
  err.textContent = "";
  const f = new FormData(e.target);
  /* Custom fields: required wale khaali hon to inline error + submit rokein. */
  const coFields = Array.isArray(SETTINGS.checkout_fields) ? SETTINGS.checkout_fields : [];
  let firstMissing = null;
  coFields.forEach(cf => {
    const msg = document.querySelector(`[data-ferr="${CSS.escape(cf.id)}"]`);
    const val = String(f.get("cf_" + cf.id) || "").trim();
    const bad = cf.required && !val;
    if (msg) msg.hidden = !bad;
    if (bad && !firstMissing) firstMissing = cf;
  });
  if (firstMissing){
    err.textContent = `"${firstMissing.label}" lazmi hai — pehle ye field bharein.`;
    const inp = e.target.querySelector(`[name="cf_${CSS.escape(firstMissing.id)}"]`);
    if (inp) inp.focus();
    return;
  }
  btn.disabled = true; btn.textContent = "Order save ho raha hai…";
     /* Module 6: server-authoritative checkout. The browser sends NO price, NO
          delivery fee, NO total — only product ids, quantities, variants and the
               coupon code. The create_order RPC validates every line against the
                    canonical catalogue and computes the total server-side. */
  const rpcLines = checkoutState.entries.map(([k,q]) => { const { id, size, color } = parseCartKey(k);
    const line = { id, qty: q }; if (size) line.size = size; if (color) line.color = color; return line;
  });
    /* Custom checkout fields: [{label, value}] — not price-relevant, stored as-is. */
  const rpcCustomFields = coFields.length
    ? coFields.map(cf => ({ label: cf.label, value: String(f.get("cf_" + cf.id) || "").trim() })).filter(x => x.value !== "")
    : null;
  /* Idempotency: reuse the stored key for a retry of this checkout, else a new key. */
  let idemKey = idemGetKey();
  if (!idemKey){ idemKey = idemNewKey(); idemSetKey(idemKey); }
    const rpcBody = {
           p_store_id: STORE_ID,
           p_customer_name: String(f.get("name") || "").trim(),
           p_phone: String(f.get("phone") || "").trim(),
           p_city: String(f.get("city") || "").trim(),
           p_address: String(f.get("address") || "").trim(),
           p_lines: rpcLines,
           p_coupon_code: appliedCoupon ? appliedCoupon.code : null,
           p_idempotency_key: idemKey,
           p_custom_fields: rpcCustomFields
  };
     let error = null;
   let serverOrder = null; /* the order row returned by create_order */
    let idemDuplicate = false; /* true when the RPC returned an existing order */   
   try {
      const idemCtrl = new AbortController();
      const idemTimer = setTimeout(() => idemCtrl.abort(), 90000); /* 90s client timeout */
      let orderRes;
      try {
        orderRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_order`, {
           method: "POST",
           headers: {
            apikey: SUPABASE_ANON_KEY,
              
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json"
          },
           body: JSON.stringify(rpcBody),
           signal: idemCtrl.signal
        });
      } finally { clearTimeout(idemTimer); }
            if (!orderRes.ok){
                       const errBody = await orderRes.json().catch(() => ({}));
                       error = { code: (errBody && errBody.message) || "", message: "Order save failed" };
            } else {
                       const rows = await orderRes.json().catch(() => null);
                       serverOrder = Array.isArray(rows) ? rows[0] : null;
                       if (!serverOrder || typeof serverOrder.order_id !== "number"){ error = { message: "Order verify nahi ho saka — store se rabta karein." }; }
                       else {
                                    idemDuplicate = !!serverOrder.is_duplicate;
                                    if (idemDuplicate && !m6OrderMatchesCart(serverOrder, rpcLines, appliedCoupon ? appliedCoupon.code : null)){
                                                   error = { message: "Order verify nahi ho saka — store se rabta karein." };
                                    }
                       }
      }
   } catch (e) { error = e; }
  btn.disabled = false; btn.innerHTML = `${icon("check", "ic-inline")} ORDER PLACE KAREIN`;
  if (error){
    console.error(error);
    err.textContent = m6CheckoutErrorMessage(error.code || "");
    return;
  }
  /* Server total wins (the RPC computed it from the canonical catalogue).
       On a duplicate, the order already exists — do NOT re-fire the Meta
            Purchase event (it may already have fired on the first attempt). */
     const serverTotal = Number(serverOrder.total) || 0;
     const serverLines = (serverOrder.items && Array.isArray(serverOrder.items.lines)) ? serverOrder.items.lines : [];
     if (!idemDuplicate) metaPurchase(serverTotal, serverLines, String(f.get("phone") || "").trim()); /* V5 Phase 5: Meta Purchase — order save ke baad, fail-open (tracking fail ho to bhi order save rehta hai). */
  idemClearKey(); /* checkout confirmed (new order or verified duplicate) — new key next time */
  if (checkoutState.source === "cart"){ cart = {}; saveCart(); renderCart(); }
  checkoutState = null;
  appliedCoupon = null;
  const ci = $("#couponInput"); if (ci) ci.value = "";
  const cm = $("#couponMsg"); if (cm) cm.textContent = "";
  renderCouponUI();
  e.target.reset();
  $("#successText").textContent = "Shukriya! Aapka order save ho gaya hai — hum jald call karke confirm karein ge.";
  $("#successOrderId").textContent = "Order #" + serverOrder.order_id + " • Total (COD): " + fmt(serverTotal);
  showPage("successPage");
};

/* ---------- V3 Part B: Order tracking (customer) ----------
   Sirf order ID + phone se status milta hai — naam/address kabhi
   public nahi hote. Server par get_order_status RPC phone verify
   karke hi row deta hai; galat phone par zero rows. */
function openTrackModal(){
  const m = $("#trackModal");
  if (!m) return;
  $("#trackResult").innerHTML = "";
  m.classList.add("open");
}
function closeTrackModal(){ const m = $("#trackModal"); if (m) m.classList.remove("open"); }
const _trackLink = document.getElementById("trackOrderLink");
if (_trackLink) _trackLink.onclick = e => { e.preventDefault(); openTrackModal(); };
const _trackBtn = document.getElementById("trackOrderBtn");
if (_trackBtn) _trackBtn.onclick = openTrackModal;
const _trackClose = document.getElementById("trackCloseBtn");
if (_trackClose) _trackClose.onclick = closeTrackModal;
const _trackModal = document.getElementById("trackModal");
if (_trackModal) _trackModal.addEventListener("click", e => { if (e.target.id === "trackModal") closeTrackModal(); });
const _trackForm = document.getElementById("trackForm");
if (_trackForm) _trackForm.onsubmit = async e => {
  e.preventDefault();
  const res = $("#trackResult");
  const oid = parseInt($("#trackOrderId").value.trim(), 10);
  const phone = $("#trackPhone").value.trim();
  if (!oid || !phone){ res.innerHTML = `<p class="form-error">Order ID aur phone number dono lazmi hain.</p>`; return; }
  res.innerHTML = `<p class="muted center">Check ho raha hai…</p>`;
  try {
    const { data, error } = await sb.rpc("get_order_status", { p_order_id: oid, p_phone: phone });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row){ res.innerHTML = `<p class="form-error">Order nahi mila — ID ya phone number dobara check karein.</p>`; return; }
    const d = new Date(row.created_at).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric" });
    res.innerHTML = `<div class="track-card">
      <p><strong>Order #${oid}</strong> — <span class="pill">${escapeHtml(row.status)}</span></p>
      <p>Total: <strong>${fmt(row.total)}</strong> • Items: <strong>${row.item_count}</strong> • Date: ${escapeHtml(d)}</p>
      ${row.tracking_note ? `<p class="track-note">📦 ${escapeHtml(row.tracking_note)}</p>` : ""}
    </div>`;
  } catch (err) {
    res.innerHTML = `<p class="form-error">Track nahi ho saka — thori der baad dobara try karein.</p>`;
  }
};

/* ---------- Header, filters, footer, misc ---------- */
$("#logoHome").onclick = e => { e.preventDefault(); showHome(); };
$("#searchToggle").onclick = () => {
  const bar = $("#searchBar");
  bar.hidden = !bar.hidden;
  if (!bar.hidden) $("#searchInput").focus();
  syncHeaderOffset();
};
/* V3.1c: fixed header ki height ke barabar body padding — header ki height
   theme/search-bar/mobile wrap se badal sakti hai, is liye measure karke
   lagayen (resize + settings apply par dobara). */
function syncHeaderOffset(){
  const h = $("#siteHeader") || document.querySelector(".site-header");
  if (!h) return; /* V3.6: Playful Pop ka header sticky NAHI hai (FunBug ki tarah upar scroll ho jata hai), is liye body par header jitni padding nahi chahiye. */ document.body.style.paddingTop = (document.body.classList.contains("theme-playful") || document.body.classList.contains("theme-luxury")) ? "0px" : h.offsetHeight + "px";
}
window.addEventListener("resize", syncHeaderOffset);
$("#searchBtn").onclick = () => { showPage("homeView"); renderGrid(); requestAnimationFrame(() => scrollToId("shop")); };
$("#searchInput").addEventListener("input", renderGrid);
$("#searchInput").addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); $("#searchBtn").click(); } });
$("#sortSelect").onchange = renderGrid;
$("#viewAllBtn").onclick = () => resetFilters("All Products", "popular");
$("#viewNewBtn").onclick = () => resetFilters("New Arrivals", "newest");
$("#shopDealsBtn").onclick = () => scrollToId("dealsSection");
$("#hotPrev").onclick = () => $("#hotTrack").scrollBy({ left: -280, behavior: "smooth" });
$("#hotNext").onclick = () => $("#hotTrack").scrollBy({ left: 280, behavior: "smooth" });
$("#revPrev").onclick = () => $("#reviewTrack").scrollBy({ left: -330, behavior: "smooth" });
$("#revNext").onclick = () => $("#reviewTrack").scrollBy({ left: 330, behavior: "smooth" });
/* V3.4: Tracks auto-slide (hot + reviews) — interval se ek card aage,
   aakhir par wapas shuru, smooth scroll. Touch/drag/hover ke dauran
   pause (force-scroll nahi — manual swipe se nahi takrata), chhorne
   par resume; arrow click timer dobara shuru karta hai. Animations
   off / reduced-motion par kabhi nahi chalta. */
function setupTrackAutoSlide(track, prevBtn, nextBtn){
  if (!track || track.dataset.autoSlide) return;
  track.dataset.autoSlide = "1";
  let timer = null, touching = false, hovering = false;
  const animOff = () => SETTINGS.animations === false || REDUCED_MOTION || document.body.classList.contains("no-anim");
  const overflows = () => track.scrollWidth > track.clientWidth + 10;
  const stop = () => { if (timer){ clearInterval(timer); timer = null; } };
  const start = () => { stop(); if (animOff() || !overflows()) return; timer = setInterval(advance, 4000); };
  const advance = () => {
    if (touching || hovering || document.hidden) return;
    if (animOff()){ stop(); return; }
    if (!overflows()) return;
    const card = track.querySelector(":scope > *");
    const gap = parseFloat(getComputedStyle(track).gap) || 16;
    const step = (card ? card.offsetWidth : 280) + gap;
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 20) track.scrollTo({ left: 0, behavior: "smooth" });
    else track.scrollBy({ left: step, behavior: "smooth" });
  };
  track.addEventListener("pointerdown", () => { touching = true; stop(); });
  ["pointerup", "pointercancel"].forEach(ev => track.addEventListener(ev, () => { touching = false; start(); }));
  track.addEventListener("mouseenter", () => { hovering = true; stop(); });
  track.addEventListener("mouseleave", () => { hovering = false; start(); });
  [prevBtn, nextBtn].forEach(b => { if (b) b.addEventListener("click", () => start()); });
  window.addEventListener("resize", () => start());
  start();
}
bindBudgetTiles();
const POLICIES = {
  contact: ["Contact Us", "<p>Order, delivery ya product ke baray mein sawal ho to store ke WhatsApp ya admin se rabta karein. Humari team aapko order ki sahi maloomat aur guidance degi.</p>"],
  shipping: ["Shipping Policy", "<p>Orders aam taur par 3–5 working days mein deliver kiye jate hain. Delivery charges har product par alag ho sakte hain aur checkout par wazeh dikhaye jate hain.</p><p>Har parcel dispatch se pehle quality-check kiya jata hai.</p>"],
  refund: ["Refund Policy", "<p>Damaged ya wrong product milne par foran rabta karein. Masla verify hone ke baad exchange ya refund policy ke mutabiq process kiya jata hai.</p><p>Product unused aur original packing mein hona chahiye, siwaye damaged delivery ke.</p>"],
  privacy: ["Privacy Policy", "<p>Aapka naam, phone number, city aur address sirf order processing aur delivery ke liye istemal hota hai. Hum aapki maloomat kisi irrelevant third party ko nahi bechte.</p>"],
  terms: ["Terms of Service", "<p>Order place karke aap product details, price aur delivery terms se ittefaq karte hain. Confirmation call par order verify hone ke baad hi parcel dispatch kiya jata hai.</p><p>Prices aur stock baghair notice change ho sakte hain.</p>"]
};
function bindPolicyButtons(root){
  (root || document).querySelectorAll("[data-policy]").forEach(b => b.onclick = () => {
    const key = b.dataset.policy;
    const p = POLICIES[key]; if (!p) return;
    $("#policyTitle").textContent = p[0];
    /* Admin Settings mein policy text likha ho to wohi; warna built-in default. */
    const custom = SETTINGS.policies && SETTINGS.policies[key];
    $("#policyBody").innerHTML = (typeof custom === "string" && custom.trim()) ? descHtml(custom) : p[1];
    $("#policyModal").classList.add("open");
  });
}
bindPolicyButtons(document);
$$("[data-close]").forEach(b => b.onclick = () => $("#policyModal").classList.remove("open"));
$("#policyModal").addEventListener("click", e => { if (e.target.id === "policyModal") e.currentTarget.classList.remove("open"); });
document.addEventListener("keydown", e => { if (e.key === "Escape") $("#policyModal").classList.remove("open"); });
/* V3.10: newsletter ab asal mein save hoti hai (newsletter_subscribers table). Duplicate email (unique store+email) ho to bhi success jaisa jawab — dobara email nahi mangta. Table na ho to saaf error. */ document.getElementById("subForm").onsubmit = async e => { e.preventDefault(); const email = String(document.getElementById("subEmail").value || "").trim(); const msg = document.getElementById("subMsg"); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ msg.textContent = "Sahi email likhein."; return; } msg.textContent = "Subscribe ho raha hai…"; try { const { data, error } = await sb.rpc("subscribe_newsletter", { p_store_id: STORE_ID, p_email: email }); if (error) throw error; if (data === false) throw new Error("subscribe failed"); msg.innerHTML = icon("check", "ic-inline") + " Shukriya! Aap subscribe ho gaye hain."; e.target.reset(); } catch (err) { msg.textContent = "Subscribe nahi ho saka — dobara koshish karein."; } };
$("#backTop").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
window.addEventListener("scroll", () => { $("#backTop").classList.toggle("show", window.scrollY >= 500); }, { passive: true });

let toastTimer;
function toast(text){
  const t = $("#toast");
  t.textContent = text; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- V3.3: Social-proof popups — SIRF MANUAL ENTRIES ----------
   Cycle: pehla popup 8s baad → durationSec dikhaye → hide → intervalSec
   wait → agla entry (tartib se, loop). Entries admin Style tab mein owner
   khud likhta hai (name/product/city/amount/timeText) — koi previous-order
   fetch nahi, koi demo entry nahi, koi "Verified" daawa nahi. timeText
   EXACT waisa dikhta hai jaisa owner ne likha (kabhi compute nahi hota).
   PDP sticky buy bar dikh raha ho to us cycle popup skip hota hai taake
   popup buy buttons par na chadhe; dikhta hua popup bhi bar aate hi chhup
   jata hai (updatePdpSticky mein hook hai). */
let spStarted = false, spTimer = null, spHideTimer = null, spEl = null;
let spIndex = 0;
function spConfig(){
  const st = (SETTINGS && SETTINGS.style && SETTINGS.style.socialProof) || {};
  const entries = Array.isArray(st.entries) ? st.entries.filter(e => e && (e.name || e.product)).map(e => ({ name: String(e.name || ""), product: String(e.product || ""), city: String(e.city || ""), amount: String(e.amount || ""), timeText: String(e.timeText || "") })) : [];
  return {
    enabled: typeof st.enabled === "boolean" ? st.enabled : true,
    intervalSec: Math.max(5, parseInt(st.intervalSec, 10) || 20),
    durationSec: Math.max(1, parseInt(st.durationSec, 10) || 5),
    entries
  };
}
function spHide(schedule){
  if (spEl) spEl.classList.remove("show");
  clearTimeout(spHideTimer);
  if (schedule) spSchedule(spConfig().intervalSec * 1000);
}
function spSchedule(ms){
  clearTimeout(spTimer);
  spTimer = setTimeout(spShowNext, ms);
}
function spShowNext(){
  const cfg = spConfig();
  if (!cfg.enabled){ stopSocialProof(); return; }
  if (!cfg.entries.length){ spSchedule(cfg.intervalSec * 1000); return; }
  const bar = document.getElementById("pdpSticky");
  if (bar && bar.classList.contains("show")){ spSchedule(cfg.intervalSec * 1000); return; }
  const item = cfg.entries[spIndex % cfg.entries.length];
  spIndex++;
  if (!spEl){
    spEl = document.createElement("div");
    spEl.id = "spPopup";
    spEl.className = "sp-popup";
    document.body.appendChild(spEl);
  }
  const initial = esc(String(item.name || "C").charAt(0).toUpperCase());
  const metaParts = [];
  if (item.city) metaParts.push(esc(item.city));
  if (item.amount) metaParts.push("Rs " + esc(item.amount));
  if (item.timeText) metaParts.push(esc(item.timeText));
  spEl.innerHTML = `<button class="sp-close" type="button" aria-label="Band karein">×</button>`
    + `<span class="sp-avatar">${initial}</span>`
    + `<div class="sp-body"><p class="sp-line"><strong>${esc(item.name)}</strong> ne <strong>${esc(item.product)}</strong> order kiya</p>`
    + (metaParts.length ? `<p class="sp-meta">${metaParts.join(" • ")}</p>` : "") + `</div>`;
  spEl.querySelector(".sp-close").onclick = e => { e.stopPropagation(); spHide(true); };
  spEl.onclick = () => {
    const p = PRODUCTS.find(x => x.name === item.product);
    if (p) openProduct(p.id);
  };
  requestAnimationFrame(() => { if (spEl) spEl.classList.add("show"); });
  clearTimeout(spHideTimer);
  spHideTimer = setTimeout(() => spHide(true), cfg.durationSec * 1000);
}
function stopSocialProof(){
  spStarted = false;
  clearTimeout(spTimer); clearTimeout(spHideTimer);
  if (spEl) spEl.classList.remove("show");
}
function startSocialProof(){
  if (!spConfig().enabled){ stopSocialProof(); return; }
  if (spStarted) return;
  spStarted = true;
  spSchedule(8000);
}

/* ---------- Tenant resolution + boot ----------
   Pehle ye tay hota hai ke visitor KIS store par hai, phir hi koi
   products/settings load hote hain (saari queries usi store ki hoti hain).
   Resolution order:
     1) ?store=<slug> URL param  (explicit — na mile to "Store nahi mila")
     2) sessionStorage 'sn_store_slug' (pehle visit se yaad)
     3) custom domain: hostname platform ke apne hosts se alag ho to
        storefront_stores mein custom_domain match
     4) default 'shopnest'
   Stores lookup hi fail ho jaye (migration abhi nahi chali) to
   SINGLE-TENANT FALLBACK: baghair store filter purana render — live
   shop kabhi is wajah se band nahi hogi. */
/* Module 1: public storefront data comes from the get_public_storefront RPC
   (server-side projection), NOT from direct table reads. Direct anon SELECT
   on settings/products/categories/storefront_stores is revoked; the RPC is
   the only path. The RPC returns {store, settings, products, categories}
   for ONE resolved store, or null. The full result is cached so
   loadSettings/loadProducts/loadCategories reuse it without a second call. */
let __publicStorefront = null; /* cached RPC result for the resolved store */
async function fetchPublicStorefront(slug){
  const { data, error } = await sb.rpc("get_public_storefront", { p_slug: slug });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  __publicStorefront = data;
  return data.store || null;
}
async function fetchStorefrontRow(slug){
  /* Kept as a thin wrapper (callers expect a store row). */
  return fetchPublicStorefront(slug);
}
async function resolveStore(){
  const paramSlug = (new URLSearchParams(location.search).get("store") || "").trim().toLowerCase();
  let slug = null;
  let explicit = false;
  if (paramSlug){
    slug = paramSlug; explicit = true;
    try { sessionStorage.setItem("sn_store_slug", slug); } catch (e) {}
  } else {
    try { slug = sessionStorage.getItem("sn_store_slug") || null; } catch (e) {}
    if (!slug){
      const host = (location.hostname || "").toLowerCase();
      if (host && !PLATFORM_HOSTS.includes(host)){
        /* Module 1: resolve a custom domain via the RPC (it tries the host
           as a slug, then as a custom_domain). No direct view query. */
        try {
          const row = await fetchPublicStorefront(host);
          if (row && row.slug){
            slug = row.slug;
            try { sessionStorage.setItem("sn_store_slug", slug); } catch (e) {}
          }
        } catch (e) { /* RPC fail — default/fallback neeche sambhal lega */ }
      }
    }
    if (!slug) slug = "shopnest";
  }
  STORE_SLUG = slug;
  let row = null;
  try {
    row = await fetchStorefrontRow(slug);
  } catch (e) {
    console.warn("Store resolution fail — single-tenant fallback render.", e);
    STORE = null; STORE_ID = null;
    return "fallback";
  }
  if (!row){
    if (explicit) return "notfound";
    if (slug !== "shopnest"){
      /* Session ka purana slug ab mojood nahi — saaf karke default try karein. */
      try { sessionStorage.removeItem("sn_store_slug"); } catch (e) {}
      STORE_SLUG = "shopnest";
      try { row = await fetchStorefrontRow("shopnest"); } catch (e) { row = null; }
      if (!row){ STORE = null; STORE_ID = null; return "fallback"; }
    } else {
      /* View hai lekin default store bhi nahi — purana single-tenant render. */
      STORE = null; STORE_ID = null;
      return "fallback";
    }
  }
  STORE = row;
  STORE_SLUG = row.slug || STORE_SLUG;
  if (row.status === "suspended") return "suspended";
  STORE_ID = row.id || null;
  return "ok";
}
function showStoreNotice(title, msg){
  document.body.classList.add("store-closed");
  const box = $("#storeNotice");
  if (box){
    $("#noticeTitle").textContent = title;
    $("#noticeText").textContent = msg;
    box.hidden = false;
  }
  document.title = title;
}
/* Module 4: lookup-fail error state — Retry + platform-home link. */
function showStoreError(){
  document.body.classList.add("store-closed");
  const box = $("#storeNotice");
  if (box){
    $("#noticeTitle").textContent = "Store load nahi ho saka";
    $("#noticeText").textContent = "Store load nahi ho saka — internet check karke dobara try karein.";
    let actions = $("#storeNoticeActions");
    if (!actions){
      actions = document.createElement("div");
      actions.id = "storeNoticeActions";
      actions.className = "store-notice-actions";
      actions.style.cssText = "display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap";
      const card = box.querySelector(".store-notice-card");
      if (card) card.appendChild(actions);
    }
    actions.innerHTML = "";
    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.id = "storeRetryBtn";
    retryBtn.className = "btn primary";
    retryBtn.textContent = "Dobara try karein";
    retryBtn.onclick = function(){ retryBoot(); };
    const homeLink = document.createElement("a");
    homeLink.id = "storeHomeLink";
    homeLink.className = "btn outline";
    homeLink.href = "https://imalirazamansha.github.io/webalibabamarketingpro/shopnest.html";
    homeLink.textContent = "Platform home";
    actions.appendChild(retryBtn);
    actions.appendChild(homeLink);
    box.hidden = false;
  }
  document.title = "Store load nahi ho saka";
}
/* Module 4: Retry — store resolution + boot dobara chalayeing. */
async function retryBoot(){
  const box = $("#storeNotice");
  if (box) box.hidden = true;
  document.body.classList.remove("store-closed");
  PRODUCTS = [];
  CATEGORIES = [];
  STORE = null;
  STORE_ID = null;
  await boot();
}
async function boot(){
  const mode = await resolveStore();
  if (mode === "suspended"){
    showStoreNotice("Store band hai", "Ye store filhal band hai — jald wapis aayega.");
    return;
  }
  if (mode === "notfound"){
    showStoreNotice("Store nahi mila", "Ye store nahi mila — link check karke dobara try karein.");
    return;
  }
  if (mode === "fallback"){
    /* Module 4: fail-closed — lookup fail ho to kuch load na karein. */
    showStoreError();
    return;
  }
  /* mode "ok": cart is store ke slug se load karein. */
  CART_KEY = "shopnest_cart_" + STORE_SLUG;
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || "{}") || {}; } catch (e) { cart = {}; }
  if (!cart || typeof cart !== "object" || Array.isArray(cart)) cart = {};
  trackPage("home"); /* pehla pageview — showPage init par nahi chalta */
  loadSettings();
  loadProducts();
}

/* Footer ki default "Help & Policies" column ka HTML — footer_links (V2) set
   hon to renderFooterLinks isay Quick Links se badal deta hai, aur khaali hon
   to yehi wapis lagta hai. Pehli applySettings() se pehle capture lazmi hai. */
const DEFAULT_HELP_HTML = $("#footerHelpLinks") ? $("#footerHelpLinks").innerHTML : "";

applySettings();
renderFaq();
boot();
