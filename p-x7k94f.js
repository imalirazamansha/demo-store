/* ================= ShopNest Admin (Shopify-level, MULTI-TENANT) =================
   Access model: login (magic link) ke baad email ki public.team rows
   (har store ki alag role) + public.platform_admins check hote hain.
   Store context: ?store=slug → sessionStorage → ek hi entitled store →
   store picker. Platform admin har store mein owner-level hai.
   Har query/mutation CURRENT store_id se scoped hai.
   Per-store roles: owner = sab kuch, admin = Team ke ilawa sab,
   staff = sirf Dashboard / Orders / Products. */
const SUPABASE_URL = "https://vyiwiqcbituttdjgsuwe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXdpcWNiaXR1dHRkamdzdXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTQ0MTYsImV4cCI6MjEwODA5MDQxNn0.fQDW8_b27GzTpu5XBi_Nqw12mmJlJodE0yB3Ei1KLNo";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = s => document.querySelector(s);
const fmt = n => "Rs." + Number(n || 0).toLocaleString("en-PK");
const STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];
const STATUS_COLORS = { Pending: "#f59e0b", Confirmed: "#3b82f6", Shipped: "#8b5cf6", Delivered: "#22C55E", Cancelled: "#EF4444" };
const PLACEHOLDER_IMG = "https://placehold.co/600x400/eef6fa/0A2B4E?text=No+Image";
/* ---------- V2: Appearance (fonts / theme) + Homepage sections ---------- */
/* font_family settings mein OBJECT save hota hai: { name, stack, google } —
   stack = CSS font-family string, google = Google Fonts query (khaali = system). */
const FONTS = {
  "": { name: "", stack: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", google: "" },
  "Poppins": { name: "Poppins", stack: "'Poppins', system-ui, sans-serif", google: "Poppins:wght@400;500;600;700;800" },
  "Inter": { name: "Inter", stack: "'Inter', system-ui, sans-serif", google: "Inter:wght@400;500;600;700;800" },
  "Roboto": { name: "Roboto", stack: "'Roboto', system-ui, sans-serif", google: "Roboto:wght@400;500;700" },
  "Montserrat": { name: "Montserrat", stack: "'Montserrat', system-ui, sans-serif", google: "Montserrat:wght@400;500;600;700;800" },
  "Playfair Display": { name: "Playfair Display", stack: "'Playfair Display', Georgia, serif", google: "Playfair+Display:wght@500;600;700;800" },
  "Rubik": { name: "Rubik", stack: "'Rubik', system-ui, sans-serif", google: "Rubik:wght@400;500;600;700" }
};
function fontObjFromName(name){ const f = FONTS[name] || FONTS[""]; return { name: f.name, stack: f.stack, google: f.google }; }
function fontNameOf(ff){
  if (!ff) return "";
  if (typeof ff === "string") return FONTS[ff] ? ff : "";
  return ff.name && FONTS[ff.name] ? ff.name : "";
}
const THEME_SWATCHES = [
  { name: "Zeebay Navy", color: "#0A2B4E" },
  { name: "Fresh Green", color: "#22C55E" },
  { name: "Maroon", color: "#7f1d1d" },
  { name: "Purple", color: "#6d28d9" },
  { name: "Teal", color: "#0f766e" },
  { name: "Black / Gold", color: "#111111" },
  { name: "Pink", color: "#db2777" }
];
/* Homepage sections — storefront (index.html) ke asal sections, DOM order mein.
   key = sections_order wali key; LEGACY_SEC purane settings.sections toggle
   keys se map hai (jo storefront abhi parhta hai). */
const SECTION_DEFS = [
  { key: "hero", label: "Hero Slider", sub: "Bara banner slider" },
  { key: "trust", label: "Trust Strip", sub: "COD / Fast Delivery wali patti" },
  { key: "categories", label: "Shop by Category", sub: "Category tiles" },
  { key: "best_sellers", label: "Best Sellers", sub: "Sab se zyada bikne wale products" }, { key: "featured", label: "Featured Pick", sub: "Bari featured product band (Playful Pop)" }, { key: "festive", label: "Festive Edit", sub: "2×2 labelled tiles (Luxury theme)" }, { key: "unstitched_tabs", label: "Unstitched Tabs", sub: "Luxury / Daily Wear / Embroidered tabs (Luxury theme)" }, { key: "readytowear_tabs", label: "Ready To Wear Tabs", sub: "Luxury / Daily Wear / Embroidered tabs (Luxury theme)" }, { key: "editorial", label: "Editorial Banner", sub: "Full-width image banner (Luxury theme)" },
  { key: "all_products", label: "All Products", sub: "Poori products list + filters" },
  { key: "promos", label: "Promo Banners", sub: "Do bare promo cards" }, { key: "reels", label: "Reels & Videos", sub: "Instagram reels row (Playful Pop + Luxury Spotted)" },
  { key: "hot", label: "Hot Selling", sub: "Trending carousel" },
  { key: "new_arrivals", label: "New Arrivals", sub: "Naye products" },
  { key: "deals", label: "Mega Deals", sub: "Limited time deals" },
  { key: "budget", label: "Shop by Budget", sub: "Budget tiles" },
  { key: "about", label: "About", sub: "Store ke baare mein" },
  { key: "how_to_order", label: "How to Order", sub: "Order karne ke steps" },
  { key: "faq", label: "FAQ", sub: "Aksar pooche jane wale sawalat" },
  { key: "testimonials", label: "Happy Customers", sub: "Customer reviews" }, { key: "blog", label: "Blog & Guides", sub: "Buying guide cards (Playful Pop)" }
];
const LEGACY_SEC = { best_sellers: "best", promos: "promos", hot: "hot", new_arrivals: "arrivals", deals: "deals", budget: "budget", about: "about", how_to_order: "howto", faq: "faq", testimonials: "reviews" };
function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
/* V3 Part B security: escapeHtml = esc (storefront ke naam se match). */
const escapeHtml = esc;
/* V3 Part B security: safeUrl — sirf http(s)/relative image URLs.
   X-1 fix (2026-11-10): scheme check ke baad ", ', <, >, backtick aur space
   ko percent-encode karte hain, taa ke koi crafted URL quoted attribute
   (src="...") se bahar na nikal sake (stored XSS). */
function safeUrl(u){
  const t = String(u || "").trim();
  if (!t) return "";
  const encAttr = s => s.replace(/["'<>` ]/g, c => ({ '"': "%22", "'": "%27", "<": "%3C", ">": "%3E", "`": "%60", " ": "%20" }[c]));
  if (/^https?:\/\//i.test(t)) return encAttr(t);
  if (t.startsWith("/") || t.startsWith("./") || t.startsWith("../")) return encAttr(t);
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) return encAttr(t);
  return "";
}

let settingsLoaded = false;
let settingsLoadFailed = false; /* HQ-A-03: load fail hua to save BLOCK hai. */
let MY_EMAIL = null;
let MY_ROLE = null;          // CURRENT store mein is user ki team role (platform-only ho to null)
/* ---------- Multi-tenant store context ---------- */
let IS_PLATFORM = false;     // platform_admins mein hai?
let MY_STORES = [];          // entitled stores: stores row + { role } (role null = sirf platform access)
let STORE_ID = null;         // current store ki uuid — SAARI queries isi se scope hoti hain
let STORE_SLUG = null;
let STORE_NAME = null;
/* Effective role: platform admin har store mein owner-level mana jata hai. */
const effRole = () => MY_ROLE || (IS_PLATFORM ? "owner" : null);
let ORDERS_CACHE = [];
let PRODUCTS_CACHE = [];
/* FE-P1: admin lists client-side 50/page (server abhi bhi poori list deta hai). */
const ADMIN_PAGE_SIZE = 50;
let ORDERS_PAGE = 1;
let PRODUCTS_PAGE = 1;
/* D-1 soft-delete: deleted_at wali rows list se chhupi rehti hain; server
   deleted_at field na bheje to missing = "not deleted" (defensive). */
let SHOW_DELETED_ORDERS = false;
const isDeletedOrder = o => !!(o && o.deleted_at);
/* L-4 COD payment: payment_status field server se na aaye to checkbox/stat
   purane tareeqay par rehte hain (defensive — kuch nahi toot-ta). */
const hasPaymentField = o => !!(o && Object.prototype.hasOwnProperty.call(o, "payment_status"));
const isPaidOrder = o => !!(o && o.payment_status === "paid");
let CATEGORIES_CACHE = [];
let heroState = [];
/* ---------- V2 state ---------- */
let CURRENT_TAB = "dashboard";
let tabRefreshArmed = false; /* switchTab refresh sirf boot ke baad (loadAll ke baad true hota hai). */
let SETTINGS_STATE = null;   // loadSettings ke baad full merged settings (saare tabs isi se bharte/save hote hain)
let metaDirty = false;   // Stale-save guard: Meta tab ke fields is session mein chhooe gaye ya nahi (persistAllSettings is se meta ko dirty-gate karta hai).
let EDITING_PRODUCT_ID = null;
let HP_ORDER = []; let HP_LUX_WARN = []; // Is theme par render na hone wali sections ki list (grey rows) — builder se koi key nahi hat-ti           // homepage builder: [{key, visible}] — custom entries key "custom:<id>"
let HP_CUSTOM = {};          // custom sections content: id -> {heading, text, img, btn_label, btn_link}
let homepageFilled = false;

/* Client-side per-store helper (effRole par mabni) — dropped DB function is_admin_plus() se is ka koi talluq nahi (Module 3b, R9). */
const isAdminPlus = () => effRole() === "owner" || effRole() === "admin";

/* Storefront defaults — script.js ke DEFAULT_SETTINGS se match. */
const ADMIN_DEFAULT_SETTINGS = {
  store_name: "ShopNest",
  seo_title: "",
  seo_description: "",
  announcements: [
    "⚡ {STORE} — PAKISTAN KA SMART STORE",
    "💵 CASH ON DELIVERY ALL OVER PAKISTAN",
    "🚚 FAST DELIVERY 3–5 DAYS",
    "🔥 HOT DEALS — LIMITED STOCK"
  ],
  hero: [
    { pill: "🔥 MEGA SALE — 50% TAK OFF", title: "SMART GADGETS, SMART LIFE!", subtitle: "Pakistan ke best smart gadgets — quality checked, Cash on Delivery ke saath, seedha aapke ghar tak.", button: "SHOP BEST SELLERS", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=80", visible: true },
    { pill: "🎧 AUDIO, WEARABLES & MORE", title: "HAR GHAR KI ZAROORAT!", subtitle: "Headphones, smart watches aur roz-marra ke useful products — honest prices aur fast dispatch.", button: "SHOP DEALS", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80", visible: true }
  ],
  promo: [
    { kicker: "HOME ESSENTIALS", heading: "GHAR KE LIYE SMART CHOICE", text: "Waqt aur mehnat dono bachayein — smart home products jo roz ka kaam asaan kar dein.", category: "Home & Living" },
    { kicker: "STYLE & FASHION", heading: "LOOK BHI, COMFORT BHI", text: "Trending fashion essentials — quality checked aur Cash on Delivery ke saath.", category: "Fashion" }
  ],
  about_heading: "PAKISTAN KA SMART STORE",
  about_text: "ShopNest par hum sirf wohi products rakhte hain jo pehle test kiye jayein. Har order dispatch se pehle quality-check hota hai aur payment Cash on Delivery hai — pehle product aapke haath mein, phir paisay. Poore Pakistan mein fast dispatch, aur damaged ya wrong product par easy exchange. Smart shopping, bina tension!",
  /* V3.3 Content — storefront DEFAULT_SETTINGS se match (khaali = defaults). */
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
  delivery_fee_flat: null, /* [FLAT-FEE] null = unset (per-product-once fallback); number, 0 = FREE, = flat fee per order */
  /* V3.6: Instagram reels + blog */ instaHandle: "", instaReels: [], blogPosts: [], showReels: true, showBlog: true, /* V3.9: fashion options + editable section/PDP text */ showSizes: true, showColors: true, showDisclaimer: true, sectionText: {}, pdpText: { details: "", related: "", delivery: "" }, /* V3.10: Luxury theme content (Festive tiles, Collection tabs, Editorial banner) */ luxuryTiles: [], luxuryTabs: [], luxuryBanner: { img: "", eyebrow: "", title: "", button: "", cat: "" }, /* V3.11: Ready To Wear tabs + Editorial slider banners */ luxuryRtwTabs: [], luxuryBanners: [], collectionPages: [], /* --- V5 Phase 4: custom pages --- */ customPages: [], /* --- V5 Phase 5: Meta + custom code (har theme) --- */ meta: { pixelId: "", capiEnabled: false, testEventCode: "", hasCapiToken: false, capiTokenLast4: "" }, customCode: { head: "", body: "" }, sections: { best: true, hot: true, arrivals: true, deals: true, budget: true, about: true, howto: true, faq: true, reviews: true, promos: true },
  policies: { shipping: "", refund: "", privacy: "", terms: "", contact: "" },
  profile: { logo_url: "", email: "", phone: "", address: "" },
  /* V2 keys — storefront inhein consume karega (Part B) */
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
  /* V3: store admin ki theme choice (settings.data.theme) */
  theme: "",
  /* V3.2 Style Editor — storefront ke DEFAULT_SETTINGS.style se match;
     khaali string = theme default (style kabhi theme ko wipe nahi karta). */
  style: {
    card: { radius: "", bg: "", border: "", shadow: "", titleColor: "", priceColor: "" },
    sections: {},
    buttons: { primaryBg: "", primaryColor: "", radius: "", secondaryColor: "", fontSize: "" },
    page: { headerBg: "", footerBg: "", marqueeBg: "", pageBg: "", textColor: "" },
    socialProof: { enabled: true, intervalSec: 20, durationSec: 5, entries: [] }
  }
};

/* ---------- Auth (magic link) + team gate ---------- */
$("#sendLinkBtn").onclick = async () => {
  const email = $("#loginEmail").value.trim();
  const msg = $("#loginMsg");
  if (!email){ msg.textContent = "Email likhein pehle."; msg.className = "msg err"; return; }
  msg.textContent = "Login link bheja ja raha hai…"; msg.className = "msg";
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href.split("#")[0] },
  });
  if (error){ msg.textContent = "Error: " + error.message; msg.className = "msg err"; showToast("Error: " + error.message, "err"); }
  else { msg.textContent = "✅ Link bhej diya gaya hai — apna email inbox check karein aur link par click karein."; msg.className = "msg ok"; showToast("✅ Login link bhej diya gaya — inbox check karein.", "ok"); }
};
$("#logoutBtn").onclick = async () => { await sb.auth.signOut(); location.reload(); };
$("#noAccessLogout").onclick = async () => { await sb.auth.signOut(); location.reload(); };

sb.auth.onAuthStateChange((_event, session) => { if (session) checkAccess(session); });
(async () => { const { data } = await sb.auth.getSession(); if (data.session) checkAccess(data.session); })();

let accessCheckedFor = null;
async function checkAccess(session){
  const email = session && session.user && session.user.email;
  if (!email) return;
  if (accessCheckedFor === email) return;
  accessCheckedFor = email;
  MY_EMAIL = email;
  try {
    /* Is email ki SAARI team rows (har store ki) + platform admin check.
       Team rows get_my_stores() RPC se aati hain (Module 3b — staff team
       table parh nahi sakta, is liye login lookup RPC se hoti hai);
       platform_admins mein apni row sirf platform admin ko nazar aati hai.
       "team by email" wali ye lookup jaan boojh kar store-unscoped hai —
       yahi login ka entry point hai. */
    const [teamRes, platRes] = await Promise.all([
      sb.rpc("get_my_stores"),
      sb.from("platform_admins").select("email").eq("email", email).maybeSingle()
    ]);
    if (teamRes.error) throw teamRes.error;
    const teamRows = teamRes.data || [];
    /* B2 MFA: platform-admin path ko AAL2 chahiye. AAL1 mein platform_admins
       row nazar nahi aati (backend RLS), is liye IS_PLATFORM sirf AAL2 mein
       set karein — warna AAL1 platform admin ko cross-store access mil jata.
       Team member ke liye AAL1 kaafi hai (apni stores), use rokna nahi.
       Agar team rows NAHI hain aur AAL1 hai, to yeh platform admin ho sakta
       hai — MFA prompt dikhayein, bare "no access" nahi. */
    const aal = await mfaGetAAL();
    const isAAL2 = !!(aal && aal.currentLevel === "aal2");
    IS_PLATFORM = isAAL2 && !!(platRes && platRes.data);
    if (!teamRows.length && !isAAL2){
      accessCheckedFor = null; // MFA ke baad dobara check ho sake
      await mfaShowGate();
      return;
    }
    /* Stores ki list bhi RLS-scoped hai: team member ko sirf apni stores,
       platform admin ko SAARI stores milti hain. */
    const { data: storeRows, error: storeErr } = await sb.from("stores").select("id, slug, name, status, allowed_themes");
    if (storeErr) throw storeErr;
    const byId = {};
    (storeRows || []).forEach(s => { byId[s.id] = s; });
    MY_STORES = teamRows.filter(r => byId[r.store_id]).map(r => ({ ...byId[r.store_id], role: r.role }));
    if (IS_PLATFORM){
      (storeRows || []).forEach(s => { if (!MY_STORES.some(m => m.id === s.id)) MY_STORES.push({ ...s, role: null }); });
    }
    MY_STORES = MY_STORES.filter(s => s.status !== "deleted");
    if (!MY_STORES.length){ showNoAccess(email); return; }

    /* Store resolution: ?store= param → sessionStorage → ek hi store → picker */
    const paramSlug = (new URLSearchParams(location.search).get("store") || "").trim().toLowerCase();
    let chosen = null;
    if (paramSlug){
      chosen = MY_STORES.find(s => s.slug === paramSlug) || null;
      if (!chosen){
        /* Store mojood hai lekin is user ki entitled list mein nahi? */
        const { data: pub } = await sb.from("storefront_stores").select("slug, name").eq("slug", paramSlug).maybeSingle();
        if (pub){ showNoAccess(email, pub.name || paramSlug); return; }
      }
    }
    if (!chosen){
      let saved = null;
      try { saved = sessionStorage.getItem("sn_admin_store"); } catch (e) {}
      if (saved) chosen = MY_STORES.find(s => s.id === saved) || null;
    }
    if (!chosen && MY_STORES.length === 1) chosen = MY_STORES[0];
    if (chosen) enterStore(chosen);
    else showStorePicker();
  } catch (e) {
    console.error("Store context resolve fail:", e);
    showNoAccess(email);
  }
}
/* ---------- B2 MFA (authenticator app) ----------
   Sirf platform-admin path ko AAL2 chahiye. Team member (Owner/Admin/Staff)
   ke liye AAL1 kaafi hai — use MFA se rokna nahi. AAL1 platform admin ko
   cross-store access kabhi nahi milta (IS_PLATFORM sirf AAL2 mein set hota
   hai). Agar team rows nahi hain aur AAL1 hai, to MFA prompt dikhta hai
   (platform admin ho sakta hai) — bare "no access" nahi.
   Secret/QR/code kabhi log nahi hota, kabhi localStorage mein nahi jata —
   sirf memory mein rehta hai aur verify ke baad saaf ho jata hai.
   Recovery codes istemal NAHI hote (experimental, disabled by default). */
let mfaEnrollFactorId = null; // sirf enrolment ke dauran, memory mein
let mfaGateDone = null;
async function mfaGetAAL(){
  try {
    const { data, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return null;
    return data; // { currentLevel: "aal1"|"aal2", nextLevel: ... }
  } catch (e) { return null; }
}
async function mfaListTotp(){
  try {
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error || !data) return [];
    return (data.totp || []).filter(f => f && f.status === "verified");
  } catch (e) { return []; }
}
async function mfaNextFriendlyName(){
  // B2 fix (2026-11-08): Supabase requires friendlyName to be unique per user.
  // Factor #1 uses "Authenticator", so factor #2 must be "Authenticator 2"
  // (then 3, 4...). Check ALL factors (verified + unverified) — an unverified
  // factor with the same name also causes a conflict.
  try {
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error || !data) return "Authenticator";
    const taken = new Set((data.totp || []).map(f => String((f && f.friendly_name) || "").toLowerCase()));
    let name = "Authenticator", n = 2;
    while (taken.has(name.toLowerCase())) { name = "Authenticator " + n; n++; }
    return name;
  } catch (e) { return "Authenticator"; }
}
function mfaCodeOf(inputEl){
  const v = String((inputEl && inputEl.value) || "").replace(/\D/g, "").slice(0, 6);
  if (inputEl) inputEl.value = v;
  return v.length === 6 ? v : null;
}
function mfaClearSecrets(){
  mfaEnrollFactorId = null;
  const qr = $("#mfaQrImg"); if (qr) qr.removeAttribute("src");
  const sec = $("#mfaSecretText"); if (sec) sec.textContent = "";
  ["#mfaChallengeCode", "#mfaEnrollCode"].forEach(s => { const el = $(s); if (el) el.value = ""; });
}
function mfaHideAllViews(){
  ["#loginView", "#dashView", "#noAccessView", "#storePickerView"].forEach(s => $(s).classList.add("hidden"));
  $("#mfaView").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");
}
/* MFA gate: AAL1 user ko challenge ya enrolment dikhayein. onDone MFA
   kamyab hone par chalta hai (access check dobara hota hai). */
async function mfaShowGate(){
  mfaClearSecrets();
  mfaHideAllViews();
  $("#mfaChallengeBox").classList.add("hidden");
  $("#mfaEnrollBox").classList.add("hidden");
  $("#mfaQrWrap").classList.add("hidden");
  $("#mfaChallengeMsg").textContent = ""; $("#mfaChallengeMsg").className = "msg";
  $("#mfaEnrollMsg").textContent = ""; $("#mfaEnrollMsg").className = "msg";
  $("#mfaIntro").innerHTML = "Platform admin ke liye <strong>doosri pehchan (MFA)</strong> zaroori hai. Pehle apne authenticator app (Google Authenticator / Authy) se 6-digit code dein. <br><small>Store team member hain to yeh screen ghalti se aayi hai — Logout karke dobara login karein.</small>";
  const factors = await mfaListTotp();
  if (factors.length){
    const sel = $("#mfaFactorSelect");
    sel.innerHTML = factors.map((f, i) => `<option value="${esc(f.id)}">Authenticator ${i + 1}${f.friendly_name ? " — " + esc(f.friendly_name) : ""}</option>`).join("");
    $("#mfaFactorPick").classList.toggle("hidden", factors.length < 2);
    $("#mfaChallengeBox").classList.remove("hidden");
    $("#mfaChallengeCode").focus();
  } else {
    $("#mfaEnrollBox").classList.remove("hidden");
  }
  mfaGateDone = async () => {
    mfaClearSecrets();
    accessCheckedFor = null;
    const { data } = await sb.auth.getSession();
    if (data.session) checkAccess(data.session);
  };
}
$("#mfaLogoutBtn").onclick = async () => { mfaClearSecrets(); await sb.auth.signOut(); location.reload(); };
$("#mfaCopySecretBtn").onclick = async function(){
  const sec = $("#mfaSecretText").textContent || "";
  if (!sec) return;
  const old = this.textContent;
  try { await navigator.clipboard.writeText(sec); }
  catch (e) {
    const ta = document.createElement("textarea");
    ta.value = sec; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e2) {}
    ta.remove();
  }
  this.textContent = "✅ Copy ho gaya";
  setTimeout(() => { this.textContent = old; }, 1800);
};
$("#mfaEnrollStartBtn").onclick = async () => {
  const btn = $("#mfaEnrollStartBtn"), msg = $("#mfaEnrollMsg");
  btn.disabled = true;
  msg.textContent = "Authenticator set up ho raha hai…"; msg.className = "msg";
  try {
    // B2 fix (2026-11-08): friendlyName must be unique per user — use the next
    // free name ("Authenticator 2" for factor #2) instead of always "Authenticator".
    const friendlyName = await mfaNextFriendlyName();
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName });
    if (error || !data || !data.totp) throw new Error((error && error.message) || "Enrol nahi ho saka");
    mfaEnrollFactorId = data.id;
    const qr = $("#mfaQrImg");
    if (data.totp.qr_code) qr.src = data.totp.qr_code; // Supabase data-URI SVG deta hai
    $("#mfaSecretText").textContent = data.totp.secret || "";
    $("#mfaQrWrap").classList.remove("hidden");
    $("#mfaEnrollStartBtn").classList.add("hidden");
    msg.textContent = "QR scan karein ya secret daal lein, phir 6-digit code likh kar verify karein."; msg.className = "msg ok";
    $("#mfaEnrollCode").focus();
  } catch (e) {
    msg.textContent = "Error: " + (e && e.message ? e.message : "Enrol nahi ho saka"); msg.className = "msg err";
  } finally { btn.disabled = false; }
};
$("#mfaEnrollVerifyBtn").onclick = async () => {
  const msg = $("#mfaEnrollMsg"), btn = $("#mfaEnrollVerifyBtn");
  if (!mfaEnrollFactorId){ msg.textContent = "Pehle 'Set up' button se QR code lein."; msg.className = "msg err"; return; }
  const code = mfaCodeOf($("#mfaEnrollCode"));
  if (!code){ msg.textContent = "6-digit code likhein."; msg.className = "msg err"; return; }
  btn.disabled = true;
  msg.textContent = "Verify ho raha hai…"; msg.className = "msg";
  try {
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: mfaEnrollFactorId, code });
    if (error) throw new Error(error.message || "Code ghalat ya expire ho gaya");
    msg.textContent = "✅ MFA on ho gaya — dashboard khul raha hai…"; msg.className = "msg ok";
    const done = mfaGateDone; mfaGateDone = null;
    if (done) await done();
  } catch (e) {
    msg.textContent = "Error: " + (e && e.message ? e.message : "Code ghalat ya expire ho gaya — dobara try karein."); msg.className = "msg err";
  } finally { btn.disabled = false; }
};
$("#mfaChallengeBtn").onclick = async () => {
  const msg = $("#mfaChallengeMsg"), btn = $("#mfaChallengeBtn");
  const factors = await mfaListTotp();
  if (!factors.length){ msg.textContent = "Koi enrolled authenticator nahi mila — pehle set up karein."; msg.className = "msg err"; return; }
  const sel = $("#mfaFactorSelect");
  const factorId = (sel && sel.value) || factors[0].id;
  const code = mfaCodeOf($("#mfaChallengeCode"));
  if (!code){ msg.textContent = "6-digit code likhein."; msg.className = "msg err"; return; }
  btn.disabled = true;
  msg.textContent = "Verify ho raha hai…"; msg.className = "msg";
  try {
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) throw new Error(error.message || "Code ghalat ya expire ho gaya");
    msg.textContent = "✅ Verify ho gaya — dashboard khul raha hai…"; msg.className = "msg ok";
    const done = mfaGateDone; mfaGateDone = null;
    if (done) await done();
  } catch (e) {
    msg.textContent = "Error: " + (e && e.message ? e.message : "Code ghalat ya expire ho gaya — dobara try karein."); msg.className = "msg err";
  } finally { btn.disabled = false; }
};
/* Enter dabane se bhi verify ho (code input par). */
["#mfaChallengeCode", "#mfaEnrollCode"].forEach(s => {
  const el = $(s);
  if (el) el.addEventListener("keydown", e => {
    if (e.key === "Enter"){
      e.preventDefault();
      const btn = s === "#mfaChallengeCode" ? $("#mfaChallengeBtn") : $("#mfaEnrollVerifyBtn");
      if (btn && !btn.disabled) btn.click();
    }
  });
});
let STORE_ALLOWED_THEMES = null; /* is store ke liye allowed theme keys ([] = sab) */
function enterStore(store){
  STORE_ALLOWED_THEMES = store.allowed_themes;
  STORE_ID = store.id;
  STORE_SLUG = store.slug;
  STORE_NAME = store.name;
  MY_ROLE = store.role || null;
  try { sessionStorage.setItem("sn_admin_store", store.id); } catch (e) {}
  try {
    const u = new URL(location.href);
    if (u.searchParams.get("store") !== store.slug){ u.searchParams.set("store", store.slug); history.replaceState(null, "", u); }
  } catch (e) {}
  settingsLoaded = false;
  updateStoreHeader();
  showDash();
}
function updateStoreHeader(){
  const sel = $("#storeSwitcher");
  sel.innerHTML = MY_STORES.map(s => `<option value="${esc(s.id)}" ${s.id === STORE_ID ? "selected" : ""}>${esc(s.name)}</option>`).join("");
  $("#storeContext").classList.remove("hidden");
  $("#curStoreName").textContent = STORE_NAME || "";
  const roleEl = $("#curStoreRole");
  roleEl.textContent = MY_ROLE ? (MY_ROLE === "owner" ? "Owner" : MY_ROLE === "admin" ? "Admin" : "Staff") : "👑 Platform";
  roleEl.className = "pill " + (effRole() === "owner" ? "green" : "");
  $("#viewStoreLink").href = "index.html?store=" + encodeURIComponent(STORE_SLUG || "shopnest");
}
$("#storeSwitcher").addEventListener("change", e => {
  const store = MY_STORES.find(s => s.id === e.target.value);
  if (store && store.id !== STORE_ID) enterStore(store);
});
function showStorePicker(){
  $("#loginView").classList.add("hidden");
  $("#dashView").classList.add("hidden");
  $("#noAccessView").classList.add("hidden");
  $("#mfaView").classList.add("hidden");
  $("#storePickerView").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");
  $("#pickerEmail").textContent = MY_EMAIL || "";
  $("#pickerList").innerHTML = MY_STORES.map(s => `<button class="btn ghost store-pick" data-pick="${esc(s.id)}"><span><svg class="ic" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> <strong>${esc(s.name)}</strong> <small>/${esc(s.slug)}${s.status === "suspended" ? " • ⏸ suspended" : ""}</small></span><span class="pill ${s.role ? "green" : ""}">${s.role ? esc(s.role) : "<svg class='ic' viewBox='0 0 24 24'><circle cx='12' cy='8' r='7'/><polyline points='8.21 13.89 7 23 12 20 17 23 15.79 13.88'/></svg> platform"}</span></button>`).join("");
  $("#pickerList").querySelectorAll("[data-pick]").forEach(b => b.onclick = () => {
    const store = MY_STORES.find(s => s.id === b.dataset.pick);
    if (store) enterStore(store);
  });
}
function showNoAccess(email, storeName){
  $("#loginView").classList.add("hidden");
  $("#dashView").classList.add("hidden");
  $("#storePickerView").classList.add("hidden");
  $("#mfaView").classList.add("hidden");
  $("#noAccessView").classList.remove("hidden");
  $("#noAccessEmail").textContent = email || "";
  $("#logoutBtn").classList.remove("hidden");
  if (storeName){
    const p = $("#noAccessView").querySelector("p");
    if (p) p.innerHTML = `Aap <strong>${esc(email || "")}</strong> se login hain, lekin <strong>${esc(storeName)}</strong> store ki team mein shamil nahi hain. Us store ke <strong>owner se rabta karein</strong> — woh Team tab se aapka email add kar dein ge.`;
  }
}
/* HQ-A-14: domain section sirf owner/admin ko — staff ko note dikhao,
   failing control kabhi nahi. */
function applyDomainVisibility(){
  const box = $("#domainBox");
  const note = $("#domainStaffNote");
  const allowed = isAdminPlus();
  if (box) box.style.display = allowed ? "" : "none";
  if (note) note.hidden = allowed;
}
function showDash(){
  $("#loginView").classList.add("hidden");
  $("#noAccessView").classList.add("hidden");
  $("#storePickerView").classList.add("hidden");
  $("#mfaView").classList.add("hidden");
  $("#dashView").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");
  /* Role gating (current store ki role par, Module 3b): staff ab Categories/Coupons/Settings/Homepage/Appearance/Style/Content istemal kar sakta hai (real store work); Team Owner/Admin ko; Meta sirf Owner/Admin. */
  $("#tabTeam").classList.toggle("hidden", !(effRole() === "owner" || effRole() === "admin"));
  const adminOnlyTabs = ["tabMeta"]; /* V5 Phase 5: Meta tab sirf Owner/Admin — staff ko token fields kabhi nahi. */
  adminOnlyTabs.forEach(id => document.getElementById(id).classList.toggle("hidden", !isAdminPlus()));
  applyDomainVisibility(); /* HQ-A-14 */
  switchTab("dashboard");
  loadAll();
  if (!settingsLoaded) loadSettings();
}
$("#refreshBtn").onclick = loadAll;

async function loadAll(){
  await Promise.all([loadOrders(), loadProducts(), loadCategories()]);
  await loadDashboard();
  if (isAdminPlus()) loadDomain();
  loadCoupons();
  if (effRole() === "owner" || effRole() === "admin") loadTeam();
  tabRefreshArmed = true; /* boot ho gaya — ab tab switch par refresh chalega. */
}

/* ---------- Image upload (Supabase Storage: product-images) ---------- */
/* V3.6c: upload se pehle auto-compress — phone ki bari photo khud chhoti
   hokar upload hoti hai (lambi side max 1200px, JPEG quality 82%), taa ke
      Supabase storage + bandwidth ~10 guna kam lage. PNG ki transparency
         mehfooz rehti hai; GIF/SVG ko haath nahi lagaya jata. FAIL-OPEN: kisi
            bhi masle par original file hi upload hoti hai, upload kabhi nahi rukta. */
async function compressImage(file){
   const MAX = 1200, QUALITY = 0.82;
   try {
      if (!file || !String(file.type || "").startsWith("image/")) return file;
      if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
      let src = null, w = 0, h = 0, objUrl = "";
      try {
         src = await createImageBitmap(file, { imageOrientation: "from-image" });
         w = src.width; h = src.height;
      } catch (e) {
         const img = await new Promise((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = () => reject(new Error("img"));
            objUrl = URL.createObjectURL(file);
            im.src = objUrl;
         });
         src = img; w = img.naturalWidth; h = img.naturalHeight;
      }
      if (!w || !h) return file;
      const scale = Math.min(1, MAX / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
      const cv = document.createElement("canvas");
      cv.width = cw; cv.height = ch;
      const ctx = cv.getContext("2d");
      if (file.type !== "image/png"){ ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cw, ch); }
      ctx.drawImage(src, 0, 0, cw, ch);
      if (src && src.close) src.close();
      if (objUrl) URL.revokeObjectURL(objUrl);
      const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise(res => cv.toBlob(res, outType, QUALITY));
      if (!blob || blob.size >= file.size) return file;
      const ext = outType === "image/png" ? "png" : "jpg";
      return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: outType });
   } catch (e) { return file; }
}
function fmtSize(b){
     b = Number(b || 0);
     if (b < 1024) return b + " B";
     if (b < 1024 * 1024) return Math.round(b / 1024) + " KB";
     return (b / 1048576).toFixed(1) + " MB";
}
/* Aakhri upload ki size report — product form upload ke baad dikhata hai
   ke compression lagi ya nahi (original → uploaded). */
let LAST_UPLOAD_INFO = null;
async function uploadImage(file, folder){
  if (!file) throw new Error("Koi image file select nahi hui.");
  /* HEIC (iPhone ki default photo format) browser mein dikhayi nahi deta —
     is liye isay chup-chap upload karke kharab image banane ke bajaye
     foran saaf message ke saath roka jata hai. */
  if (/\.hei[cf]$/i.test(file.name || "") || file.type === "image/heic" || file.type === "image/heif") throw new Error("Ye photo HEIC format mein hai (iPhone ki default setting) — browser isay dikha nahi sakta, is liye upload rok di gayi hai. iPhone par Settings → Camera → Formats → 'Most Compatible' select karein, ya photo ko JPG mein convert karke dobara upload karein.");
  if (!String(file.type || "").startsWith("image/")) throw new Error("Sirf image file select karein.");
   const up = await compressImage(file);
     LAST_UPLOAD_INFO = { before: file.size, after: up.size };
  /* DEC-20(c) / FE-P3: 2 MB max upload size — compression ke baad bhi
     2 MB se bara ho to upload rok dein (storage + mobile load). Original
     file par check nahi (compression aksar 5 MB photo ko bhi ~500 KB kar
     deta hai) — check sirf asal upload payload par hai. */
  if (up.size > 2 * 1024 * 1024) throw new Error("Ye photo 2 MB se bari hai (compression ke baad bhi " + fmtSize(up.size) + ") — chhoti photo use karein ya image ko resize karke dobara upload karein.");
  const match = String(up.name || "").match(/\.([a-zA-Z0-9]+)$/);
  const ext = match ? "." + match[1].toLowerCase() : "";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  const path = `${STORE_ID}/${folder}/${uniqueName}`;
  const { error } = await sb.storage.from("product-images").upload(path, up, { upsert: true, contentType: up.type });
  if (error) throw error;
  const { data } = sb.storage.from("product-images").getPublicUrl(path);
  if (!data || !data.publicUrl) throw new Error("Upload ke baad public URL nahi mila.");
  return data.publicUrl;
}
function setUploadMsg(el, text, kind = ""){
  if (!el) return;
  el.textContent = text;
  el.className = "upload-msg" + (kind ? " " + kind : "");
}
/* ---------- Global toast (har kaam par khoobsurat success/fail popup) ---------- */
function showToast(msg, kind = "ok"){
  let wrap = document.getElementById("toastWrap");
  if (!wrap){ wrap = document.createElement("div"); wrap.id = "toastWrap"; document.body.appendChild(wrap); }
  const el = document.createElement("div");
  el.className = "toast " + (kind === "err" ? "err" : kind === "info" ? "info" : "ok");
  const icon = kind === "err" ? '<svg class="ic" viewBox="0 0 24 24" style="width:18px;height:18px;vertical-align:-3px"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' : kind === "info" ? '<svg class="ic" viewBox="0 0 24 24" style="width:18px;height:18px;vertical-align:-3px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' : '<svg class="ic" viewBox="0 0 24 24" style="width:18px;height:18px;vertical-align:-3px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  el.innerHTML = `<span>${icon}</span><span style="flex:1">${esc(String(msg))}</span><button type="button" aria-label="Band karein">✕</button>`;
  el.querySelector("button").onclick = () => el.remove();
  wrap.appendChild(el);
  setTimeout(() => el.remove(), (kind === "err" || kind === "info") ? 7000 : 4500);
}

/* ---------- Orders ---------- */
/* Naye orders mein items ek OBJECT hai { lines, coupon, discount };
   purane orders plain ARRAY thay. Dono ko lines ki list mein normalize karein. */
function orderLines(o){
  if (Array.isArray(o && o.items)) return o.items;
  if (o && o.items && Array.isArray(o.items.lines)) return o.items.lines;
  return [];
}
function orderMeta(o){
  if (o && o.items && !Array.isArray(o.items)) return { coupon: o.items.coupon || null, discount: Number(o.items.discount) || 0 };
  return { coupon: null, discount: 0 }; } /* V3.9: order line label — variant (size/color) ke saath. */ function lineLabel(i){ const v = []; if (i.size) v.push("Size: " + i.size); if (i.color) v.push(i.color); return esc(i.name) + " × " + i.qty + (v.length? " <small>(" + v.map(esc).join(", ") + ")</small>": "");} function lineLabelPlain(i){ const v = []; if (i.size) v.push("Size: " + i.size); if (i.color) v.push(i.color); return i.name + " x" + i.qty + (v.length? " (" + v.join(", ") + ")": "");}
async function loadOrders(){
  const { data, error } = await sb.from("orders").select("*").eq("store_id", STORE_ID).order("id", { ascending: false });
  const wrap = $("#ordersWrap");
  if (error){ wrap.innerHTML = `<p class="empty-note">Orders load nahi ho sakay: ${esc(error.message)}</p>`; ORDERS_CACHE = []; renderOrderStats(); return; }
  ORDERS_CACHE = data || [];
  /* D-1: stats mein deleted orders nahi ginte. */
  const visibleOrders = ORDERS_CACHE.filter(o => !isDeletedOrder(o));
  $("#statOrders").textContent = visibleOrders.length;
  $("#statPending").textContent = visibleOrders.filter(o => o.status === "Pending").length;
  /* L-4: revenue = Delivered AUR paid. payment_status field maujood na ho to
     purana hisaab (sirf Delivered) — server migration ke baad hi paid-only. */
  const deliveredOrders = visibleOrders.filter(o => o.status === "Delivered");
  const paidDelivered = deliveredOrders.filter(o => !hasPaymentField(o) || isPaidOrder(o));
  const unpaidDelivered = deliveredOrders.filter(o => hasPaymentField(o) && !isPaidOrder(o));
  const revEl = $("#statRevenue");
  revEl.textContent = fmt(paidDelivered.reduce((s,o) => s + Number(o.total || 0), 0));
  revEl.title = unpaidDelivered.length
    ? ("Delivered lekin cash nahi mila: " + fmt(unpaidDelivered.reduce((s,o) => s + Number(o.total || 0), 0)) + " (" + unpaidDelivered.length + " orders)")
    : "";
  renderOrderStats();
  renderOrders();
}
/* Orders tab ke upar wali stats strip: 6 cards + status ki stacked bar.
   Counts CURRENT store ke loaded orders (ORDERS_CACHE) se bante hain. */
function renderOrderStats(){
  /* D-1: stats mein deleted orders nahi ginte. */
  const rows = ORDERS_CACHE.filter(o => !isDeletedOrder(o));
  const counts = {};
  STATUSES.forEach(s => { counts[s] = rows.filter(o => o.status === s).length; });
  const total = rows.length;
  const statsEl = $("#orderStats");
  if (statsEl) statsEl.innerHTML = `<div class="ostat"><strong>${total}</strong><span>Kul Orders</span></div>`
    + STATUSES.map(s => `<div class="ostat"><strong style="color:${STATUS_COLORS[s]}">${counts[s]}</strong><span>${s}</span></div>`).join("");
  const stackEl = $("#orderStack");
  if (stackEl) stackEl.innerHTML = total
    ? STATUSES.filter(s => counts[s] > 0).map(s => `<div style="width:${(counts[s] / total * 100).toFixed(2)}%;background:${STATUS_COLORS[s]}" title="${s}: ${counts[s]}"></div>`).join("")
    : "";
  const legendEl = $("#orderStackLegend");
  if (legendEl) legendEl.innerHTML = total
    ? STATUSES.map(s => `<span><i style="background:${STATUS_COLORS[s]}"></i>${s}: ${counts[s]} (${Math.round(counts[s] / total * 100)}%)</span>`).join("")
    : `<span>Abhi tak koi order nahi aaya.</span>`;
}
/* L-4: Delivered order par "cash collected" checkbox. Field server se na
   aaye to ye function kabhi call nahi hota (column hi nahi banta). Paid ko
   wapas unpaid sirf owner/admin kar sakta hai (staff ka checkbox disabled). */
function paymentCellHtml(o){
  if (!hasPaymentField(o)) return "—";
  if (isDeletedOrder(o)) return "—"; /* soft-deleted order ka payment nahi badalte — RPC deleted_at check nahi karta */
  if (o.status !== "Delivered") return isPaidOrder(o) ? "✅ Paid" : "—";
  const paid = isPaidOrder(o);
  const lock = paid && effRole() === "staff";
  return `<label style="display:flex;gap:5px;align-items:center;cursor:pointer;font-size:13px;white-space:nowrap"><input type="checkbox" data-pay="${o.id}" ${paid ? "checked" : ""} ${lock ? "disabled" : ""} style="width:17px;height:17px"> ${paid ? "✅ Cash mila" : "Cash mila?"}</label>`;
}
/* FE-P1: orders pager (50/page) — #ordersPager div mein. */
function renderOrdersPager(total){
  const el = $("#ordersPager");
  if (!el) return;
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  if (ORDERS_PAGE > pages) ORDERS_PAGE = pages;
  if (total <= ADMIN_PAGE_SIZE){ el.innerHTML = ""; return; }
  el.innerHTML = `<div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap"><button class="btn small ghost" id="ordersPrevBtn" type="button" ${ORDERS_PAGE <= 1 ? "disabled" : ""}>← Pichla</button><span style="font-size:13.5px;font-weight:600">Page ${ORDERS_PAGE} / ${pages} (${total} orders)</span><button class="btn small ghost" id="ordersNextBtn" type="button" ${ORDERS_PAGE >= pages ? "disabled" : ""}>Agla →</button></div>`;
  const prev = $("#ordersPrevBtn"); if (prev) prev.onclick = () => { if (ORDERS_PAGE > 1){ ORDERS_PAGE--; renderOrders(); } };
  const next = $("#ordersNextBtn"); if (next) next.onclick = () => { if (ORDERS_PAGE < pages){ ORDERS_PAGE++; renderOrders(); } };
}
function renderOrders(){
  const wrap = $("#ordersWrap");
  const q = ($("#orderSearch").value || "").trim().toLowerCase();
  const sf = $("#orderStatusFilter").value || "";
  /* D-1: aam view mein deleted orders chhupe hote hain; "Deleted orders"
     view mein SIRF deleted dikhte hain (restore ke saath). */
  const pool = ORDERS_CACHE.filter(o => SHOW_DELETED_ORDERS ? isDeletedOrder(o) : !isDeletedOrder(o));
  const list = pool.filter(o =>
    (!sf || o.status === sf) &&
    (!q || String(o.customer_name || "").toLowerCase().includes(q) || String(o.phone || "").includes(q)));
  if (!ORDERS_CACHE.length){ wrap.innerHTML = `<p class="empty-note">Abhi tak koi order nahi aaya.</p>`; renderOrdersPager(0); return; }
  if (!list.length){ wrap.innerHTML = `<p class="empty-note">${SHOW_DELETED_ORDERS ? "Koi deleted order nahi hai." : (!pool.length ? "Saare orders deleted hain — 'Deleted orders dikhayein' se dekhein." : "Is search/filter par koi order nahi mila.")}</p>`; renderOrdersPager(0); return; }
  /* FE-P1: 50/page. */
  const pages = Math.max(1, Math.ceil(list.length / ADMIN_PAGE_SIZE));
  if (ORDERS_PAGE > pages) ORDERS_PAGE = pages;
  const pageList = list.slice((ORDERS_PAGE - 1) * ADMIN_PAGE_SIZE, ORDERS_PAGE * ADMIN_PAGE_SIZE);
  /* L-4: payment column sirf tab jab data mein payment_status field ho. */
  const showPayCol = list.some(hasPaymentField);
  wrap.innerHTML = `<table>
    <thead><tr><th>#</th><th>Customer</th><th>Phone / City</th><th>Address</th><th>Items</th><th>Total</th><th>Status</th>${showPayCol ? "<th>Payment</th>" : ""}<th></th></tr></thead>
    <tbody>${pageList.map(o => { const lines = orderLines(o); const meta = orderMeta(o); return `<tr data-order="${o.id}">
      <td><strong>#${o.id}</strong><br><small style="color:var(--muted)">${new Date(o.created_at).toLocaleString("en-PK",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}</small></td>
      <td><strong>${esc(o.customer_name)}</strong></td>
      <td>${esc(o.phone)}<br><small style="color:var(--muted)">${esc(o.city)}</small></td>
      <td style="max-width:170px">${esc(o.address)}</td>
      <td class="order-items">${lines.map(lineLabel).join("<br>")}${lines.some(i => i.delivery_fee !== undefined) ? `<br><small>Delivery: ${(() => { const d = lines.reduce((s,i) => s + (Number(i.delivery_fee)||0), 0); return d === 0 ? "FREE" : fmt(d); })()}</small>` : ""}${meta.coupon ? `<br><small>🎟️ Coupon ${esc(meta.coupon)}: −${fmt(meta.discount)}</small>` : ""}</td>
      <td><strong>${fmt(o.total)}</strong></td>
      <td><select class="status" data-status="${o.id}">${STATUSES.map(s => `<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></td>
      ${showPayCol ? `<td>${paymentCellHtml(o)}</td>` : ""}
      <td style="white-space:nowrap">${SHOW_DELETED_ORDERS
        ? (effRole() === "owner" ? `<button class="btn small" data-restore-order="${o.id}">↩ Restore</button>` : "")
        : `<button class="btn small ghost" data-edit-order="${o.id}">✎ Edit</button>${effRole() === "owner" ? ` <button class="btn small danger" data-del-order="${o.id}">Delete</button>` : ""}`}</td>
    </tr>`; }).join("")}</tbody></table>`;
  wrap.querySelectorAll("[data-edit-order]").forEach(b => b.onclick = () => openOrderEdit(+b.dataset.editOrder));
  wrap.querySelectorAll("tbody tr[data-order]").forEach(tr => tr.onclick = e => {
    if (e.target.closest("button, select, input, a, label")) return;
    openOrderDetails(+tr.dataset.order);
  });
  wrap.querySelectorAll("[data-status]").forEach(sel => sel.onchange = async () => {
    const { error } = await sb.rpc("update_order_status", { p_order_id: +sel.dataset.status, p_status: sel.value });
    if (error) showToast("Status update fail: " + error.message, "err"); else { await loadOrders(); loadDashboard(); showToast("✅ Order status update ho gaya.", "ok"); }
  });
  wrap.querySelectorAll("[data-del-order]").forEach(b => b.onclick = async () => {
    /* D-1: soft-delete — order list se hat jayega lekin restore ho sakega
       (Deleted orders view se). Server migration (deleted_at + restore_order)
       apply hone ke baad hi ye soft-delete hai; us se pehle delete_order RPC
       ka maujooda server behaviour chalta hai. */
    if (!confirm("Yeh order delete kar dein? Order list se hat jayega lekin restore ho sakega — 'Deleted orders' view se wapas la sakte hain.")) return;
    const id = +b.dataset.delOrder;
    const msg = $("#ordersMsg");
    b.disabled = true; b.textContent = "Deleting…";
    msg.textContent = `Order #${id} delete ho raha hai…`; msg.className = "msg";
    try {
      /* Module 3b: delete sirf Owner — delete_order RPC (audited); direct
         delete ab Owner-only policy par bhi band hai. */
      const { data: ok, error } = await sb.rpc("delete_order", { p_order_id: id });
      if (error) throw error;
      if (!ok) throw new Error("Order delete nahi hua — sirf Owner delete kar sakta hai.");
      msg.textContent = `✅ Order #${id} delete ho gaya (soft-delete — Deleted orders se restore ho sakta hai).`; msg.className = "msg ok";
      showToast(`✅ Order #${id} delete ho gaya (Deleted orders se restore ho sakta hai).`, "ok");
      await loadOrders(); loadDashboard();
    } catch (e) {
      msg.textContent = "Delete fail: " + e.message; msg.className = "msg err";
      showToast("Delete fail: " + e.message, "err");
      b.disabled = false; b.textContent = "Delete";
    }
  });
  wrap.querySelectorAll("[data-pay]").forEach(cb => cb.onchange = async () => {
    /* L-4 / DEC-15: payment_status — purpose-built RPC mark_payment_status (migration 07).
       Server enforces: Delivered required to mark paid; staff may mark paid; only owner/admin
       may reverse. Direct REST update is revoked (Module 3b) — never use it here. */
    const id = +cb.dataset.pay;
    const paid = cb.checked;
    cb.disabled = true; /* double-click / duplicate request rokein */
    const { data: ok, error } = await sb.rpc("mark_payment_status", { p_order_id: id, p_collected: paid });
    if (error || ok !== true){
      cb.checked = !paid; /* persisted state wapis (RPC ne kuch nahi badla) */
      cb.disabled = false;
      showToast("Payment status save nahi ho saka: " + (error ? error.message : "server ne confirm nahi kiya"), "err");
      return;
    }
    const row = ORDERS_CACHE.find(x => x.id === id); if (row) row.payment_status = paid ? "paid" : "unpaid";
    showToast(paid ? "✅ Cash mil gaya — payment paid mark ho gaya." : "Payment wapas unpaid kar diya gaya.", "ok");
    cb.disabled = false;
    await loadOrders(); loadDashboard();
  });
  wrap.querySelectorAll("[data-restore-order]").forEach(b => b.onclick = async () => {
    /* D-1: restore — server par restore_order RPC migration ke saath aayega;
       na ho to saaf error, kuch nahi toot-ta. */
    const id = +b.dataset.restoreOrder;
    if (!confirm(`Order #${id} restore kar dein? Ye dobara orders list mein aa jayega.`)) return;
    const { error } = await sb.rpc("restore_order", { p_order_id: id });
    if (error){ showToast("Restore nahi ho saka: " + error.message + " (server par restore abhi available nahi — migration apply nahi hui).", "err"); return; }
    showToast(`✅ Order #${id} restore ho gaya.`, "ok");
    await loadOrders(); loadDashboard();
  });
  renderOrdersPager(list.length);
}
$("#orderSearch").addEventListener("input", () => { ORDERS_PAGE = 1; renderOrders(); });
$("#orderStatusFilter").addEventListener("change", () => { ORDERS_PAGE = 1; renderOrders(); });
const _showDeletedToggle = $("#showDeletedOrders");
if (_showDeletedToggle) _showDeletedToggle.addEventListener("change", e => { SHOW_DELETED_ORDERS = e.target.checked; ORDERS_PAGE = 1; renderOrders(); });

/* ---------- Order Edit (modal) ----------
   Orders table mein koi note/delivery_fee/discount COLUMN nahi hai:
   delivery fee har item line ke andar (delivery_fee) hoti hai, aur
   coupon + discount items JSON ke meta mein ({lines, coupon, discount}).
   Purane orders plain array hain — save par shape mehfooz rakhi jati hai
   (discount/coupon ho to object shape mein convert ho jata hai). */
let OE_ID = null;
let OE_COUPON = null;
let OE_ORIG = null; /* HQ-A-10: load hua order — save sirf BADLE hue fields bhejta hai. */
function openOrderEdit(id){
  const o = ORDERS_CACHE.find(x => x.id === id);
  if (!o) return;
  OE_ID = id;
  OE_ORIG = JSON.parse(JSON.stringify(o)); /* HQ-A-10: diff isi se banta hai. */
  const meta = orderMeta(o);
  OE_COUPON = meta.coupon;
  $("#oeTitle").textContent = "#" + o.id;
  /* Module 3b: financial section (items/discount/total) sirf Owner ko — staff/admin ko sirf details nazar aati hain. */
  const finSec = $("#oeFinancialSection");
  if (finSec) finSec.classList.toggle("hidden", effRole() !== "owner");
  $("#oeName").value = o.customer_name || "";
  $("#oePhone").value = o.phone || "";
  $("#oeCity").value = o.city || "";
  $("#oeAddress").value = o.address || "";
  /* V3 Part B: tracking note (orders.tracking_note) */
  if ($("#oeTrackNote")) $("#oeTrackNote").value = o.tracking_note || "";
  $("#oeStatus").innerHTML = STATUSES.map(s => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("");
  $("#oeDiscount").value = meta.discount || 0;
  $("#oeItems").innerHTML = "";
  const lines = orderLines(o);
  (lines.length ? lines : [{}]).forEach(l => addOeItemRow(l));
  oeRecalc();
  /* Total mein pehle order ka MAUJOODA total dikhao (sirf display — save par
     server items se total dobara hisaab karega). */
  $("#oeTotal").value = o.total ?? 0;
  $("#oeMsg").textContent = ""; $("#oeMsg").className = "msg";
  /* M24 (§2.9, same release): staff sirf status badal sakta hai — PII/details
     inputs staff ke liye disabled. Server bhi rokta hai (staff payload mein
     sirf p_order_id + p_status hota hai); UI mein bhi dikhna chahiye, warna
     staff ki edit silently drop ho jati ("Koi change nahi"). */
  const staffNoPii = effRole() === "staff";
  ["#oeName", "#oePhone", "#oeCity", "#oeAddress", "#oeTrackNote"].forEach(sel => {
    const el = $(sel);
    if (el) el.disabled = staffNoPii;
  });
  $("#orderEditModal").classList.remove("hidden");
}
function addOeItemRow(l = {}){
  const row = document.createElement("div");
  row.className = "oe-item";
  if (l.id !== undefined && l.id !== null) row.dataset.pid = l.id;
  row.innerHTML = `<input type="text" data-oe="name" value="${esc(l.name || "")}" placeholder="Product naam">
    <input type="number" data-oe="qty" min="0" value="${l.qty ?? 1}">
    <input type="number" data-oe="price" min="0" value="${l.price ?? 0}">
    <input type="number" data-oe="fee" min="0" value="${l.delivery_fee ?? 0}">
    <input type="text" data-oe="size" value="${esc(l.size || "")}" placeholder="Size"> <input type="text" data-oe="color" value="${esc(l.color || "")}" placeholder="Color"> <button class="btn small danger" type="button" data-oe-del title="Item hatayein">✕</button>`;
  row.querySelectorAll("input").forEach(inp => inp.addEventListener("input", oeRecalc));
  row.querySelector("[data-oe-del]").onclick = () => { row.remove(); oeRecalc(); };
  $("#oeItems").appendChild(row);
}
function oeReadItems(){
  return [...$("#oeItems").querySelectorAll(".oe-item")].map(r => {
    const g = k => r.querySelector(`[data-oe="${k}"]`).value;
    const item = {
      name: g("name").trim(),
      qty: Math.max(0, parseInt(g("qty")) || 0),
      price: Math.max(0, parseInt(g("price")) || 0),
      delivery_fee: Math.max(0, parseInt(g("fee")) || 0), size: g("size").trim(), color: g("color").trim()
    };
    if (r.dataset.pid) item.id = isNaN(+r.dataset.pid) ? r.dataset.pid : +r.dataset.pid;
    /* Checkout wali line shape: { id, name, price, qty, delivery_fee } + V3.9 size/color (hon to). */
    const out = item.id !== undefined
      ? { id: item.id, name: item.name, price: item.price, qty: item.qty, delivery_fee: item.delivery_fee }
      : { name: item.name, price: item.price, qty: item.qty, delivery_fee: item.delivery_fee }; if (item.size) out.size = item.size; if (item.color) out.color = item.color; return out;
  }).filter(i => i.name || i.price > 0 || i.qty > 0);
}
/* [FLAT-FEE] Same rule as the storefront: flat fee from SETTINGS_STATE, else once per distinct product. */
function flatDeliveryFeeAdmin(){ const f = (typeof SETTINGS_STATE !== "undefined" && SETTINGS_STATE) ? SETTINGS_STATE.delivery_fee_flat : null; return (typeof f === "number" && isFinite(f) && f >= 0) ? Math.floor(f) : null; }
function orderDeliveryFee(items){
  const flat = flatDeliveryFeeAdmin();
  if (flat !== null) return items.length ? flat : 0;
  const seen = new Set();
  return items.reduce((s, i) => { const id = (i.id !== undefined && i.id !== null) ? String(i.id) : null; if (id !== null) { if (seen.has(id)) return s; seen.add(id); } return s + (Number(i.delivery_fee) || 0); }, 0);
}
function oeComputed(){
  const items = oeReadItems();
  const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
  const del = orderDeliveryFee(items);
  const disc = Math.max(0, parseInt($("#oeDiscount").value) || 0);
  return { items, sub, del, disc, total: Math.max(0, sub + del - disc) };
}
function oeRecalc(){
  const c = oeComputed();
  $("#oeTotal").value = c.total;
  $("#oeCalcNote").textContent = `Hisaab: Items ${fmt(c.sub)} + Delivery ${fmt(c.del)} − Discount ${fmt(c.disc)} = ${fmt(c.total)}${OE_COUPON ? ` • 🎟️ Coupon: ${OE_COUPON}` : ""} • Total server hisaab karega (haath se nahi badal sakta)`;
}

$("#oeDiscount").addEventListener("input", oeRecalc);
$("#oeAddItem").onclick = () => { addOeItemRow({}); oeRecalc(); };
$("#oeCancelBtn").onclick = () => $("#orderEditModal").classList.add("hidden");
/* M24 fallback helper: PostgREST returns 404 / code PGRST202 ("Could not
   find the function ...") when an RPC does not exist (e.g. update_order_all
   after an M24 rollback). Any other RPC error is a real failure, not a
   missing function — sirf is case mein fallback chalta hai. */
function isRpcFunctionNotFound(err){
  if (!err) return false;
  if (err.code === "PGRST202") return true;
  return /could not find the function/i.test(String(err.message || ""));
}
$("#orderEditModal").addEventListener("click", e => { if (e.target.id === "orderEditModal") e.currentTarget.classList.add("hidden"); });
$("#oeSaveBtn").onclick = async () => {
  if (OE_ID == null) return;
  const btn = $("#oeSaveBtn");
  const msg = $("#oeMsg");
  const orig = ORDERS_CACHE.find(x => x.id === OE_ID);
  const c = oeComputed();
  const hasMeta = c.disc > 0 || !!OE_COUPON;
  const items = (orig && Array.isArray(orig.items) && !hasMeta)
    ? c.items
    : { lines: c.items, coupon: OE_COUPON, discount: c.disc };
  const customer_name = $("#oeName").value.trim();
  if (!customer_name){ msg.textContent = "Customer name khaali nahi ho sakta."; msg.className = "msg err"; return; }
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    /* HQ-A-10: sirf BADLE hue hisse save karte hain (loaded order se diff).
       M24 (same release, findings §2.9 + D-19): staff save ek hi atomic
       `update_order_all` RPC se hota hai — payload mein sirf p_order_id +
       p_status (status badla ho to); details/financials/reason staff kabhi
       nahi bhejta. Owner/admin teen alag RPCs se save karte hain (neeche).
       Agar `update_order_all` na mile (PostgREST 404 — e.g. M24 rollback
       ke baad), to staff bhi teen purane RPCs par wapas chala jata hai
       (neeche fallback) — teeno RPCs is liye barkarar hain. */
    const isStaff = effRole() === "staff";
    const origMeta = OE_ORIG ? orderMeta(OE_ORIG) : { coupon: null, discount: 0 };
    const newDetails = {
      p_customer_name: customer_name,
      p_phone: $("#oePhone").value.trim(),
      p_city: $("#oeCity").value.trim(),
      p_address: $("#oeAddress").value.trim(),
      p_tracking_note: $("#oeTrackNote") ? $("#oeTrackNote").value.trim() : null
    };
    let detailsChanged = !OE_ORIG
      || newDetails.p_customer_name !== (OE_ORIG.customer_name || "")
      || newDetails.p_phone !== (OE_ORIG.phone || "")
      || newDetails.p_city !== (OE_ORIG.city || "")
      || newDetails.p_address !== (OE_ORIG.address || "")
      || (newDetails.p_tracking_note || "") !== (OE_ORIG.tracking_note || "");
    /* M24 switch (§2.9): staff ke liye detailsChanged force false — staff
       PII edit nahi kar sakta, is liye details payload mein nahi aati. */
    if (isStaff) detailsChanged = false;
    const newStatus = $("#oeStatus").value;
    const statusChanged = !OE_ORIG || newStatus !== OE_ORIG.status;
    const finChanged = effRole() === "owner" && (!OE_ORIG
      || JSON.stringify(items) !== JSON.stringify(OE_ORIG.items) || c.disc !== (origMeta.discount || 0));
    if (!detailsChanged && !statusChanged && !finChanged){
      msg.textContent = "Koi change nahi — kuch save nahi kiya gaya.";
      msg.className = "msg";
      btn.disabled = false; btn.innerHTML = `<svg class="ic" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg> Order Save karein`;
      return;
    }
    /* M24 staff path: sirf status — atomic update_order_all. Agar function
       nahi mila (PostgREST 404 / PGRST202 — M24 rollback ke baad), to
       neeche teen purane RPCs par wapas chale jayen (FALLBACK, explicit). */
    let savedViaAll = false;
    if (isStaff && statusChanged){
      const r = await sb.rpc("update_order_all", { p_order_id: OE_ID, p_status: newStatus });
      if (r.error && isRpcFunctionNotFound(r.error)){
        /* update_order_all absent — fall through to the three old RPCs. */
      } else if (r.error){
        throw r.error;
      } else {
        savedViaAll = true;
      }
    }
    if (!savedViaAll){
      if (detailsChanged){
        let r = await sb.rpc("update_order_details", { p_order_id: OE_ID, ...newDetails });
        if (r.error) throw r.error;
      }
      if (statusChanged){
        let r = await sb.rpc("update_order_status", { p_order_id: OE_ID, p_status: newStatus });
        if (r.error) throw r.error;
      }
      if (finChanged){
        let r = await sb.rpc("update_order_financials", { p_order_id: OE_ID, p_items: items, p_discount: c.disc });
        if (r.error) throw r.error;
      }
    }
    $("#orderEditModal").classList.add("hidden");
    const om = $("#ordersMsg");
    om.textContent = `✅ Order #${OE_ID} update ho gaya.`; om.className = "msg ok";
    showToast(`✅ Order #${OE_ID} update ho gaya.`, "ok");
    await loadOrders(); loadDashboard();
  } catch (e) {
    msg.textContent = "Order save fail: " + e.message; msg.className = "msg err";
    showToast("Order save fail: " + e.message, "err");
  } finally {
    btn.disabled = false; btn.innerHTML = `<svg class="ic" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg> Order Save karein`;
  }
};

/* ------------ Order Details (read-only modal) ------------
   Orders tab ki row par click → popup mein order ki poori detail.
   Read-only hai – kuch save nahi hota; Edit button maujooda
   #orderEditModal kholta hai. Data ORDERS_CACHE se aata hai. */
let OD_ID = null;
function closeOrderDetails(){
  OD_ID = null;
  const m = $("#orderDetailsModal");
  if (m) m.classList.add("hidden");
}
function openOrderDetails(id){
  const o = ORDERS_CACHE.find(x => x.id === id);
  if (!o) return;
  if (!$("#orderDetailsModal") || !$("#odBody") || !$("#odTitle")) return;
  OD_ID = id;
  const lines = orderLines(o);
  const meta = orderMeta(o);
  const sub = lines.reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);
  const del = orderDeliveryFee(lines);
  const disc = meta.discount || 0;
  const computed = Math.max(0, sub + del - disc);
  const storedTotal = Number(o.total) || 0;
  const hasFee = lines.some(l => l.delivery_fee !== undefined && l.delivery_fee !== null);
  const dateStr = o.created_at ? new Date(o.created_at).toLocaleString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
  const pillColor = STATUS_COLORS[o.status] || "#64748b";
  $("#odTitle").textContent = "#" + o.id;
  $("#odBody").innerHTML = `<div class="od-kv">
    <div><small>Store</small><strong>${esc(STORE_NAME || STORE_SLUG || "—")}</strong></div>
    <div><small>Date</small><strong>${esc(dateStr)}</strong></div>
    <div><small>Status</small><span class="pill" style="background:${pillColor};color:#fff">${esc(o.status || "—")}</span></div>
    <div><small>Order ID</small><strong>#${esc(o.id)}</strong></div>
    <div><small>Customer</small><strong>${esc(o.customer_name || "—")}</strong></div>
    <div><small>Phone</small><strong>${esc(o.phone || "—")}</strong></div>
    <div><small>City</small><strong>${esc(o.city || "—")}</strong></div>
    <div class="wide"><small>Address</small><strong>${esc(o.address || "—")}</strong></div>
    <div class="wide"><small>Tracking note</small><strong>${esc(o.tracking_note || "—")}</strong></div>
  </div>
  <label style="font-size:12px;font-weight:700;color:var(--muted)">Items</label>
  ${lines.length ? `<div class="od-items"><div class="od-head"><span>Product</span><span>Qty × Price</span><span>Total</span></div>${lines.map(l => {
    const v = [];
    if (l.size) v.push("Size: " + l.size);
    if (l.color) v.push("Color: " + l.color);
    const fee = (l.delivery_fee !== undefined && l.delivery_fee !== null) ? `<small>Delivery: ${Number(l.delivery_fee) === 0 ? "FREE" : fmt(l.delivery_fee)}</small>` : "";
    return `<div class="od-item"><span class="od-name">${esc(l.name || "—")}${v.length ? `<small>(${v.map(esc).join(", ")})</small>` : ""}${fee}</span><span class="od-num">${Number(l.qty) || 0} × ${fmt(l.price)}</span><span class="od-num"><strong>${fmt((Number(l.price) || 0) * (Number(l.qty) || 0))}</strong></span></div>`;
  }).join("")}</div>` : `<p class="empty-note">Is order mein koi item nahi hai.</p>`}
  <div>
    <div class="od-sumrow"><span>Items subtotal</span><strong>${fmt(sub)}</strong></div>
    <div class="od-sumrow"><span>Delivery</span><strong>${hasFee ? (del === 0 ? "FREE" : fmt(del)) : "—"}</strong></div>
    ${disc > 0 ? `<div class="od-sumrow"><span>Discount${meta.coupon ? ` (🎟️ ${esc(meta.coupon)})` : ""}</span><strong>− ${fmt(disc)}</strong></div>` : ""}
    <div class="od-sumrow total"><span>Total</span><strong>${fmt(storedTotal)}</strong></div>
  </div>
  ${computed !== storedTotal ? `<p class="hint">Note: items ke hisaab se ${fmt(computed)} banta hai — Total haath se ${fmt(storedTotal)} likha gaya hai.</p>` : ""}`;
$("#orderDetailsModal").classList.remove("hidden");
const cb = $("#odCloseBtn");
if (cb) cb.focus({ preventScroll: true });
}
const odCloseBtn = $("#odCloseBtn");
if (odCloseBtn) odCloseBtn.onclick = () => closeOrderDetails();
const odEditBtn = $("#odEditBtn");
if (odEditBtn) odEditBtn.onclick = () => { const id = OD_ID; closeOrderDetails(); if (id != null) openOrderEdit(id); };
const odModal = $("#orderDetailsModal");
if (odModal) odModal.addEventListener("click", e => { if (e.target.id === "orderDetailsModal") closeOrderDetails(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeOrderDetails(); });

/* ---------- Products ---------- */
async function loadProducts(){
  const { data, error } = await sb.from("products").select("*").eq("store_id", STORE_ID).order("id", { ascending: true });
  const wrap = $("#productsWrap");
  if (error){ wrap.innerHTML = `<p class="empty-note">Products load nahi ho sakay: ${esc(error.message)}</p>`; return; }
  PRODUCTS_CACHE = data || [];
  $("#statProducts").textContent = PRODUCTS_CACHE.length;
  renderLowStock();
  refreshCatList();
  renderProductsList();
  /* Edit form khula ho to usay fresh data se dobara bhar dein (save ke baad). */
  if (EDITING_PRODUCT_ID != null){
    const p = PRODUCTS_CACHE.find(x => x.id === EDITING_PRODUCT_ID);
    if (p) fillProductForm(p); else closeProductForm();
  }
}
/* ---------- Bulk delete + Storage cleanup ---------- */
let BULK_SELECTED = new Set();
/* Product row delete + us ki (ghair-shared) images Storage se delete.
   Storage fail ho to bhi product delete hi rehta hai — sirf us image ki
   file reh jati hai (dobara delete par phir try hogi). Shared-image guard
   replace path wala hi hai (removeUnsharedStorageUrls): kisi doosre
   product, category ya settings mein lagi image kabhi delete nahi hoti;
   doosre store / bahar ki URL / uncertain path bhi mehfooz rehte hain. */
async function deleteProductAndImages(id){
  const p = PRODUCTS_CACHE.find(x => x.id === id);
  const { error } = await sb.from("products").delete().eq("id", id).eq("store_id", STORE_ID);
  if (error) throw error;
  if (!p) return { images: 0 };
  const urls = [];
  if (p.img) urls.push(p.img);
  if (Array.isArray(p.gallery)) urls.push(...p.gallery);
  if (!urls.length) return { images: 0 };
  /* D2-DELETE-GAP fix: delete path ab wahi shared-image guard istemal
     karta hai jo replace path karta hai — removeUnsharedStorageUrls
     (products + categories + settings, fail-closed, sirf apni-store
     paths). Is se category ya settings (hero/logo) mein lagi image
     delete nahi hoti, aur doosre store / bahar ki URL bhi mehfooz
     rehti hai. Record pehle delete hota hai, Storage safai us ke
     baad — delete fail ho to image barkarar rehti hai. */
  const cl = await removeUnsharedStorageUrls(urls, []);
  if (cl.failed) return { images: cl.removed, storageWarn: true };
  return { images: cl.removed };
}
/* ---------- Replace-orphan cleanup (L-19) ---------- */
/* Purani image URL(s) Storage se delete karein — SIRF jab wo kisi aur product
   (img/gallery) ya category (image) mein lagi na hon (shared-image guard —
   template copy D-6 shared references mehfooz rehti hain) aur nayi URL(s)
   mein shaamil na hon. Sirf is store ki apni "<STORE_ID>/..." paths chhooti
   hain (ownStoragePath); external URLs (Unsplash waghera), doosre store ki
   paths aur legacy be-prefix paths kabhi delete nahi hoti. Guard sirf
   products/categories nahi — settings (hero/luxury/blog/reels/logo) bhi
   parhta hai, aur guard read ke fail hone par kuch delete nahi karta
   (fail-closed — query error par data null aata hai, use ignore karna
   fail-open hota).
   Sirf successful DB save ke BAAD call karein — save fail ho to purani image
   barkarar rehti hai. Storage fail non-fatal hai ({ removed: 0, failed: true })
   — product/category save phir bhi kamyab rehta hai. deleteProductAndImages
   ab yehi helper istemal karta hai (D2-DELETE-GAP fix) — ek hi guard,
   dono raston par. */
/* Storage path sirf is store ki apni (current-format) object ka hona chahiye:
   "<STORE_ID>/..." se shuru ho, ".." ya backslash na ho, aur "?" / "#" ke baad
   kuch na ho. Doosre store ka path, legacy be-ghair-prefix path
   ("products/15/..." — Module 2 se pehle ke uploads) ya traversal jaisa path
   kabhi delete nahi hota (legacy objects orphan hi rehte hain — un ki cleanup
   alag owner-approved plan se hoti hai). */
function ownStoragePath(url){
  const s = String(url || "");
  const i = s.indexOf("/product-images/");
  if (i < 0) return null;
  const p = s.slice(i + "/product-images/".length).split("?")[0].split("#")[0];
  if (!p || !STORE_ID || !p.startsWith(STORE_ID + "/")) return null;
  if (p.split("/").includes("..") || p.includes("\\")) return null;
  return p;
}
/* Abhi-abhi upload hui (is liye kahin reference nahi ho sakti) URL(s) ko
   best-effort delete karein — failed save par nayi upload orphan na rahe.
   Kabhi throw nahi karta; sirf apni-store paths chhooti hain. */
async function removeOwnStorageUrls(urls){
  try {
    const paths = [...new Set((urls || []).map(ownStoragePath).filter(Boolean))];
    if (!paths.length) return 0;
    const { error } = await sb.storage.from("product-images").remove(paths);
    return error ? 0 : paths.length;
  } catch (e) { return 0; }
}
async function removeUnsharedStorageUrls(urls, keepUrls){
  const own = [];
  for (const u of (urls || [])){
    const s = String(u || "");
    const path = ownStoragePath(s);
    if (path) own.push({ url: s, path });
  }
  if (!own.length) return { removed: 0, failed: false };
  const keep = new Set((keepUrls || []).map(String));
  const drop = own.filter(o => !keep.has(o.url));
  if (!drop.length) return { removed: 0, failed: false };
  let refs = [];
  try {
    const { data: prods, error: pErr } = await sb.from("products").select("id,img,gallery");
    const { data: cats, error: cErr } = await sb.from("categories").select("image");
    const { data: settings, error: sErr } = await sb.from("settings").select("data");
    /* supabase-js query fail par throw NAHI karta — { data: null, error } deta
       hai. Error ko ignore karna fail-OPEN hota (refs khaali → sab delete);
       is liye kisi bhi guard read ke fail hone par kuch delete na karein. */
    if (pErr || cErr || sErr || !Array.isArray(prods) || !Array.isArray(cats) || !Array.isArray(settings)) return { removed: 0, failed: true };
    refs = [...prods.flatMap(x => [x.img, ...(Array.isArray(x.gallery) ? x.gallery : [])]),
            ...cats.map(c => c.image)];
    /* Settings-held references bhi guard karein: hero slides, luxury tiles /
       banners, collection pages, blog, reels poster/avatar aur logo — sab
       isi bucket ki URLs hain, aur template copy (HQ) inhein doosri store ki
       settings mein bhi copy kar deta hai. In mein lagi URL delete hui to
       hero/banner khaali ho jata hai. */
    const collect = (v) => {
      if (typeof v === "string"){ if (v.indexOf("/product-images/") >= 0) refs.push(v); }
      else if (Array.isArray(v)){ v.forEach(collect); }
      else if (v && typeof v === "object"){ Object.values(v).forEach(collect); }
    };
    settings.forEach(row => collect(row && row.data));
  } catch (e) { /* refs na milen to delete na karein — mehfooz rahein */ return { removed: 0, failed: true }; }
  const paths = [...new Set(drop.filter(o => !refs.includes(o.url)).map(o => o.path))];
  if (!paths.length) return { removed: 0, failed: false };
  const { error } = await sb.storage.from("product-images").remove(paths);
  if (error) return { removed: 0, failed: true };
  return { removed: paths.length, failed: false };
}
/* FE-P1: products pager (50/page) — #productsPager div mein. */
function renderProductsPager(total){
  const el = $("#productsPager");
  if (!el) return;
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  if (PRODUCTS_PAGE > pages) PRODUCTS_PAGE = pages;
  if (total <= ADMIN_PAGE_SIZE){ el.innerHTML = ""; return; }
  el.innerHTML = `<div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap"><button class="btn small ghost" id="productsPrevBtn" type="button" ${PRODUCTS_PAGE <= 1 ? "disabled" : ""}>← Pichla</button><span style="font-size:13.5px;font-weight:600">Page ${PRODUCTS_PAGE} / ${pages} (${total} products)</span><button class="btn small ghost" id="productsNextBtn" type="button" ${PRODUCTS_PAGE >= pages ? "disabled" : ""}>Agla →</button></div>`;
  const prev = $("#productsPrevBtn"); if (prev) prev.onclick = () => { if (PRODUCTS_PAGE > 1){ PRODUCTS_PAGE--; renderProductsList(); } };
  const next = $("#productsNextBtn"); if (next) next.onclick = () => { if (PRODUCTS_PAGE < pages){ PRODUCTS_PAGE++; renderProductsList(); } };
}
/* Products LIST (Shopify-style table) — Edit par upar wala card form khulta hai. */
function renderProductsList(){
  const wrap = $("#productsWrap");
    BULK_SELECTED = new Set([...BULK_SELECTED].filter(id => PRODUCTS_CACHE.some(p => p.id === id)));
  const q = ($("#prodSearch").value || "").trim().toLowerCase();
  const list = PRODUCTS_CACHE.filter(p => !q
    || String(p.name || "").toLowerCase().includes(q)
    || String(p.cat || "").toLowerCase().includes(q));
  $("#prodCount").textContent = PRODUCTS_CACHE.length ? `${list.length} / ${PRODUCTS_CACHE.length} products` : "";
  if (!PRODUCTS_CACHE.length){ wrap.innerHTML = `<p class="empty-note">Abhi koi product nahi hai — upar "Add New Product" se pehla product banayein.</p>`; renderProductsPager(0); return; }
  if (!list.length){ wrap.innerHTML = `<p class="empty-note">Is search par koi product nahi mila.</p>`; renderProductsPager(0); return; }
  /* FE-P1: 50/page (bulk select sirf is page ki rows par lagta hai). */
  const pages = Math.max(1, Math.ceil(list.length / ADMIN_PAGE_SIZE));
  if (PRODUCTS_PAGE > pages) PRODUCTS_PAGE = pages;
  const pageList = list.slice((PRODUCTS_PAGE - 1) * ADMIN_PAGE_SIZE, PRODUCTS_PAGE * ADMIN_PAGE_SIZE);
  wrap.innerHTML = `<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap"><label style="display:flex;gap:6px;align-items:center;cursor:pointer;font-weight:600;font-size:14px"><input type="checkbox" id="bulkCheckAll"> Sab select karein</label><span id="bulkCount" style="color:var(--muted);font-size:13.5px;font-weight:600"></span><button class="btn small danger" id="bulkDelBtn" type="button" disabled><svg class="ic" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Selected delete karein</button><span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;border-left:1.5px solid var(--line);padding-left:10px"><select id="bulkEditField" style="border:1.5px solid var(--line);border-radius:8px;padding:6px 8px;font-size:13px"><option value="">Bulk edit…</option><option value="stock-in">Stock → In Stock</option><option value="stock-out">Stock → Out of Stock</option><option value="live-on">Live → Show</option><option value="live-off">Live → Hide</option><option value="featured-on">Featured → On</option><option value="featured-off">Featured → Off</option><option value="price-up">Price → +% barhayein</option><option value="price-down">Price → -% kam karein</option></select><input id="bulkEditVal" type="number" min="1" max="90" placeholder="%" style="width:70px;border:1.5px solid var(--line);border-radius:8px;padding:6px 8px;font-size:13px;display:none"><button class="btn small" id="bulkEditBtn" type="button" disabled>Apply</button></span></div><table>
    <thead><tr><th></th><th>Photo</th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Live</th><th>Featured</th><th></th></tr></thead>
    <tbody>${pageList.map(p => `<tr>
      <td><input type="checkbox" data-bulk-check="${p.id}" ${BULK_SELECTED.has(p.id) ? "checked" : ""}></td>
      <td><img class="prod-thumb" src="${safeUrl(p.img || PLACEHOLDER_IMG)}" alt=""></td>
      <td><strong>${esc(p.name || "")}</strong><br><small style="color:var(--muted)">#${p.id}</small></td>
      <td>${esc(p.cat || "General")}</td>
      <td><strong>${fmt(p.price)}</strong>${p.old ? `<br><small style="color:var(--muted);text-decoration:line-through">${fmt(p.old)}</small>` : ""}</td>
      <td>${p.stock === "out" ? `<span class="pill grey"><svg class="ic" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Out of Stock</span>` : `<span class="pill green">In Stock</span>`}</td>
      <td>${p.active ? `<span class="pill green">Live</span>` : `<span class="pill grey">Hidden</span>`}</td>
      <td>${p.featured ? `<span class="star-on" title="Featured">★</span>` : `<span class="star-off" title="Featured nahi">★</span>`}</td>
      <td style="white-space:nowrap"><button class="btn small" data-edit-prod="${p.id}">✎ Edit</button> <button class="btn small danger" data-del-prod="${p.id}">Delete</button></td>
    </tr>`).join("")}</tbody></table>`;
  wrap.querySelectorAll("[data-edit-prod]").forEach(b => b.onclick = () => openProductForm(+b.dataset.editProd));
  /* Bulk select wiring — selection search badalne par bhi mehfooz rehti hai. */
  const bulkCount = wrap.querySelector("#bulkCount");
  const bulkBtn = wrap.querySelector("#bulkDelBtn");
  const checkAll = wrap.querySelector("#bulkCheckAll");
  /* Bulk edit controls — selection par stock/live/featured/price ek saath. */
  const editField = wrap.querySelector("#bulkEditField");
  const editVal = wrap.querySelector("#bulkEditVal");
  const editBtn = wrap.querySelector("#bulkEditBtn");
  const syncEditBtn = () => {
    const f = editField.value;
    const needPct = f === "price-up" || f === "price-down";
    editVal.style.display = needPct ? "" : "none";
    editBtn.disabled = !f || !BULK_SELECTED.size || (needPct && !(parseFloat(editVal.value) > 0));
  };
  const syncBulk = () => {
    const n = BULK_SELECTED.size;
    bulkCount.textContent = n ? `${n} selected` : "";
    bulkBtn.disabled = !n;
    bulkBtn.innerHTML = n ? `<svg class="ic" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> ${n} selected delete karein` : `<svg class="ic" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Selected delete karein`;
    const boxes = [...wrap.querySelectorAll("[data-bulk-check]")];
    checkAll.checked = boxes.length > 0 && boxes.every(b => BULK_SELECTED.has(+b.dataset.bulkCheck));
    checkAll.indeterminate = boxes.some(b => BULK_SELECTED.has(+b.dataset.bulkCheck)) && !checkAll.checked;
    syncEditBtn();
  };
  wrap.querySelectorAll("[data-bulk-check]").forEach(cb => cb.addEventListener("change", () => {
    const id = +cb.dataset.bulkCheck;
    if (cb.checked) BULK_SELECTED.add(id); else BULK_SELECTED.delete(id);
    syncBulk();
  }));
  checkAll.addEventListener("change", () => {
    wrap.querySelectorAll("[data-bulk-check]").forEach(cb => {
      const id = +cb.dataset.bulkCheck;
      if (checkAll.checked) BULK_SELECTED.add(id); else BULK_SELECTED.delete(id);
      cb.checked = checkAll.checked;
    });
    syncBulk();
  });
  editField.addEventListener("change", syncEditBtn);
  editVal.addEventListener("input", syncEditBtn);
  editBtn.onclick = async () => {
    const ids = [...BULK_SELECTED];
    const f = editField.value;
    if (!ids.length || !f) return;
    const pct = parseFloat(editVal.value) || 0;
    const label = editField.options[editField.selectedIndex].text;
    if (!confirm(`${ids.length} products par ye lagayein: ${label}${(f === "price-up" || f === "price-down") ? " (" + pct + "%)" : ""}?`)) return;
    editBtn.disabled = true; editBtn.textContent = "Applying…";
    let ok = 0, fail = 0;
    for (const id of ids){
      const p = PRODUCTS_CACHE.find(x => x.id === id);
      let patch = null;
      if (f === "stock-in") patch = { stock: "in" };
      else if (f === "stock-out") patch = { stock: "out" };
      else if (f === "live-on") patch = { active: true };
      else if (f === "live-off") patch = { active: false };
      else if (f === "featured-on") patch = { featured: true };
      else if (f === "featured-off") patch = { featured: false };
      else if ((f === "price-up" || f === "price-down") && p){
        const np = Math.max(0, Math.round((p.price || 0) * (f === "price-up" ? (1 + pct / 100) : (1 - pct / 100))));
        patch = { price: np };
      }
      if (!patch){ fail++; continue; }
      const { error } = await sb.from("products").update(patch).eq("id", id).eq("store_id", STORE_ID);
      if (error) fail++; else ok++;
    }
    await loadProducts(); /* J2: bulk edit ke baad list fresh ho — await karein, warna toast pehle aur list baad mein update hoti hai. */
    if (fail) showToast(`${ok} products update huin, ${fail} fail huin.`, (fail && !ok) ? "err" : "info");
    else showToast(`✅ ${ok} products update ho gayin (${label}).`, "ok");
  };
  bulkBtn.onclick = async () => {
    const ids = [...BULK_SELECTED];
    if (!ids.length) return;
    if (!confirm(`${ids.length} products delete kar dein? Ye wapas nahi aayega — un ki images bhi Storage se delete ho jayengi (jo kisi doosre product, category ya settings mein lagi hon wo mehfooz rahengi).`)) return;
    bulkBtn.disabled = true; bulkBtn.textContent = "Deleting…";
    let ok = 0, fail = 0, imgs = 0, warn = false;
    for (const id of ids){
      try {
        const r = await deleteProductAndImages(id);
        ok++; imgs += r.images;
        if (r.storageWarn) warn = true;
        PRODUCTS_CACHE = PRODUCTS_CACHE.filter(x => x.id !== id);
        if (EDITING_PRODUCT_ID === id) closeProductForm();
      } catch (e) { fail++; }
    }
    BULK_SELECTED.clear();
    await loadProducts(); loadCategories(); /* category counts bhi fresh hon (delete se count badalta hai) — products PEHLE await karein, warna count purane cache se banta hai (J2) */
    const warnNote = warn ? " Kuch images Storage se delete nahi ho sakin." : "";
    if (fail) showToast(`${ok} products delete huin, ${fail} fail huin.` + (imgs ? ` ${imgs} images bhi Storage se delete huin (space wapas mili).` : "") + warnNote, (fail && !ok) ? "err" : "info");
    else showToast(`✅ ${ok} products delete ho gayin.` + (imgs ? ` ${imgs} images bhi Storage se delete huin — space wapas mil gayi.` : "") + warnNote, "ok");
  };
  syncBulk();
  wrap.querySelectorAll("[data-del-prod]").forEach(b => b.onclick = async () => {
    if (!confirm("Yeh product delete kar dein?")) return;
    const id = +b.dataset.delProd;
    try {
      const r = await deleteProductAndImages(id);
      if (EDITING_PRODUCT_ID === id) closeProductForm();
      await loadProducts(); loadCategories(); /* category counts bhi fresh hon — products PEHLE await karein (J2) */
      showToast("✅ Product delete ho gaya." + (r.images ? ` ${r.images} image${r.images > 1 ? "s" : ""} bhi Storage se delete huin — space wapas mil gayi.` : "") + (r.storageWarn ? " Kuch images Storage se delete nahi ho sakin." : ""), "ok");
    } catch (e) { showToast("Delete fail: " + e.message, "err"); }
  });
  renderProductsPager(list.length);
}
$("#prodSearch").addEventListener("input", () => { PRODUCTS_PAGE = 1; renderProductsList(); });
function openProductForm(id){
  const p = PRODUCTS_CACHE.find(x => x.id === id);
  if (!p) return;
  EDITING_PRODUCT_ID = id;
  fillProductForm(p);
  $("#productFormWrap").classList.remove("hidden");
  $("#productFormWrap").scrollIntoView({ behavior: "smooth", block: "start" });
}
function fillProductForm(p){
  const wrap = $("#productFormWrap");
  wrap.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px"><h4 style="margin:0">✎ Product Edit — ${esc(p.name || "")}</h4><button class="btn small ghost" id="closeProdForm" type="button">✕ Form band karein</button></div>`
    + `<div class="prod-grid" style="grid-template-columns:1fr">${prodCard(p)}</div>`;
  bindProdCards(wrap);
  $("#closeProdForm").onclick = closeProductForm;
}
function closeProductForm(){
  EDITING_PRODUCT_ID = null;
  $("#productFormWrap").innerHTML = "";
  $("#productFormWrap").classList.add("hidden");
}
function refreshCatList(){
  const fromProducts = PRODUCTS_CACHE.map(p => p.cat).filter(Boolean);
  const fromTable = CATEGORIES_CACHE.map(c => c.name).filter(Boolean);
  const cats = [...new Set([...fromTable, ...fromProducts])];
  $("#catList").innerHTML = cats.map(c => `<option value="${esc(c)}">`).join("");
}
/* V3.9: product.options <-> form strings (sizes "S, M, L, XL"; colors "Maroon #7F1D1D, Green #0B3D2E"). */ const COLOR_NAME_HEX = {"red":"#DC2626","blue":"#2563EB","green":"#16A34A","black":"#111111","white":"#F5F5F5","yellow":"#EAB308","pink":"#EC4899","purple":"#9333EA","orange":"#EA580C","brown":"#92400E","grey":"#6B7280","gray":"#6B7280","beige":"#D6CDBF","maroon":"#7F1D1D","navy":"#1E3A8A","teal":"#0D9488","gold":"#D4A017","silver":"#C0C0C0","lavender":"#E6E6FA","mustard":"#D9A404","olive":"#808000","cream":"#FFFDD0","sky blue":"#38BDF8","coral":"#FF7F50"}; function optionsOf(p){ const o = (p && p.options && typeof p.options === "object")? p.options: {}; return { sizes: Array.isArray(o.sizes)? o.sizes.map(s => String(s).trim()).filter(Boolean): [], colors: Array.isArray(o.colors)? o.colors.map(c => (typeof c === "string" ? { name: c.trim(), hex: COLOR_NAME_HEX[c.trim().toLowerCase()] || "#8A8A8A" } : c)).filter(c => c && typeof c === "object" && String(c.name || "").trim()).map(c => ({ name: String(c.name).trim(), hex: /^#[0-9a-fA-F]{6}$/.test(String(c.hex || ""))? String(c.hex): (COLOR_NAME_HEX[String(c.name).trim().toLowerCase()] || "#8A8A8A")})): []};} function sizesStr(p){ return optionsOf(p).sizes.join(", ");} function colorsStr(p){ return optionsOf(p).colors.map(c => c.name + " " + c.hex).join(", ");} function parseSizes(str){ return String(str || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 12);} function parseColors(str){ return String(str || "").split(",").map(s => s.trim()).filter(Boolean).map(part => { const m = part.match(/^(.*?)\s*(#[0-9a-fA-F]{6})\s*$/); if (m) return { name: m[1].trim(), hex: m[2]}; return { name: part, hex: "#8A8A8A"};}).filter(c => c.name).slice(0, 12);} /* Gallery URL inputs — product ki jitni gallery images hon, utne inputs
   (kam se kam 3). Multi-upload ya drag-reorder se zyada images banen to
   inputs khud barh jate hain, taa ke save par koi image gum na ho. */
function galleryInputs(p){
  const g = Array.isArray(p.gallery) ? p.gallery : [];
  const slots = Math.max(3, g.length);
  let h = "";
  for (let i = 0; i < slots; i++) h += `<input data-f="gallery${i+1}" value="${esc(g[i] || "")}" placeholder="Extra image ${i+1} URL (optional)">`;
  return h;
}
function prodCard(p){
  const out = p.stock === "out";
  return `<div class="prod" data-id="${p.id}">
    <img class="img-preview" data-preview src="${safeUrl(p.img || PLACEHOLDER_IMG)}" alt="">
    <div class="badges-row">${p.featured ? `<span class="pill green">⭐ Featured</span>` : ""}${out ? `<span class="pill grey"><svg class="ic" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Out of Stock</span>` : `<span class="pill green">✅ In Stock</span>`}</div>
    <label>Product name</label><input data-f="name" value="${esc(p.name||"")}">
    <div class="row2">
      <div><label>Price (Rs)</label><input data-f="price" type="number" value="${p.price||0}"></div>
      <div><label>Old price (Rs, optional)</label><input data-f="old" type="number" value="${p.old||""}"></div>
    </div>
    <div class="row2">
      <div><label>Category (choose ya nayi type karein)</label><input data-f="cat" list="catList" value="${esc(p.cat||"")}"></div>
      <div><label>Show on store?</label><select data-f="active"><option value="true" ${p.active?"selected":""}>Yes — live</option><option value="false" ${!p.active?"selected":""}>No — hidden</option></select></div>
    </div>
    <div class="row2">
      <div><label>📦 Stock</label><select data-f="stock"><option value="in" ${!out?"selected":""}>In Stock</option><option value="out" ${out?"selected":""}>Out of Stock</option></select></div>
      <div><label>⭐ Featured (Best Sellers mein pehle)</label><label class="checkline" style="margin-top:2px"><input data-f="featured" type="checkbox" ${p.featured?"checked":""}> Featured product hai</label></div>
    </div>
    <div class="row2">
      <div><label>⭐ Rating (0 – 5)</label><input data-f="rating" type="number" step="0.1" min="0" max="5" value="${p.rating ?? 4.5}"></div>
      <div><label>Reviews (number)</label><input data-f="reviews" type="number" min="0" value="${p.reviews||0}"></div>
    </div>
    <div class="row2">
      <div><label>🚚 Delivery fee (Rs) — is product par</label><input data-f="delivery_fee" type="number" min="0" value="${p.delivery_fee||0}"></div>
      <div><label>🏷️ Discount % badge (0–90)</label><input data-f="discount_pct" type="number" min="0" max="90" value="${p.discount_pct ?? ""}" placeholder="Auto (price se)"></div>
    </div>
    <p class="hint">Delivery fee: 0 = is product par <strong>FREE delivery</strong>; fee product par ek dafa lagti hai, quantity par nahi.</p>
    <p class="hint">Discount badge: khali/0 chor dein to badge price/old price se <strong>auto hisaab</strong> hoga; koi number likhein to card aur product page par <strong>wohi % badge</strong> nazar aayega.</p>
    <p class="hint" data-discount-warn hidden style="color:#b45309">⚠️ Discount % likha hai lekin price kam nahi hua (old price nahi likha, ya price old price se kam nahi) — checkout par yehi price charge hoga, badge sirf % dikhayega.</p>
     <div class="row2"> <div><label>👗 Sizes (comma se alag — khaali = size nahi dikhega)</label><input data-f="sizes" value="${esc(sizesStr(p))}" placeholder="S, M, L, XL"></div> <div><label>🎨 Colors (naam + hex — khaali = color nahi dikhega)</label><input data-f="colors" value="${esc(colorsStr(p))}" placeholder="Maroon #7F1D1D, Green #0B3D2E"></div> </div> <p class="hint">Sizes/colors sirf is product ke liye hain — product page par pills/swatches banenge. Content tab se sizes ya colors poore store ke liye band bhi kiye ja sakte hain.</p> <div class="row2"> <div><label>🧵 Fabric (kapra — jaise Lawn, Chiffon)</label><input data-f="fabric" value="${esc(p.fabric || "")}" placeholder="Lawn"></div> </div> <label>📷 Product images upload (ek saath kai select karein)</label><input data-file="imgfile" type="file" accept="image/*" multiple>
    <p class="upload-msg" data-upload-msg>Files select karein to Save dabane par upload hongi. 1 file ho to sirf main image badlegi; 2 ya zyada hon to yehi poori image set ban jayegi (pehli main, baaki gallery). Koi file na ho to neeche wala URL use hoga.</p>
    <label>Ya image URL paste karein</label><input data-f="img" value="${esc(p.img||"")}" placeholder="https://…">
    <label>🖼️ Extra images (card par swipe hongi — V3.6 gallery)</label><div data-gallery-wrap>${galleryInputs(p)}</div><p class="hint">Extra image ho to product card par image swipe hogi (dots + auto-rotate) — FunBug ke bestseller cards ki tarah. Khaali chor dein to sirf main image dikhegi.</p>
    <label>↕️ Images ki tartib (pehli = main)</label><div class="img-order" data-img-order style="display:flex;gap:8px;flex-wrap:wrap"></div>
    <p class="hint">Desktop par image ko drag karke aage-peeche karein, mobile par ▲▼ buttons dabayein; kisi image ko hatane ke liye us par ✕ dabayein — Save par pakki hogi (Storage se bhi delete ho jayegi). Pehli image main hogi, baaki gallery mein swipe hongi.</p><label>Description</label><textarea data-f="desc" rows="6">${esc(p.desc||"")}</textarea>
    <p class="hint">Ye text product page par 'Product Details' mein nazar aayega — khaali line chorne se naya paragraph banta hai.</p>
    <div class="actions">
      <button class="btn small" data-save="${p.id}"> <svg class="ic" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg> Save</button>
      <button class="btn small danger" data-del="${p.id}">Delete</button>
    </div>
  </div>`;
}
/* ---------- Product images ki tartib (drag-reorder) ---------- */
/* Strip mein product ki saari images (main + gallery, jitni bhi hon) thumbs
   ki shakal mein. Desktop par HTML5 drag, mobile par ▲▼ buttons (touch par
   drag nahi chalta). Har tabdeeli foran img + gallery inputs mein likhi
   jati hai, Save par persist hoti hai. */
function imgOrderList(card){
  const arr = [];
  const main = card.querySelector('[data-f="img"]').value.trim();
  if (main) arr.push(main);
  card.querySelectorAll('[data-gallery-wrap] input').forEach(el => {
    const v = el.value.trim();
    if (v) arr.push(v);
  });
  return arr;
}
function writeImgOrder(card, arr){
  card.querySelector('[data-f="img"]').value = arr[0] || "";
  const wrap = card.querySelector('[data-gallery-wrap]');
  const rest = arr.slice(1);
  let inputs = wrap.querySelectorAll('input');
  while (inputs.length < rest.length){
    const el = document.createElement('input');
    el.setAttribute('data-f', 'gallery' + (inputs.length + 1));
    el.placeholder = 'Extra image ' + (inputs.length + 1) + ' URL (optional)';
    wrap.appendChild(el);
    inputs = wrap.querySelectorAll('input');
  }
  inputs.forEach((el, i) => { el.value = rest[i] || ""; });
  const prev = card.querySelector('[data-preview]');
  if (prev) prev.src = arr[0] || PLACEHOLDER_IMG;
}
function renderImgOrder(card){
  const strip = card.querySelector('[data-img-order]');
  if (!strip) return;
  const arr = imgOrderList(card);
  if (!arr.length){ strip.innerHTML = '<span class="hint">Koi image nahi — pehle image upload karein ya URL paste karein.</span>'; return; }
  let dragIdx = -1;
  strip.innerHTML = arr.map((u, i) => `<div draggable="true" data-idx="${i}" style="position:relative;border:2px solid #ddd;border-radius:8px;overflow:hidden;width:64px;height:64px;cursor:grab;flex:0 0 auto" title="Image ${i+1}${i===0 ? " (main)" : ""}"><img src="${safeUrl(u)}" draggable="false" style="width:100%;height:100%;object-fit:cover;display:block"><span style="position:absolute;top:0;left:0;background:#000a;color:#fff;font-size:11px;padding:1px 5px;border-radius:0 0 6px 0">${i+1}</span><button type="button" data-remove="${i}" title="Ye image hatayein" style="position:absolute;top:0;right:0;background:#b91c1c;color:#fff;border:0;width:20px;height:20px;font-size:12px;line-height:1;border-radius:0 0 0 6px;cursor:pointer">✕</button><span style="position:absolute;bottom:0;right:0;display:flex"><button type="button" data-move="-1" title="Ek pehle" style="background:#000a;color:#fff;border:0;padding:4px 7px;font-size:14px;line-height:1">▲</button><button type="button" data-move="1" title="Ek baad mein" style="background:#000a;color:#fff;border:0;padding:4px 7px;font-size:14px;line-height:1">▼</button></span></div>`).join("");
  strip.querySelectorAll('[data-idx]').forEach(box => {
    box.addEventListener('dragstart', e => { dragIdx = +box.dataset.idx; try { e.dataTransfer.setData('text/plain', String(dragIdx)); } catch (err) {} });
    box.addEventListener('dragover', e => e.preventDefault());
    box.addEventListener('drop', e => {
      e.preventDefault();
      let from = dragIdx;
      if (from < 0){ try { from = +e.dataTransfer.getData('text/plain'); } catch (err) {} }
      const to = +box.dataset.idx;
      if (from === to || isNaN(from)) return;
      const a = imgOrderList(card);
      const [it] = a.splice(from, 1);
      a.splice(to, 0, it);
      writeImgOrder(card, a);
      renderImgOrder(card);
    });
  });
  strip.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', () => {
      const box = btn.closest('[data-idx]');
      const i = +box.dataset.idx, d = +btn.dataset.move;
      const a = imgOrderList(card);
      const j = i + d;
      if (j < 0 || j >= a.length) return;
      [a[i], a[j]] = [a[j], a[i]];
      writeImgOrder(card, a);
      renderImgOrder(card);
    });
  });
  /* Per-image remove: kisi bhi maujooda image par ✕ — poora product delete kiye baghair. Hatayi hui image Save par inputs se nikal jati hai; purani-image safai (D2) use Storage se bhi delete kar deti hai agar kahin aur use nahi ho rahi. Aakhri image block hai (product be-tasveer na rahe). */
  strip.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const box = btn.closest('[data-idx]');
      const i = +box.dataset.idx;
      const a = imgOrderList(card);
      if (a.length <= 1){ showToast("Aakhri image nahi hatayi ja sakti — pehle nayi image add karein.", "err"); return; }
      if (!confirm("Ye image hatayein? Save karne par ye Storage se bhi delete ho jayegi (agar kahin aur use nahi ho rahi).")) return;
      a.splice(i, 1);
      writeImgOrder(card, a);
      renderImgOrder(card);
    });
  });
}
/* HQ-A-13: product form client-side validation — naam, price, discount %, stock. */
function validateProductForm(card, get){
  const errs = [];
  if (!get("name").trim()) errs.push("Product name khaali nahi ho sakta.");
  const priceRaw = get("price").trim();
  if (!/^\d+$/.test(priceRaw)) errs.push("Price poora number (0 ya zyada) hona chahiye.");
  const discRaw = get("discount_pct").trim();
  if (discRaw !== "" && !/^\d+$/.test(discRaw)) errs.push("Discount % poora number hona chahiye.");
  else if (discRaw !== "" && (parseInt(discRaw) < 0 || parseInt(discRaw) > 100)) errs.push("Discount % 0–100 ke beech hona chahiye.");
  const stock = get("stock");
  if (stock !== "in" && stock !== "out") errs.push("Stock 'In Stock' ya 'Out of Stock' hona chahiye.");
  return errs;
}
/* F-17: discount_pct likha ho lekin price us hisaab se kam na hua ho to
   warning dikhao (badge % se banta hai, checkout price se charge hota hai).
   Warning hai — save block nahi karti. */
function updateDiscountWarn(card){
  const warn = card.querySelector("[data-discount-warn]");
  if (!warn) return;
  const disc = parseInt(card.querySelector('[data-f="discount_pct"]').value) || 0;
  const price = parseInt(card.querySelector('[data-f="price"]').value) || 0;
  const oldRaw = card.querySelector('[data-f="old"]').value.trim();
  const old = oldRaw === "" ? null : parseInt(oldRaw);
  warn.hidden = !(disc > 0 && (old === null || isNaN(old) || old <= price));
}
function bindProdCards(wrap){
  wrap.querySelectorAll(".prod").forEach(card => {
    const preview = card.querySelector("[data-preview]");
    const urlInput = card.querySelector('[data-f="img"]');
    const fileInput = card.querySelector('[data-file="imgfile"]');
    const msg = card.querySelector("[data-upload-msg]");
    urlInput.addEventListener("input", () => { preview.src = urlInput.value.trim() || PLACEHOLDER_IMG; });
    fileInput.addEventListener("change", () => {
      const files = fileInput.files ? Array.from(fileInput.files) : [];
      if (!files.length) return;
      preview.src = URL.createObjectURL(files[0]);
      setUploadMsg(msg, `${files.length} image${files.length > 1 ? "s" : ""} selected — Save dabane par upload hongi.` + (files.length === 1 ? " Sirf main image badlegi." : " Yehi poori image set ban jayegi (pehli main, baaki gallery).") + (files.length > 10 ? " Sirf pehli 10 li jayengi." : ""));
    });
    renderImgOrder(card);
    /* D2 capture-timing fix (2026-11-11): purani image set FORM KHULTE WAQT capture karein (snapshot), save ke waqt nahi — save ke waqt inputs pehle se edited hotay hain (✕ remove / typed URL), is liye save-time capture hatayi hui image ko kabhi dekh hi nahi sakta tha (f2o5y3yd orphan reh gaya tha). */
    card.dataset.oldImgs = JSON.stringify(imgOrderList(card));
    updateDiscountWarn(card); /* F-17 warning live update. */
    card.addEventListener("input", e => {
      if (e.target.matches('[data-f="img"]') || e.target.closest('[data-gallery-wrap]')) renderImgOrder(card);
      updateDiscountWarn(card);
    });
  });
  wrap.querySelectorAll("[data-save]").forEach(b => b.onclick = async () => {
    const card = b.closest(".prod");
    const get = f => card.querySelector(`[data-f="${f}"]`).value;
    const msg = card.querySelector("[data-upload-msg]");
    const fileInput = card.querySelector('[data-file="imgfile"]');
    const files = fileInput.files ? Array.from(fileInput.files) : [];
    /* HQ-A-13: pehle validation — ghalat data par upload/save dono rukte hain. */
    const formErrs = validateProductForm(card, get);
    if (formErrs.length){
      setUploadMsg(msg, "❌ " + formErrs.join(" "), "err");
      showToast("Product save nahi hua: " + formErrs.join(" "), "err");
      return;
    }
    updateDiscountWarn(card); /* F-17: warning hai, block nahi. */
    let imageUrl = get("img").trim();
    /* L-19: purani image set form khulte waqt capture hui thi (bindProdCards — card.dataset.oldImgs). Save ke waqt inputs se capture karna ghalat tha: ✕ remove / typed URL ke baad inputs mein hatayi hui image hoti hi nahi, is liye safai use kabhi delete nahi karti thi. */
    const oldImgUrls = JSON.parse(card.dataset.oldImgs || "[]");
    const oldLabel = b.textContent;
    b.disabled = true; b.textContent = files.length ? "Uploading…" : "Saving…";
    /* Is save mein upload hui URLs — save fail ho to ye kahin reference nahi
       hoti, is liye wapas delete kar ke orphan hone se bachate hain. */
    let uploadedUrls = [];
    if (files.length){
      try {
        const take = files.slice(0, 10);
        setUploadMsg(msg, take.length + " image" + (take.length > 1 ? "s" : "") + " upload ho rahi " + (take.length > 1 ? "hain" : "hai") + "…");
        let totalBefore = 0, totalAfter = 0;
        for (const f of take){
          totalBefore += f.size;
          uploadedUrls.push(await uploadImage(f, `products/${b.dataset.save}`));
          if (LAST_UPLOAD_INFO) totalAfter += LAST_UPLOAD_INFO.after;
        }
        if (take.length === 1){
        imageUrl = uploadedUrls[0];
        card.querySelector('[data-f="img"]').value = imageUrl;
        card.querySelector("[data-preview]").src = imageUrl;
        } else {
          writeImgOrder(card, uploadedUrls);
          imageUrl = uploadedUrls[0];
        }
        let doneNote = `✅ ${uploadedUrls.length} image${uploadedUrls.length > 1 ? "s" : ""} upload complete — ab product save ho raha hai.`;
                 if (totalAfter > 0 && totalAfter < totalBefore){
                              const pct = Math.round((1 - totalAfter / totalBefore) * 100);
                              doneNote += ` Compress hui: ${fmtSize(totalBefore)} → ${fmtSize(totalAfter)} (${pct}% chhoti).`;
                 }
                 if (take.length > 1) doneNote += " Yehi poori image set ban gayi (pehli main, baaki gallery).";
        if (files.length > 10) doneNote += " Sirf pehli 10 li gayin.";
        setUploadMsg(msg, doneNote, "ok");
      } catch (e) {
        /* Upload aadhi hui (pehli file(s) chadh gayi, baad wali fail) to
           chadhi hui URLs orphan na rahen — wapas delete karein. Purani
           image ko kuch nahi hota (save hua hi nahi). */
        await removeOwnStorageUrls(uploadedUrls);
        setUploadMsg(msg, "Upload fail: " + e.message, "err");
        showToast("Image upload fail — product save nahi kiya gaya: " + e.message, "err");
        b.disabled = false; b.textContent = oldLabel;
        return;
      }
    }
    const discountRaw = get("discount_pct").trim();
    const discountNum = discountRaw === "" ? 0 : parseInt(discountRaw);
    const payload = {
      name: get("name").trim(),
      price: parseInt(get("price")) || 0,
      old: get("old") ? parseInt(get("old")) : null,
      cat: get("cat").trim() || "General",
      stock: get("stock") === "out" ? "out" : "in",
      featured: !!card.querySelector('[data-f="featured"]').checked,
      rating: Math.min(5, Math.max(0, parseFloat(get("rating")) || 0)),
      reviews: Math.max(0, parseInt(get("reviews")) || 0),
      delivery_fee: Math.max(0, parseInt(get("delivery_fee")) || 0),
      discount_pct: (!discountNum || discountNum <= 0) ? null : Math.min(90, Math.round(discountNum)),
      active: get("active") === "true",
      img: imageUrl, gallery: Array.from(card.querySelectorAll('[data-gallery-wrap] input')).map(el => el.value.trim()).filter(Boolean),
      desc: get("desc").trim(), fabric: get("fabric").trim() || null, options: { sizes: parseSizes(get("sizes")), colors: parseColors(get("colors")) },
    };
    const { error } = await sb.from("products").update(payload).eq("id", +b.dataset.save).eq("store_id", STORE_ID);
    if (error) {
      /* DB save fail: purani image barkarar hai (delete nahi hui), aur is
         save mein upload hui nayi image(s) bhi orphan na rahen — wapas
         delete karein (best-effort; save ka fail hona hi asal natija hai). */
      const cleaned = await removeOwnStorageUrls(uploadedUrls);
      setUploadMsg(msg, "Product save fail: " + error.message, "err");
      showToast("Save fail: " + error.message + (cleaned ? " (Nayi upload hui image wapas delete kar di gayi.)" : ""), "err");
      b.disabled = false; b.textContent = oldLabel;
    } else {
      fileInput.value = "";
      b.textContent = "✅ Saved!";
      await loadProducts(); loadCategories(); /* category "Products" count bhi fresh ho — products PEHLE await karein, warna count purane cache se banta hai (J2) */
      /* L-19 replace-orphan fix: purani image(s) delete karein — sirf jab un
         ki jagah nayi URL aayi ho; shared/external wali chhoot jayengi. */
      let replaceNote = "";
      try {
        const newUrls = [payload.img, ...(Array.isArray(payload.gallery) ? payload.gallery : [])].filter(Boolean);
        if (oldImgUrls.some(u => u && !newUrls.includes(u))){
          const cl = await removeUnsharedStorageUrls(oldImgUrls, newUrls);
          if (cl.removed) replaceNote = ` Purani ${cl.removed} image${cl.removed > 1 ? "s" : ""} Storage se delete ho gayi.`;
          else if (cl.failed) replaceNote = " Purani image Storage se delete nahi ho saki (product save ho gaya).";
        }
      } catch (e) { replaceNote = " Purani image Storage se delete nahi ho saki (product save ho gaya)."; }
      /* Snapshot refresh: isi khule form par dobara save ho to purani set ab NAYI set hai — warna dobara save par pehle se delete hui image dobara delete karne ki koshish hoti. */
      card.dataset.oldImgs = JSON.stringify([payload.img, ...(Array.isArray(payload.gallery) ? payload.gallery : [])].filter(Boolean));
      showToast((payload.active ? "✅ Product save ho gaya — store par live hai." : "✅ Product save ho gaya — hidden hai (store par nazar nahi aayega).") + replaceNote, "ok");
    }
  });
  wrap.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("Yeh product delete kar dein?")) return;
    try {
      const r = await deleteProductAndImages(+b.dataset.del);
      await loadProducts(); loadCategories(); /* category counts bhi fresh hon — products PEHLE await karein (J2) */
      showToast("✅ Product delete ho gaya." + (r.images ? ` ${r.images} image${r.images > 1 ? "s" : ""} bhi Storage se delete huin — space wapas mil gayi.` : "") + (r.storageWarn ? " Kuch images Storage se delete nahi ho sakin." : ""), "ok");
    } catch (e) { showToast("Delete fail: " + e.message, "err"); }
  });
}
$("#addProductBtn").onclick = async () => {
  const { data, error } = await sb.from("products").insert({
    store_id: STORE_ID,
    name: "New Product", cat: "General", price: 999, rating: 4.5, reviews: 0, delivery_fee: 0, discount_pct: null, stock: "in", featured: false, img: "", gallery: [], desc: "", active: false, options: {},
  }).select("id").single();
  if (error) showToast("Add fail: " + error.message, "err");
  else {
    await loadProducts(); loadCategories(); /* naya product "General" mein hai — us ki count bhi fresh ho */
    if (data && data.id) openProductForm(data.id);
    showToast("Naya product ban gaya hai (abhi hidden hai) — form mein details aur image bhar kar, 'Show on store' = Yes karke Save karein.", "info");
  }
};

/* ---------- Categories ---------- */
async function loadCategories(){
  const wrap = $("#categoriesWrap");
  const { data, error } = await sb.from("categories").select("*").eq("store_id", STORE_ID).order("sort", { ascending: true }).order("id", { ascending: true });
  if (error){ wrap.innerHTML = `<p class="empty-note">Categories load nahi ho sakein (shopify migration run hai?): ${esc(error.message)}</p>`; CATEGORIES_CACHE = []; return; }
  CATEGORIES_CACHE = data || [];
  refreshCatList();
  if (!CATEGORIES_CACHE.length){ wrap.innerHTML = `<p class="empty-note">Abhi koi category nahi hai — upar wale form se pehli category add karein.</p>`; return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>Image</th><th>Name</th><th>Products</th><th>Sort</th><th>Visible</th><th>Image URL / Upload</th><th></th></tr></thead>
    <tbody>${CATEGORIES_CACHE.map(c => { const count = PRODUCTS_CACHE.filter(p => p.cat === c.name).length; return `<tr data-cid="${c.id}">
      <td><img class="thumb-sm" data-cprev src="${safeUrl(c.image || PLACEHOLDER_IMG)}" alt=""></td>
      <td><input type="text" data-cname value="${esc(c.name)}"></td>
      <td>${count}</td>
      <td><input type="number" data-csort value="${c.sort ?? 0}" style="max-width:76px"></td>
      <td><input type="checkbox" data-cvis ${c.visible !== false ? "checked" : ""} style="width:18px;height:18px"></td>
      <td><input type="text" data-cimg value="${esc(c.image || "")}" placeholder="https://…"><br><input type="file" data-cfile accept="image/*" style="margin-top:5px"></td>
      <td style="white-space:nowrap"><button class="btn small" data-csave="${c.id}">Save</button> <button class="btn small danger" data-cdel="${c.id}">Delete</button></td>
    </tr>`; }).join("")}</tbody></table>`;
  wrap.querySelectorAll("[data-cvis]").forEach(cb => cb.onchange = async () => {
    const id = +cb.closest("tr").dataset.cid;
    const { error } = await sb.from("categories").update({ visible: cb.checked }).eq("id", id).eq("store_id", STORE_ID);
    const msg = $("#catMsg");
    if (error){ msg.textContent = "Visible update fail: " + error.message; msg.className = "msg err"; cb.checked = !cb.checked; showToast("Visible update fail: " + error.message, "err"); }
    else { msg.textContent = cb.checked ? "✅ Category ab store par nazar aayegi." : "✅ Category store se hide ho gayi (products phir bhi All Products mein rahenge)."; msg.className = "msg ok"; showToast(cb.checked ? "✅ Category ab store par nazar aayegi." : "✅ Category store se hide ho gayi.", "ok"); await loadCategories(); }
  });
  wrap.querySelectorAll("[data-csave]").forEach(b => b.onclick = async () => {
    const tr = b.closest("tr");
    const id = +b.dataset.csave;
    const name = tr.querySelector("[data-cname]").value.trim();
    if (!name){ showToast("Category ka naam khaali nahi ho sakta.", "err"); return; }
    /* HQ-A-02 (DEC-10): rename products.cat ko bhi cascade karta hai — atomic RPC
       rename_category (migration 18) se. M27 se RPC khud 'General' ka rename
       protect karta hai (server-side); UI bhi pehle se rokta hai (double safety). */
    const oldCat = (CATEGORIES_CACHE.find(c => c.id === id) || {}).name || "";
    const renamed = oldCat && oldCat !== name;
    if (renamed && oldCat === "General"){ showToast("General category ka naam nahi badal sakte.", "err"); return; }
    const affected = renamed ? PRODUCTS_CACHE.filter(p => p.cat === oldCat).length : 0;
    if (renamed && affected > 0){
      if (!confirm(`${affected} products is category mein hain — rename karne se un ka category bhi badal jayega?`)) return;
    }
    let image = tr.querySelector("[data-cimg]").value.trim();
    /* L-19: category replace se pehle purani image capture karein. */
    const oldCatImage = (CATEGORIES_CACHE.find(c => c.id === id) || {}).image || "";
    const file = tr.querySelector("[data-cfile]").files[0];
    /* Is save mein upload hui image — save fail ho to orphan na rahe. */
    let uploadedCatImage = "";
    const old = b.textContent; b.disabled = true; b.textContent = "Saving…";
    try {
      if (file){ image = await uploadImage(file, "categories"); uploadedCatImage = image; }
      /* Naam badla ho to pehle atomic rename RPC (cascade samet) — is ke baghair
         image/sort save nahi karte, taa ke aadha save na ho. */
      let moved = 0;
      if (renamed){
        const { data: movedCount, error: rErr } = await sb.rpc("rename_category", { p_store_id: STORE_ID, p_old_name: oldCat, p_new_name: name });
        if (rErr){
          const m = String(rErr.message || "");
          if (/duplicate|unique/i.test(m)) throw new Error("Is naam ki category pehle se maujood hai.");
          throw rErr;
        }
        moved = Number(movedCount) || 0;
      }
      /* Image/sort sirf is row ki hain — direct update mehfooz hai (koi cascade nahi). */
      const { error } = await sb.from("categories").update({ image, sort: parseInt(tr.querySelector("[data-csort]").value) || 0 }).eq("id", id).eq("store_id", STORE_ID);
      if (error){
        if (renamed){
          /* Rename ho gaya, image save fail: purani image mehfooz hai, aur
             is save mein upload hui nayi image orphan na rahe — wapas delete. */
          await removeOwnStorageUrls([uploadedCatImage]);
          $("#catMsg").textContent = `Category rename ho gayi (${moved} products updated), lekin image/sort save nahi hui: ` + error.message;
          $("#catMsg").className = "msg err";
          showToast("Category rename ho gayi, lekin image/sort save nahi hui: " + error.message, "err");
        } else throw error;
      } else if (renamed){
        $("#catMsg").textContent = `✅ Category save ho gayi — ${moved} products updated.`;
        $("#catMsg").className = "msg ok";
        showToast(`✅ Category save ho gayi — ${moved} products updated.`, "ok");
      } else {
        $("#catMsg").textContent = "✅ Category save ho gayi."; $("#catMsg").className = "msg ok";
        showToast("✅ Category save ho gayi.", "ok");
      }
      /* L-19 replace-orphan fix (category image): sirf jab image save kamyab
         hua ho (!error) aur purani URL ki jagah nayi aayi ho. Rename ho gaya
         magar image save fail hua to purani image mehfooz rehti hai. */
      if (!error && oldCatImage && oldCatImage !== image){
        try {
          const cl = await removeUnsharedStorageUrls([oldCatImage], [image]);
          if (cl.removed) showToast("✅ Purani category image Storage se delete ho gayi.", "ok");
          else if (cl.failed) showToast("Purani category image Storage se delete nahi ho saki (category save ho gayi).", "info");
        } catch (e) {}
      }
      await loadProducts(); loadCategories(); /* rename ke baad products ka cat badla — pehle products fresh karein, phir categories (count usi cache se) (J2) */
    } catch (e) {
      /* Rename/upload/update fail: purani image barkarar hai; is save mein
         upload hui nayi image orphan na rahe — wapas delete karein. */
      await removeOwnStorageUrls([uploadedCatImage]);
      showToast("Category save fail: " + e.message, "err");
    }
    b.disabled = false; b.textContent = old;
  });
  wrap.querySelectorAll("[data-cdel]").forEach(b => b.onclick = async () => {
    const id = +b.dataset.cdel;
    const catName = (CATEGORIES_CACHE.find(c => c.id === id) || {}).name || "";
    if (catName === "General"){ showToast("General category delete nahi ho sakti.", "err"); return; }
    const affected = catName ? PRODUCTS_CACHE.filter(p => p.cat === catName).length : 0;
    if (!confirm(`Yeh category delete kar dein?\n\nNote: is category ke PRODUCTS delete NAHI honge — ${affected} product ki category "General" kar di jayegi, aur category nav/tiles/footer se gayab hogi.`)) return;
    /* HQ-A-02 (DEC-10): atomic RPC delete_category_reassign (migration 18) — pehle
       products General par, phir category delete, aik transaction mein. */
    const { data: moved, error } = await sb.rpc("delete_category_reassign", { p_store_id: STORE_ID, p_name: catName });
    if (error){
      const msg = /General/i.test(error.message) ? "General category delete nahi ho sakti." : error.message;
      showToast("Delete fail: " + msg, "err");
      return;
    }
    const n = Number(moved) || 0;
    $("#catMsg").textContent = `✅ Category delete ho gayi (${n} products General par move ho gaye).`; $("#catMsg").className = "msg ok";
    showToast("✅ Category delete ho gayi.", "ok");
    await loadProducts(); loadCategories(); /* delete ke baad products General par — pehle products fresh karein, phir categories (J2) */
  });
}
$("#addCategoryBtn").onclick = async () => {
  const name = $("#catNewName").value.trim();
  const msg = $("#catMsg");
  if (!name){ msg.textContent = "Pehle category ka naam likhein."; msg.className = "msg err"; return; }
  const btn = $("#addCategoryBtn");
  btn.disabled = true; btn.textContent = "Adding…";
  try {
    let image = $("#catNewImage").value.trim();
    const file = $("#catNewImageFile").files[0];
    if (file) image = await uploadImage(file, "categories");
    const maxSort = CATEGORIES_CACHE.reduce((m,c) => Math.max(m, Number(c.sort) || 0), 0);
    const { error } = await sb.from("categories").insert({ store_id: STORE_ID, name, image, visible: true, sort: maxSort + 1 });
    if (error) throw error;
    $("#catNewName").value = ""; $("#catNewImage").value = ""; $("#catNewImageFile").value = "";
    msg.textContent = `✅ Category "${name}" add ho gayi.`; msg.className = "msg ok";
    showToast(`✅ Category "${name}" add ho gayi.`, "ok");
    await loadCategories();
  } catch (e) {
    msg.textContent = "Category add fail: " + e.message; msg.className = "msg err";
    showToast("Category add fail: " + e.message, "err");
  } finally { btn.disabled = false; btn.textContent = "＋ Add Category"; }
};

/* ---------- Coupons ---------- */
async function loadCoupons(){
  const wrap = $("#couponsWrap");
  const { data, error } = await sb.from("coupons").select("*").eq("store_id", STORE_ID).order("id", { ascending: true });
  if (error){ wrap.innerHTML = `<p class="empty-note">Coupons load nahi ho sakay (shopify migration run hai?): ${esc(error.message)}</p>`; return; }
  if (!data.length){ wrap.innerHTML = `<p class="empty-note">Abhi koi coupon nahi hai — upar wale form se pehla coupon banayein.</p>`; return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>Code</th><th>Discount</th><th>Expiry</th><th>Max uses</th><th>Uses</th><th>Active</th><th>Banaya gaya</th><th></th></tr></thead>
    <tbody>${data.map(c => `<tr>
      <td><strong>${esc(c.code)}</strong></td>
      <td>${c.pct}% OFF</td>
      <td>${c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-PK",{day:"numeric",month:"short",year:"numeric"}) : "—"}</td>
      <td>${c.max_uses == null ? "∞" : c.max_uses}</td>
      <td>${c.uses == null ? 0 : c.uses}</td>
      <td><input type="checkbox" data-cpn-active="${c.id}" ${c.active ? "checked" : ""} style="width:18px;height:18px"></td>
      <td><small style="color:var(--muted)">${new Date(c.created_at).toLocaleDateString("en-PK",{day:"numeric",month:"short",year:"numeric"})}</small></td>
      <td><button class="btn small danger" data-cpn-del="${c.id}">Delete</button></td>
    </tr>`).join("")}</tbody></table>`;
  wrap.querySelectorAll("[data-cpn-active]").forEach(cb => cb.onchange = async () => {
    const { error } = await sb.from("coupons").update({ active: cb.checked }).eq("id", +cb.dataset.cpnActive).eq("store_id", STORE_ID);
    if (error){ showToast("Coupon update fail: " + error.message, "err"); cb.checked = !cb.checked; } else showToast("✅ Coupon " + (cb.checked ? "active ho gaya." : "inactive ho gaya."), "ok");
  });
  wrap.querySelectorAll("[data-cpn-del]").forEach(b => b.onclick = async () => {
    if (!confirm("Yeh coupon delete kar dein?")) return;
    const { error } = await sb.from("coupons").delete().eq("id", +b.dataset.cpnDel).eq("store_id", STORE_ID);
    if (error) showToast("Delete fail: " + error.message, "err"); else { await loadCoupons(); showToast("✅ Coupon delete ho gaya.", "ok"); }
  });
}
$("#addCouponBtn").onclick = async () => {
  const code = $("#cpnCode").value.trim().toUpperCase();
  const pct = Math.min(90, Math.max(1, parseInt($("#cpnPct").value) || 0));
  const msg = $("#couponsMsg");
  if (!code){ msg.textContent = "Coupon code likhein."; msg.className = "msg err"; return; }
  if (!pct){ msg.textContent = "Discount % 1–90 ke darmiyan likhein."; msg.className = "msg err"; return; }
  /* M22: expiry + max-uses (columns exist only after the M22 ALTER TABLE).
     Send them ONLY when set — PostgREST rejects unknown columns even when
     null, so an unconditional insert would break coupon creation before M22
     lands. Expiry is end-of-day (23:59:59) so the coupon stays valid through
     its expiry date; empty = never expires / unlimited. */
  const expRaw = $("#cpnExpiry").value;
  const maxRaw = $("#cpnMaxUses").value.trim();
  const payload = { store_id: STORE_ID, code, pct, active: true };
  if (expRaw) payload.expires_at = new Date(expRaw + "T23:59:59").toISOString(); /* F-M22-2a: local end-of-day as UTC ISO — the DB is UTC, so an offset-less string would stay valid ~5h past the admin's local end-of-day. */
  if (maxRaw !== "") payload.max_uses = Math.max(1, parseInt(maxRaw) || 0);
  const { error } = await sb.from("coupons").insert(payload);
  if (error){ msg.textContent = "Coupon add fail: " + error.message; msg.className = "msg err"; showToast("Coupon add fail: " + error.message, "err"); return; }
  $("#cpnCode").value = ""; $("#cpnPct").value = ""; $("#cpnExpiry").value = ""; $("#cpnMaxUses").value = "";
  msg.textContent = `✅ Coupon ${code} (${pct}% OFF) ban gaya.`; msg.className = "msg ok";
  showToast(`✅ Coupon ${code} (${pct}% OFF) ban gaya.`, "ok");
  await loadCoupons();
};

/* ---------- Team (owner only) ---------- */
async function loadTeam(){
  const wrap = $("#teamWrap");
  const { data, error } = await sb.from("team").select("*").eq("store_id", STORE_ID).order("created_at", { ascending: true });
  if (error){ wrap.innerHTML = `<p class="empty-note">Team load nahi ho saki: ${esc(error.message)}</p>`; return; }
  /* Module 3b: Add form mein role options — Owner ko Staff/Admin/Owner; Admin ko sirf Staff. */
  const roleSel = $("#teamRole");
  if (roleSel) roleSel.innerHTML = effRole() === "admin"
    ? '<option value="staff">Staff</option>'
    : '<option value="staff">Staff</option><option value="admin">Admin</option><option value="owner">Owner</option>';
  wrap.innerHTML = `<table>
    <thead><tr><th>Email</th><th>Role</th><th></th></tr></thead>
    <tbody>${(data || []).map(m => { const self = m.email === MY_EMAIL; return `<tr>
      <td><strong>${esc(m.email)}</strong>${self ? ' <span class="pill green">Aap</span>' : ""}</td>
      <td><select class="status" data-trole="${esc(m.email)}" ${(self || effRole() !== "owner") ? "disabled" : ""}>${["owner","admin","staff"].map(r => `<option value="${r}" ${r===m.role?"selected":""}>${r[0].toUpperCase()+r.slice(1)}</option>`).join("")}</select></td>
      <td>${self ? '<small style="color:var(--muted)">Apna account remove nahi ho sakta</small>' : (effRole() === "owner" || m.role === "staff" ? `<button class="btn small danger" data-tdel="${esc(m.email)}">Remove</button>` : '<small style="color:var(--muted)">Sirf Owner remove kar sakta hai</small>')}</td>
    </tr>`; }).join("")}</tbody></table>`;
  wrap.querySelectorAll("[data-trole]").forEach(sel => sel.onchange = async () => {
    const { error } = await sb.from("team").update({ role: sel.value }).eq("store_id", STORE_ID).eq("email", sel.dataset.trole);
    if (error){ showToast("Role update fail: " + error.message, "err"); await loadTeam(); }
    else { $("#teamMsg").textContent = "✅ Role update ho gaya."; $("#teamMsg").className = "msg ok"; showToast("✅ Role update ho gaya.", "ok"); }
  });
  wrap.querySelectorAll("[data-tdel]").forEach(b => b.onclick = async () => {
    if (!confirm(`${b.dataset.tdel} ko team se remove kar dein? Unka dashboard access foran band ho jayega.`)) return;
    const { error } = await sb.from("team").delete().eq("store_id", STORE_ID).eq("email", b.dataset.tdel);
    if (error) showToast("Remove fail: " + error.message, "err"); else { await loadTeam(); showToast("✅ Member team se remove ho gaya.", "ok"); }
  });
}
$("#addTeamBtn").onclick = async () => {
  const email = $("#teamEmail").value.trim().toLowerCase();
  const role = $("#teamRole").value;
  const msg = $("#teamMsg");
  if (!email || !email.includes("@")){ msg.textContent = "Sahi email likhein."; msg.className = "msg err"; return; }
  const { error } = await sb.from("team").insert({ store_id: STORE_ID, email, role });
  if (error){ msg.textContent = "Member add fail: " + error.message; msg.className = "msg err"; showToast("Member add fail: " + error.message, "err"); return; }
  $("#teamEmail").value = "";
  msg.textContent = `✅ ${email} team mein add ho gaya (${role}). Woh magic link se login kar sakte hain — agar link na aaye to pehle Supabase Auth mein unka user banana hoga.`; msg.className = "msg ok";
  showToast(`✅ ${email} team mein add ho gaya (${role}).`, "ok");
  await loadTeam();
};

/* ---------- Dashboard / Analytics ---------- */
function dayKeyOf(d){ return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function startOfDay(offset = 0){ const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset); return d; }
function lastNDayKeys(n){ const arr = []; for (let i = n - 1; i >= 0; i--) arr.push(dayKeyOf(startOfDay(-i))); return arr; }
function setCard(id, value, label){
  const el = document.getElementById(id); if (!el) return;
  el.textContent = value;
  if (label !== undefined){ const span = el.parentElement.querySelector("span"); if (span) span.textContent = label; }
}
function sourceOf(v){
  if (v.utm_source) return v.utm_source;
  const h = String(v.referrer_host || "direct").toLowerCase();
  if (!h || h === "direct") return "Direct";
  if (h.includes("google")) return "Google";
  if (h.includes("facebook") || h.includes("fb.")) return "Facebook";
  if (h.includes("instagram")) return "Instagram";
  if (h.includes("whatsapp") || h.includes("wa.me")) return "WhatsApp";
  if (h.includes("youtube") || h.includes("youtu.be")) return "YouTube";
  return h;
}
function barChart(el, values, labels, opts = {}){
  if (!el) return;
  const max = Math.max(...values, 0);
  if (max <= 0){ el.innerHTML = `<p class="empty-note">${opts.empty || "Abhi tak koi data record nahi."}</p>`; return; }
  el.innerHTML = `<div class="bars">${values.map((v, i) => `<div class="bar-col"><span class="bar-val">${opts.format ? opts.format(v) : v}</span><div class="bar ${opts.sales ? "sales" : ""}" style="height:${Math.max(3, Math.round(v / max * 100))}%"></div><span class="bar-lab">${escapeHtml(labels[i])}</span></div>`).join("")}</div>`;
}
async function loadDashboard(){
  /* Visits: sirf pichle 30 din fetch hote hain (performance). */
  let visits = [];
  const msg = $("#dashMsg");
  try {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await sb.from("visits").select("*").eq("store_id", STORE_ID).gte("created_at", since).order("created_at", { ascending: false }).limit(5000);
    if (error) throw error;
    visits = data || [];
    msg.textContent = ""; msg.className = "msg";
  } catch (e) {
    msg.textContent = "Visits load nahi ho sakay (analytics migration run hai to thori dair mein data aana shuru hoga): " + e.message;
    msg.className = "msg err";
  }
  const orders = ORDERS_CACHE.filter(o => o.status !== "Cancelled" && !isDeletedOrder(o));
  const countByDay = rows => { const m = {}; rows.forEach(r => { const k = dayKeyOf(new Date(r.created_at)); m[k] = (m[k] || 0) + 1; }); return m; };
  const sumByDay = rows => { const m = {}; rows.forEach(r => { const k = dayKeyOf(new Date(r.created_at)); m[k] = (m[k] || 0) + Number(r.total || 0); }); return m; };
  const vBy = countByDay(visits), oCntBy = countByDay(orders), oSumBy = sumByDay(orders);
  const todayK = dayKeyOf(new Date()), yestK = dayKeyOf(startOfDay(-1));
  const keys7 = lastNDayKeys(7), keys30 = lastNDayKeys(30);
  const sumKeys = (m, keys) => keys.reduce((s, k) => s + (m[k] || 0), 0);

  const vToday = vBy[todayK] || 0, vYest = vBy[yestK] || 0, v7 = sumKeys(vBy, keys7);
  const visits7rows = visits.filter(v => keys7.includes(dayKeyOf(new Date(v.created_at))));
  const unique7 = new Set(visits7rows.map(v => v.session_id).filter(Boolean)).size;
  setCard("avToday", vToday); setCard("avYesterday", vYest); setCard("av7", v7); setCard("avUnique7", unique7);

  const oToday = oSumBy[todayK] || 0, oYest = oSumBy[yestK] || 0;
  const o7 = sumKeys(oSumBy, keys7), o30 = sumKeys(oSumBy, keys30);
  const oAll = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const ocToday = oCntBy[todayK] || 0, ocYest = oCntBy[yestK] || 0, oc7 = sumKeys(oCntBy, keys7);
  setCard("asToday", fmt(oToday), `Aaj ki sales • ${ocToday} orders`);
  setCard("asYesterday", fmt(oYest), `Kal ki sales • ${ocYest} orders`);
  setCard("as7", fmt(o7)); setCard("as30", fmt(o30)); setCard("asAll", fmt(oAll));
  setCard("asAov", orders.length ? fmt(Math.round(oAll / orders.length)) : "Rs.0");
  setCard("asOrders7", oc7);
  setCard("asConv", v7 > 0 ? (Math.round(oc7 / v7 * 1000) / 10) + "%" : "—");

  const dayLabels = keys7.map(k => new Date(k + "T00:00:00").toLocaleDateString("en-PK", { weekday: "short" }));
  barChart($("#chartVisitors"), keys7.map(k => vBy[k] || 0), dayLabels, { empty: "Abhi tak koi visit record nahi — store par pehli visit ke baad chart banna shuru hoga." });
  const shortRs = v => v >= 1000 ? "Rs." + (Math.round(v / 100) / 10) + "k" : fmt(v);
  barChart($("#chartSales"), keys7.map(k => oSumBy[k] || 0), dayLabels, { sales: true, format: shortRs, empty: "Abhi tak koi order record nahi." });

  /* Traffic sources (loaded visits = pichle 30 din) */
  const tWrap = $("#trafficWrap");
  if (!visits.length){
    tWrap.innerHTML = `<p class="empty-note">Abhi tak koi visit record nahi. Jaise hi customers store kholenge, sources yahan nazar aayenge.</p>`;
  } else {
    const counts = {};
    visits.forEach(v => { const s = sourceOf(v); counts[s] = (counts[s] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    tWrap.innerHTML = top.map(([name, n]) => { const pct = Math.round(n / visits.length * 100); return `<div class="tsrc-row"><span>${esc(name)}</span><div class="tsrc-track"><div class="tsrc-fill" style="width:${pct}%"></div></div><span class="tsrc-num">${n} • ${pct}%</span></div>`; }).join("")
      + `<p class="hint" style="margin-top:8px">Total ${visits.length} visits (pichle 30 din ke loaded data par).</p>`;
  }

  /* Top products (saare non-cancelled orders se) */
  const agg = {};
  orders.forEach(o => orderLines(o).forEach(i => {
    const name = i.name || "Product";
    if (!agg[name]) agg[name] = { qty: 0, rev: 0 };
    agg[name].qty += Number(i.qty) || 0;
    agg[name].rev += (Number(i.price) || 0) * (Number(i.qty) || 0);
  }));
  const topList = Object.entries(agg).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
  $("#topProductsWrap").innerHTML = topList.length
    ? `<table><tbody>${topList.map(([name, a], i) => `<tr><td>${i + 1}. <strong>${esc(name)}</strong></td><td>${a.qty} sold</td><td><strong>${fmt(a.rev)}</strong></td></tr>`).join("")}</tbody></table>`
    : `<p class="empty-note">Abhi tak koi order record nahi.</p>`;

  /* Recent orders — deleted orders nahi dikhte (D-1). */
  const recent = ORDERS_CACHE.filter(o => !isDeletedOrder(o)).slice(0, 5);
  $("#recentOrdersWrap").innerHTML = recent.length
    ? `<table><tbody>${recent.map(o => `<tr><td><strong>#${o.id}</strong></td><td>${esc(o.customer_name)}</td><td>${fmt(o.total)}</td><td><span class="pill">${esc(o.status)}</span></td><td><small style="color:var(--muted)">${new Date(o.created_at).toLocaleString("en-PK",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}</small></td></tr>`).join("")}</tbody></table>`
    : `<p class="empty-note">Abhi tak koi order record nahi.</p>`;
}

/* ---------- Store Settings ---------- */
function normalizeHeroSlides(rawHero){
  const blank = { pill: "", title: "", subtitle: "", button: "", image: "", visible: true };
  if (!Array.isArray(rawHero) || !rawHero.length) return JSON.parse(JSON.stringify(ADMIN_DEFAULT_SETTINGS.hero));
  return rawHero.slice(0, 4).map(s => {
    const d = { ...blank };
    if (s && typeof s === "object") ["pill", "title", "subtitle", "button", "image"].forEach(k => { if (typeof s[k] === "string") d[k] = s[k]; });
    if (s && typeof s === "object") d.visible = s.visible !== false;
    return d;
  });
}
/* V3.9: section titles editor — keys storefront SECTION_TEXT_KEY se match karte hain. */ const SECTION_TEXT_KEYS_ADMIN = ["categories", "best", "hot", "arrivals", "deals", "budget", "howto", "faq", "reviews", "festive", "unstitched_tabs", "readytowear_tabs", "all_products"]; /* ---------- V4 Phase 2: theme registry helpers (admin, def-driven) ----------
   Behaviour contract: koi def na mile to V3 path — sab boxes dikhte hain,
   builder poori list dikhata hai, Style table 13 rows. Def mile to sirf
   uske controls dikhte hain; HIDE sirf CSS display:none se hota hai —
   boxes DOM mein rehte hain, is liye persistAllSettings ka overlay
   (readCntList / checkboxes) chhupi hui values ko bhi sahi parhta hai.
   Save path mein koi guard nahi: guard lagana ghalat hota — theme switch
   ke baad save hone wala unsaved edit mit jata. */
function v4AdminThemeKey(){
var t = (typeof SETTINGS_STATE !== "undefined" && SETTINGS_STATE && SETTINGS_STATE.theme) ? String(SETTINGS_STATE.theme).toLowerCase() : "";
return t;
}
function v4AdminDefSectionsFor(themeKey){
var def = null;
try { def = (themeKey && window.SHOPNEST_THEME_DEF) ? (window.SHOPNEST_THEME_DEF(String(themeKey).toLowerCase()) || null) : null; } catch (e){ def = null; }
if (def && Array.isArray(def.sections)) return def.sections.map(function(s){ return s && s.key; }).filter(Boolean);
return null;
}
/* Renderable sections per theme (builder greying — ek jagah, def-driven):
   - def.sections ho (Luxury) to wahi keys renderable hain.
   - warna SECTION_DEFS ki keys mein se theme-gated keys hata dein:
     Luxury-only = luxury def ki onlySections (fallback literal),
     Playful-only = playful def ki onlySections (fallback literal),
     reels sirf playful/luxury par render hota hai (storefront ki wahi shart).
   Ye sirf BUILDER ke grey/disabled ke liye hai — storefront ke gates
   (applySections) alag se chalte hain aur wahi faisla karte hain. */
function v4AdminOnlySectionsFor(themeKey, fallback){
var d = null;
 try { d = (themeKey && window.SHOPNEST_THEME_DEF) ? (window.SHOPNEST_THEME_DEF(String(themeKey).toLowerCase()) || null) : null; } catch(e){ d = null; }
 if (d && Array.isArray(d.onlySections) && d.onlySections.length) return d.onlySections.slice();
 return fallback.slice();
}
function v4AdminRenderableSectionsFor(themeKey){
var key = String(themeKey || "").toLowerCase();
var defKeys = v4AdminDefSectionsFor(key);
if (defKeys) return defKeys;
var all = SECTION_DEFS.map(function(d){ return d.key; });
var luxOnly = v4AdminOnlySectionsFor("luxury", ["festive", "unstitched_tabs", "readytowear_tabs", "editorial"]);
var playOnly = v4AdminOnlySectionsFor("playful", ["featured", "blog"]);
return all.filter(function(k){
if (key !== "luxury" && luxOnly.indexOf(k) !== -1) return false;
if (key !== "playful" && playOnly.indexOf(k) !== -1) return false;
if (k === "reels" && key !== "playful" && key !== "luxury") return false;
return true;
});
}

function v4AdminThemeDef(){
var k = v4AdminThemeKey();
try { return (k && window.SHOPNEST_THEME_DEF) ? (window.SHOPNEST_THEME_DEF(k) || null) : null; } catch (e){ return null; }
}
function v4AdminDefSections(){
return v4AdminDefSectionsFor(v4AdminThemeKey());
}
/* Content box map: wrapId -> schema key ("generic" = hamesha dikhe). */
var V4_CONTENT_BOXES = [
{ wrap: "cntHowWrap", key: "generic" },
{ wrap: "cntFaqWrap", key: "generic" },
{ wrap: "cntReviewsWrap", key: "generic" },
{ wrap: "cntBudgetWrap", key: "generic" },
{ wrap: "cntTrustWrap", key: "generic" },
{ wrap: "cntLuxTilesWrap", key: "luxuryTiles" },
{ wrap: "cntLuxTabsWrap", key: "luxuryTabs" },
{ wrap: "cntLuxRtwTabsWrap", key: "luxuryRtwTabs" },
{ wrap: "cntLuxBannersWrap", key: "luxuryBanners" },
{ wrap: "cntCollPagesWrap", key: "collectionPages" },
{ wrap: "cntCustomPagesWrap", key: "generic" },
{ wrap: "cntReelsWrap", key: "instaReels" },
{ wrap: "cntBlogWrap", key: "blogPosts" }
];
function v4BoxVisibleForTheme(boxKey, def){
if (!def || !def.settingsSchema) return true; /* V3 path — koi def nahi, ya stub def (settingsSchema nahi): aaj jaisa, sab dikhe */
if (boxKey === "generic") return true;
return !!def.settingsSchema[boxKey];
}
/* Style table key filter: def ho to sirf uske sections; na ho to 13 keys. */
function v4StyleKeyVisible(k){
var secs = v4AdminDefSections();
if (!secs) return true;
return secs.indexOf(k) !== -1;
}
function v4AdminCleanStr(v){ return String(v || ""); }
function v4AdminSanitizeList(rawList, fields, max, keep){
if (!Array.isArray(rawList)) return null;
var out = rawList.filter(function(x){ return x && typeof x === "object"; }).map(function(x){
var o = {};
fields.forEach(function(f){ o[f] = v4AdminCleanStr(x[f]); });
return o;
}).filter(function(o){
if (keep === "all") return true;
if (keep === "img") return !!o.img;
if (keep === "cat") return !!o.cat;
return fields.some(function(f){ return !!o[f]; });
});
return (typeof max === "number") ? out.slice(0, max) : out;
}
function v4AdminSanitizeObject(rawObj, fields){
if (!rawObj || typeof rawObj !== "object") return null;
var o = {};
fields.forEach(function(f){ if (typeof rawObj[f] === "string") o[f] = rawObj[f]; });
return o;
}
/* V4 admin schema loop — def ki keys whitelist mein. ADDITIVE: V3 lines
   upar rehti hain aur same values likhti hain; loop unhein dobara same tarah
   likhta hai. luxuryBanners ki V3 line V5 Phase 2b mein DELETE ho chuki —
   loop ab us ka WAHID writer hai (def shape {img,eyebrow,title,button,cat};
   alt kabhi display nahi hota tha).
   'deferred' keys skip (showDisclaimer — admin V3 line usay likhti hai).
   Maps: sectionText fixed 12 keys (SECTION_TEXT_KEYS_ADMIN), pdpText fixed
   3 keys — def ka kind "open" storefront semantics hai; admin ke paas
   sirf in keys ke inputs hain, is liye loop bhi inhi ko likhta hai. */
function applyAdminThemeSchema(out, raw){
var defs = window.SHOPNEST_THEME_DEFS || {};
Object.keys(defs).forEach(function(dk){
var def = defs[dk];
var schema = def && def.settingsSchema;
if (!schema) return;
Object.keys(schema).forEach(function(key){
var spec = schema[key];
if (!spec || spec.deferred) return;
if (spec.type === "list"){
var list = v4AdminSanitizeList(raw[key], spec.fields, spec.max, spec.keep);
if (list !== null) out[key] = list;
} else if (spec.type === "string"){
if (typeof raw[key] === "string") out[key] = raw[key].trim();
} else if (spec.type === "boolean"){
if (typeof raw[key] === "boolean") out[key] = raw[key];
} else if (spec.type === "object"){
var obj = v4AdminSanitizeObject(raw[key], spec.fields);
if (obj !== null && out[key] && typeof out[key] === "object"){
Object.keys(obj).forEach(function(f){ out[key][f] = obj[f]; });
}
} else if (spec.type === "map"){
if (raw[key] && typeof raw[key] === "object"){
if (key === "sectionText"){
if (!out[key] || typeof out[key] !== "object") out[key] = {};
SECTION_TEXT_KEYS_ADMIN.forEach(function(k){
var v = raw[key][k];
if (v && typeof v === "object") out[key][k] = { eyebrow: String(v.eyebrow || ""), title: String(v.title || "") };
});
} else if (key === "pdpText"){
if (!out[key] || typeof out[key] !== "object") out[key] = {};
(spec.keys || []).forEach(function(k){ if (typeof raw[key][k] === "string") out[key][k] = raw[key][k]; });
} else if (spec.kind === "open"){
if (!out[key] || typeof out[key] !== "object") out[key] = {};
Object.keys(raw[key]).forEach(function(k){ var v = raw[key][k]; if (v && typeof v === "object") out[key][k] = { eyebrow: String(v.eyebrow || ""), title: String(v.title || "") }; });
}
}
}
});
});
}
/* Theme visibility apply karein: Content boxes hide/show (display:none,
   DOM mein rehte hain); theme badla ho to builder re-seed + Style table
   re-render (reload jaisa, save ke baad). */
var V4_APPLIED_THEME = null;
function applyThemeVisibility(){
var themeKey = v4AdminThemeKey();
var def = v4AdminThemeDef();
V4_CONTENT_BOXES.forEach(function(b){
var wrap = document.getElementById(b.wrap);
if (!wrap) return;
var box = wrap.parentElement;
if (!box || !box.classList || !box.classList.contains("settings-box")) return; /* fail safe: dikhta rahe */
box.style.display = v4BoxVisibleForTheme(b.key, def) ? "" : "none";
});
if (themeKey !== V4_APPLIED_THEME){
V4_APPLIED_THEME = themeKey;
if (typeof homepageFilled !== "undefined" && homepageFilled && typeof seedHomepage === "function") seedHomepage(SETTINGS_STATE);
if (typeof styleFilled !== "undefined" && styleFilled && typeof renderStyleSections === "function") renderStyleSections((SETTINGS_STATE && SETTINGS_STATE.style && SETTINGS_STATE.style.sections) || {});
if (typeof sectionsFilled !== "undefined" && sectionsFilled && typeof renderSectionsTab === "function") renderSectionsTab((SETTINGS_STATE && SETTINGS_STATE.sectionStyles) || {}, (SETTINGS_STATE && SETTINGS_STATE.sectionText) || {});
}
}
function mergeAdminSettings(raw){
  const out = JSON.parse(JSON.stringify(ADMIN_DEFAULT_SETTINGS));
  if (!raw || typeof raw !== "object") return out;
  if (typeof raw.store_name === "string" && raw.store_name.trim()) out.store_name = raw.store_name.trim();
  if (Array.isArray(raw.announcements)) out.announcements = out.announcements.map((d,i) => typeof raw.announcements[i] === "string" && raw.announcements[i].trim() ? raw.announcements[i] : d);
  if (Array.isArray(raw.hero) && raw.hero.length) out.hero = normalizeHeroSlides(raw.hero);
  if (Array.isArray(raw.promo)) out.promo = out.promo.map((d,i) => ({ ...d, ...(raw.promo[i] && typeof raw.promo[i] === "object" ? raw.promo[i] : {}) }));
  if (typeof raw.about_heading === "string" && raw.about_heading.trim()) out.about_heading = raw.about_heading.trim();
  if (typeof raw.about_text === "string" && raw.about_text.trim()) out.about_text = raw.about_text.trim();
  /* V3.3 Content — key maujood ho to wahi (khaali array = sab delete); na ho to defaults. */
  const cs = v => String(v || "");
  if (Array.isArray(raw.howSteps)) out.howSteps = raw.howSteps.filter(x => x && typeof x === "object").map(x => ({ title: cs(x.title), text: cs(x.text) }));
  if (Array.isArray(raw.faqs)) out.faqs = raw.faqs.filter(x => x && typeof x === "object").map(x => ({ q: cs(x.q), a: cs(x.a) }));
  if (Array.isArray(raw.reviews)) out.reviews = raw.reviews.filter(x => x && typeof x === "object").map(x => {
    const r = parseFloat(x.rating);
    return { product: cs(x.product), name: cs(x.name), city: cs(x.city), rating: Number.isFinite(r) ? Math.min(5, Math.max(1, r)) : 5, text: cs(x.text) };
  });
  if (Array.isArray(raw.budgetTiles)) out.budgetTiles = raw.budgetTiles.filter(x => x && typeof x === "object").map(x => ({ label: cs(x.label), amount: cs(x.amount), note: cs(x.note), budget: cs(x.budget) }));
  if (Array.isArray(raw.trustItems)) out.trustItems = raw.trustItems.filter(x => x && typeof x === "object").map(x => ({ title: cs(x.title), sub: cs(x.sub) })); /* V3.6: Instagram reels + blog */ if (typeof raw.instaHandle === "string") out.instaHandle = raw.instaHandle.trim(); if (Array.isArray(raw.instaReels)) out.instaReels = raw.instaReels.filter(x => x && typeof x === "object").map(x => ({ user: cs(x.user), avatar: cs(x.avatar), video: cs(x.video), poster: cs(x.poster), title: cs(x.title) })); if (Array.isArray(raw.blogPosts)) out.blogPosts = raw.blogPosts.filter(x => x && typeof x === "object").map(x => ({ title: cs(x.title), excerpt: cs(x.excerpt), img: cs(x.img), link: cs(x.link) })); if (typeof raw.showReels === "boolean") out.showReels = raw.showReels; if (typeof raw.showBlog === "boolean") out.showBlog = raw.showBlog; /* V3.9: fashion toggles + section/PDP text. */ if (typeof raw.showSizes === "boolean") out.showSizes = raw.showSizes; if (typeof raw.showColors === "boolean") out.showColors = raw.showColors; if (typeof raw.showDisclaimer === "boolean") out.showDisclaimer = raw.showDisclaimer; if (raw.sectionText && typeof raw.sectionText === "object"){ SECTION_TEXT_KEYS_ADMIN.forEach(k => { const v = raw.sectionText[k]; if (v && typeof v === "object") out.sectionText[k] = { eyebrow: String(v.eyebrow || ""), title: String(v.title || "") }; }); } if (raw.pdpText && typeof raw.pdpText === "object"){ ["details", "related", "delivery"].forEach(k => { if (typeof raw.pdpText[k] === "string") out.pdpText[k] = raw.pdpText[k]; }); } const luxCs = v => String(v || ""); if (Array.isArray(raw.luxuryTiles)) out.luxuryTiles = raw.luxuryTiles.filter(x => x && typeof x === "object").map(x => ({ label: luxCs(x.label), cat: luxCs(x.cat), img: luxCs(x.img) })).filter(x => x.label || x.cat || x.img).slice(0, 4); if (Array.isArray(raw.luxuryTabs)) out.luxuryTabs = raw.luxuryTabs.filter(x => x && typeof x === "object").map(x => ({ label: luxCs(x.label), cat: luxCs(x.cat) })).filter(x => x.label || x.cat).slice(0, 4); if (raw.luxuryBanner && typeof raw.luxuryBanner === "object"){ ["img", "eyebrow", "title", "button", "cat"].forEach(k => { if (typeof raw.luxuryBanner[k] === "string") out.luxuryBanner[k] = raw.luxuryBanner[k]; }); } if (Array.isArray(raw.luxuryRtwTabs)) out.luxuryRtwTabs = raw.luxuryRtwTabs.filter(x => x && typeof x === "object").map(x => ({ label: luxCs(x.label), cat: luxCs(x.cat) })).filter(x => x.label || x.cat).slice(0, 4); if (Array.isArray(raw.collectionPages)) out.collectionPages = raw.collectionPages.filter(x => x && typeof x === "object").map(x => ({ cat: luxCs(x.cat), title: luxCs(x.title), subtitle: luxCs(x.subtitle), img: luxCs(x.img) })).filter(x => x.cat).slice(0, 12); if (Array.isArray(raw.customPages)) out.customPages = raw.customPages.filter(x => x && typeof x === "object").map(x => ({ slug: String(x.slug || "").trim().toLowerCase(), title: luxCs(x.title), body: String(x.body || "").slice(0, 20000), seoTitle: luxCs(x.seoTitle), showInHeader: x.showInHeader === true, showInFooter: x.showInFooter === true })).filter(x => x.slug).slice(0, 20); /* V5 Phase 5: Meta + custom code — whitelist rebuild; capiToken yahan KABHI nahi (wo store_meta_secrets mein hai, Part B). */ if (raw.meta && typeof raw.meta === "object"){ out.meta = { pixelId: String(raw.meta.pixelId || "").replace(/[^0-9]/g, "").slice(0, 20), capiEnabled: raw.meta.capiEnabled === true, testEventCode: String(raw.meta.testEventCode || "").slice(0, 64), hasCapiToken: raw.meta.hasCapiToken === true, capiTokenLast4: String(raw.meta.capiTokenLast4 || "").slice(-4) }; } if (raw.customCode && typeof raw.customCode === "object"){ out.customCode = { head: String(raw.customCode.head || "").slice(0, 50000), body: String(raw.customCode.body || "").slice(0, 50000) }; }
  if (typeof raw.whatsapp_number === "string") out.whatsapp_number = raw.whatsapp_number.trim();
  /* [FLAT-FEE] Store-level flat delivery fee: plain non-negative integer, else unset. */
  if (typeof raw.delivery_fee_flat === "number" && isFinite(raw.delivery_fee_flat)) out.delivery_fee_flat = Math.max(0, Math.floor(raw.delivery_fee_flat));
  /* V3 Part B: SEO fields */
  if (typeof raw.seo_title === "string") out.seo_title = raw.seo_title;
  if (typeof raw.seo_description === "string") out.seo_description = raw.seo_description;
  if (raw.sections && typeof raw.sections === "object") Object.keys(out.sections).forEach(k => { if (typeof raw.sections[k] === "boolean") out.sections[k] = raw.sections[k]; });
  if (raw.policies && typeof raw.policies === "object") Object.keys(out.policies).forEach(k => { if (typeof raw.policies[k] === "string") out.policies[k] = raw.policies[k]; });
  if (raw.profile && typeof raw.profile === "object") Object.keys(out.profile).forEach(k => { if (typeof raw.profile[k] === "string") out.profile[k] = raw.profile[k]; });
  /* --- V2 keys (Appearance / Homepage / Custom Fields) --- */
  if (raw.font_family && typeof raw.font_family === "object")
    out.font_family = { name: String(raw.font_family.name || ""), stack: String(raw.font_family.stack || ""), google: String(raw.font_family.google || "") };
  else if (typeof raw.font_family === "string" && FONTS[raw.font_family])
    out.font_family = { ...FONTS[raw.font_family] };
  if (typeof raw.theme_color === "string") out.theme_color = raw.theme_color;
  if (typeof raw.theme === "string") out.theme = raw.theme.trim().toLowerCase();
  /* V3.2 Style Editor — sirf validated values merge hoti hain; ghalat
     rang/radius khaali (theme default) ban jata hai, kabhi raw save nahi hota. */
  if (raw.style && typeof raw.style === "object"){
    const st = raw.style;
    out.style = JSON.parse(JSON.stringify(ADMIN_DEFAULT_SETTINGS.style));
    if (st.card && typeof st.card === "object"){
      out.style.card.radius = clampRadiusAdmin(st.card.radius);
      out.style.card.bg = adminStyleColor(st.card.bg);
      out.style.card.border = adminStyleColor(st.card.border);
      out.style.card.shadow = ["", "none", "soft", "strong"].indexOf(String(st.card.shadow || "")) !== -1 ? String(st.card.shadow) : "";
      out.style.card.titleColor = adminStyleColor(st.card.titleColor);
      out.style.card.priceColor = adminStyleColor(st.card.priceColor);
    }
    if (st.sections && typeof st.sections === "object"){
      STYLE_SECTION_KEYS_ADMIN.forEach(k => {
        if (st.sections[k] && typeof st.sections[k] === "object")
          out.style.sections[k] = { bg: adminStyleColor(st.sections[k].bg), heading: adminStyleColor(st.sections[k].heading) };
      });
    }
    if (st.buttons && typeof st.buttons === "object"){
      out.style.buttons.primaryBg = adminStyleColor(st.buttons.primaryBg);
      out.style.buttons.primaryColor = adminStyleColor(st.buttons.primaryColor);
      out.style.buttons.radius = clampRadiusAdmin(st.buttons.radius);
      out.style.buttons.secondaryColor = adminStyleColor(st.buttons.secondaryColor);
      out.style.buttons.fontSize = ["", "S", "M", "L"].indexOf(String(st.buttons.fontSize || "")) !== -1 ? String(st.buttons.fontSize) : "";
    }
    if (st.page && typeof st.page === "object"){
      ["headerBg", "footerBg", "marqueeBg", "pageBg", "textColor"].forEach(k => { out.style.page[k] = adminStyleColor(st.page[k]); });
    }
    if (st.socialProof && typeof st.socialProof === "object"){
      const sp = st.socialProof;
      if (typeof sp.enabled === "boolean") out.style.socialProof.enabled = sp.enabled;
      /* V3.3: demo flag ab parha hi nahi jata — popups sirf manual entries se. */
      if (Array.isArray(sp.entries)) out.style.socialProof.entries = sp.entries.filter(e => e && typeof e === "object").map(e => ({ name: String(e.name || ""), product: String(e.product || ""), city: String(e.city || ""), amount: String(e.amount || ""), timeText: String(e.timeText || "") })).filter(e => e.name || e.product);
      const iv = parseInt(sp.intervalSec, 10);
      if (Number.isFinite(iv)) out.style.socialProof.intervalSec = Math.max(5, iv);
      const du = parseInt(sp.durationSec, 10);
      if (Number.isFinite(du)) out.style.socialProof.durationSec = Math.max(1, du);
    }
  }
  if (typeof raw.logo_url === "string") out.logo_url = raw.logo_url;
  if (raw.socials && typeof raw.socials === "object") Object.keys(out.socials).forEach(k => { if (typeof raw.socials[k] === "string") out.socials[k] = raw.socials[k]; });
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
/* V5 Phase 2b: theme schema loop (additive — V3 lines upar rehti hain; luxuryBanners ka wahid writer loop hai, V3 line delete ho chuki). */
mergeAdminSectionStyles(out, raw); applyAdminThemeSchema(out, raw);
  return out;
}
function renderHeroEditor(){
  const wrap = $("#heroSlidesWrap");
  wrap.innerHTML = heroState.map((h, i) => `
    <div class="settings-box hero-box" data-hidx="${i}" style="margin-top:12px">
      <div class="hero-head"><h4>Slide ${i + 1}</h4>
        <span style="display:flex;gap:12px;align-items:center">
          <label class="checkline" style="border:0;padding:2px"><input type="checkbox" data-hvis ${h.visible !== false ? "checked" : ""}> Show on store</label>
          <button class="btn small danger" type="button" data-hdel ${heroState.length <= 1 ? "disabled" : ""}>Delete slide</button>
        </span>
      </div>
      <div class="settings-grid">
        <div>
          <label>Pill label</label><input data-hf="pill" value="${esc(h.pill || "")}">
          <label>Big title</label><input data-hf="title" value="${esc(h.title || "")}">
          <label>Button text</label><input data-hf="button" value="${esc(h.button || "")}">
        </div>
        <div>
          <label>Subtitle</label><textarea data-hf="subtitle" rows="2">${esc(h.subtitle || "")}</textarea>
          <label>Image URL</label><input data-hf="image" value="${esc(h.image || "")}">
          <label>Ya apni hero image upload karein</label>
          <div class="upload-row"><input type="file" data-hfile accept="image/*"></div>
          <p class="upload-msg" data-hmsg></p>
        </div>
      </div>
    </div>`).join("");
  wrap.querySelectorAll("[data-hdel]").forEach(b => b.onclick = () => {
    syncHeroFromDom();
    const idx = +b.closest(".hero-box").dataset.hidx;
    heroState.splice(idx, 1);
    renderHeroEditor();
  });
}
function syncHeroFromDom(){
  const boxes = [...document.querySelectorAll(".hero-box")];
  if (!boxes.length) return;
  heroState = boxes.map(box => {
    const get = f => box.querySelector(`[data-hf="${f}"]`).value;
    return { pill: get("pill"), title: get("title"), subtitle: get("subtitle"), button: get("button"), image: get("image"), visible: box.querySelector("[data-hvis]").checked };
  });
}
async function collectHeroSlides(){
  /* Save se pehle DOM se slides parho; file lagi ho to pehle upload karo —
     upload fail ho to poora save ruk jata hai (purani behavior ki tarah). */
  const boxes = [...document.querySelectorAll(".hero-box")];
  const slides = [];
  for (const box of boxes){
    const get = f => box.querySelector(`[data-hf="${f}"]`).value.trim();
    let image = get("image");
    const file = box.querySelector("[data-hfile]").files[0];
    if (file){
      const msg = box.querySelector("[data-hmsg]");
      setUploadMsg(msg, "Hero image upload ho rahi hai…");
      image = await uploadImage(file, `hero/slide-${slides.length + 1}`);
      box.querySelector('[data-hf="image"]').value = image;
      box.querySelector("[data-hfile]").value = "";
      setUploadMsg(msg, "✅ Hero image upload complete.", "ok");
    }
    slides.push({ pill: get("pill"), title: get("title"), subtitle: get("subtitle"), button: get("button"), image, visible: box.querySelector("[data-hvis]").checked });
  }
  return slides.length ? slides : JSON.parse(JSON.stringify(ADMIN_DEFAULT_SETTINGS.hero));
}
/* ---------- V5 Phase 3: Content-list image uploads (URL ke saath file upload) ---------- Kaunsi list ki kaunsi field par file input lagta hai + file kis Storage folder mein jati hai. Sirf yahan listed (wrap, field) par upload button banta hai — baaki content lists (How/FAQ/Reviews/Budget/Trust/Tabs/Social-proof) mein koi file input nahi aata. Folder naam existing convention jaisay hain (hero/slide-N, custom-sections, profile) — sab aik hi public bucket "product-images" mein. */ const CNT_UPLOAD_FOLDERS = { cntLuxTilesWrap: { img: "luxury-tiles" }, cntLuxBannersWrap: { img: "luxury-banners" }, cntReelsWrap: { avatar: "reels", poster: "reels" }, cntBlogWrap: { img: "blog" }, cntCollPagesWrap: { img: "collection-pages" } }; async function collectCntUploads(){ /* Save se pehle: Content-list rows mein lagi files upload karo (hero jaisa deferred pattern — file Save par upload hoti hai, select par sirf preview). Upload fail ho to throw karta hai aur poora save ruk jata hai (purani URL barkarar rehti hai — input bhi, DB bhi). File ho to typed URL par jeet-ti hai (product flow jaisa). */ for (const [wrapId, fields] of Object.entries(CNT_UPLOAD_FOLDERS)){ const wrap = document.getElementById(wrapId); if (!wrap) continue; for (const row of wrap.querySelectorAll(".cnt-row")){ for (const [key, folder] of Object.entries(fields)){ const inp = row.querySelector(`[data-cntfile="${key}"]`); const file = inp && inp.files && inp.files[0]; if (!file) continue; const msg = row.querySelector(`[data-cntmsg="${key}"]`); const urlInp = row.querySelector(`[data-f="${key}"]`); const prev = row.querySelector(`[data-cntprev="${key}"]`); setUploadMsg(msg, "Image upload ho rahi hai…"); const url = await uploadImage(file, folder); if (urlInp) urlInp.value = url; if (prev) prev.src = url; inp.value = ""; setUploadMsg(msg, "✅ Image upload ho gayi.", "ok"); } } } } $("#addSlideBtn").onclick = () => {
  syncHeroFromDom();
  if (heroState.length >= 4){ showToast("Zyada se zyada 4 hero slides ho sakti hain.", "err"); return; }
  heroState.push({ pill: "", title: "", subtitle: "", button: "SHOP NOW", image: "", visible: true });
  renderHeroEditor();
};
/* ---------- V5 Phase 2a: "Sections" tab — sab section editing aik jagah ----------
   Har section (SECTION_DEFS, 21 keys) ka aik card: style controls
   (settings.sectionStyles) + heading eyebrow/title (settings.sectionText).
   Cards/total sirf product-grid sections par; price/badge colors sirf grids par;
   bannerText sirf hero + editorial par; baaqi sections par container controls.
   Purane tabs (Homepage/Content/Style/Settings) untouched rehte hain — yeh tab
   unhi keys ko parhta/likhta hai, duplicate source nahi banta. sectionText ke
   liye dirty-flag rule: jo tab badla gaya, usi ki values save hoti hain
   (dono badle hon to Sections tab jeet-ta hai — §6 flag). */
let sectionsFilled = false;
let sectionsTextDirty = false;
let contentTextDirty = false;
let sectionsListenersBound = false;
const SECTION_STYLE_GRID_KEYS = ["best_sellers", "new_arrivals", "deals", "all_products"];
const SECTION_STYLE_BAND_KEYS = ["featured", "hero", "editorial"];
const SECTION_TO_TEXT_KEY = { categories: "categories", best_sellers: "best", hot: "hot", new_arrivals: "arrivals", deals: "deals", budget: "budget", how_to_order: "howto", faq: "faq", testimonials: "reviews", festive: "festive", unstitched_tabs: "unstitched_tabs", readytowear_tabs: "readytowear_tabs", all_products: "all_products" };
function clampSsInt(v, lo, hi){ const n = parseInt(v, 10); if (!Number.isFinite(n)) return 0; return Math.max(lo, Math.min(hi, n)); }
function sanitizeSectionStyleAdmin(raw){
  if (!raw || typeof raw !== "object") return null;
  const o = {};
  const cd = clampSsInt(raw.cardsDesktop, 1, 6); if (cd) o.cardsDesktop = cd;
  const cm = clampSsInt(raw.cardsMobile, 1, 3); if (cm) o.cardsMobile = cm;
  const tt = clampSsInt(raw.total, 1, 50); if (tt) o.total = tt;
  const hd = clampSsInt(raw.heightDesktop, 0, 1200); if (hd) o.heightDesktop = hd;
  const hm = clampSsInt(raw.heightMobile, 0, 1200); if (hm) o.heightMobile = hm;
  if (["full", "boxed", "narrow"].indexOf(String(raw.widthMode || "")) !== -1) o.widthMode = String(raw.widthMode);
  const mw = clampSsInt(raw.maxWidth, 320, 1600); if (mw) o.maxWidth = mw;
  if (["left", "center", "right"].indexOf(String(raw.align || "")) !== -1) o.align = String(raw.align);
  if (raw.bold === true) o.bold = true;
  if (raw.italic === true) o.italic = true;
  const cols = {};
  if (raw.colors && typeof raw.colors === "object"){
    ["heading", "text", "buttonBg", "buttonText", "price", "badge", "badgeText", "bannerText"].forEach(function(f){ const c = adminStyleColor(raw.colors[f]); if (c) cols[f] = c; });
  }
  if (Object.keys(cols).length) o.colors = cols;
  const bg = adminStyleColor(raw.bg); if (bg) o.bg = bg;
  const pd = clampSsInt(raw.padding, 0, 120); if (pd) o.padding = pd;
  const mg = clampSsInt(raw.margin, 0, 120); if (mg) o.margin = mg;
  return Object.keys(o).length ? o : null;
}
function mergeAdminSectionStyles(out, raw){
  if (!raw || !raw.sectionStyles || typeof raw.sectionStyles !== "object") return;
  if (!out.sectionStyles || typeof out.sectionStyles !== "object") out.sectionStyles = {};
  SECTION_DEFS.forEach(function(d){
    const s = sanitizeSectionStyleAdmin(raw.sectionStyles[d.key]);
    if (s) out.sectionStyles[d.key] = s;
  });
}
function renderSectionsTab(styles, text){
  const wrap = document.getElementById("secStyleWrap");
  if (!wrap) return;
  styles = styles || {};
  text = text || {};
  const themeKey = v4AdminThemeKey();
  const renderable = v4AdminRenderableSectionsFor(themeKey);
  wrap.innerHTML = SECTION_DEFS.map(function(d){
    const key = d.key;
    const st = (styles[key] && typeof styles[key] === "object") ? styles[key] : {};
    const cols = st.colors || {};
    const isGrid = SECTION_STYLE_GRID_KEYS.indexOf(key) !== -1;
    const isBand = SECTION_STYLE_BAND_KEYS.indexOf(key) !== -1;
    const isHot = key === "hot";
    const tKey = SECTION_TO_TEXT_KEY[key];
    const t = (tKey && text[tKey]) || {};
    const ok = renderable.indexOf(key) !== -1;
    const field = function(inner){ return '<div class="ss-field">' + inner + '</div>'; };
    const num = function(f, label, min, max, ph){
      return field('<label>' + label + '</label><input type="number" data-ss-field="' + f + '" min="' + min + '" max="' + max + '" placeholder="' + (ph || "") + '" value="' + esc(st[f] == null ? "" : String(st[f])) + '">');
    };
    const colPair = function(f, label){
      const v = cols[f] || "";
      return field('<label>' + label + '</label><div class="color-row"><input type="color" data-ss-color="' + f + '" value="' + (isHexColor(v) ? v : "#ffffff") + '"><input type="text" data-ss-hex="' + f + '" placeholder="#RRGGBB ya khaali" value="' + esc(v) + '"></div>');
    };
    const sel = function(f, label, opts){
      let s = field('<label>' + label + '</label><select data-ss-field="' + f + '">');
      opts.forEach(function(o){ s += '<option value="' + o[0] + '"' + (String(st[f] || "") === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; });
      return s + '</select></div>';
    };
    let h = '<div class="settings-box" data-ss-key="' + esc(key) + '"' + (ok ? '' : ' style="opacity:.55"') + '>';
    h += '<h4>' + esc(d.label) + (ok ? '' : ' <span style="font-size:12px;color:var(--muted)">(is theme par nahi dikhta)</span>') + '</h4>';
    h += '<p style="color:var(--muted);font-size:13px;margin-bottom:10px">' + esc(d.sub || "") + '</p>';
    h += '<div class="ss-grid">';
    if (isGrid){
      h += num("cardsDesktop", "Desktop — aik row mein cards (1–6)", 1, 6, "4");
      h += num("cardsMobile", "Mobile — aik row mein cards (1–3)", 1, 3, "2");
      h += num("total", "Kul cards (khaali = default)", 1, 50, key === "best_sellers" ? "8" : key === "new_arrivals" ? "20" : key === "deals" ? "8" : "sab");
    } else if (isHot){
      h += num("total", "Kul cards (khaali = 10)", 1, 50, "10");
    }
    h += num("heightDesktop", "Height — desktop (px, khaali = auto)", 0, 1200, "");
    h += num("heightMobile", "Height — mobile (px, khaali = auto)", 0, 1200, "");
    h += sel("widthMode", "Width", [["", "Theme default"], ["full", "Full width"], ["boxed", "Boxed"], ["narrow", "Narrow"]]);
    h += num("maxWidth", "Max width — Boxed/Narrow (px)", 320, 1600, "1180");
    h += sel("align", "Text alignment", [["", "Theme default"], ["left", "Left"], ["center", "Center"], ["right", "Right"]]);
    h += field('<label class="checkline"><input type="checkbox" data-ss-field="bold"' + (st.bold ? " checked" : "") + '> Bold</label>');
    h += field('<label class="checkline"><input type="checkbox" data-ss-field="italic"' + (st.italic ? " checked" : "") + '> Italic</label>');
    h += colPair("heading", "Heading rang");
    h += colPair("text", "Text rang");
    if (isGrid || isBand) h += colPair("buttonBg", "Button background");
    if (isGrid || isBand) h += colPair("buttonText", "Button text rang");
    if (isGrid) h += colPair("price", "Price rang");
    if (isGrid) h += colPair("badge", "Discount badge background");
    if (isGrid) h += colPair("badgeText", "Discount badge text");
    if (key === "hero" || key === "editorial") h += colPair("bannerText", "Banner text rang");
    h += field('<label>Section background</label><div class="color-row"><input type="color" data-ss-color="bg" value="' + (isHexColor(st.bg) ? st.bg : "#ffffff") + '"><input type="text" data-ss-hex="bg" placeholder="#RRGGBB ya khaali" value="' + esc(st.bg || "") + '"></div>');
    h += num("padding", "Padding — upar/neeche (px)", 0, 120, "52");
    h += num("margin", "Margin — upar/neeche (px)", 0, 120, "0");
    if (tKey){
      h += field('<label>Heading — chhota upar wala text</label><input type="text" data-ss-eyebrow value="' + esc(t.eyebrow || "") + '" placeholder="Khaali = asal heading">');
      h += field('<label>Heading — bara title</label><input type="text" data-ss-title value="' + esc(t.title || "") + '" placeholder="Khaali = asal heading">');
    }
    h += '</div></div>';
    return h;
  }).join("");
  wrap.querySelectorAll("[data-ss-key]").forEach(function(card){
    card.querySelectorAll("[data-ss-color]").forEach(function(cEl){
      const hexEl = card.querySelector('[data-ss-hex="' + cEl.dataset.ssColor + '"]');
      bindColorPair(cEl, hexEl);
    });
  });
  sectionsTextDirty = false;
}
function fillSections(s){
  const styles = (s && s.sectionStyles) || {};
  const text = (s && s.sectionText) || {};
  renderSectionsTab(styles, text);
  if (!sectionsListenersBound){
    sectionsListenersBound = true;
    const wrap = document.getElementById("secStyleWrap");
    if (wrap) wrap.addEventListener("input", function(e){
      const t = e.target;
      if (t && (t.hasAttribute("data-ss-eyebrow") || t.hasAttribute("data-ss-title"))) sectionsTextDirty = true;
    });
    const cp = document.getElementById("contentPanel");
    if (cp) cp.addEventListener("input", function(e){
      const t = e.target;
      if (t && t.id && t.id.indexOf("cntSec_") === 0) contentTextDirty = true;
    });
  }
  sectionsFilled = true;
}
function readSectionStyles(){
  const base = JSON.parse(JSON.stringify((SETTINGS_STATE && SETTINGS_STATE.sectionStyles) || {}));
  if (!sectionsFilled) return base;
  const wrap = document.getElementById("secStyleWrap");
  if (!wrap) return base;
  wrap.querySelectorAll("[data-ss-key]").forEach(function(card){
    const key = card.dataset.ssKey;
    if (!key) return;
    const raw = {};
    card.querySelectorAll("[data-ss-field]").forEach(function(inp){
      const f = inp.dataset.ssField;
      if (!f) return;
      if (inp.type === "checkbox") raw[f] = !!inp.checked;
      else raw[f] = inp.value;
    });
    const cols = {};
    card.querySelectorAll("[data-ss-hex]").forEach(function(hexEl){
      const f = hexEl.dataset.ssHex;
      if (!f || f === "bg") return;
      const v = adminStyleColor(hexEl.value);
      if (v) cols[f] = v;
    });
    if (Object.keys(cols).length) raw.colors = cols;
    const bgEl = card.querySelector('[data-ss-hex="bg"]');
    const bg = bgEl ? adminStyleColor(bgEl.value) : "";
    if (bg) raw.bg = bg;
    const s = sanitizeSectionStyleAdmin(raw);
    if (s) base[key] = s; else delete base[key];
  });
  return base;
}
function readSectionsText(){
  const out = {};
  const wrap = document.getElementById("secStyleWrap");
  if (!wrap) return out;
  wrap.querySelectorAll("[data-ss-key]").forEach(function(card){
    const key = card.dataset.ssKey;
    const tKey = SECTION_TO_TEXT_KEY[key];
    if (!tKey) return;
    const eb = card.querySelector("[data-ss-eyebrow]");
    const ti = card.querySelector("[data-ss-title]");
    const e = eb ? eb.value.trim() : "", t = ti ? ti.value.trim() : "";
    if (e || t) out[tKey] = { eyebrow: e, title: t };
  });
  return out;
}

function fillSettings(s){
  $("#setStoreName").value = s.store_name;
  $("#setWhatsapp").value = s.whatsapp_number;
  const dff = $("#setDeliveryFeeFlat"); if (dff) dff.value = (s.delivery_fee_flat === null || s.delivery_fee_flat === undefined) ? "" : String(s.delivery_fee_flat);
  /* V3 Part B: SEO */
  if ($("#setSeoTitle")) $("#setSeoTitle").value = s.seo_title || "";
  if ($("#setSeoDesc")) $("#setSeoDesc").value = s.seo_description || "";
  s.announcements.forEach((a,i) => { document.getElementById("setAnn" + (i + 1)).value = a; });
  heroState = JSON.parse(JSON.stringify(s.hero));
  renderHeroEditor();
  [1,2].forEach(n => {
    const p = s.promo[n - 1];
    document.getElementById(`setP${n}Kicker`).value = p.kicker || "";
    document.getElementById(`setP${n}Heading`).value = p.heading || "";
    document.getElementById(`setP${n}Text`).value = p.text || "";
    document.getElementById(`setP${n}Category`).value = p.category || "";
  });
  $("#setAboutHeading").value = s.about_heading;
  $("#setAboutText").value = s.about_text;
  document.querySelectorAll("[data-sec]").forEach(cb => { cb.checked = s.sections[cb.dataset.sec] !== false; });
  document.querySelectorAll("[data-pol]").forEach(ta => { ta.value = s.policies[ta.dataset.pol] || ""; });
  $("#profLogo").value = s.profile.logo_url || "";
  $("#profEmail").value = s.profile.email || "";
  $("#profPhone").value = s.profile.phone || "";
  $("#profAddress").value = s.profile.address || "";
  /* V2 tabs bhi isi merged settings se bharte hain */
  seedHomepage(s);
  fillAppearance(s);
  fillStyle(s);
  fillContent(s);
  fillSections(s);
  fillMeta(s); /* V5 Phase 5: Meta tab bharein. */
  /* V4 Phase 2: active theme ke controls dikhayein/chhupayein. */
  applyThemeVisibility();
}
/* HQ-A-03: Save buttons ko load-fail par disable rakho; success par enable. */
function setSettingsSaveDisabled(disabled){
  document.querySelectorAll(".js-save, #globalSaveBtn").forEach(b => { b.disabled = disabled; });
}
function showSettingsLoadBanner(show){
  const banner = $("#settingsLoadBanner");
  if (banner) banner.hidden = !show;
}
async function loadSettings(){
  /* HQ-A-03: settingsLoaded sirf SUCCESSFUL load par true hota hai — load
     shuru hote hi true karna defaults se poori settings wipe kar deta tha. */
  const msg = $("#settingsMsg");
  try {
    const { data, error } = await sb.rpc("get_store_settings", { p_store_id: STORE_ID });
    if (error) throw error;
    SETTINGS_STATE = mergeAdminSettings(data);
    fillSettings(SETTINGS_STATE);
    settingsLoaded = true;
    settingsLoadFailed = false;
    setSettingsSaveDisabled(false);
    showSettingsLoadBanner(false);
  } catch (e) {
    settingsLoaded = false;
    settingsLoadFailed = true;
    SETTINGS_STATE = mergeAdminSettings(null);
    fillSettings(SETTINGS_STATE);
    setSettingsSaveDisabled(true);
    showSettingsLoadBanner(true);
    showToast("Settings load nahi hui — save mat karein. Page reload karein.", "err");
    msg.textContent = "Settings load nahi huye (migration run hai?); defaults dikhaye ja rahe hain: " + e.message;
    msg.className = "msg err";
  }
}
/* ---------- Drag-reorder helper (Homepage sections + custom fields) ----------
   Row sirf ⠿ handle par mouse-down se draggable banta hai, taa ke inputs
   mein text select/edit karna drag se takraye nahi. */
function bindDragRows(container, rowSel){
  if (!container) return;
  let dragEl = null;
  container.querySelectorAll(rowSel).forEach(row => {
    const handle = row.querySelector(".drag-handle");
    if (!handle) return;
    handle.addEventListener("mousedown", () => { row.draggable = true; });
    handle.addEventListener("mouseup", () => { if (!dragEl) row.draggable = false; });
    row.addEventListener("dragstart", e => {
      dragEl = row;
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", ""); } catch (err) {}
    });
    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      row.draggable = false;
      dragEl = null;
      container.querySelectorAll(rowSel).forEach(r => r.classList.remove("dragover"));
    });
    row.addEventListener("dragover", e => {
      if (!dragEl || dragEl === row) return;
      e.preventDefault();
      container.querySelectorAll(rowSel).forEach(r => r.classList.remove("dragover"));
      row.classList.add("dragover");
    });
    row.addEventListener("drop", e => {
      e.preventDefault();
      if (!dragEl || dragEl === row) return;
      const rows = [...container.querySelectorAll(rowSel)];
      if (rows.indexOf(dragEl) < rows.indexOf(row)) row.after(dragEl); else row.before(dragEl);
      row.classList.remove("dragover");
    });
  });
}

/* ---------- Homepage Builder ---------- */
function legacyVisible(s, key){
  const lk = LEGACY_SEC[key];
  return lk ? s.sections[lk] !== false : true;
}
function seedHomepage(s){
  HP_CUSTOM = {};
  (s.custom_sections || []).forEach(c => { HP_CUSTOM[c.id] = { heading: c.heading, text: c.text, img: c.img, btn_label: c.btn_label, btn_link: c.btn_link }; });
  const known = SECTION_DEFS.map(d => d.key);
  const saved = Array.isArray(s.sections_order) ? s.sections_order : null;
  if (saved && saved.length){
    HP_ORDER = saved
      .filter(e => known.includes(e.key) || (e.key.startsWith("custom:") && HP_CUSTOM[e.key.slice(7)]))
      .map(e => ({ key: e.key, visible: e.visible !== false }));
    known.forEach(k => { if (!HP_ORDER.some(e => e.key === k)) HP_ORDER.push({ key: k, visible: legacyVisible(s, k) }); });
    Object.keys(HP_CUSTOM).forEach(id => { if (!HP_ORDER.some(e => e.key === "custom:" + id)) HP_ORDER.push({ key: "custom:" + id, visible: true }); });
  } else {
    HP_ORDER = SECTION_DEFS.map(d => ({ key: d.key, visible: legacyVisible(s, d.key) }));
    Object.keys(HP_CUSTOM).forEach(id => HP_ORDER.push({ key: "custom:" + id, visible: true }));
  }
  /* Builder hamesha poori list dikhata hai — jo section is theme par render nahi hota, woh grey + disabled rehta hai (renderHomepage). Koi key kabhi builder se nahi hat-ti, is liye stale theme par bhi koi rendered section gum nahi hota. */ var v4Renderable = v4AdminRenderableSectionsFor(s.theme); HP_LUX_WARN = HP_ORDER.filter(e => !e.key.startsWith("custom:") && v4Renderable.indexOf(e.key) === -1).map(e => e.key); homepageFilled = true;
  renderHomepage();
}
function renderHomepage(){
  const wrap = $("#sectionsWrap");
  if (!wrap) return;
  wrap.innerHTML = (HP_LUX_WARN.length ? `<div class="msg warn" style="margin-bottom:10px">⚠️ Grey rows is theme par nahi dikhte — unhein hide/show ya drag nahi kiya ja sakta: ${HP_LUX_WARN.map(esc).join(", ")}</div>` : "") + HP_ORDER.map((e, i) => {
    if (e.key.startsWith("custom:")){
      const id = e.key.slice(7);
      const c = HP_CUSTOM[id] || { heading: "", text: "", img: "", btn_label: "", btn_link: "" };
      return `<div class="sec-row" data-seckey="${esc(e.key)}">
        <div class="sec-line">
          <span class="drag-handle" title="Drag karke tartib badlein">⠿</span>
          <span class="sec-name"><svg class="ic" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> Custom Section<small data-cusname>${esc(c.heading || "Bina heading ke")}</small></span>
          <label class="checkline" style="border:0;padding:2px"><input type="checkbox" data-secvis ${e.visible ? "checked" : ""}> <svg class="ic" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Show</label>
          <button class="btn small danger" type="button" data-secdel>Delete</button>
          <span class="sec-move"><button class="btn small" type="button" data-secmove="-1" title="Upar le jayein"${i === 0 ? " disabled" : ""}>↑</button><button class="btn small" type="button" data-secmove="1" title="Neeche le jayein"${i === HP_ORDER.length - 1 ? " disabled" : ""}>↓</button></span>
        </div>
        <div class="custom-editor" data-customeditor="${esc(id)}">
          <div class="settings-grid">
            <div>
              <label>Heading</label><input data-cf="heading" value="${esc(c.heading)}" placeholder="e.g. Hamari Kahani">
              <label>Button label (optional)</label><input data-cf="btn_label" value="${esc(c.btn_label)}" placeholder="e.g. Aur Jaanein">
              <label>Button link (optional)</label><input data-cf="btn_link" value="${esc(c.btn_link)}" placeholder="https://… ya #section">
            </div>
            <div>
              <label>Image URL</label><input data-cf="img" value="${esc(c.img)}" placeholder="https://…">
              <label>Ya image upload karein</label>
              <div class="upload-row"><input type="file" data-cfile accept="image/*"></div>
              <p class="upload-msg" data-cmsg></p>
            </div>
          </div>
          <label>Text</label><textarea data-cf="text" rows="3" placeholder="Section ka text…">${esc(c.text)}</textarea>
        </div>
      </div>`;
    }
    const def = SECTION_DEFS.find(d => d.key === e.key) || { label: e.key, sub: "" };
     const off = HP_LUX_WARN.indexOf(e.key) !== -1;
    return `<div class="sec-row${off ? " sec-off" : ""}" data-seckey="${esc(e.key)}">
      <div class="sec-line">
        <span class="drag-handle" title="Drag karke tartib badlein">⠿</span>
        <span class="sec-name">${esc(def.label)}<small>${esc(def.sub)}${off ? " — is theme par nahi dikhta" : ""}</small></span>
        <label class="checkline" style="border:0;padding:2px"><input type="checkbox" data-secvis ${e.visible ? "checked" : ""}${off ? " disabled" : ""}> <svg class="ic" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Show</label>
        <span class="sec-move"><button class="btn small" type="button" data-secmove="-1" title="Upar le jayein"${i === 0 ? " disabled" : ""}>↑</button><button class="btn small" type="button" data-secmove="1" title="Neeche le jayein"${i === HP_ORDER.length - 1 ? " disabled" : ""}>↓</button></span>
      </div>
    </div>`;
  }).join("");
  bindDragRows(wrap, ".sec-row");
  wrap.querySelectorAll("[data-secdel]").forEach(b => b.onclick = () => {
    syncHomepageFromDom();
    const key = b.closest(".sec-row").dataset.seckey;
    HP_ORDER = HP_ORDER.filter(e => e.key !== key);
    if (key.startsWith("custom:")) delete HP_CUSTOM[key.slice(7)];
    renderHomepage();     
  });
   wrap.querySelectorAll("[data-secmove]").forEach(b => b.onclick = () => {
      syncHomepageFromDom();
      const key = b.closest(".sec-row").dataset.seckey;
      const idx = HP_ORDER.findIndex(e => e.key === key);
      const ni = idx + (+b.dataset.secmove || 0);
      if (idx < 0 || ni < 0 || ni >= HP_ORDER.length) return;
      const tmp = HP_ORDER[idx]; HP_ORDER[idx] = HP_ORDER[ni]; HP_ORDER[ni] = tmp;
      renderHomepage();
   });
  wrap.querySelectorAll("[data-cfile]").forEach(inp => inp.addEventListener("change", async () => {
    const file = inp.files && inp.files[0];
    if (!file) return;
    const ed = inp.closest(".custom-editor");
    const msg = ed.querySelector("[data-cmsg]");
    try {
            setUploadMsg(msg, "Image upload ho rahi hai…");
       const url = await uploadImage(file, "custom-sections");
      ed.querySelector('[data-cf="img"]').value = url;
      setUploadMsg(msg, "✅ Image upload ho gayi — Save karna na bhoolein.", "ok");
    } catch (err) {
      setUploadMsg(msg, "Upload fail: " + err.message, "err");
    }
  }));
}
function syncHomepageFromDom(){
  const wrap = $("#sectionsWrap");
  if (!wrap) return;
  const rows = [...wrap.querySelectorAll(".sec-row")];
  if (rows.length) HP_ORDER = rows.map(r => ({ key: r.dataset.seckey, visible: r.querySelector("[data-secvis]").checked }));
  wrap.querySelectorAll("[data-customeditor]").forEach(ed => {
    const g = f => ed.querySelector(`[data-cf="${f}"]`).value;
    HP_CUSTOM[ed.dataset.customeditor] = { heading: g("heading"), text: g("text"), img: g("img"), btn_label: g("btn_label"), btn_link: g("btn_link") };
  });
}
$("#addCustomSectionBtn").onclick = () => {
  syncHomepageFromDom();
  const id = "c" + Date.now().toString(36);
  HP_CUSTOM[id] = { heading: "", text: "", img: "", btn_label: "", btn_link: "" };
  HP_ORDER.push({ key: "custom:" + id, visible: true });
  renderHomepage();
  const ed = document.querySelector(`[data-customeditor="${id}"]`);
  if (ed) ed.scrollIntoView({ behavior: "smooth", block: "center" });
};

/* ---------- Appearance ---------- */
function updateLogoPreview(url){
  const img = $("#appLogoPreview");
  if (!img) return;
  if (url){ img.src = url; img.classList.remove("hidden"); }
  else { img.classList.add("hidden"); img.removeAttribute("src"); }
}
function renderSwatches(){
  const wrap = $("#themeSwatches");
  if (!wrap) return;
  wrap.innerHTML = THEME_SWATCHES.map(t => `<button type="button" class="swatch" data-swatch="${t.color}" title="${esc(t.name)}" style="background:${t.color}"></button>`).join("")
    + `<span style="font-size:12.5px;color:var(--muted)">Preset rang — ya upar color picker se koi bhi rang chunein</span>`;
  wrap.querySelectorAll("[data-swatch]").forEach(b => b.onclick = () => { $("#appThemeColor").value = b.dataset.swatch; markSwatch(); });
  markSwatch();
}
function markSwatch(){
  const cur = ($("#appThemeColor").value || "").toLowerCase();
  document.querySelectorAll("#themeSwatches [data-swatch]").forEach(b => b.classList.toggle("active", b.dataset.swatch.toLowerCase() === cur));
}
function linkRowHtml(l = {}){
  return `<div class="link-row">
    <input type="text" data-lk="label" placeholder="Label (e.g. Home)" value="${esc(l.label || "")}">
    <input type="text" data-lk="url" placeholder="URL (e.g. index.html, #faq, https://…)" value="${esc(l.url || "")}">
    <button class="btn small ghost" type="button" data-lup title="Upar le jayein">↑</button>
    <button class="btn small ghost" type="button" data-ldown title="Neeche le jayein">↓</button>
    <button class="btn small danger" type="button" data-ldel title="Link hatayein">✕</button>
  </div>`;
}
function bindLinkRows(wrap){
  if (!wrap) return;
  wrap.querySelectorAll(".link-row").forEach(row => {
    row.querySelector("[data-ldel]").onclick = () => row.remove();
    row.querySelector("[data-lup]").onclick = () => { const prev = row.previousElementSibling; if (prev) wrap.insertBefore(row, prev); };
    row.querySelector("[data-ldown]").onclick = () => { const next = row.nextElementSibling; if (next) wrap.insertBefore(next, row); };
  });
}
function renderLinkRows(wrap, links){
  if (!wrap) return;
  wrap.innerHTML = (links || []).map(l => linkRowHtml(l)).join("");
  bindLinkRows(wrap);
}
function readLinkRows(wrap){
  if (!wrap) return [];
  return [...wrap.querySelectorAll(".link-row")].map(r => ({
    label: r.querySelector('[data-lk="label"]').value.trim(),
    url: r.querySelector('[data-lk="url"]').value.trim()
  })).filter(l => l.label || l.url);
}
/* Custom fields (checkout / products) */
const FIELD_TYPES = ["text", "number", "select", "textarea"];
function fieldRowHtml(f = {}){
  const opts = Array.isArray(f.options) ? f.options.join(", ") : String(f.options || "");
  return `<div class="fld-row" data-fid="${esc(f.id || "")}">
    <span class="drag-handle" title="Drag karke tartib badlein">⠿</span>
    <input type="text" data-ff="label" placeholder="Field label (e.g. Order Note)" value="${esc(f.label || "")}" style="flex:1;min-width:130px">
    <select data-ff="type">${FIELD_TYPES.map(t => `<option value="${t}" ${t === (f.type || "text") ? "selected" : ""}>${t}</option>`).join("")}</select>
    <input type="text" data-ff="options" placeholder="Options — select ke liye, comma se (S, M, L)" value="${esc(opts)}" style="flex:1;min-width:150px">
    <label class="checkline" style="border:0;padding:2px"><input type="checkbox" data-ff="required" ${f.required ? "checked" : ""}> Required</label>
    <button class="btn small danger" type="button" data-fdel title="Field hatayein">✕</button>
  </div>`;
}
function bindFieldRows(wrap){
  if (!wrap) return;
  bindDragRows(wrap, ".fld-row");
  wrap.querySelectorAll("[data-fdel]").forEach(b => b.onclick = () => { b.closest(".fld-row").remove(); checkFieldRowsWarn(wrap); });
  /* F-21: required select jis ke zero options hon — warning line (save
     block nahi karti; checkout par aisi field customer ko rok degi). */
  if (!wrap._fieldsWarn){
    const warn = document.createElement("p");
    warn.className = "hint";
    warn.style.color = "#b45309";
    warn.hidden = true;
    wrap.after(warn);
    wrap._fieldsWarn = warn;
  }
  if (!wrap._fieldsWarnBound){
    wrap.addEventListener("input", () => checkFieldRowsWarn(wrap));
    wrap.addEventListener("change", () => checkFieldRowsWarn(wrap));
    wrap._fieldsWarnBound = true;
  }
  checkFieldRowsWarn(wrap);
}
function checkFieldRowsWarn(wrap){
  const warn = wrap._fieldsWarn;
  if (!warn) return;
  const bad = readFieldRows(wrap).filter(f => f.type === "select" && f.required && (!f.options || !f.options.length));
  warn.hidden = !bad.length;
  if (bad.length) warn.textContent = "⚠️ " + bad.map(f => "“" + f.label + "”").join(", ") + " — required select field hai lekin is ke koi options nahi hain; yeh field checkout block kar dega. Pehle options likhein ya Required hatayein.";
}
function renderFieldRows(wrap, fields){
  if (!wrap) return;
  wrap.innerHTML = (fields || []).map(f => fieldRowHtml(f)).join("");
  bindFieldRows(wrap);
}
function readFieldRows(wrap){
  if (!wrap) return [];
  return [...wrap.querySelectorAll(".fld-row")].map(r => {
    const g = k => r.querySelector(`[data-ff="${k}"]`);
    return {
      id: r.dataset.fid || ("f" + Math.random().toString(36).slice(2, 9)),
      label: g("label").value.trim(),
      type: g("type").value,
      options: g("options").value.split(",").map(x => x.trim()).filter(Boolean),
      required: g("required").checked
    };
  }).filter(f => f.label);
}
/* ---------- V3: Theme picker (Appearance tab, TOP) ----------
   Allowed list = store ki allowed_themes (Super Admin se); [] = sab.
   Disallowed themes lock ke saath dikhti hain, click nahi hoti. */
let ADMIN_THEME_SELECTED = "";
function renderThemePicker(){
  var wrap = $("#themeGrid");
  if (!wrap) return;
  var themes = window.SHOPNEST_THEMES || [];
  var allowed = window.SHOPNEST_ALLOWED_THEMES ? window.SHOPNEST_ALLOWED_THEMES(STORE_ALLOWED_THEMES) : themes;
  var allowedKeys = allowed.map(function(t){ return t.key; });
  wrap.innerHTML = themes.map(function(t){
    var ok = allowedKeys.indexOf(t.key) !== -1;
    var sel = ADMIN_THEME_SELECTED === t.key;
    var dots = `<span class="theme-dots"><i style="background:${t.palette.primary}"></i><i style="background:${t.palette.accent}"></i><i style="background:${t.palette.header}"></i></span>`;
    return `<button type="button" class="theme-card ${sel ? "selected" : ""} ${ok ? "" : "locked"}" data-theme="${t.key}" ${ok ? "" : "disabled"}>${dots}<h5>${t.name} <small>(${t.nameUr})</small></h5><p>${t.tagline}</p><p><small>${t.business}</small></p><p><small>\u{1F4D0} Layout: ${t.layoutDesc || ""}</small></p>${sel ? "<p><strong>✓ Selected</strong></p>" : ""}${ok ? "" : "<p><strong>🔒 Super Admin ne ye theme allow nahi ki</strong></p>"}</button>`;
  }).join("");
  wrap.querySelectorAll("[data-theme]").forEach(function(b){
    b.onclick = function(){ ADMIN_THEME_SELECTED = b.dataset.theme; renderThemePicker(); };
  });
  var note = $("#themeNote");
  if (note){
    var cur = themes.find(function(t){ return t.key === ADMIN_THEME_SELECTED; });
    note.textContent = cur ? ("Selected theme: " + cur.name + " — Save dabane par store par lag jayega.")
      : "Koi theme select nahi — store default (General) look par chalega.";
  }
}
function fillAppearance(s){
  ADMIN_THEME_SELECTED = (s.theme && window.SHOPNEST_THEME_KNOWN && window.SHOPNEST_THEME_KNOWN(s.theme)) ? s.theme : "";
  renderThemePicker();
  $("#appFont").value = fontNameOf(s.font_family);
  $("#appThemeColor").value = /^#[0-9a-fA-F]{6}$/.test(s.theme_color || "") ? s.theme_color : "#0A2B4E";
  renderSwatches();
  const logo = s.logo_url || (s.profile && s.profile.logo_url) || "";
  $("#appLogoUrl").value = logo;
  updateLogoPreview(logo);
  $("#socFacebook").value = s.socials.facebook || "";
  $("#socInstagram").value = s.socials.instagram || "";
  $("#socTiktok").value = s.socials.tiktok || "";
  $("#socYoutube").value = s.socials.youtube || "";
  $("#socX").value = s.socials.x || "";
  $("#socWhatsapp").value = s.socials.whatsapp || "";
  renderLinkRows($("#menuLinksWrap"), s.menu_links);
  renderLinkRows($("#footerLinksWrap"), s.footer_links);
  $("#footerText").value = s.footer_text || "";
  renderFieldRows($("#checkoutFieldsWrap"), s.checkout_fields);
  renderFieldRows($("#productFieldsWrap"), s.product_fields);
}
/* ---------- V3.2: Style Editor (admin "Style" tab) ----------
   Storage: settings.data.style (storefront ke shape se match). Save
   shared persistAllSettings se hota hai — Style tab ki save doosre tabs
   ki values ko wipe nahi karti (data SETTINGS_STATE clone se banta hai).
   Validation: rang sirf #RRGGBB ya chhoti named allowlist, warna khaali
   (theme default) — koi raw string kabhi save/storefront style nahi banti. */
const STYLE_SECTION_KEYS_ADMIN = ["hero", "categories", "best_sellers", "all_products", "promos", "hot", "new_arrivals", "deals", "budget", "about", "how_to_order", "faq", "testimonials"];
const STYLE_NAMED_ADMIN = ["white", "black", "red", "green", "blue", "pink", "orange", "purple", "navy", "teal", "maroon", "gold", "cream", "beige", "grey", "gray", "brown", "yellow", "transparent"];
function isHexColor(v){ return /^#[0-9a-fA-F]{6}$/.test(String(v || "").trim()); }
function adminStyleColor(v){
  const t = String(v || "").trim();
  if (!t) return "";
  if (isHexColor(t)) return t;
  const low = t.toLowerCase();
  return STYLE_NAMED_ADMIN.indexOf(low) !== -1 ? low : "";
}
function clampRadiusAdmin(v){
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return "";
  return Math.min(30, Math.max(0, n));
}
let styleFilled = false; /* fillStyle chala ho to hi readStyle DOM parhe — warna SETTINGS_STATE jaisa ka waisa rahe */
function bindColorPair(colorEl, hexEl){
  if (!colorEl || !hexEl) return;
  colorEl.addEventListener("input", () => { hexEl.value = colorEl.value; });
  hexEl.addEventListener("input", () => { if (isHexColor(hexEl.value.trim())) colorEl.value = hexEl.value.trim(); });
}
function setRadiusControl(sliderId, defId, valId, v){
  const sl = document.getElementById(sliderId), df = document.getElementById(defId), val = document.getElementById(valId);
  if (!sl || !df || !val) return;
  if (v === "" || v === null || v === undefined){
    df.checked = true; sl.disabled = true; sl.value = 18; val.textContent = "Theme default";
  } else {
    const r = clampRadiusAdmin(v);
    df.checked = false; sl.disabled = false; sl.value = r === "" ? 18 : r; val.textContent = (r === "" ? "Theme default" : r + "px");
  }
}
function bindRadiusControl(sliderId, defId, valId){
  const sl = document.getElementById(sliderId), df = document.getElementById(defId), val = document.getElementById(valId);
  if (!sl || !df || !val) return;
  sl.addEventListener("input", () => { val.textContent = sl.value + "px"; });
  df.addEventListener("change", () => {
    sl.disabled = df.checked;
    val.textContent = df.checked ? "Theme default" : sl.value + "px";
  });
}
function renderStyleSections(sections){
  const body = $("#styleSectionsBody");
  if (!body) return;
  var v4StyleKeys = STYLE_SECTION_KEYS_ADMIN.filter(function(k){ return v4StyleKeyVisible(k); });
  body.innerHTML = v4StyleKeys.map(k => {
    const def = SECTION_DEFS.find(d => d.key === k) || { label: k };
    const s = (sections && sections[k]) || {};
    return `<tr data-skey="${esc(k)}"><td><strong>${esc(def.label)}</strong></td>`
      + `<td><div class="color-row"><input type="color" data-sbgc value="${isHexColor(s.bg) ? s.bg : "#ffffff"}"><input type="text" data-sbg placeholder="#RRGGBB ya khaali" value="${esc(s.bg || "")}"></div></td>`
      + `<td><div class="color-row"><input type="color" data-shc value="${isHexColor(s.heading) ? s.heading : "#0A2B4E"}"><input type="text" data-sh placeholder="#RRGGBB ya khaali" value="${esc(s.heading || "")}"></div></td></tr>`;
  }).join("");
  body.querySelectorAll("tr").forEach(tr => {
    bindColorPair(tr.querySelector("[data-sbgc]"), tr.querySelector("[data-sbg]"));
    bindColorPair(tr.querySelector("[data-shc]"), tr.querySelector("[data-sh]"));
  });
}
function fillStyle(s){
  const st = (s && s.style) || ADMIN_DEFAULT_SETTINGS.style;
  const setPair = (colorId, hexId, val) => {
    const c = document.getElementById(colorId), h = document.getElementById(hexId);
    if (!c || !h) return;
    h.value = val || "";
    if (isHexColor(val)) c.value = val;
  };
  setPair("styCardBgC", "styCardBg", st.card.bg);
  setPair("styCardBorderC", "styCardBorder", st.card.border);
  setPair("styCardTitleC", "styCardTitle", st.card.titleColor);
  setPair("styCardPriceC", "styCardPrice", st.card.priceColor);
  setPair("styBtnBgC", "styBtnBg", st.buttons.primaryBg);
  setPair("styBtnColorC", "styBtnColor", st.buttons.primaryColor);
  setPair("styBtnSecC", "styBtnSec", st.buttons.secondaryColor);
  setPair("styPageHeaderC", "styPageHeader", st.page.headerBg);
  setPair("styPageFooterC", "styPageFooter", st.page.footerBg);
  setPair("styPageMarqueeC", "styPageMarquee", st.page.marqueeBg);
  setPair("styPageBgC", "styPageBg", st.page.pageBg);
  setPair("styPageTextC", "styPageText", st.page.textColor);
  const shadow = document.getElementById("styCardShadow");
  if (shadow) shadow.value = ["", "none", "soft", "strong"].indexOf(st.card.shadow) !== -1 ? st.card.shadow : "";
  setRadiusControl("styCardRadius", "styCardRadiusDefault", "styCardRadiusVal", st.card.radius);
  setRadiusControl("styBtnRadius", "styBtnRadiusDefault", "styBtnRadiusVal", st.buttons.radius);
  const fs = document.getElementById("styBtnFontSize");
  if (fs) fs.value = ["", "S", "M", "L"].indexOf(st.buttons.fontSize) !== -1 ? st.buttons.fontSize : "";
  const spE = document.getElementById("stySpEnabled");
  if (spE) spE.checked = st.socialProof.enabled !== false;
  const spI = document.getElementById("stySpInterval");
  if (spI) spI.value = st.socialProof.intervalSec || 20;
  const spD = document.getElementById("stySpDuration");
  if (spD) spD.value = st.socialProof.durationSec || 5;
  renderSpEntries(st.socialProof.entries || []);
  renderStyleSections(st.sections || {});
  styleFilled = true;
}
function readStyle(){
  const base = JSON.parse(JSON.stringify((SETTINGS_STATE && SETTINGS_STATE.style) || ADMIN_DEFAULT_SETTINGS.style));
  if (!styleFilled) return base; /* panel abhi bhara hi nahi — stored style ko chhero mat */
  const hexVal = id => {
    const el = document.getElementById(id);
    if (!el) return undefined;
    return adminStyleColor(el.value);
  };
  const put = (obj, key, id) => { const v = hexVal(id); if (v !== undefined) obj[key] = v; };
  put(base.card, "bg", "styCardBg");
  put(base.card, "border", "styCardBorder");
  put(base.card, "titleColor", "styCardTitle");
  put(base.card, "priceColor", "styCardPrice");
  put(base.buttons, "primaryBg", "styBtnBg");
  put(base.buttons, "primaryColor", "styBtnColor");
  put(base.buttons, "secondaryColor", "styBtnSec");
  put(base.page, "headerBg", "styPageHeader");
  put(base.page, "footerBg", "styPageFooter");
  put(base.page, "marqueeBg", "styPageMarquee");
  put(base.page, "pageBg", "styPageBg");
  put(base.page, "textColor", "styPageText");
  const shadow = document.getElementById("styCardShadow");
  if (shadow) base.card.shadow = ["", "none", "soft", "strong"].indexOf(shadow.value) !== -1 ? shadow.value : "";
  const readRadius = (sliderId, defId) => {
    const df = document.getElementById(defId), sl = document.getElementById(sliderId);
    if (!df || !sl) return undefined;
    return df.checked ? "" : clampRadiusAdmin(sl.value);
  };
  const cr = readRadius("styCardRadius", "styCardRadiusDefault");
  if (cr !== undefined) base.card.radius = cr;
  const br = readRadius("styBtnRadius", "styBtnRadiusDefault");
  if (br !== undefined) base.buttons.radius = br;
  const fs = document.getElementById("styBtnFontSize");
  if (fs) base.buttons.fontSize = ["", "S", "M", "L"].indexOf(fs.value) !== -1 ? fs.value : "";
  const body = document.getElementById("styleSectionsBody");
  if (body){
    body.querySelectorAll("tr[data-skey]").forEach(tr => {
      const k = tr.dataset.skey;
      const bg = tr.querySelector("[data-sbg]"), hd = tr.querySelector("[data-sh]");
      base.sections[k] = {
        bg: bg ? adminStyleColor(bg.value) : ((base.sections[k] && base.sections[k].bg) || ""),
        heading: hd ? adminStyleColor(hd.value) : ((base.sections[k] && base.sections[k].heading) || "")
      };
    });
  }
  const spE = document.getElementById("stySpEnabled");
  if (spE) base.socialProof.enabled = spE.checked;
  const spI = document.getElementById("stySpInterval");
  if (spI){ const v = parseInt(spI.value, 10); if (Number.isFinite(v)) base.socialProof.intervalSec = Math.max(5, v); }
  const spD = document.getElementById("stySpDuration");
  if (spD){ const v = parseInt(spD.value, 10); if (Number.isFinite(v)) base.socialProof.durationSec = Math.max(1, v); }
  base.socialProof.entries = readSpEntries();
  delete base.socialProof.demo; /* V3.3: demo flag ab save hi nahi hota */
  return base;
}
/* Static Style pairs + radius controls: sirf ek dafa bind (fillStyle dobara
   chalne par duplicate listeners nahi lagte — sections rows alag se bind hoti hain). */
(function bindStyleStatic(){
  [["styCardBgC", "styCardBg"], ["styCardBorderC", "styCardBorder"], ["styCardTitleC", "styCardTitle"], ["styCardPriceC", "styCardPrice"],
   ["styBtnBgC", "styBtnBg"], ["styBtnColorC", "styBtnColor"], ["styBtnSecC", "styBtnSec"],
   ["styPageHeaderC", "styPageHeader"], ["styPageFooterC", "styPageFooter"], ["styPageMarqueeC", "styPageMarquee"],
   ["styPageBgC", "styPageBg"], ["styPageTextC", "styPageText"]].forEach(([c, h]) => bindColorPair(document.getElementById(c), document.getElementById(h)));
  bindRadiusControl("styCardRadius", "styCardRadiusDefault", "styCardRadiusVal");
  bindRadiusControl("styBtnRadius", "styBtnRadiusDefault", "styBtnRadiusVal");
})();

$("#appThemeColor").addEventListener("input", markSwatch);
$("#appLogoUrl").addEventListener("input", e => updateLogoPreview(e.target.value.trim()));
$("#appLogoFile").addEventListener("change", e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  updateLogoPreview(URL.createObjectURL(f));
  setUploadMsg($("#appLogoMsg"), `Selected: ${f.name} — Save dabane par upload hoga.`);
});
$("#addMenuLinkBtn").onclick = () => { $("#menuLinksWrap").insertAdjacentHTML("beforeend", linkRowHtml()); bindLinkRows($("#menuLinksWrap")); };
$("#addFooterLinkBtn").onclick = () => { $("#footerLinksWrap").insertAdjacentHTML("beforeend", linkRowHtml()); bindLinkRows($("#footerLinksWrap")); };
$("#addCheckoutFieldBtn").onclick = () => { $("#checkoutFieldsWrap").insertAdjacentHTML("beforeend", fieldRowHtml()); bindFieldRows($("#checkoutFieldsWrap")); };
$("#addProductFieldBtn").onclick = () => { $("#productFieldsWrap").insertAdjacentHTML("beforeend", fieldRowHtml()); bindFieldRows($("#productFieldsWrap")); };


/* ---------- V3.3 Content tab — list editors (generic row pattern) ----------
   Rows DOM mein hi state hain: up/down DOM nodes move karte hain, delete
   node hatata hai, save waqt readCntList DOM se parhta hai. onclick
   assignment se dobara bind karna safe hai (duplicate listener nahi lagta). */
let contentFilled = false;
const HOW_FIELDS = [["title", "Step title", "text"], ["text", "Step text", "textarea"]];
const FAQ_FIELDS = [["q", "Sawal", "text"], ["a", "Jawab", "textarea"]];
const REVIEW_FIELDS = [["product", "Product (store jaisa naam)", "text"], ["name", "Customer naam", "text"], ["city", "Sheher", "text"], ["rating", "Rating (1–5)", "number"], ["text", "Review text", "textarea"]];
const BUDGET_FIELDS = [["label", "Label (UNDER / ★ TOP PICKS)", "text"], ["amount", "Amount (Rs.1,499 / HIGHEST RATED)", "text"], ["note", "Note", "text"], ["budget", "Budget value (1499 ya top)", "text"]];
const TRUST_FIELDS = [["title", "Title", "text"], ["sub", "Sub text", "text"]];
const SP_FIELDS = [["name", "Naam", "text"], ["product", "Product", "text"], ["city", "Sheher", "text"], ["amount", "Amount", "text"], ["timeText", "Waqt exact", "text"]]; /* V3.6: Instagram reels + blog (Content tab) */ const REEL_FIELDS = [["user", "Instagram username (makeupbydeenak)", "text"], ["avatar", "Avatar image URL (profile photo)", "text"], ["video", "Video link (MP4 ya Instagram reel link)", "text"], ["poster", "Poster/thumbnail image URL", "text"], ["title", "Caption (Wedding Festive)", "text"]]; const BLOG_FIELDS = [["title", "Post title", "text"], ["excerpt", "Short excerpt", "textarea"], ["img", "Image URL", "text"], ["link", "Read-more link (optional)", "text"]]; const LUX_TILE_FIELDS = [["label", "Tile label (FESTIVE WEAR)", "text"], ["cat", "Category naam (bilkul store jaisa)", "text"], ["img", "Image URL (khaali ho to category ki pehli product image)", "text"]]; const LUX_TAB_FIELDS = [["label", "Tab label (Luxury)", "text"], ["cat", "Category naam (bilkul store jaisa)", "text"]]; const LUX_BANNER_FIELDS = [["img", "Banner image URL", "text"], ["eyebrow", "Upar wala chhota text (eyebrow)", "text"], ["title", "Bara heading", "text"], ["button", "Button label (khaali ho to button nahi dikhega)", "text"], ["cat", "Button kholta hai (category naam)", "text"]]; const COLL_PAGE_FIELDS = [["cat", "Category naam (bilkul store jaisa)", "text"], ["title", "Page title (khaali ho to collection ka naam)", "text"], ["subtitle", "Page subtitle (khaali ho to product count)", "text"], ["img", "Collection banner image URL", "text"]];
function escAttr(v){ return String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
function cntRowHtml(fields, row, rowClass, wrapId){
  let h = `<div class="${rowClass || "cnt-row"}">`; const upMap = (wrapId && CNT_UPLOAD_FOLDERS[wrapId]) || {};
  fields.forEach(([k, label, type]) => {
    const v = escAttr(row[k] ?? "");
    h += `<label style="font-size:13px;color:var(--muted)">${label}</label>`;
    if (type === "textarea") h += `<textarea data-f="${k}" rows="2">${v}</textarea>`;
    else if (type === "number") h += `<input data-f="${k}" type="number" min="1" max="5" step="0.1" value="${v}">`;
    else h += `<input data-f="${k}" type="text" value="${v}">`; /* V5 Phase 3: image field par URL ke saath file upload + preview. */ if (upMap[k]) h += `<div class="upload-row"><input type="file" data-cntfile="${k}" accept="image/*"><img class="thumb-sm" data-cntprev="${k}" src="${safeUrl(v) || PLACEHOLDER_IMG}" alt=""></div><p class="upload-msg" data-cntmsg="${k}"></p>`;
  });
  h += `<div class="cnt-row-actions"><button class="btn small" type="button" data-cnt-up>↑ Upar</button><button class="btn small" type="button" data-cnt-down>↓ Neeche</button><button class="btn small danger" type="button" data-cnt-del>Delete</button></div></div>`;
  return h;
}
function bindCntRows(wrap){
  if (!wrap) return;
  wrap.querySelectorAll(".cnt-row").forEach(row => {
    row.querySelector("[data-cnt-up]").onclick = () => { const p = row.previousElementSibling; if (p) wrap.insertBefore(row, p); };
    row.querySelector("[data-cnt-down]").onclick = () => { const n = row.nextElementSibling; if (n) wrap.insertBefore(n, row); };
    row.querySelector("[data-cnt-del]").onclick = () => row.remove(); /* V5 Phase 3: file select par fori preview + Save ka msg; URL type karne par preview update. */ row.querySelectorAll("[data-cntfile]").forEach(inp => { inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; const prev = row.querySelector(`[data-cntprev="${inp.dataset.cntfile}"]`); const msg = row.querySelector(`[data-cntmsg="${inp.dataset.cntfile}"]`); if (prev) prev.src = URL.createObjectURL(f); setUploadMsg(msg, "Image select ho gayi — Save dabane par upload hogi."); }; }); row.querySelectorAll("[data-cntprev]").forEach(prev => { const urlInp = row.querySelector(`[data-f="${prev.dataset.cntprev}"]`); if (urlInp) urlInp.oninput = () => { const u = urlInp.value.trim(); prev.src = u ? (safeUrl(u) || PLACEHOLDER_IMG) : PLACEHOLDER_IMG; }; });
  });
}
function renderCntList(wrapId, rows, fields, rowClass){
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  wrap.innerHTML = (rows || []).map(r => cntRowHtml(fields, r, rowClass, wrapId)).join("");
  bindCntRows(wrap);
}
function readCntList(wrapId, fields){
  const wrap = document.getElementById(wrapId);
  if (!wrap) return [];
  return [...wrap.querySelectorAll(".cnt-row")].map(row => {
    const o = {};
    fields.forEach(([k]) => { const el = row.querySelector(`[data-f="${k}"]`); o[k] = el ? el.value.trim() : ""; });
    return o;
  }).filter(o => Object.values(o).some(v => v !== ""));
}
/* ---------- V5 Phase 4: Custom Pages editor (Content tab) ----------
Har row = aik page: title, slug (auto title se, English), body (rich text —
B/I/Link/List toolbar, whitelist HTML), SEO title, header/footer menu
checkboxes, live preview. Slug unique + URL-safe; khaali slug title se
banta hai; Urdu title ho to fallback "page-<n>" (admin badal sakta hai).
Save par readCustomPages() DOM se parhta hai — generic readCntList nahi,
kyunke slug dedupe + checkbox + body-cap yahin hoti hai. */
const CUSTOM_PAGE_MAX = 20;
const CUSTOM_PAGE_BODY_MAX = 20000;
function slugifyPageTitle(t){ return String(t || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60); }
function sanitizePageHtmlAdmin(html){
  /* Storefront sanitizePageHtml ki copy — admin aur storefront alag files
  hain, shared module nahi (mergeSettings bhi dono mein duplicate hai).
  Dono ka output aik jaisa hona chahiye (harness H-P). */
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
function customPageRowHtml(p){
  p = p || {};
  const slug = escAttr(p.slug || "");
  const link = slug ? ("index.html?store=" + encodeURIComponent(STORE_SLUG || "shopnest") + "&page=" + encodeURIComponent(slug)) : "";
  return `<div class="cnt-row" data-custompage-row>
    <label style="font-size:13px;color:var(--muted)">Page title</label>
    <input data-f="title" type="text" value="${escAttr(p.title || "")}" placeholder="About Us">
    <label style="font-size:13px;color:var(--muted)">Slug (link ka hissa — English, unique)</label>
    <input data-f="slug" type="text" value="${slug}" placeholder="about-us"${slug ? ' data-touched="1"' : ""}>
    <p data-page-link style="color:var(--muted);font-size:13px;margin:6px 0 0">${link ? ("Page ka link: <a href=\"" + escAttr(link) + "\" target=\"_blank\" rel=\"noopener\">" + escAttr(link) + "</a>") : "Slug likhte hi page ka link yahan dikhega."}</p>
    <label style="font-size:13px;color:var(--muted)">Page text (rich text)</label>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0">
      <button class="btn small" type="button" data-cp-bold><b>B</b></button>
      <button class="btn small" type="button" data-cp-italic><i>I</i></button>
      <input type="url" data-cp-linkurl placeholder="https://... ya page:slug" style="flex:1;min-width:140px">
      <button class="btn small" type="button" data-cp-link>🔗 Link</button>
      <button class="btn small" type="button" data-cp-list>• List</button>
    </div>
    <textarea data-f="body" rows="5" maxlength="20000" placeholder="Page ka text likhein...">${escAttr(p.body || "")}</textarea>
    <div data-cp-preview style="border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin-top:6px;font-size:14px;line-height:1.7;"></div>
    <label style="font-size:13px;color:var(--muted)">SEO title (khaali ho to page title)</label>
    <input data-f="seoTitle" type="text" value="${escAttr(p.seoTitle || "")}" placeholder="About Us — Store Name">
    <label class="checkline"><input type="checkbox" data-f="showInHeader"${p.showInHeader ? " checked" : ""}> Header menu mein dikhayein</label>
    <label class="checkline"><input type="checkbox" data-f="showInFooter"${p.showInFooter ? " checked" : ""}> Footer menu mein dikhayein</label>
    <div class="cnt-row-actions"><button class="btn small" type="button" data-cnt-up>↑ Upar</button><button class="btn small" type="button" data-cnt-down>↓ Neeche</button><button class="btn small danger" type="button" data-cnt-del>Delete</button></div></div>`;
}
function cpWrap(ta, open, close){
  if (!ta) return;
  const s = (ta.selectionStart === null ? ta.value.length : ta.selectionStart);
  const e = (ta.selectionEnd === null ? ta.value.length : ta.selectionEnd);
  const sel = ta.value.slice(s, e);
  if (sel) ta.setRangeText(open + sel + close, s, e, "end");
  else { ta.setRangeText(open + close, s, e, "end"); ta.setSelectionRange(s + open.length, s + open.length); }
  ta.focus();
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}
function cpList(ta){
  if (!ta) return;
  const s = (ta.selectionStart === null ? 0 : ta.selectionStart);
  const e = (ta.selectionEnd === null ? ta.value.length : ta.selectionEnd);
  const sel = ta.value.slice(s, e) || ta.value;
  const items = sel.split(/\n/).map(x => x.trim()).filter(Boolean);
  if (!items.length) return;
  const html = "<ul>\n" + items.map(x => "<li>" + x + "</li>").join("\n") + "\n</ul>";
  if (ta.value.slice(s, e)) ta.setRangeText(html, s, e, "end");
  else ta.value = html;
  ta.focus();
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}
function cpUpdateRow(row){
  if (!row) return;
  const titleEl = row.querySelector('[data-f="title"]');
  const slugEl = row.querySelector('[data-f="slug"]');
  const bodyEl = row.querySelector('[data-f="body"]');
  const linkEl = row.querySelector("[data-page-link]");
  const prevEl = row.querySelector("[data-cp-preview]");
  if (slugEl && titleEl && !slugEl.dataset.touched){
    const auto = slugifyPageTitle(titleEl.value);
    if (auto) slugEl.value = auto;
  }
  if (linkEl && slugEl){
    const slug = slugifyPageTitle(slugEl.value);
    const href = "index.html?store=" + encodeURIComponent(STORE_SLUG || "shopnest") + "&page=" + encodeURIComponent(slug);
    linkEl.innerHTML = slug ? ("Page ka link: <a href=\"" + escAttr(href) + "\" target=\"_blank\" rel=\"noopener\">" + escAttr(href) + "</a>") : "Slug likhte hi page ka link yahan dikhega.";
  }
  if (prevEl && bodyEl) prevEl.innerHTML = sanitizePageHtmlAdmin(bodyEl.value);
}
function bindCustomPageRows(wrap){
  if (!wrap) return;
  wrap.querySelectorAll("[data-custompage-row]").forEach(row => {
    row.querySelector("[data-cnt-up]").onclick = () => { const p = row.previousElementSibling; if (p) wrap.insertBefore(row, p); };
    row.querySelector("[data-cnt-down]").onclick = () => { const n = row.nextElementSibling; if (n) wrap.insertBefore(n, row); };
    row.querySelector("[data-cnt-del]").onclick = () => row.remove();
    const titleEl = row.querySelector('[data-f="title"]');
    const slugEl = row.querySelector('[data-f="slug"]');
    const bodyEl = row.querySelector('[data-f="body"]');
    if (titleEl) titleEl.oninput = () => cpUpdateRow(row);
    if (slugEl) slugEl.oninput = () => { slugEl.dataset.touched = "1"; cpUpdateRow(row); };
    if (bodyEl) bodyEl.oninput = () => cpUpdateRow(row);
    const boldBtn = row.querySelector("[data-cp-bold]");
    if (boldBtn) boldBtn.onclick = () => cpWrap(bodyEl, "<b>", "</b>");
    const itBtn = row.querySelector("[data-cp-italic]");
    if (itBtn) itBtn.onclick = () => cpWrap(bodyEl, "<i>", "</i>");
    const linkBtn = row.querySelector("[data-cp-link]");
    if (linkBtn) linkBtn.onclick = () => {
      const urlInp = row.querySelector("[data-cp-linkurl]");
      const url = urlInp ? urlInp.value.trim() : "";
      if (!/^(https?:|mailto:|page:)/i.test(url)){ toast("Link ke liye https://... ya page:slug likhein"); return; }
      cpWrap(bodyEl, '<a href="' + url.replace(/"/g, "") + '">', "</a>");
    };
    const listBtn = row.querySelector("[data-cp-list]");
    if (listBtn) listBtn.onclick = () => cpList(bodyEl);
    cpUpdateRow(row);
  });
}
function renderCustomPages(rows){
  const wrap = document.getElementById("cntCustomPagesWrap");
  if (!wrap) return;
  wrap.innerHTML = (rows || []).map(p => customPageRowHtml(p)).join("");
  bindCustomPageRows(wrap);
}
function addCustomPageRow(){
  const wrap = document.getElementById("cntCustomPagesWrap");
  if (!wrap) return;
  wrap.insertAdjacentHTML("beforeend", customPageRowHtml({}));
  bindCustomPageRows(wrap);
}
function readCustomPages(){
  const wrap = document.getElementById("cntCustomPagesWrap");
  if (!wrap) return [];
  const seen = {};
  return [...wrap.querySelectorAll("[data-custompage-row]")].map((row, i) => {
    const val = k => { const el = row.querySelector(`[data-f="${k}"]`); return el ? el.value.trim() : ""; };
    const chk = k => { const el = row.querySelector(`[data-f="${k}"]`); return !!(el && el.checked); };
    let slug = slugifyPageTitle(val("slug") || val("title"));
    if (!slug) slug = "page-" + (i + 1);
    if (seen[slug]){ let n = 2; while (seen[slug + "-" + n]) n++; slug = slug + "-" + n; }
    seen[slug] = true;
    return { slug, title: val("title"), body: val("body").slice(0, CUSTOM_PAGE_BODY_MAX), seoTitle: val("seoTitle"), showInHeader: chk("showInHeader"), showInFooter: chk("showInFooter") };
  }).filter(p => p.title || p.body).slice(0, CUSTOM_PAGE_MAX);
}
function fillContent(s){
  const g = id => document.getElementById(id);
  if (g("cntAboutHeading")) g("cntAboutHeading").value = s.about_heading || "";
  if (g("cntAboutText")) g("cntAboutText").value = s.about_text || "";
  if (g("cntFooterText")) g("cntFooterText").value = s.footer_text || "";
  renderCntList("cntHowWrap", s.howSteps || [], HOW_FIELDS);
  renderCntList("cntFaqWrap", s.faqs || [], FAQ_FIELDS);
  renderCntList("cntReviewsWrap", s.reviews || [], REVIEW_FIELDS);
  renderCntList("cntBudgetWrap", s.budgetTiles || [], BUDGET_FIELDS);
  renderCntList("cntTrustWrap", s.trustItems || [], TRUST_FIELDS); /* V3.6: Instagram + blog (checkboxes: stored false ho to uncheck). */ if (g("cntInstaHandle")) g("cntInstaHandle").value = s.instaHandle || ""; if (g("cntShowReels")) g("cntShowReels").checked = s.showReels !== false; if (g("cntShowBlog")) g("cntShowBlog").checked = s.showBlog !== false; /* V3.9: fashion toggles + section/PDP text. */ if (g("cntShowSizes")) g("cntShowSizes").checked = s.showSizes !== false; if (g("cntShowColors")) g("cntShowColors").checked = s.showColors !== false; if (g("cntShowDisclaimer")) g("cntShowDisclaimer").checked = s.showDisclaimer !== false; SECTION_TEXT_KEYS_ADMIN.forEach(k => { if (g("cntSec_" + k + "_eyebrow")) g("cntSec_" + k + "_eyebrow").value = (s.sectionText && s.sectionText[k] && s.sectionText[k].eyebrow) || ""; if (g("cntSec_" + k + "_title")) g("cntSec_" + k + "_title").value = (s.sectionText && s.sectionText[k] && s.sectionText[k].title) || "";}); if (g("cntPdpDetails")) g("cntPdpDetails").value = (s.pdpText && s.pdpText.details) || ""; if (g("cntPdpRelated")) g("cntPdpRelated").value = (s.pdpText && s.pdpText.related) || ""; if (g("cntPdpDelivery")) g("cntPdpDelivery").value = (s.pdpText && s.pdpText.delivery) || ""; /* V3.10: Luxury tiles/tabs/banner. */ renderCntList("cntLuxTilesWrap", s.luxuryTiles || [], LUX_TILE_FIELDS); renderCntList("cntLuxTabsWrap", s.luxuryTabs || [], LUX_TAB_FIELDS); /* V3.11: Ready To Wear tabs + Editorial slider banners. */ renderCntList("cntLuxRtwTabsWrap", s.luxuryRtwTabs || [], LUX_TAB_FIELDS); renderCntList("cntLuxBannersWrap", s.luxuryBanners || [], LUX_BANNER_FIELDS); renderCntList("cntCollPagesWrap", s.collectionPages || [], COLL_PAGE_FIELDS); renderCustomPages(s.customPages || []); renderCntList("cntReelsWrap", s.instaReels || [], REEL_FIELDS); renderCntList("cntBlogWrap", s.blogPosts || [], BLOG_FIELDS);
  contentFilled = true;
}
function addCntRow(wrapId, fields, rowClass){
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  wrap.insertAdjacentHTML("beforeend", cntRowHtml(fields, {}, rowClass, wrapId));
  bindCntRows(wrap);
}
$("#addCntHowBtn").onclick = () => addCntRow("cntHowWrap", HOW_FIELDS);
$("#addCntFaqBtn").onclick = () => addCntRow("cntFaqWrap", FAQ_FIELDS);
$("#addCntReviewsBtn").onclick = () => addCntRow("cntReviewsWrap", REVIEW_FIELDS);
$("#addCntBudgetBtn").onclick = () => addCntRow("cntBudgetWrap", BUDGET_FIELDS);
$("#addCntTrustBtn").onclick = () => addCntRow("cntTrustWrap", TRUST_FIELDS); $("#addCntReelsBtn").onclick = () => addCntRow("cntReelsWrap", REEL_FIELDS); $("#addCntBlogBtn").onclick = () => addCntRow("cntBlogWrap", BLOG_FIELDS); document.getElementById("addCntLuxTilesBtn").onclick = () => addCntRow("cntLuxTilesWrap", LUX_TILE_FIELDS); document.getElementById("addCntLuxTabsBtn").onclick = () => addCntRow("cntLuxTabsWrap", LUX_TAB_FIELDS); $("#addCntLuxRtwTabsBtn").onclick = () => addCntRow("cntLuxRtwTabsWrap", LUX_TAB_FIELDS); $("#addCntLuxBannersBtn").onclick = () => addCntRow("cntLuxBannersWrap", LUX_BANNER_FIELDS); document.getElementById("addCntCollPagesBtn").onclick = () => addCntRow("cntCollPagesWrap", COLL_PAGE_FIELDS); /* V5 Phase 4: null-guard — HTML box (commit 3) se pehle JS aaye to admin na toote. */ const _acpb = document.getElementById("addCntCustomPagesBtn"); if (_acpb) _acpb.onclick = () => addCustomPageRow();
$("#addSpEntryBtn").onclick = () => addCntRow("spEntriesWrap", SP_FIELDS, "sp-row cnt-row");
function renderSpEntries(entries){
  renderCntList("spEntriesWrap", entries || [], SP_FIELDS, "sp-row cnt-row");
}
function readSpEntries(){
  return readCntList("spEntriesWrap", SP_FIELDS);
}

/* ---------- Settings SAVE (shared) ----------
   Settings / Homepage / Appearance teeno tabs ki save EK hi routine hai:
   saare tabs ke DOM se values parh kar EK settings.data upsert hota hai,
   taa ke kisi ek tab ki save doosre tab ki values ko wipe na kare.
   Upar wala topbar Save button bhi yehi routine chalata hai. */
/* ---------- (A) Luxury auto-seed: theme-apply par 7 categories ----------    Jab admin Appearance se Luxury theme save karta hai aur store ka Luxury    content bilkul khaali hai (tiles/tabs/banners/reels — sab khaali), to 7    Luxury categories auto-ban jati hain jo store mein pehle se na hon.    VALUES seed nahi hoti (na shopnest ki, na images/handle) — sirf structure.    Kabhi overwrite nahi: koi bhi Luxury list non-empty ho to kuch nahi hota.    Seed condition "values empty" hai, "keys absent" nahi — persistAllSettings    har Save par poora merged object likhta hai, is liye khaali keys DB mein    maujood hoti hain. */ const LUXURY_CATEGORIES = ["Luxury", "Daily Wear", "Embroidered", "Pret", "Luxury Pret", "Daily Wear Pret", "Embroidered Pret"]; async function seedLuxuryCategories(savedData){   const empty = v => !Array.isArray(v) || v.length === 0;   try {     if (!savedData || savedData.theme !== "luxury") return { created: 0, skipped: true };     if (!empty(savedData.luxuryTiles) || !empty(savedData.luxuryTabs) || !empty(savedData.luxuryRtwTabs) || !empty(savedData.luxuryBanners) || !empty(savedData.instaReels)) return { created: 0, skipped: true };     const { data: existing, error: e0 } = await sb.from("categories").select("name, sort").eq("store_id", STORE_ID);     if (e0) throw e0;     const have = new Set((existing || []).map(c => String(c.name || "").trim().toLowerCase()));     let maxSort = (existing || []).reduce((m, c) => Math.max(m, Number(c.sort) || 0), 0);     const missing = LUXURY_CATEGORIES.filter(n => !have.has(n.toLowerCase()));     if (!missing.length) return { created: 0, skipped: false };     const rows = missing.map(n => { maxSort += 1; return { store_id: STORE_ID, name: n, image: "", visible: true, sort: maxSort }; });     const { error } = await sb.from("categories").insert(rows);     if (error) throw error;     if (typeof loadCategories === "function") loadCategories();     showToast("👑 Luxury theme: " + rows.length + " categories ban gayin.", "ok");     return { created: rows.length, skipped: false };   } catch (e) {     showToast("Luxury categories seed fail: " + (e && e.message ? e.message : e), "err");     return { created: 0, error: e };   } } /* ================= V5 Phase 5: Meta tab (Pixel + CAPI + custom code) =================
   Token kabhi settings.data mein nahi jata — sirf store_meta_secrets (Part B).
   fillMeta: token field hamesha khali rehta hai; placeholder mein •••• + last4 dikhta hai. */
function fillMeta(s){
  const pid = $("#metaPixelId"); if (!pid) return; /* Panel abhi DOM mein nahi. */
  const m = (s && s.meta) || {};
  const cc = (s && s.customCode) || {};
  pid.value = String(m.pixelId || "");
  const en = $("#metaCapiEnabled"); if (en) en.checked = m.capiEnabled === true;
  const tec = $("#metaTestEventCode"); if (tec) tec.value = String(m.testEventCode || "");
  const tok = $("#metaCapiToken"); if (tok){ tok.value = ""; tok.placeholder = m.hasCapiToken ? ("••••••••" + String(m.capiTokenLast4 || "")) : "Meta Events Manager se token paste karein"; }
  const del = $("#metaCapiDelete"); if (del) del.checked = false;
  const st = $("#metaTokenState"); if (st) st.textContent = m.hasCapiToken ? ("Token save hai ••••" + String(m.capiTokenLast4 || "") + " — naya token paste karke Save dabayein, ya delete tick karke Save karein.") : "Koi CAPI token save nahi — Pixel akela bhi kaam karega.";
  const ch = $("#metaCodeHead"); if (ch) ch.value = String(cc.head || "");
  const cb = $("#metaCodeBody"); if (cb) cb.value = String(cc.body || "");
  metaRenderLog();
}
function readMeta(){
  const pidEl = $("#metaPixelId");
  if (!pidEl) return null; /* Meta panel DOM mein nahi (HTML commit abhi nahi aaya) — SETTINGS_STATE ki values rehti hain. */
  const prev = (SETTINGS_STATE && SETTINGS_STATE.meta) || {};
  const tokEl = $("#metaCapiToken");
  const delEl = $("#metaCapiDelete");
  let hasTok = prev.hasCapiToken === true, last4 = String(prev.capiTokenLast4 || "");
  const newTok = tokEl ? String(tokEl.value || "").trim() : "";
  if (delEl && delEl.checked){ hasTok = false; last4 = ""; }
  else if (newTok){ hasTok = true; last4 = newTok.slice(-4); }
  return { pixelId: String(pidEl.value || "").replace(/[^0-9]/g, "").slice(0, 20), capiEnabled: !!($("#metaCapiEnabled") && $("#metaCapiEnabled").checked), testEventCode: String((($("#metaTestEventCode") || {}).value) || "").slice(0, 64), hasCapiToken: hasTok, capiTokenLast4: last4 };
}
function readCustomCode(){
  return { head: String((($("#metaCodeHead") || {}).value) || "").slice(0, 50000), body: String((($("#metaCodeBody") || {}).value) || "").slice(0, 50000) };
}
function metaRenderLog(){
  const box = $("#metaEventLog"); if (!box) return;
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem("sn_meta_log_v1") || "[]"); if (!Array.isArray(arr)) arr = []; } catch (e){ arr = []; }
  if (!arr.length){ box.textContent = "Abhi koi event log nahi — test button dabayein ya store par koi action karein."; return; }
  box.innerHTML = arr.map(e => "<div>" + esc(e.t || "") + " — " + esc(e.kind || "") + " " + esc(e.name || "") + " — " + (e.ok ? "OK" : "FAIL") + " — " + esc(e.detail || "") + "</div>").join("");
}
function metaTestPixel(){
  const pid = String((($("#metaPixelId") || {}).value) || "").replace(/[^0-9]/g, "");
  const msg = $("#metaMsg");
  if (!pid){ if (msg){ msg.textContent = "Pehle Pixel ID likhein, phir test karein."; msg.className = "msg err"; } return; }
  /* HQ-A-08: fbq admin page par kabhi load nahi hota (pixel script sirf
     storefront par hai) — is liye pehle fbq check karein; na ho to jhooti
     success NA dikhayein. */
  if (typeof window.fbq !== "function"){
    try { const arr = JSON.parse(localStorage.getItem("sn_meta_log_v1") || "[]"); arr.unshift({ t: new Date().toISOString(), kind: "test", name: "PageView", ok: false, detail: "fbq maujood nahi — test nahi bheja gaya" }); localStorage.setItem("sn_meta_log_v1", JSON.stringify(arr.slice(0, 20))); } catch (e){}
    metaRenderLog();
    if (msg){ msg.textContent = "Pixel load nahi hua — admin page par pixel script nahi hai; test nahi bheja gaya. Storefront khol kar wahan se test karein ya Events Manager check karein."; msg.className = "msg err"; }
    return;
  }
  try {
    window.fbq("track", "PageView", {}, { eventID: "test_" + Date.now().toString(36) });
    try { const arr = JSON.parse(localStorage.getItem("sn_meta_log_v1") || "[]"); arr.unshift({ t: new Date().toISOString(), kind: "test", name: "PageView", ok: true, detail: "admin test — Events Manager → Test Events mein dekhein" }); localStorage.setItem("sn_meta_log_v1", JSON.stringify(arr.slice(0, 20))); } catch (e){}
    metaRenderLog();
    if (msg){ msg.textContent = "Test PageView bhej diya — Meta Events Manager → Test Events mein 1–2 minute mein nazar aana chahiye."; msg.className = "msg ok"; }
  } catch (e){ if (msg){ msg.textContent = "Test nahi bhej saka: " + (e && e.message ? e.message : ""); msg.className = "msg err"; } }
}
function bindMetaTab(){
  const tb = $("#metaTestPixelBtn"); if (tb) tb.onclick = metaTestPixel;
  const cl = $("#metaClearLogBtn"); if (cl) cl.onclick = () => { try { localStorage.removeItem("sn_meta_log_v1"); } catch (e){} metaRenderLog(); };
  const tg = $("#metaTokenToggle"); if (tg) tg.onclick = () => { const tok = $("#metaCapiToken"); if (!tok) return; tok.type = tok.type === "password" ? "text" : "password"; tg.textContent = tok.type === "password" ? "👁 dikhayein" : "🙈 chhupayein"; };
  /* Stale-save guard: Meta tab ke fields chhooey jayein to hi metaDirty — warna
     persistAllSettings meta/customCode payload se hata dega aur RPC ka top-level
     merge stored meta ko mehfooz rakhega (capiEnabled overwrite nahi hota).
     Programmatic fill (fillMeta) input/change events nahi chalata, is liye ye
     sirf asal user edits par set hota hai. */
  ["metaPixelId", "metaCapiEnabled", "metaTestEventCode", "metaCapiToken", "metaCapiDelete", "metaCodeHead", "metaCodeBody"].forEach(fid => {
    const el = document.getElementById(fid);
    if (!el) return;
    el.addEventListener("input", () => { metaDirty = true; });
    el.addEventListener("change", () => { metaDirty = true; });
  });
}
async function persistAllSettings(){
  /* HQ-A-03: load fail / load pending ho to save se inkaar — defaults se
     asal settings overwrite nahi honi chahiye. */
  if (settingsLoadFailed || !settingsLoaded){
    const blockMsg = settingsLoadFailed
      ? "Settings load nahi hui — save mat karein. Page reload karein, phir save karein."
      : "Settings abhi load ho rahi hain — thori dair ruk kar dobara save karein.";
    showSettingsLoadBanner(settingsLoadFailed);
    setSettingsSaveDisabled(settingsLoadFailed);
    const topMsg0 = $("#topSaveMsg");
    if (topMsg0) topMsg0.textContent = blockMsg;
    showToast(blockMsg, "err");
    const m0 = $("#settingsMsg"); if (m0){ m0.textContent = blockMsg; m0.className = "msg err"; }
    return;
  }
  const saveBtns = [...document.querySelectorAll(".js-save, #globalSaveBtn")];
  const savedLabels = saveBtns.map(b => b.innerHTML);
  saveBtns.forEach(b => { b.disabled = true; b.textContent = "Saving…"; });
  const msgEls = { settings: $("#settingsMsg"), homepage: $("#homepageMsg"), appearance: $("#appearanceMsg"), style: $("#styleMsg"), content: $("#contentMsg"), sections: $("#sectionsMsg"), meta: $("#metaMsg") }; /* V5 Phase 5: metaMsg. */
  Object.values(msgEls).forEach(m => { if (m){ m.textContent = ""; m.className = "msg"; } });
  const topMsg = $("#topSaveMsg");
  if (topMsg) topMsg.textContent = "";
  let pendingToken = null;   /* HQ-A-09: token save settings ke BAAD, alag se. */
  let tokenSaveError = null;
  try {
    const data = JSON.parse(JSON.stringify(SETTINGS_STATE || mergeAdminSettings(null)));
    /* Hero slides (pending file uploads samet) */
    const hero = await collectHeroSlides(); /* V5 Phase 3: Content-list uploads — hero ke baad, Content reads se pehle. */ await collectCntUploads();
    heroState = JSON.parse(JSON.stringify(hero));
    data.hero = hero;
    /* Settings tab ke fields */
    data.store_name = $("#setStoreName").value.trim() || ADMIN_DEFAULT_SETTINGS.store_name;
    data.announcements = [1, 2, 3, 4].map(i => document.getElementById("setAnn" + i).value.trim());
    data.promo = [1, 2].map(n => ({
      kicker: document.getElementById(`setP${n}Kicker`).value.trim(),
      heading: document.getElementById(`setP${n}Heading`).value.trim(),
      text: document.getElementById(`setP${n}Text`).value.trim(),
      category: document.getElementById(`setP${n}Category`).value.trim()
    }));
    /* V3.3: Content tab khula ho to wahi about fields jeet-ti hain, warna Settings tab. */
    data.about_heading = ((contentFilled && $("#cntAboutHeading")) ? $("#cntAboutHeading").value.trim() : $("#setAboutHeading").value.trim()) || ADMIN_DEFAULT_SETTINGS.about_heading;
    data.about_text = ((contentFilled && $("#cntAboutText")) ? $("#cntAboutText").value.trim() : $("#setAboutText").value.trim()) || ADMIN_DEFAULT_SETTINGS.about_text;
    data.whatsapp_number = $("#setWhatsapp").value.trim();
    /* [FLAT-FEE] Flat delivery fee: khaali = unset (per-product-once fallback); 0 = FREE. Invalid input => unset (safe). */
    const dffRaw = $("#setDeliveryFeeFlat") ? $("#setDeliveryFeeFlat").value.trim() : "";
    const dffNum = parseInt(dffRaw, 10);
    data.delivery_fee_flat = (dffRaw === "" || !Number.isFinite(dffNum)) ? null : Math.max(0, dffNum);
    /* V3 Part B: SEO */
    data.seo_title = $("#setSeoTitle") ? $("#setSeoTitle").value.trim() : "";
    data.seo_description = $("#setSeoDesc") ? $("#setSeoDesc").value.trim() : "";
    const secToggles = {};
    document.querySelectorAll("[data-sec]").forEach(cb => { secToggles[cb.dataset.sec] = cb.checked; });
    data.sections = secToggles;
    const policies = {};
    document.querySelectorAll("[data-pol]").forEach(ta => { policies[ta.dataset.pol] = ta.value; });
    data.policies = policies;
    /* Profile logo (Settings tab) — file lagi ho to upload */
    let profLogo = $("#profLogo").value.trim();
    const profLogoFile = $("#profLogoFile").files[0];
    if (profLogoFile){
      setUploadMsg($("#profLogoMsg"), "Logo upload ho raha hai…");
      profLogo = await uploadImage(profLogoFile, "profile");
      $("#profLogo").value = profLogo;
      $("#profLogoFile").value = "";
      setUploadMsg($("#profLogoMsg"), "✅ Logo upload complete.", "ok");
    }
    data.profile = {
      logo_url: profLogo,
      email: $("#profEmail").value.trim(),
      phone: $("#profPhone").value.trim(),
      address: $("#profAddress").value.trim()
    };
    /* Appearance: logo (apni file lagi ho to upload) — logo_url hi asal key hai;
       profile.logo_url ko bhi sync rakhte hain taa ke mojooda storefront logo dikhaye. */
    let appLogo = $("#appLogoUrl").value.trim();
    const appLogoFile = $("#appLogoFile").files[0];
    if (appLogoFile){
      setUploadMsg($("#appLogoMsg"), "Logo upload ho raha hai…");
      appLogo = await uploadImage(appLogoFile, "profile");
      $("#appLogoUrl").value = appLogo;
      $("#appLogoFile").value = "";
      updateLogoPreview(appLogo);
      setUploadMsg($("#appLogoMsg"), "✅ Logo upload complete.", "ok");
    }
    /* Logo-clear fix: do fields (#appLogoUrl + #profLogo) aik hi logo hain —
       purana `appLogo || profLogo` kisi aik field ko khaali karne par doosre
       field ki purani value se logo wapas la deta tha, aur `if (data.logo_url)`
       sync-back khaali karne par profile ko dobara bhar deta tha — is liye
       logo kabhi clear nahi hota tha (Module 2 §2.1 #10: dono saves se ignore).
       Ab: jis field ki value load-time value se badli ho, woh jeet-ti hai
       (khaali karna bhi jeet-ta hai); dono na badlein to purana logo rehta
       hai. Jeetne wali value dono keys mein aik saath likhte hain, kyunke
       storefront `logo_url || profile.logo_url` parhta hai (script.js:519) —
       sirf aik saaf karne se header logo rehta. Dono na badlein to dono keys
       aur dono DOM fields stored values par hi rehte hain — warna aik
       divergent stored pair (logo_url != profile.logo_url, legacy data mein
       mumkin) har ghair-mutalliq save par chup-chap aik value mein collapse
       ho jata. DOM fields bhi sync karte hain, warna agla save purani DOM
       value se logo wapas la dega. */
    const prevAppLogo = (SETTINGS_STATE && (SETTINGS_STATE.logo_url || (SETTINGS_STATE.profile && SETTINGS_STATE.profile.logo_url))) || "";
    const prevProfLogo = (SETTINGS_STATE && SETTINGS_STATE.profile && SETTINGS_STATE.profile.logo_url) || "";
    let newLogo = prevAppLogo;
    let logoChanged = false;
    if (appLogo !== prevAppLogo){ newLogo = appLogo; logoChanged = true; }
    else if (profLogo !== prevProfLogo){ newLogo = profLogo; logoChanged = true; }
    if (logoChanged){
      data.logo_url = newLogo;
      data.profile.logo_url = newLogo;
      if ($("#appLogoUrl").value !== newLogo) $("#appLogoUrl").value = newLogo;
      if ($("#profLogo").value !== newLogo) $("#profLogo").value = newLogo;
    }
    updateLogoPreview(newLogo);
    data.font_family = fontObjFromName($("#appFont").value);
    /* V3 theme: sirf known key save ho, warna khaali (general fallback) */
    data.theme = (window.SHOPNEST_THEME_KNOWN && window.SHOPNEST_THEME_KNOWN(ADMIN_THEME_SELECTED)) ? ADMIN_THEME_SELECTED : "";
    data.theme_color = $("#appThemeColor").value || "";
    data.socials = {
      facebook: $("#socFacebook").value.trim(),
      instagram: $("#socInstagram").value.trim(),
      tiktok: $("#socTiktok").value.trim(),
      youtube: $("#socYoutube").value.trim(),
      x: $("#socX").value.trim(),
      whatsapp: $("#socWhatsapp").value.trim()
    };
    data.menu_links = readLinkRows($("#menuLinksWrap"));
    data.footer_links = readLinkRows($("#footerLinksWrap"));
    data.footer_text = (contentFilled && $("#cntFooterText")) ? $("#cntFooterText").value : $("#footerText").value;
    /* Homepage builder */
    if (homepageFilled){
      syncHomepageFromDom();
      data.sections_order = HP_ORDER.map(e => ({ key: e.key, visible: e.visible !== false }));
      data.custom_sections = Object.entries(HP_CUSTOM).map(([id, c]) => ({ id, heading: c.heading, text: c.text, img: c.img, btn_label: c.btn_label, btn_link: c.btn_link }));
      /* Bridge: jo storefront abhi settings.sections parhta hai, us ke liye
         builder ki visibility legacy toggles mein bhi likh dein. */
      HP_ORDER.forEach(e => { const lk = LEGACY_SEC[e.key]; if (lk) data.sections[lk] = e.visible !== false; });
    }
    /* Custom fields */
    data.checkout_fields = readFieldRows($("#checkoutFieldsWrap"));
    data.product_fields = readFieldRows($("#productFieldsWrap"));
    /* V3.2 Style Editor — shared save ka hissa; baaki tabs ki tarah
       SETTINGS_STATE clone se shuru hone ki wajah se koi tab wipe nahi hota. */
    data.style = readStyle();
    data.sectionStyles = readSectionStyles();
    /* V5 Phase 5: Meta + custom code — sirf jab Meta panel DOM mein ho (HTML commit pehle aaya). */
    const metaRead = readMeta();
    if (metaRead){
      data.meta = metaRead;
      data.customCode = readCustomCode();
/* CAPI token — server-side save (Part B2 Edge Function "meta-token-save").
         FIX 2026-11-04 (UPSERT/UPDATE bug): store_meta_secrets par koi SELECT policy
         nahi (token kabhi client se parha na jaye — by design), is liye client-side
         UPSERT/DELETE purani row ko dekh hi nahi sakta aur 403 deta hai (plain INSERT
         chalta hai, UPDATE/DELETE nahi — test se prove). Is liye token save ab Edge
         Function se hota hai — function caller ka JWT verify karke (owner/admin/
         platform admin) aur service_role se upsert/delete karta hai (RLS bypass). */
      /* HQ-A-09: token yahan sirf NOTE karte hain — save settings ke baad
         alag se hoga, taa ke token fail ho to settings save na ruke. */
      const tokEl = $("#metaCapiToken");
      const delEl = $("#metaCapiDelete");
      const newTok = tokEl ? String(tokEl.value || "").trim() : "";
      if ((delEl && delEl.checked) || newTok) pendingToken = { newTok, del: !!(delEl && delEl.checked) };
    }
    /* V3.3 Content — sirf jab Content tab bhara gaya ho; warna SETTINGS_STATE
       ki values (stored ya defaults) waisi ki waisi rehti hain. */
    if (contentFilled){
      data.howSteps = readCntList("cntHowWrap", HOW_FIELDS);
      data.faqs = readCntList("cntFaqWrap", FAQ_FIELDS);
      data.reviews = readCntList("cntReviewsWrap", REVIEW_FIELDS).map(r => {
        const v = parseFloat(r.rating);
        return { ...r, rating: Number.isFinite(v) ? Math.min(5, Math.max(1, v)) : 5 };
      });
      data.budgetTiles = readCntList("cntBudgetWrap", BUDGET_FIELDS);
      data.trustItems = readCntList("cntTrustWrap", TRUST_FIELDS); /* V3.6: Instagram + blog (Content tab bhara ho to wahi jeet-ta hai). */ data.instaHandle = (document.getElementById("cntInstaHandle") ? document.getElementById("cntInstaHandle").value.trim() : ""); data.showReels = document.getElementById("cntShowReels") ? document.getElementById("cntShowReels").checked : true; data.showBlog = document.getElementById("cntShowBlog") ? document.getElementById("cntShowBlog").checked : true; /* V3.9: fashion toggles + section/PDP text. */ data.showSizes = document.getElementById("cntShowSizes") ? document.getElementById("cntShowSizes").checked : true; data.showColors = document.getElementById("cntShowColors") ? document.getElementById("cntShowColors").checked : true; data.showDisclaimer = document.getElementById("cntShowDisclaimer") ? document.getElementById("cntShowDisclaimer").checked : true; if (contentTextDirty){ data.sectionText = {}; SECTION_TEXT_KEYS_ADMIN.forEach(k => { const eb = document.getElementById("cntSec_" + k + "_eyebrow"); const ti = document.getElementById("cntSec_" + k + "_title"); const e = eb ? eb.value.trim() : "", t = ti ? ti.value.trim() : ""; if (e || t) data.sectionText[k] = { eyebrow: e, title: t };}); } data.pdpText = { details: document.getElementById("cntPdpDetails") ? document.getElementById("cntPdpDetails").value.trim() : "", related: document.getElementById("cntPdpRelated") ? document.getElementById("cntPdpRelated").value.trim() : "", delivery: document.getElementById("cntPdpDelivery") ? document.getElementById("cntPdpDelivery").value.trim() : "" }; /* V3.10: Luxury tiles/tabs/banner. */ data.luxuryTiles = readCntList("cntLuxTilesWrap", LUX_TILE_FIELDS); data.luxuryTabs = readCntList("cntLuxTabsWrap", LUX_TAB_FIELDS); /* V3.11: Ready To Wear tabs + Editorial slider banners. */ data.luxuryRtwTabs = readCntList("cntLuxRtwTabsWrap", LUX_TAB_FIELDS); data.luxuryBanners = readCntList("cntLuxBannersWrap", LUX_BANNER_FIELDS); data.collectionPages = readCntList("cntCollPagesWrap", COLL_PAGE_FIELDS); /* V5 Phase 4: wrap na ho to customPages bilkul nahi likhte (purani values mehfooz). */ if (document.getElementById("cntCustomPagesWrap")) data.customPages = readCustomPages(); data.instaReels = readCntList("cntReelsWrap", REEL_FIELDS); data.blogPosts = readCntList("cntBlogWrap", BLOG_FIELDS);
    }
    if (sectionsTextDirty){ data.sectionText = readSectionsText();}
 /* Module 3b: settings save update_store_settings RPC se hoti hai (staff ke
       meta/customCode server par strip hote hain; direct upsert ab
       Owner/Admin-only policy par band hai). */
    const savePayload = JSON.parse(JSON.stringify(data));
    if (effRole() === "staff"){ delete savePayload.meta; delete savePayload.customCode; }
    /* Stale-save guard: Meta tab is session mein chhooa hi nahi gaya to meta/customCode
       payload se hata dein — RPC ka top-level merge (v_stored || v_in) phir stored meta
       ko bilkul waisa ka waisa rakhta hai, chahe page kitna bhi purana ho. */
    if (!metaDirty){ delete savePayload.meta; delete savePayload.customCode; }
    const { data: saved, error } = await sb.rpc("update_store_settings", { p_store_id: STORE_ID, p_data: savePayload });
    if (error) throw error;
    /* HQ-A-09: settings save ho gayin — AB token save karein, apni try/catch
       mein. Token fail ho to settings ka save wapas nahi hota; token ka
       natija alag se bataya jata hai (neeche success message mein). */
    if (pendingToken){
      try {
        const { data: sessData } = await sb.auth.getSession();
        const accessToken = sessData && sessData.session ? sessData.session.access_token : "";
        if (!accessToken) throw new Error("admin session nahi mili, dobara sign in karein.");
        const tokResp = await fetch(SUPABASE_URL + "/functions/v1/meta-token-save", { method: "POST", headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + accessToken, "Content-Type": "application/json" }, body: JSON.stringify({ store_id: STORE_ID, capi_token: pendingToken.newTok, delete: pendingToken.del }) });
        let tokJson = {};
        try { tokJson = await tokResp.json(); } catch (e) {}
        if (!tokResp.ok || !tokJson.ok) throw new Error(tokJson.error || ("HTTP " + tokResp.status));
        const tokEl2 = $("#metaCapiToken"); if (tokEl2) tokEl2.value = "";
        const delEl2 = $("#metaCapiDelete"); if (delEl2) delEl2.checked = false;
      } catch (tokErr) {
        tokenSaveError = tokErr;
      }
    }
    SETTINGS_STATE = saved || data; metaDirty = false; /* save ke baad snapshot fresh hai — agla save dobara sirf chhooe gaye Meta par likhega. */ /* (A) Luxury auto-seed — theme save ho gaya, ab categories (agar khaali hon). Seed apni ghalti khud pakarta hai (toast) — save is se fail nahi hota. */ await seedLuxuryCategories(data);
    renderHeroEditor();
/* V4 Phase 2: theme badla ho to Content/builder/Style dobara dikhayein. */
applyThemeVisibility();
    const okText = "✅ Save ho gaya — store reload karke changes dekhein.";
    Object.values(msgEls).forEach(m => { if (m){ m.textContent = okText; m.className = "msg ok"; } });
    showToast("✅ Save ho gaya — store reload karke changes dekhein.", "ok");
    /* HQ-A-09: token ka natija alag se — settings save ho chuki hain. */
    if (tokenSaveError){
      const tokMsg = "CAPI token save nahi ho saka: " + tokenSaveError.message + " — settings save ho gayin, token dobara save karein.";
      if (msgEls.meta){ msgEls.meta.textContent = tokMsg; msgEls.meta.className = "msg err"; }
      showToast(tokMsg, "err");
    }
    if (topMsg){ topMsg.textContent = "✅ Save ho gaya"; setTimeout(() => { topMsg.textContent = ""; }, 3500); }
  } catch (e) {
    Object.values(msgEls).forEach(m => { if (m){ m.textContent = "Save fail: " + e.message; m.className = "msg err"; } });
    if (topMsg) topMsg.textContent = "";
    showToast("Save fail: " + e.message, "err");
  } finally {
    /* HQ-A-03: load fail hua to buttons dobara enable NA karein. */
    if (!settingsLoadFailed) saveBtns.forEach((b, i) => { b.disabled = false; b.innerHTML = savedLabels[i]; });
  }
}
/* ---------- V3 Part B: CSV export + Low-stock alerts + Domain ---------- */
function downloadCSV(filename, rows){
  const escCell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map(r => r.map(escCell).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function csvDate(){
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
const _expO = $("#exportOrdersBtn");
if (_expO) _expO.onclick = () => {
  const rows = [["Order ID", "Date", "Customer", "Phone", "City", "Address", "Items", "Total", "Status"]];
  ORDERS_CACHE.forEach(o => {
    const lines = orderLines(o);
    rows.push([o.id, new Date(o.created_at).toLocaleString("en-PK"), o.customer_name || "", o.phone || "", o.city || "", o.address || "",
      lines.map(lineLabelPlain).join("; "), o.total || 0, o.status || ""]);
  });
  downloadCSV(`orders-${STORE_SLUG || "store"}-${csvDate()}.csv`, rows);
};
const _expP = $("#exportProductsBtn");
if (_expP) _expP.onclick = () => {
  const rows = [["ID", "Name", "Category", "Price", "Old Price", "Stock", "Live", "Featured"]];
  PRODUCTS_CACHE.forEach(pr => {
    rows.push([pr.id, pr.name || "", pr.cat || "", pr.price || 0, pr.old || "", pr.stock || "", pr.active ? "yes" : "no", pr.featured ? "yes" : "no"]);
  });
  downloadCSV(`products-${STORE_SLUG || "store"}-${csvDate()}.csv`, rows);
};
/* ---------- CSV Import (products) ---------- */
/* Quotes + commas wali CSV theek se parse karta hai. Header ho to columns
   naam se pehchani jati hain (ID column ho to ignore hoti hai); header na
   ho to export wali tartib maani jati hai. Import hamesha NAYE products
   banata hai (purani ko overwrite nahi karta), hidden haalat mein taa ke
   client pehle check karke phir live kare. */
function parseCSV(text){
  const rows = [];
  let row = [], cur = "", inQ = false;
  const s = String(text).replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++){
    const c = s[i];
    if (inQ){
      if (c === '"'){
        if (s[i+1] === '"'){ cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"'){ inQ = true; }
    else if (c === ','){ row.push(cur); cur = ""; }
    else if (c === '\n'){ row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== '\r'){ cur += c; }
  }
  if (cur !== "" || row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(v => String(v).trim() !== ""));
}
function csvColIdx(headers, names){
  const h = headers.map(x => String(x).trim().toLowerCase());
  for (const n of names){
    const i = h.indexOf(n);
    if (i >= 0) return i;
  }
  return -1;
}
const _impP = $("#importProductsFile");
if (_impP) _impP.addEventListener("change", async () => {
  const file = _impP.files && _impP.files[0];
  _impP.value = "";
  if (!file) return;
  const msg = $("#importMsg");
  const setMsg = (t, kind) => { if (msg){ msg.textContent = t; msg.style.color = kind === "err" ? "var(--red)" : "var(--muted)"; } };
  try {
    const rows = parseCSV(await file.text());
    if (!rows.length){ setMsg("CSV khaali hai.", "err"); return; }
    const first = rows[0].map(x => String(x).trim().toLowerCase());
    const hasHeader = first.includes("name") || first.includes("product");
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const idx = hasHeader ? {
      name: csvColIdx(rows[0], ["name", "product"]),
      cat: csvColIdx(rows[0], ["category", "cat"]),
      price: csvColIdx(rows[0], ["price"]),
      old: csvColIdx(rows[0], ["old price", "old"]),
      stock: csvColIdx(rows[0], ["stock"]),
      live: csvColIdx(rows[0], ["live", "active"]),
      featured: csvColIdx(rows[0], ["featured"]),
      img: csvColIdx(rows[0], ["image", "img", "image url"]),
      gallery: csvColIdx(rows[0], ["gallery", "extra images"]),
      desc: csvColIdx(rows[0], ["description", "desc"]),
      rating: csvColIdx(rows[0], ["rating"]),
      reviews: csvColIdx(rows[0], ["reviews"]),
      fee: csvColIdx(rows[0], ["delivery fee", "delivery_fee"]),
      disc: csvColIdx(rows[0], ["discount %", "discount", "discount_pct"]),
    } : { name: 1, cat: 2, price: 3, old: 4, stock: 5, live: 6, featured: 7, img: -1, gallery: -1, desc: -1, rating: -1, reviews: -1, fee: -1, disc: -1 };
    const get = (r, i) => (i >= 0 && r[i] != null ? String(r[i]).trim() : "");
    const yes = v => ["yes", "true", "1", "y", "live", "show"].includes(v.toLowerCase());
    const valid = [], bad = [];
    dataRows.forEach((r, n) => {
      const name = get(r, idx.name);
      const price = parseFloat(get(r, idx.price));
      if (!name || isNaN(price)){ bad.push(n + (hasHeader ? 2 : 1)); return; }
      const stockRaw = get(r, idx.stock).toLowerCase();
      valid.push({
        store_id: STORE_ID,
        name,
        cat: get(r, idx.cat) || "General",
        price: Math.max(0, Math.round(price)),
        old: get(r, idx.old) ? Math.max(0, Math.round(parseFloat(get(r, idx.old)) || 0)) : null,
        stock: (stockRaw === "out" || stockRaw === "out of stock") ? "out" : "in",
        active: idx.live >= 0 ? yes(get(r, idx.live)) : false,
        featured: idx.featured >= 0 ? yes(get(r, idx.featured)) : false,
        img: get(r, idx.img),
        gallery: get(r, idx.gallery) ? get(r, idx.gallery).split("|").map(s => s.trim()).filter(Boolean) : [],
        desc: get(r, idx.desc),
        rating: idx.rating >= 0 ? Math.min(5, Math.max(0, parseFloat(get(r, idx.rating)) || 4.5)) : 4.5,
        reviews: idx.reviews >= 0 ? Math.max(0, parseInt(get(r, idx.reviews)) || 0) : 0,
        delivery_fee: idx.fee >= 0 ? Math.max(0, parseInt(get(r, idx.fee)) || 0) : 0,
        discount_pct: idx.disc >= 0 && get(r, idx.disc) !== "" ? Math.min(90, Math.max(0, Math.round(parseFloat(get(r, idx.disc)) || 0))) : null,
      });
    });
    if (!valid.length){ setMsg(`Koi theek row nahi mili (${bad.length} rows mein naam/price ka masla).`, "err"); return; }
    if (!confirm(`${valid.length} products import ho jayenge (naye products, hidden haalat mein — live karne se pehle check kar lein).${bad.length ? ` ${bad.length} rows chhoot jayengi (naam/price ghalat).` : ""} Jaari rakhein?`)) return;
    setMsg("Import ho raha hai…");
    const { error } = await sb.from("products").insert(valid);
    if (error){ setMsg("Import fail: " + error.message, "err"); showToast("Import fail: " + error.message, "err"); return; }
    setMsg(`✅ ${valid.length} products import ho gayin.${bad.length ? ` ${bad.length} rows chhoot gayin (rows: ${bad.slice(0, 10).join(", ")}).` : ""}`);
    showToast(`✅ ${valid.length} products import ho gayin (hidden — live karne se pehle check kar lein).`, "ok");
    await loadProducts(); loadCategories(); /* category counts bhi fresh hon — products PEHLE await karein (J2) */
  } catch (e) { setMsg("Import fail: " + e.message, "err"); showToast("Import fail: " + e.message, "err"); }
});
/* Low-stock: stock === 'out' wali products ki list — Products tab banner + Dashboard card. */
function renderLowStock(){
  const out = (PRODUCTS_CACHE || []).filter(pr => pr.stock === "out");
  const banner = $("#lowStockBanner");
  if (banner){
    if (out.length){
      banner.hidden = false;
      banner.innerHTML = `<p class="msg err" style="margin:0">⚠️ <strong>${out.length} product(s) out of stock</strong> — ${out.map(pr => escapeHtml(pr.name || ("#" + pr.id))).join(", ")}</p>`;
    } else { banner.hidden = true; banner.innerHTML = ""; }
  }
  const dash = $("#dashLowStock");
  if (dash){
    if (out.length){
      dash.hidden = false;
      dash.innerHTML = `<h3 style="margin-bottom:6px">⚠️ Low Stock Alert</h3><p class="msg err" style="margin:0"><strong>${out.length} product(s) out of stock:</strong> ${out.map(pr => escapeHtml(pr.name || ("#" + pr.id))).join(", ")}</p>`;
    } else { dash.hidden = true; dash.innerHTML = ""; }
  }
}
/* Domain section (Settings tab, admin+): current domain dikhao, RPC se save karo. */
async function loadDomain(){
  const cur = $("#domCurrent");
  const inp = $("#domInput");
  if (!cur || !inp) return;
  try {
    const { data, error } = await sb.from("stores").select("custom_domain,domain_status").eq("id", STORE_ID).single();
    if (error) throw error;
    const d = (data && data.custom_domain) || "";
    const st = (data && data.domain_status) || "none";
    cur.textContent = d ? `Current domain: ${d} — status: ${st}` : "Abhi koi domain connect nahi hai (status: none).";
    inp.value = d;
  } catch (e) {
    cur.textContent = "Domain load nahi ho saka: " + e.message;
  }
}
function validDomain(d){
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(d);
}
async function saveDomain(clear){
  const msg = $("#domMsg");
  /* HQ-A-14: staff yahan kabhi nahi aana chahiye (section hidden hai) — phir
     bhi guard, taa ke koi direct call bhi server error na khaye. */
  if (!isAdminPlus()){
    msg.textContent = "Domain sirf owner/admin ke liye hai.";
    msg.className = "msg err"; return;
  }
  const inp = $("#domInput");
  const domain = clear ? "" : inp.value.trim().toLowerCase();
  if (!clear && !validDomain(domain)){
    msg.textContent = "Domain ghalat hai — sirf aisa likhein: shop.example.com (https:// ya / ke baghair).";
    msg.className = "msg err"; return;
  }
  msg.textContent = "Save ho raha hai…"; msg.className = "msg";
  try {
    /* set_store_domain RPC: sirf domain + status badalta hai, baaki store
       fields ko chhoo nahi sakta — is liye team member bhi safe tareeqay
       se apna domain save kar sakta hai. */
    const { error } = await sb.rpc("set_store_domain", { p_store_id: STORE_ID, p_domain: domain, p_status: domain ? "pending" : "none" });
    if (error) throw error;
    msg.textContent = clear ? "✅ Domain hata diya gaya." : "✅ Domain save ho gaya — status 'pending'. DNS lagane ke baad Super Admin isay 'live' karega.";
    msg.className = "msg ok";
    showToast(clear ? "✅ Domain hata diya gaya." : "✅ Domain save ho gaya.", "ok");
    loadDomain();
  } catch (e) {
    msg.textContent = "Domain save fail: " + e.message; msg.className = "msg err";
    showToast("Domain save fail: " + e.message, "err");
  }
}
const _domSave = $("#domSaveBtn");
if (_domSave) _domSave.onclick = () => saveDomain(false);
const _domClear = $("#domClearBtn");
if (_domClear) _domClear.onclick = () => saveDomain(true);

$("#saveSettingsBtn").onclick = persistAllSettings;
$("#saveHomepageBtn").onclick = persistAllSettings;
$("#saveAppearanceBtn").onclick = persistAllSettings;
$("#saveStyleBtn").onclick = persistAllSettings;
$("#saveContentBtn").onclick = persistAllSettings;
$("#saveSectionsBtn").onclick = persistAllSettings;
$("#saveMetaBtn").onclick = persistAllSettings; /* V5 Phase 5. */
$("#globalSaveBtn").onclick = persistAllSettings;
bindMetaTab(); /* V5 Phase 5: Meta tab buttons (null-guarded — panel na ho to bhi safe). */

/* ---------- Tabs ---------- */
const TAB_VIEWS = {
  dashboard: ["tabDashboard", "dashboardPanel"],
  orders: ["tabOrders", "ordersPanel"],
  products: ["tabProducts", "productsPanel"],
  categories: ["tabCategories", "categoriesPanel"],
  coupons: ["tabCoupons", "couponsPanel"],
  team: ["tabTeam", "teamPanel"],
  homepage: ["tabHomepage", "homepagePanel"],
  sections: ["tabSections", "sectionsPanel"],
  appearance: ["tabAppearance", "appearancePanel"],
  style: ["tabStyle", "stylePanel"],
  content: ["tabContent", "contentPanel"],
  settings: ["tabSettings", "settingsPanel"],
  meta: ["tabMeta", "metaPanel"] /* V5 Phase 5: Meta tab (Pixel + CAPI + custom code). */
};
/* In tabs par topbar wala global Save button nazar aata hai. */
const SAVEABLE_TABS = ["settings", "homepage", "appearance", "style", "content", "sections", "meta"]; /* V5 Phase 5: Meta tab bhi global Save se save hota hai. */
Object.entries(TAB_VIEWS).forEach(([view, [tabId]]) => {
  document.getElementById(tabId).onclick = () => switchTab(view);
});
/* Stale-counts fix (J2/J3): current tab ka data dobara load karein.
   Await ka order ahem hai — products/orders PEHLE (cache fresh ho), phir
   categories/dashboard (jo usi cache se count hoti hain). */
async function refreshCurrentTab(){
  if (!tabRefreshArmed) return;
  /* Stale inline message saaf karein — dobara load hone wala data purane
     message se match nahi karta (L10: "✅ Order #232 update ho gaya" tab
     switch ke baad bhi dikhta rehta tha). Sirf tab-switch / tab-wapsi par,
     save flow se NAHI (wahan message load ke BAAD set hota hai). */
  if (CURRENT_TAB === "orders" || CURRENT_TAB === "dashboard"){ const m = $("#ordersMsg"); if (m){ m.textContent = ""; m.className = "msg"; } }
  else if (CURRENT_TAB === "categories"){ const m = $("#catMsg"); if (m){ m.textContent = ""; m.className = "msg"; } }
  if (CURRENT_TAB === "orders"){ await loadOrders(); loadDashboard(); }
  else if (CURRENT_TAB === "categories"){ await loadProducts(); loadCategories(); }
  else if (CURRENT_TAB === "dashboard"){ await loadOrders(); loadDashboard(); }
}
async function switchTab(view){
  CURRENT_TAB = view;
  Object.entries(TAB_VIEWS).forEach(([key, [tabId, panelId]]) => {
    document.getElementById(tabId).classList.toggle("active", key === view);
    document.getElementById(panelId).classList.toggle("hidden", key !== view);
  });
  $("#globalSaveBtn").classList.toggle("hidden", !SAVEABLE_TABS.includes(view));
  /* V4 Phase 2: tab khulte hi active theme ke controls dobara lagayein. */
  applyThemeVisibility();
  /* Stale-counts fix: tab khulte hi us ke data dobara load karein (storefront ya
     doosri tab se badla hua data purana na dikhe). Boot ke waqt nahi (loadAll chal raha hota hai). */
  await refreshCurrentTab();
}
/* Stale-counts fix (J3): browser tab wapas aane par bhi current tab ka data
   dobara load karein — storefront tab par order karne ke baad admin tab par
   aane se naya order forun nazar aaye. switchTab sirf admin ke andar ke tab
   switch par chalta hai; browser tab switch par visibilitychange chalta hai. */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshCurrentTab();
});
