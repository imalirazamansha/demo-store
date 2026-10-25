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
  /* --- V2 keys (Part A admin contract) --- */
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
    socialProof: { enabled: true, intervalSec: 20, durationSec: 5, entries: [] }
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
let maxPrice = null;
/* Cart har store ka alag: key boot mein resolve ke baad banti hai
   ("shopnest_cart_<slug>"). Us se pehle cart khaali object hai. */
let CART_KEY = "shopnest_cart";
let cart = {};
let checkoutState = null;
let pdpId = null;
let pdpQty = 1;
let heroIndex = 0;
let heroTimer = null;
let liveTimer = null;
let liveSold = 0;
let liveVisiting = 0;

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
function deliveryTotal(entries){ return entries.reduce((sum, [id]) => sum + feeOf(findP(id)), 0); }
function delivText(p){
  const f = feeOf(p);
  return f === 0 ? `${icon("truck", "ic-inline")} FREE Delivery` : `${icon("truck", "ic-inline")} Delivery: ${fmt(f)}`;
}

/* ---------- Settings ---------- */
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
  if (Array.isArray(raw.trustItems)) out.trustItems = raw.trustItems.filter(x => x && typeof x === "object").map(x => ({ title: cleanStr(x.title), sub: cleanStr(x.sub) }));
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
  if (typeof raw.seo_description === "string") out.seo_description = raw.seo_description.trim();
  return out;
}
async function loadSettings(){
  try {
    /* Tenant mode: is store ki apni settings row. Fallback: purani id=1 row. */
    let q = sb.from("settings").select("data");
    q = STORE_ID ? q.eq("store_id", STORE_ID) : q.eq("id", 1);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    const raw = data && data.data;
    const isEmpty = !raw || (typeof raw === "object" && Object.keys(raw).length === 0);
    /* Settings khaali hon to store ka naam stores table wale name se —
       header/footer mein client ka asal naam nazar aaye. */
    SETTINGS = mergeSettings(isEmpty && STORE && STORE.name ? { store_name: STORE.name } : raw);
  } catch (e) {
    console.warn("Settings load nahi huye; defaults use ho rahe hain.", e);
    SETTINGS = mergeSettings(null);
  }
  applySettings();
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
  HERO_SLIDES = SETTINGS.hero.filter(s => s.visible !== false);
  $("#heroSection").hidden = HERO_SLIDES.length === 0;
  $("#heroTrack").innerHTML = HERO_SLIDES.map((s, i) => `
    <article class="hero-slide ${i % 2 === 1 ? "alt" : ""}">
      <div class="hero-inner">
        <div class="hero-content"><span class="hero-pill">${esc(s.pill)}</span><h1>${esc(s.title)}</h1><p>${esc(s.subtitle)}</p><button class="btn primary" type="button" data-hero-target="${i === 0 ? "bestSection" : "dealsSection"}">${esc(s.button)}</button></div>
        <img class="hero-img" src="${safeUrl(s.image)}" alt="${esc(s.title)}">
      </div>
    </article>`).join("");
  $("#heroDots").innerHTML = HERO_SLIDES.map((_, i) => `<button type="button" data-hero-dot="${i}" class="${i === heroIndex ? "active" : ""}" aria-label="Hero slide ${i + 1}"></button>`).join("");
  $$("[data-hero-dot]").forEach(b => b.onclick = () => setHero(+b.dataset.heroDot));
  $$("[data-hero-target]").forEach(b => b.onclick = () => scrollToId(b.dataset.heroTarget));
  if (HERO_SLIDES.length){ setHero(Math.min(heroIndex, HERO_SLIDES.length - 1)); startHero(); }
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
  const digits = String(SETTINGS.whatsapp_number || "").replace(/\D/g, "");
  if (digits){ wa.href = "https://wa.me/" + digits; wa.hidden = false; } else { wa.hidden = true; wa.removeAttribute("href"); }
  /* Homepage sections: sections_order (V2) ho to wohi order + visibility;
     na ho to legacy settings.sections toggles wala purana behaviour. */
  applySections();
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
  renderSteps();
  renderFaq();
  renderReviews();
  watchReveals();
  syncHeaderOffset();
  applyStyleSettings();
  startSocialProof();
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
  var allowedKeys = getAllowed ? getAllowed(STORE ? STORE.allowed_themes : null).map(function(t){ return t.key; }) : ["general", "fashion", "beauty", "electronics", "food"];
  var pick = function(k){ return (k && allowedKeys.indexOf(k) !== -1 && known(k)) ? k : null; };
  var key = pick(SETTINGS.theme) || pick(STORE && STORE.theme) || "general";
  ACTIVE_THEME = getTheme(key);
  return ACTIVE_THEME;
}
function applyTheme(){
  var root = document.documentElement;
  var t = resolveActiveTheme();
  /* Body classes: pichli theme ki classes saaf, nayi lagayen. */
  ["general", "fashion", "beauty", "electronics", "food"].forEach(function(k){ document.body.classList.remove("theme-" + k); });
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
    nav.innerHTML = links.map(navLinkHTML).join("");
    bindAnchors(nav);
    return;
  }
  const cats = ["All", ...CAT_LIST];
  nav.innerHTML = cats.map(c => `<button type="button" class="${c === activeCat ? "active" : ""}" data-nav-cat="${esc(c)}">${esc(c)}</button>`).join("");
  nav.querySelectorAll("[data-nav-cat]").forEach(b => b.onclick = () => setFilter({ cat: b.dataset.navCat, maxPrice: null }));
}
function renderFooterLinks(){
  const box = $("#footerHelpLinks");
  const title = $("#footerHelpTitle");
  if (!box) return;
  const links = (SETTINGS.footer_links || []).filter(l => l && (l.label || l.url));
  if (links.length){
    if (title) title.textContent = "Quick Links";
    box.innerHTML = links.map(navLinkHTML).join("");
    bindAnchors(box);
  } else {
    if (title) title.textContent = "Help & Policies";
    box.innerHTML = DEFAULT_HELP_HTML;
    bindPolicyButtons(box);
  }
}

/* ---------- V2: Homepage sections order + custom sections ---------- */
const SECTION_NODE_IDS = { hero: "heroSection", trust: "trustSection", categories: "categoriesSection", best_sellers: "bestSection", all_products: "shop", promos: "promoSection", hot: "hotSection", new_arrivals: "newSection", deals: "dealsSection", budget: "budgetSection", about: "aboutSection", how_to_order: "howSection", faq: "faqSection", testimonials: "reviewsSection" };
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
      if (el) el.hidden = SETTINGS.sections[key] === false;
    });
    return;
  }
  /* sections_order precedence: order + visibility yahi se. Jo key list mein
     nahi, woh default order ke end par, visible rehti hai. */
  const seen = new Set();
  const seq = [];
  order.forEach(e => {
    if (typeof e.key !== "string") return;
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
    el.hidden = e.visible === false || (e.key === "hero" && HERO_SLIDES.length === 0);
    seq.push(el); seen.add(e.key);
  });
  SECTION_DEFAULT_KEYS.forEach(k => {
    if (seen.has(k)) return;
    const el = document.getElementById(SECTION_NODE_IDS[k]);
    if (!el) return;
    el.hidden = k === "hero" && HERO_SLIDES.length === 0;
    seq.push(el);
  });
  seq.forEach(el => home.appendChild(el));
}
function setHero(i){
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
  try {
    let q = sb.from("categories").select("*");
    if (STORE_ID) q = q.eq("store_id", STORE_ID);
    const { data, error } = await q.order("sort", { ascending: true }).order("id", { ascending: true });
    if (error) throw error;
    CATEGORIES = data || [];
  } catch (e) {
    /* Table na ho / fail ho to purana behaviour: products se categories derive. */
    console.warn("Categories table load nahi hui; products se derive hoga.", e);
    CATEGORIES = [];
  }
}
async function loadProducts(){
  let q = sb.from("products").select("*").eq("active", true);
  if (STORE_ID) q = q.eq("store_id", STORE_ID);
  const { data, error } = await q.order("id", { ascending: true });
  if (error){
    console.error(error);
    $("#loadError").hidden = false;
    $("#resultsText").textContent = "";
    return;
  }
  PRODUCTS = data || [];
  if (!categoriesReady) categoriesReady = loadCategories();
  await categoriesReady;
  /* Visible categories table se; hidden categories nav/tiles/footer se gayab
     (un ke products All Products grid mein phir bhi aate hain). */
  const visibleCats = CATEGORIES.filter(c => c.visible !== false).map(c => c.name).filter(Boolean);
  CAT_LIST = visibleCats.length ? visibleCats : [...new Set(PRODUCTS.map(p => p.cat).filter(Boolean))];
  renderCats(); renderProductSections(); renderGrid(); renderCart();
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
  const off = SETTINGS.animations === false || REDUCED_MOTION;
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
  const badge = opts.newBadge ? `<span class="new-badge">NEW</span>` : (off > 0 ? `<span class="discount-badge">-${off}%</span>` : "");
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
  return `<article class="card reveal ${out ? "is-oos" : ""}">
    <div class="card-imgwrap" data-view="${p.id}"><img src="${safeUrl(p.img || "")}" alt="${esc(p.name)}" loading="lazy">${badge}${oosBadge}</div>
    <div class="card-body">
      <h3 class="card-title" data-view="${p.id}">${esc(p.name)}</h3>${spec}
      <p class="stars">${stars(p.rating)} <small>${ratingOf(p).toFixed(1)} (${reviewsOf(p)})</small></p>
      <div class="price"><strong>${fmt(p.price)}</strong>${Number(p.old) > Number(p.price) ? `<del>${fmt(p.old)}</del>` : ""}</div>
      <p class="deliv ${feeOf(p) ? "paid" : ""}">${delivText(p)}</p>
      <div class="card-actions">${actions}</div>
    </div></article>`;
}
function bindCards(root){
  if (!root) return;
  root.querySelectorAll("[data-add]").forEach(b => b.onclick = e => { e.stopPropagation(); addToCart(+b.dataset.add, 1); });
  root.querySelectorAll("[data-order]").forEach(b => b.onclick = e => { e.stopPropagation(); buyNow(+b.dataset.order, 1); });
  root.querySelectorAll("[data-view]").forEach(el => el.onclick = () => openProduct(+el.dataset.view));
}
function renderInto(id, list, opts){
  const el = document.getElementById(id);
  el.innerHTML = list.map(p => cardHTML(p, opts)).join("");
  bindCards(el);
}
function renderProductSections(){
  /* Best Sellers: featured products pehle, phir reviews ke hisaab se. */
  renderInto("bestGrid", [...PRODUCTS].sort((a,b) => ((b.featured ? 1 : 0) - (a.featured ? 1 : 0)) || reviewsOf(b) - reviewsOf(a)).slice(0, 8));
  renderInto("hotTrack", [...PRODUCTS].sort((a,b) => ratingOf(b) - ratingOf(a) || reviewsOf(b) - reviewsOf(a)).slice(0, 10));
  renderInto("newGrid", [...PRODUCTS].sort((a,b) => b.id - a.id).slice(0, 8), { newBadge: true });
  renderInto("dealGrid", PRODUCTS.filter(p => effectivePct(p) >= 20).sort((a,b) => effectivePct(b) - effectivePct(a) || reviewsOf(b) - reviewsOf(a)).slice(0, 8));
  renderReviews();
  const hot = [...PRODUCTS].sort((a,b) => ratingOf(b) - ratingOf(a) || reviewsOf(b) - reviewsOf(a))[0];
  $("#hotOrderBtn").disabled = !hot;
  $("#hotOrderBtn").onclick = () => { if (hot) openProduct(hot.id); };
  watchReveals();
  /* V3.4: hot + reviews auto-slide (pehli render par setup; dataset
     guard dobara timer nahi banne deta). */
  setupTrackAutoSlide($("#hotTrack"), $("#hotPrev"), $("#hotNext"));
  setupTrackAutoSlide($("#reviewTrack"), $("#revPrev"), $("#revNext"));
}
function currentList(){
  const q = $("#searchInput").value.trim().toLowerCase();
  let list = PRODUCTS.filter(p =>
    (activeCat === "All" || p.cat === activeCat) &&
    (maxPrice === null || Number(p.price) <= maxPrice) &&
    (!q || String(p.name).toLowerCase().includes(q) || String(p.cat).toLowerCase().includes(q) || String(p.desc || "").toLowerCase().includes(q)));
  const s = $("#sortSelect").value;
  if (s === "price-low") list = [...list].sort((a,b) => a.price - b.price);
  if (s === "price-high") list = [...list].sort((a,b) => b.price - a.price);
  if (s === "rating") list = [...list].sort((a,b) => ratingOf(b) - ratingOf(a));
  if (s === "popular") list = [...list].sort((a,b) => reviewsOf(b) - reviewsOf(a));
  return list;
}
function renderGrid(){
  const list = currentList();
  $("#resultsText").textContent = PRODUCTS.length ? list.length + " products" : "";
  $("#emptyMsg").hidden = !(PRODUCTS.length && list.length === 0);
  $("#shopTitle").textContent = activeCat === "All" ? "ALL PRODUCTS" : activeCat.toUpperCase();
  $("#filterNote").textContent = `${activeCat === "All" ? "Saari categories" : activeCat}${maxPrice !== null ? " • Under " + fmt(maxPrice) : " • Har price range"}`;
  const grid = $("#grid");
  grid.innerHTML = list.map(p => cardHTML(p)).join("");
  bindCards(grid);
  watchReveals();
}
function setFilter({ cat = activeCat, maxPrice: nextMax = maxPrice, sort } = {}){
  activeCat = cat; maxPrice = nextMax;
  if (sort) $("#sortSelect").value = sort;
  showPage("homeView");
  renderCats(); renderGrid();
  requestAnimationFrame(() => scrollToId("shop"));
}
function resetFilters(){ $("#searchInput").value = ""; setFilter({ cat: "All", maxPrice: null, sort: "popular" }); }
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
/* V3.3: Trust strip, budget tiles, how-to steps — sab settings-driven. */
const TRUST_ICONS = ["cash", "truck", "shield", "returns"];
function renderTrust(){
  const wrap = document.querySelector("#trustSection .trust-grid");
  if (!wrap) return;
  const list = (SETTINGS && Array.isArray(SETTINGS.trustItems)) ? SETTINGS.trustItems : [];
  wrap.innerHTML = list.map((t, i) => `<div>${icon(TRUST_ICONS[i % TRUST_ICONS.length])}<strong>${esc(t.title)}</strong><span>${esc(t.sub)}</span></div>`).join("");
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
  wrap.innerHTML = list.map(b => `<button class="budget-tile${b.budget === "top" ? " top-pick" : ""}" type="button" data-budget="${esc(b.budget)}"><span>${b.budget === "top" ? icon("star", "ic-inline") + " " : ""}${esc(b.label)}</span><strong>${esc(b.amount)}</strong><small>${esc(b.note)}</small></button>`).join("");
  bindBudgetTiles();
}
function renderSteps(){
  const wrap = document.querySelector("#howSection .steps-grid");
  if (!wrap) return;
  const list = (SETTINGS && Array.isArray(SETTINGS.howSteps)) ? SETTINGS.howSteps : [];
  wrap.innerHTML = list.map((st, i) => `<div><span>${String(i + 1).padStart(2, "0")}</span><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p></div>`).join("");
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
    sb.from("visits").insert(row).then(() => {}, () => {});
  } catch (e) { /* tracking fail = silent */ }
}

/* ---------- Pages ---------- */
const PAGE_IDS = ["homeView", "productPage", "cartPage", "checkoutPage", "successPage"];
const PAGE_TRACK = { homeView: "home", productPage: "product", cartPage: "cart", checkoutPage: "checkout" };
function showPage(id){
  if (id !== "productPage") stopLiveTicker();
  PAGE_IDS.forEach(pid => { document.getElementById(pid).hidden = pid !== id; });
  if (id !== "homeView") window.scrollTo({ top: 0 });
  if (typeof updatePdpSticky === "function") updatePdpSticky();
  if (PAGE_TRACK[id]) trackPage(PAGE_TRACK[id]);
}
function showHome(){ showPage("homeView"); window.scrollTo({ top: 0 }); }

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
  liveSold = (Number(p.id) * 137) % 900 + 120;
  liveVisiting = Math.min(240, Math.max(12, (Number(p.id) * 53) % 40 + 8));
  $("#pdpSold").textContent = liveSold.toLocaleString("en-PK");
  $("#pdpVisiting").textContent = liveVisiting;
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
  renderPdpCustomFields(p);
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
  showPage("productPage");
  watchReveals();
  startLiveTicker();
}
/* LIVE counters ko zinda feel dena: har ~2.5s visiting count halka sa random-walk
   hota hai (12–240 ke andar), sold kabhi kabhi +1 barhta hai (kabhi kam nahi hota).
   Product page se hat-te hi showPage() is timer ko band kar deta hai. */
function flashNum(el){
  if (!el) return;
  el.classList.remove("tick");
  void el.offsetWidth;
  el.classList.add("tick");
}
function startLiveTicker(){
  stopLiveTicker();
  liveTimer = setInterval(() => {
    const visEl = $("#pdpVisiting");
    const soldEl = $("#pdpSold");
    if (!visEl || !soldEl || $("#productPage").hidden){ stopLiveTicker(); return; }
    let dv = Math.floor(Math.random() * 9) - 4;
    if (dv === 0) dv = Math.random() < 0.5 ? -1 : 1;
    liveVisiting = Math.min(240, Math.max(12, liveVisiting + dv));
    visEl.textContent = liveVisiting;
    flashNum(visEl);
    if (Math.random() < 0.25){
      liveSold += 1;
      soldEl.textContent = liveSold.toLocaleString("en-PK");
      flashNum(soldEl);
    }
  }, 2500);
}
function stopLiveTicker(){
  if (liveTimer){ clearInterval(liveTimer); liveTimer = null; }
}
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
$("#pdpStickyAdd").onclick = () => { if (pdpId !== null) addToCart(pdpId, pdpQty); };
$("#pdpStickyOrder").onclick = () => { if (pdpId !== null) buyNow(pdpId, pdpQty); };
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
$("#pdpAdd").onclick = () => { if (pdpId !== null) addToCart(pdpId, pdpQty); };
$("#pdpOrder").onclick = () => { if (pdpId !== null) buyNow(pdpId, pdpQty); };

/* ---------- Cart ---------- */
function saveCart(){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function cartCount(){ return Object.values(cart).reduce((a,b) => a + Number(b || 0), 0); }
function cartEntries(){ return Object.entries(cart).map(([id,q]) => [+id, Number(q)]).filter(([,q]) => q > 0); }
function cartSubtotal(){ return cartEntries().reduce((sum,[id,q]) => { const p = findP(id); return p ? sum + Number(p.price) * q : sum; }, 0); }
function addToCart(id, qty){
  cart[id] = (Number(cart[id]) || 0) + qty;
  saveCart(); renderCart();
  const p = findP(id); if (p) toast(`Added: ${p.name}`);
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
function setQty(id, q){
  if (q <= 0) delete cart[id]; else cart[id] = q;
  saveCart(); renderCart();
}
function renderCart(){
  const n = cartCount();
  $("#cartCount").textContent = n;
  const entries = cartEntries();
  $("#cartEmptyMsg").hidden = n !== 0;
  $("#cartRows").innerHTML = entries.map(([id,q]) => {
    const p = findP(id); if (!p) return "";
    return `<div class="cart-row">
      <img src="${safeUrl(p.img || "")}" alt="${esc(p.name)}">
      <div><h3>${esc(p.name)}</h3><p>${fmt(p.price)} each • ${delivText(p)}</p>
        <div class="cart-controls"><button class="qty-btn" type="button" data-cdec="${p.id}">−</button><strong>${q}</strong><button class="qty-btn" type="button" data-cinc="${p.id}">+</button><button class="remove-link" type="button" data-crem="${p.id}">Remove</button></div>
      </div><strong class="line-total">${fmt(Number(p.price) * q)}</strong>
    </div>`;
  }).join("");
  $$("[data-cinc]").forEach(b => b.onclick = () => setQty(+b.dataset.cinc, Number(cart[b.dataset.cinc]) + 1));
  $$("[data-cdec]").forEach(b => b.onclick = () => setQty(+b.dataset.cdec, Number(cart[b.dataset.cdec]) - 1));
  $$("[data-crem]").forEach(b => b.onclick = () => setQty(+b.dataset.crem, 0));
  const sub = cartSubtotal();
  const fee = deliveryTotal(entries);
  $("#cpSubtotal").textContent = fmt(sub);
  $("#cpDelivery").textContent = n === 0 ? "—" : (fee === 0 ? "FREE" : fmt(fee));
  $("#cpTotal").textContent = fmt(sub + fee);
  $("#cpCheckoutBtn").disabled = !n;
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
  const sub = entries.reduce((sum,[id,q]) => { const p = findP(id); return p ? sum + Number(p.price) * q : sum; }, 0);
  const fee = deliveryTotal(entries);
  /* Coupon discount sirf products subtotal par — delivery par nahi. */
  const discount = appliedCoupon ? Math.round(sub * Math.min(90, Math.max(0, appliedCoupon.pct)) / 100) : 0;
  return { sub, fee, discount, total: sub + fee - discount };
}
function renderCheckoutSummary(){
  const entries = checkoutState ? checkoutState.entries : [];
  $("#coItems").innerHTML = entries.map(([id,q]) => {
    const p = findP(id); if (!p) return "";
    return `<div class="co-item"><img src="${safeUrl(p.img || "")}" alt=""><div class="co-item-info"><h4>${esc(p.name)}</h4><p>${fmt(p.price)} × ${q} • ${delivText(p)}</p></div><strong>${fmt(Number(p.price) * q)}</strong></div>`;
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
function showCheckoutPage(){ renderCheckoutFields(); renderCheckoutSummary(); showPage("checkoutPage"); }
function buyNow(id, qty){
  if (!findP(id)) return;
  checkoutState = { source: "buynow", entries: [[id, qty]] };
  showCheckoutPage();
}
$("#backToShop").onclick = showHome;
$("#continueBtn").onclick = showHome;
$("#couponApplyBtn").onclick = applyCoupon;
$("#couponRemoveBtn").onclick = removeCoupon;
$("#couponInput").addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); applyCoupon(); } });
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
  const { total, discount } = checkoutTotals();
  const lines = checkoutState.entries.map(([id,q]) => {
    const p = findP(id);
    return { id: p.id, name: p.name, price: p.price, qty: q, delivery_fee: feeOf(p) };
  });
  /* items jsonb ab ek object hai: { lines, coupon, discount } — line items ke
     saath coupon meta bhi save hota hai. Purane orders plain array thay;
     admin dono shapes ko parh leta hai. Custom checkout fields ki values
     custom_fields: [{label, value}] mein jati hain (shape break nahi hota). */
  const items = { lines, coupon: appliedCoupon ? appliedCoupon.code : null, discount };
  if (coFields.length)
    items.custom_fields = coFields.map(cf => ({ label: cf.label, value: String(f.get("cf_" + cf.id) || "").trim() })).filter(x => x.value !== "");
  const orderRow = {
    customer_name: String(f.get("name") || "").trim(),
    phone: String(f.get("phone") || "").trim(),
    city: String(f.get("city") || "").trim(),
    address: String(f.get("address") || "").trim(),
    items, total, status: "Pending"
  };
  if (STORE_ID) orderRow.store_id = STORE_ID;
  const { error } = await sb.from("orders").insert(orderRow);
  btn.disabled = false; btn.innerHTML = `${icon("check", "ic-inline")} ORDER PLACE KAREIN`;
  if (error){
    console.error(error);
    err.textContent = "Order save nahi ho saka — internet check karke dobara try karein.";
    return;
  }
  if (checkoutState.source === "cart"){ cart = {}; saveCart(); renderCart(); }
  checkoutState = null;
  appliedCoupon = null;
  const ci = $("#couponInput"); if (ci) ci.value = "";
  const cm = $("#couponMsg"); if (cm) cm.textContent = "";
  renderCouponUI();
  e.target.reset();
  $("#successText").textContent = "Shukriya! Aapka order save ho gaya hai — hum jald call karke confirm karein ge.";
  $("#successOrderId").textContent = "Total (COD): " + fmt(total);
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
  if (h) document.body.style.paddingTop = h.offsetHeight + "px";
}
window.addEventListener("resize", syncHeaderOffset);
$("#searchBtn").onclick = () => { showPage("homeView"); renderGrid(); requestAnimationFrame(() => scrollToId("shop")); };
$("#searchInput").addEventListener("input", renderGrid);
$("#searchInput").addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); $("#searchBtn").click(); } });
$("#sortSelect").onchange = renderGrid;
$("#viewAllBtn").onclick = resetFilters;
$("#viewNewBtn").onclick = resetFilters;
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
$("#subForm").onsubmit = e => {
  e.preventDefault();
  $("#subMsg").innerHTML = `${icon("check", "ic-inline")} Shukriya! Aap subscribe ho gaye hain.`;
  e.target.reset();
};
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
async function fetchStorefrontRow(slug){
  const { data, error } = await sb.from("storefront_stores").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data || null;
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
        const cands = [host, host.startsWith("www.") ? host.slice(4) : "www." + host];
        try {
          const { data, error } = await sb.from("storefront_stores").select("slug").in("custom_domain", cands).limit(1);
          if (!error && data && data.length){
            slug = data[0].slug;
            try { sessionStorage.setItem("sn_store_slug", slug); } catch (e) {}
          }
        } catch (e) { /* view nahi mili — default/fallback neeche sambhal lega */ }
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
  /* mode "ok" ya "fallback": cart is store ke slug se load karein. */
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
