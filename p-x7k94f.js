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
  { key: "best_sellers", label: "Best Sellers", sub: "Sab se zyada bikne wale products" }, { key: "featured", label: "Featured Pick", sub: "Bari featured product band (Playful Pop)" },
  { key: "all_products", label: "All Products", sub: "Poori products list + filters" },
  { key: "promos", label: "Promo Banners", sub: "Do bare promo cards" }, { key: "reels", label: "Reels & Videos", sub: "Instagram reels row (Playful Pop)" },
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
/* V3 Part B security: safeUrl — sirf http(s)/relative image URLs. */
function safeUrl(u){
  const t = String(u || "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/") || t.startsWith("./") || t.startsWith("../")) return t;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
  return "";
}

let settingsLoaded = false;
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
let CATEGORIES_CACHE = [];
let heroState = [];
/* ---------- V2 state ---------- */
let CURRENT_TAB = "dashboard";
let SETTINGS_STATE = null;   // loadSettings ke baad full merged settings (saare tabs isi se bharte/save hote hain)
let EDITING_PRODUCT_ID = null;
let HP_ORDER = [];           // homepage builder: [{key, visible}] — custom entries key "custom:<id>"
let HP_CUSTOM = {};          // custom sections content: id -> {heading, text, img, btn_label, btn_link}
let homepageFilled = false;

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
  /* V3.6: Instagram reels + blog */ instaHandle: "", instaReels: [], blogPosts: [], showReels: true, showBlog: true, sections: { best: true, hot: true, arrivals: true, deals: true, budget: true, about: true, howto: true, faq: true, reviews: true, promos: true },
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
  if (error){ msg.textContent = "Error: " + error.message; msg.className = "msg err"; }
  else { msg.textContent = "✅ Link bhej diya gaya hai — apna email inbox check karein aur link par click karein."; msg.className = "msg ok"; }
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
       Dono queries RLS-scoped hain: team rows sirf entitled stores ki
       milti hain; platform_admins mein apni row sirf platform admin ko
       nazar aati hai. "team by email" wali ye lookup jaan boojh kar
       store-unscoped hai — yahi login ka entry point hai. */
    const [teamRes, platRes] = await Promise.all([
      sb.from("team").select("email, store_id, role").eq("email", email),
      sb.from("platform_admins").select("email").eq("email", email).maybeSingle()
    ]);
    if (teamRes.error) throw teamRes.error;
    IS_PLATFORM = !!(platRes && platRes.data);
    const teamRows = teamRes.data || [];
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
  $("#storePickerView").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");
  $("#pickerEmail").textContent = MY_EMAIL || "";
  $("#pickerList").innerHTML = MY_STORES.map(s => `<button class="btn ghost store-pick" data-pick="${esc(s.id)}"><span>🏪 <strong>${esc(s.name)}</strong> <small>/${esc(s.slug)}${s.status === "suspended" ? " • ⏸ suspended" : ""}</small></span><span class="pill ${s.role ? "green" : ""}">${s.role ? esc(s.role) : "👑 platform"}</span></button>`).join("");
  $("#pickerList").querySelectorAll("[data-pick]").forEach(b => b.onclick = () => {
    const store = MY_STORES.find(s => s.id === b.dataset.pick);
    if (store) enterStore(store);
  });
}
function showNoAccess(email, storeName){
  $("#loginView").classList.add("hidden");
  $("#dashView").classList.add("hidden");
  $("#storePickerView").classList.add("hidden");
  $("#noAccessView").classList.remove("hidden");
  $("#noAccessEmail").textContent = email || "";
  $("#logoutBtn").classList.remove("hidden");
  if (storeName){
    const p = $("#noAccessView").querySelector("p");
    if (p) p.innerHTML = `Aap <strong>${esc(email || "")}</strong> se login hain, lekin <strong>${esc(storeName)}</strong> store ki team mein shamil nahi hain. Us store ke <strong>owner se rabta karein</strong> — woh Team tab se aapka email add kar dein ge.`;
  }
}
function showDash(){
  $("#loginView").classList.add("hidden");
  $("#noAccessView").classList.add("hidden");
  $("#storePickerView").classList.add("hidden");
  $("#dashView").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");
  /* Role gating (current store ki role par): staff ko Categories/Coupons/Team/Settings nahi; admin ko Team nahi. */
  $("#tabTeam").classList.toggle("hidden", effRole() !== "owner");
  const adminOnlyTabs = ["tabCategories", "tabCoupons", "tabSettings", "tabHomepage", "tabAppearance", "tabStyle", "tabContent"];
  adminOnlyTabs.forEach(id => document.getElementById(id).classList.toggle("hidden", !isAdminPlus()));
  switchTab("dashboard");
  loadAll();
  if (isAdminPlus() && !settingsLoaded) loadSettings();
}
$("#refreshBtn").onclick = loadAll;

async function loadAll(){
  await Promise.all([loadOrders(), loadProducts(), loadCategories()]);
  await loadDashboard();
  if (isAdminPlus()) loadDomain();
  if (isAdminPlus()) loadCoupons();
  if (effRole() === "owner") loadTeam();
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
  if (!String(file.type || "").startsWith("image/")) throw new Error("Sirf image file select karein.");
   const up = await compressImage(file);
     LAST_UPLOAD_INFO = { before: file.size, after: up.size };
  const match = String(up.name || "").match(/\.([a-zA-Z0-9]+)$/);
  const ext = match ? "." + match[1].toLowerCase() : "";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  const path = `${folder}/${uniqueName}`;
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
  return { coupon: null, discount: 0 };
}
async function loadOrders(){
  const { data, error } = await sb.from("orders").select("*").eq("store_id", STORE_ID).order("id", { ascending: false });
  const wrap = $("#ordersWrap");
  if (error){ wrap.innerHTML = `<p class="empty-note">Orders load nahi ho sakay: ${esc(error.message)}</p>`; ORDERS_CACHE = []; renderOrderStats(); return; }
  ORDERS_CACHE = data || [];
  $("#statOrders").textContent = ORDERS_CACHE.length;
  $("#statPending").textContent = ORDERS_CACHE.filter(o => o.status === "Pending").length;
  $("#statRevenue").textContent = fmt(ORDERS_CACHE.filter(o => o.status === "Delivered").reduce((s,o) => s + Number(o.total || 0), 0));
  renderOrderStats();
  renderOrders();
}
/* Orders tab ke upar wali stats strip: 6 cards + status ki stacked bar.
   Counts CURRENT store ke loaded orders (ORDERS_CACHE) se bante hain. */
function renderOrderStats(){
  const counts = {};
  STATUSES.forEach(s => { counts[s] = ORDERS_CACHE.filter(o => o.status === s).length; });
  const total = ORDERS_CACHE.length;
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
function renderOrders(){
  const wrap = $("#ordersWrap");
  const q = ($("#orderSearch").value || "").trim().toLowerCase();
  const sf = $("#orderStatusFilter").value || "";
  const list = ORDERS_CACHE.filter(o =>
    (!sf || o.status === sf) &&
    (!q || String(o.customer_name || "").toLowerCase().includes(q) || String(o.phone || "").includes(q)));
  if (!ORDERS_CACHE.length){ wrap.innerHTML = `<p class="empty-note">Abhi tak koi order nahi aaya.</p>`; return; }
  if (!list.length){ wrap.innerHTML = `<p class="empty-note">Is search/filter par koi order nahi mila.</p>`; return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>#</th><th>Customer</th><th>Phone / City</th><th>Address</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead>
    <tbody>${list.map(o => { const lines = orderLines(o); const meta = orderMeta(o); return `<tr>
      <td><strong>#${o.id}</strong><br><small style="color:var(--muted)">${new Date(o.created_at).toLocaleString("en-PK",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}</small></td>
      <td><strong>${esc(o.customer_name)}</strong></td>
      <td>${esc(o.phone)}<br><small style="color:var(--muted)">${esc(o.city)}</small></td>
      <td style="max-width:170px">${esc(o.address)}</td>
      <td class="order-items">${lines.map(i => `${esc(i.name)} × ${i.qty}`).join("<br>")}${lines.some(i => i.delivery_fee !== undefined) ? `<br><small>Delivery: ${(() => { const d = lines.reduce((s,i) => s + (Number(i.delivery_fee)||0), 0); return d === 0 ? "FREE" : fmt(d); })()}</small>` : ""}${meta.coupon ? `<br><small>🎟️ Coupon ${esc(meta.coupon)}: −${fmt(meta.discount)}</small>` : ""}</td>
      <td><strong>${fmt(o.total)}</strong></td>
      <td><select class="status" data-status="${o.id}">${STATUSES.map(s => `<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></td>
      <td style="white-space:nowrap"><button class="btn small ghost" data-edit-order="${o.id}">✎ Edit</button> <button class="btn small danger" data-del-order="${o.id}">Delete</button></td>
    </tr>`; }).join("")}</tbody></table>`;
  wrap.querySelectorAll("[data-edit-order]").forEach(b => b.onclick = () => openOrderEdit(+b.dataset.editOrder));
  wrap.querySelectorAll("[data-status]").forEach(sel => sel.onchange = async () => {
    const { error } = await sb.from("orders").update({ status: sel.value }).eq("id", +sel.dataset.status).eq("store_id", STORE_ID);
    if (error) alert("Status update fail: " + error.message); else { await loadOrders(); loadDashboard(); }
  });
  wrap.querySelectorAll("[data-del-order]").forEach(b => b.onclick = async () => {
    if (!confirm("Yeh order delete kar dein?")) return;
    const id = +b.dataset.delOrder;
    const msg = $("#ordersMsg");
    b.disabled = true; b.textContent = "Deleting…";
    msg.textContent = `Order #${id} delete ho raha hai…`; msg.className = "msg";
    try {
      /* .select("id") forces PostgREST to return deleted rows — sirf request
         success par nahi, asal deleted row par bharosa karte hain. */
      const { data: deleted, error } = await sb.from("orders").delete().eq("id", id).eq("store_id", STORE_ID).select("id");
      if (error) throw error;
      if (!deleted || deleted.length === 0) throw new Error("Koi row delete nahi hui — Supabase ki orders delete RLS policy ya team access check karein.");
      msg.textContent = `✅ Order #${id} delete ho gaya.`; msg.className = "msg ok";
      await loadOrders(); loadDashboard();
    } catch (e) {
      msg.textContent = "Delete fail: " + e.message; msg.className = "msg err";
      alert("Delete fail: " + e.message);
      b.disabled = false; b.textContent = "Delete";
    }
  });
}
$("#orderSearch").addEventListener("input", renderOrders);
$("#orderStatusFilter").addEventListener("change", renderOrders);

/* ---------- Order Edit (modal) ----------
   Orders table mein koi note/delivery_fee/discount COLUMN nahi hai:
   delivery fee har item line ke andar (delivery_fee) hoti hai, aur
   coupon + discount items JSON ke meta mein ({lines, coupon, discount}).
   Purane orders plain array hain — save par shape mehfooz rakhi jati hai
   (discount/coupon ho to object shape mein convert ho jata hai). */
let OE_ID = null;
let OE_COUPON = null;
let OE_TOTAL_TOUCHED = false;
function openOrderEdit(id){
  const o = ORDERS_CACHE.find(x => x.id === id);
  if (!o) return;
  OE_ID = id;
  OE_TOTAL_TOUCHED = false;
  const meta = orderMeta(o);
  OE_COUPON = meta.coupon;
  $("#oeTitle").textContent = "#" + o.id;
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
  /* Total input mein pehle order ka MAUJOODA total dikhao — items badalne
     par hi auto hisaab usay overwrite karega (jab tak user haath na lagaye). */
  $("#oeTotal").value = o.total ?? 0;
  $("#oeMsg").textContent = ""; $("#oeMsg").className = "msg";
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
    <button class="btn small danger" type="button" data-oe-del title="Item hatayein">✕</button>`;
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
      delivery_fee: Math.max(0, parseInt(g("fee")) || 0)
    };
    if (r.dataset.pid) item.id = isNaN(+r.dataset.pid) ? r.dataset.pid : +r.dataset.pid;
    /* Checkout wali line shape: { id, name, price, qty, delivery_fee } */
    return item.id !== undefined
      ? { id: item.id, name: item.name, price: item.price, qty: item.qty, delivery_fee: item.delivery_fee }
      : { name: item.name, price: item.price, qty: item.qty, delivery_fee: item.delivery_fee };
  }).filter(i => i.name || i.price > 0 || i.qty > 0);
}
function oeComputed(){
  const items = oeReadItems();
  const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
  const del = items.reduce((s, i) => s + (Number(i.delivery_fee) || 0), 0);
  const disc = Math.max(0, parseInt($("#oeDiscount").value) || 0);
  return { items, sub, del, disc, total: Math.max(0, sub + del - disc) };
}
function oeRecalc(){
  const c = oeComputed();
  if (!OE_TOTAL_TOUCHED) $("#oeTotal").value = c.total;
  $("#oeCalcNote").textContent = `Hisaab: Items ${fmt(c.sub)} + Delivery ${fmt(c.del)} − Discount ${fmt(c.disc)} = ${fmt(c.total)}${OE_COUPON ? ` • 🎟️ Coupon: ${OE_COUPON}` : ""}${OE_TOTAL_TOUCHED ? " • Total haath se likha gaya hai (auto hisaab band)" : ""}`;
}
$("#oeTotal").addEventListener("input", () => { OE_TOTAL_TOUCHED = true; oeRecalc(); });
$("#oeDiscount").addEventListener("input", oeRecalc);
$("#oeAddItem").onclick = () => { addOeItemRow({}); oeRecalc(); };
$("#oeCancelBtn").onclick = () => $("#orderEditModal").classList.add("hidden");
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
  const payload = {
    customer_name: $("#oeName").value.trim(),
    phone: $("#oePhone").value.trim(),
    city: $("#oeCity").value.trim(),
    address: $("#oeAddress").value.trim(),
    tracking_note: $("#oeTrackNote") ? $("#oeTrackNote").value.trim() : undefined,
    status: $("#oeStatus").value,
    items,
    total: Math.max(0, parseInt($("#oeTotal").value) || 0)
  };
  if (!payload.customer_name){ msg.textContent = "Customer name khaali nahi ho sakta."; msg.className = "msg err"; return; }
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    const { error } = await sb.from("orders").update(payload).eq("id", OE_ID).eq("store_id", STORE_ID);
    if (error) throw error;
    $("#orderEditModal").classList.add("hidden");
    const om = $("#ordersMsg");
    om.textContent = `✅ Order #${OE_ID} update ho gaya.`; om.className = "msg ok";
    await loadOrders(); loadDashboard();
  } catch (e) {
    msg.textContent = "Order save fail: " + e.message; msg.className = "msg err";
  } finally {
    btn.disabled = false; btn.textContent = "💾 Order Save karein";
  }
};

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
/* Products LIST (Shopify-style table) — Edit par upar wala card form khulta hai. */
function renderProductsList(){
  const wrap = $("#productsWrap");
  const q = ($("#prodSearch").value || "").trim().toLowerCase();
  const list = PRODUCTS_CACHE.filter(p => !q
    || String(p.name || "").toLowerCase().includes(q)
    || String(p.cat || "").toLowerCase().includes(q));
  $("#prodCount").textContent = PRODUCTS_CACHE.length ? `${list.length} / ${PRODUCTS_CACHE.length} products` : "";
  if (!PRODUCTS_CACHE.length){ wrap.innerHTML = `<p class="empty-note">Abhi koi product nahi hai — upar "Add New Product" se pehla product banayein.</p>`; return; }
  if (!list.length){ wrap.innerHTML = `<p class="empty-note">Is search par koi product nahi mila.</p>`; return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>Photo</th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Live</th><th>Featured</th><th></th></tr></thead>
    <tbody>${list.map(p => `<tr>
      <td><img class="prod-thumb" src="${safeUrl(p.img || PLACEHOLDER_IMG)}" alt=""></td>
      <td><strong>${esc(p.name || "")}</strong><br><small style="color:var(--muted)">#${p.id}</small></td>
      <td>${esc(p.cat || "General")}</td>
      <td><strong>${fmt(p.price)}</strong>${p.old ? `<br><small style="color:var(--muted);text-decoration:line-through">${fmt(p.old)}</small>` : ""}</td>
      <td>${p.stock === "out" ? `<span class="pill grey">⛔ Out of Stock</span>` : `<span class="pill green">In Stock</span>`}</td>
      <td>${p.active ? `<span class="pill green">Live</span>` : `<span class="pill grey">Hidden</span>`}</td>
      <td>${p.featured ? `<span class="star-on" title="Featured">★</span>` : `<span class="star-off" title="Featured nahi">★</span>`}</td>
      <td style="white-space:nowrap"><button class="btn small" data-edit-prod="${p.id}">✎ Edit</button> <button class="btn small danger" data-del-prod="${p.id}">Delete</button></td>
    </tr>`).join("")}</tbody></table>`;
  wrap.querySelectorAll("[data-edit-prod]").forEach(b => b.onclick = () => openProductForm(+b.dataset.editProd));
  wrap.querySelectorAll("[data-del-prod]").forEach(b => b.onclick = async () => {
    if (!confirm("Yeh product delete kar dein?")) return;
    const id = +b.dataset.delProd;
    const { error } = await sb.from("products").delete().eq("id", id).eq("store_id", STORE_ID);
    if (error) alert("Delete fail: " + error.message);
    else { if (EDITING_PRODUCT_ID === id) closeProductForm(); loadProducts(); }
  });
}
$("#prodSearch").addEventListener("input", renderProductsList);
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
function prodCard(p){
  const out = p.stock === "out";
  return `<div class="prod" data-id="${p.id}">
    <img class="img-preview" data-preview src="${safeUrl(p.img || PLACEHOLDER_IMG)}" alt="">
    <div class="badges-row">${p.featured ? `<span class="pill green">⭐ Featured</span>` : ""}${out ? `<span class="pill grey">⛔ Out of Stock</span>` : `<span class="pill green">✅ In Stock</span>`}</div>
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
    <label>📷 Product image upload</label><input data-file="imgfile" type="file" accept="image/*">
    <p class="upload-msg" data-upload-msg>File select karein to Save dabane par image upload hogi. Koi file na ho to neeche wala URL use hoga.</p>
    <label>Ya image URL paste karein</label><input data-f="img" value="${esc(p.img||"")}" placeholder="https://…">
    <label>🖼️ Extra images (card par swipe hongi — V3.6 gallery)</label><input data-f="gallery1" value="${esc((Array.isArray(p.gallery) ? p.gallery[0] : "") || "")}" placeholder="Extra image 1 URL (optional)"><input data-f="gallery2" value="${esc((Array.isArray(p.gallery) ? p.gallery[1] : "") || "")}" placeholder="Extra image 2 URL (optional)"><input data-f="gallery3" value="${esc((Array.isArray(p.gallery) ? p.gallery[2] : "") || "")}" placeholder="Extra image 3 URL (optional)"><p class="hint">Extra image ho to product card par image swipe hogi (dots + auto-rotate) — FunBug ke bestseller cards ki tarah. Khaali chor dein to sirf main image dikhegi.</p><label>Description</label><textarea data-f="desc" rows="6">${esc(p.desc||"")}</textarea>
    <p class="hint">Ye text product page par 'Product Details' mein nazar aayega — khaali line chorne se naya paragraph banta hai.</p>
    <div class="actions">
      <button class="btn small" data-save="${p.id}">💾 Save</button>
      <button class="btn small danger" data-del="${p.id}">Delete</button>
    </div>
  </div>`;
}
function bindProdCards(wrap){
  wrap.querySelectorAll(".prod").forEach(card => {
    const preview = card.querySelector("[data-preview]");
    const urlInput = card.querySelector('[data-f="img"]');
    const fileInput = card.querySelector('[data-file="imgfile"]');
    const msg = card.querySelector("[data-upload-msg]");
    urlInput.addEventListener("input", () => { preview.src = urlInput.value.trim() || PLACEHOLDER_IMG; });
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      preview.src = URL.createObjectURL(file);
      setUploadMsg(msg, `Selected: ${file.name} (${fmtSize(file.size)}) — Save dabane par upload hogi.`);
    });
  });
  wrap.querySelectorAll("[data-save]").forEach(b => b.onclick = async () => {
    const card = b.closest(".prod");
    const get = f => card.querySelector(`[data-f="${f}"]`).value;
    const msg = card.querySelector("[data-upload-msg]");
    const fileInput = card.querySelector('[data-file="imgfile"]');
    const file = fileInput.files && fileInput.files[0];
    let imageUrl = get("img").trim();
    const oldLabel = b.textContent;
    b.disabled = true; b.textContent = file ? "Uploading…" : "Saving…";
    if (file){
      try {
        setUploadMsg(msg, "Image upload ho rahi hai…");
        imageUrl = await uploadImage(file, `products/${b.dataset.save}`);
        card.querySelector('[data-f="img"]').value = imageUrl;
        card.querySelector("[data-preview]").src = imageUrl;
        let doneNote = "✅ Image upload complete — ab product save ho raha hai.";
                 if (LAST_UPLOAD_INFO && LAST_UPLOAD_INFO.after < LAST_UPLOAD_INFO.before){
                              const pct = Math.round((1 - LAST_UPLOAD_INFO.after / LAST_UPLOAD_INFO.before) * 100);
                              doneNote += ` Compress hui: ${fmtSize(LAST_UPLOAD_INFO.before)} → ${fmtSize(LAST_UPLOAD_INFO.after)} (${pct}% chhoti).`;
                 }
                 setUploadMsg(msg, doneNote, "ok");
      } catch (e) {
        setUploadMsg(msg, "Upload fail: " + e.message, "err");
        alert("Image upload fail — product save nahi kiya gaya: " + e.message);
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
      img: imageUrl, gallery: [get("gallery1").trim(), get("gallery2").trim(), get("gallery3").trim()].filter(Boolean),
      desc: get("desc").trim(),
    };
    const { error } = await sb.from("products").update(payload).eq("id", +b.dataset.save).eq("store_id", STORE_ID);
    if (error) {
      setUploadMsg(msg, "Product save fail: " + error.message, "err");
      alert("Save fail: " + error.message);
      b.disabled = false; b.textContent = oldLabel;
    } else {
      fileInput.value = "";
      b.textContent = "✅ Saved!";
      loadProducts();
    }
  });
  wrap.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("Yeh product delete kar dein?")) return;
    const { error } = await sb.from("products").delete().eq("id", +b.dataset.del).eq("store_id", STORE_ID);
    if (error) alert("Delete fail: " + error.message); else loadProducts();
  });
}
$("#addProductBtn").onclick = async () => {
  const { data, error } = await sb.from("products").insert({
    store_id: STORE_ID,
    name: "New Product", cat: "General", price: 999, rating: 4.5, reviews: 0, delivery_fee: 0, discount_pct: null, stock: "in", featured: false, img: "", gallery: [], desc: "", active: false,
  }).select("id").single();
  if (error) alert("Add fail: " + error.message);
  else {
    await loadProducts();
    if (data && data.id) openProductForm(data.id);
    alert("Naya product ban gaya hai (abhi hidden hai) — khule hue form mein details aur image file bhar kar, 'Show on store' = Yes karke Save karein.");
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
    if (error){ msg.textContent = "Visible update fail: " + error.message; msg.className = "msg err"; cb.checked = !cb.checked; }
    else { msg.textContent = cb.checked ? "✅ Category ab store par nazar aayegi." : "✅ Category store se hide ho gayi (products phir bhi All Products mein rahenge)."; msg.className = "msg ok"; loadCategories(); }
  });
  wrap.querySelectorAll("[data-csave]").forEach(b => b.onclick = async () => {
    const tr = b.closest("tr");
    const id = +b.dataset.csave;
    const name = tr.querySelector("[data-cname]").value.trim();
    if (!name){ alert("Category ka naam khaali nahi ho sakta."); return; }
    let image = tr.querySelector("[data-cimg]").value.trim();
    const file = tr.querySelector("[data-cfile]").files[0];
    const old = b.textContent; b.disabled = true; b.textContent = "Saving…";
    try {
      if (file) image = await uploadImage(file, "categories");
      const { error } = await sb.from("categories").update({ name, image, sort: parseInt(tr.querySelector("[data-csort]").value) || 0 }).eq("id", id).eq("store_id", STORE_ID);
      if (error) throw error;
      $("#catMsg").textContent = "✅ Category save ho gayi."; $("#catMsg").className = "msg ok";
      loadCategories(); loadProducts();
    } catch (e) { alert("Category save fail: " + e.message); }
    b.disabled = false; b.textContent = old;
  });
  wrap.querySelectorAll("[data-cdel]").forEach(b => b.onclick = async () => {
    if (!confirm("Yeh category delete kar dein?\n\nNote: is category ke PRODUCTS delete NAHI honge — un par category ka text waisa hi rahega, sirf category nav/tiles/footer se gayab hogi.")) return;
    const { error } = await sb.from("categories").delete().eq("id", +b.dataset.cdel).eq("store_id", STORE_ID);
    if (error) alert("Delete fail: " + error.message);
    else { $("#catMsg").textContent = "✅ Category delete ho gayi (products mehfooz hain)."; $("#catMsg").className = "msg ok"; loadCategories(); }
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
    loadCategories();
  } catch (e) {
    msg.textContent = "Category add fail: " + e.message; msg.className = "msg err";
  } finally { btn.disabled = false; btn.textContent = "＋ Add Category"; }
};

/* ---------- Coupons ---------- */
async function loadCoupons(){
  const wrap = $("#couponsWrap");
  const { data, error } = await sb.from("coupons").select("*").eq("store_id", STORE_ID).order("id", { ascending: true });
  if (error){ wrap.innerHTML = `<p class="empty-note">Coupons load nahi ho sakay (shopify migration run hai?): ${esc(error.message)}</p>`; return; }
  if (!data.length){ wrap.innerHTML = `<p class="empty-note">Abhi koi coupon nahi hai — upar wale form se pehla coupon banayein.</p>`; return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>Code</th><th>Discount</th><th>Active</th><th>Banaya gaya</th><th></th></tr></thead>
    <tbody>${data.map(c => `<tr>
      <td><strong>${esc(c.code)}</strong></td>
      <td>${c.pct}% OFF</td>
      <td><input type="checkbox" data-cpn-active="${c.id}" ${c.active ? "checked" : ""} style="width:18px;height:18px"></td>
      <td><small style="color:var(--muted)">${new Date(c.created_at).toLocaleDateString("en-PK",{day:"numeric",month:"short",year:"numeric"})}</small></td>
      <td><button class="btn small danger" data-cpn-del="${c.id}">Delete</button></td>
    </tr>`).join("")}</tbody></table>`;
  wrap.querySelectorAll("[data-cpn-active]").forEach(cb => cb.onchange = async () => {
    const { error } = await sb.from("coupons").update({ active: cb.checked }).eq("id", +cb.dataset.cpnActive).eq("store_id", STORE_ID);
    if (error){ alert("Coupon update fail: " + error.message); cb.checked = !cb.checked; }
  });
  wrap.querySelectorAll("[data-cpn-del]").forEach(b => b.onclick = async () => {
    if (!confirm("Yeh coupon delete kar dein?")) return;
    const { error } = await sb.from("coupons").delete().eq("id", +b.dataset.cpnDel).eq("store_id", STORE_ID);
    if (error) alert("Delete fail: " + error.message); else loadCoupons();
  });
}
$("#addCouponBtn").onclick = async () => {
  const code = $("#cpnCode").value.trim().toUpperCase();
  const pct = Math.min(90, Math.max(1, parseInt($("#cpnPct").value) || 0));
  const msg = $("#couponsMsg");
  if (!code){ msg.textContent = "Coupon code likhein."; msg.className = "msg err"; return; }
  if (!pct){ msg.textContent = "Discount % 1–90 ke darmiyan likhein."; msg.className = "msg err"; return; }
  const { error } = await sb.from("coupons").insert({ store_id: STORE_ID, code, pct, active: true });
  if (error){ msg.textContent = "Coupon add fail: " + error.message; msg.className = "msg err"; return; }
  $("#cpnCode").value = ""; $("#cpnPct").value = "";
  msg.textContent = `✅ Coupon ${code} (${pct}% OFF) ban gaya.`; msg.className = "msg ok";
  loadCoupons();
};

/* ---------- Team (owner only) ---------- */
async function loadTeam(){
  const wrap = $("#teamWrap");
  const { data, error } = await sb.from("team").select("*").eq("store_id", STORE_ID).order("created_at", { ascending: true });
  if (error){ wrap.innerHTML = `<p class="empty-note">Team load nahi ho saki: ${esc(error.message)}</p>`; return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>Email</th><th>Role</th><th></th></tr></thead>
    <tbody>${(data || []).map(m => { const self = m.email === MY_EMAIL; return `<tr>
      <td><strong>${esc(m.email)}</strong>${self ? ' <span class="pill green">Aap</span>' : ""}</td>
      <td><select class="status" data-trole="${esc(m.email)}" ${self ? "disabled" : ""}>${["owner","admin","staff"].map(r => `<option value="${r}" ${r===m.role?"selected":""}>${r[0].toUpperCase()+r.slice(1)}</option>`).join("")}</select></td>
      <td>${self ? '<small style="color:var(--muted)">Apna owner account remove nahi ho sakta</small>' : `<button class="btn small danger" data-tdel="${esc(m.email)}">Remove</button>`}</td>
    </tr>`; }).join("")}</tbody></table>`;
  wrap.querySelectorAll("[data-trole]").forEach(sel => sel.onchange = async () => {
    const { error } = await sb.from("team").update({ role: sel.value }).eq("store_id", STORE_ID).eq("email", sel.dataset.trole);
    if (error){ alert("Role update fail: " + error.message); loadTeam(); }
    else { $("#teamMsg").textContent = "✅ Role update ho gaya."; $("#teamMsg").className = "msg ok"; }
  });
  wrap.querySelectorAll("[data-tdel]").forEach(b => b.onclick = async () => {
    if (!confirm(`${b.dataset.tdel} ko team se remove kar dein? Unka dashboard access foran band ho jayega.`)) return;
    const { error } = await sb.from("team").delete().eq("store_id", STORE_ID).eq("email", b.dataset.tdel);
    if (error) alert("Remove fail: " + error.message); else loadTeam();
  });
}
$("#addTeamBtn").onclick = async () => {
  const email = $("#teamEmail").value.trim().toLowerCase();
  const role = $("#teamRole").value;
  const msg = $("#teamMsg");
  if (!email || !email.includes("@")){ msg.textContent = "Sahi email likhein."; msg.className = "msg err"; return; }
  const { error } = await sb.from("team").insert({ store_id: STORE_ID, email, role });
  if (error){ msg.textContent = "Member add fail: " + error.message; msg.className = "msg err"; return; }
  $("#teamEmail").value = "";
  msg.textContent = `✅ ${email} team mein add ho gaya (${role}). Woh magic link se login kar sakte hain — agar link na aaye to pehle Supabase Auth mein unka user banana hoga.`; msg.className = "msg ok";
  loadTeam();
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
  const orders = ORDERS_CACHE.filter(o => o.status !== "Cancelled");
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

  /* Recent orders */
  const recent = ORDERS_CACHE.slice(0, 5);
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
  if (Array.isArray(raw.trustItems)) out.trustItems = raw.trustItems.filter(x => x && typeof x === "object").map(x => ({ title: cs(x.title), sub: cs(x.sub) })); /* V3.6: Instagram reels + blog */ if (typeof raw.instaHandle === "string") out.instaHandle = raw.instaHandle.trim(); if (Array.isArray(raw.instaReels)) out.instaReels = raw.instaReels.filter(x => x && typeof x === "object").map(x => ({ video: cs(x.video), poster: cs(x.poster), title: cs(x.title) })); if (Array.isArray(raw.blogPosts)) out.blogPosts = raw.blogPosts.filter(x => x && typeof x === "object").map(x => ({ title: cs(x.title), excerpt: cs(x.excerpt), img: cs(x.img), link: cs(x.link) })); if (typeof raw.showReels === "boolean") out.showReels = raw.showReels; if (typeof raw.showBlog === "boolean") out.showBlog = raw.showBlog;
  if (typeof raw.whatsapp_number === "string") out.whatsapp_number = raw.whatsapp_number.trim();
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
$("#addSlideBtn").onclick = () => {
  syncHeroFromDom();
  if (heroState.length >= 4){ alert("Zyada se zyada 4 hero slides ho sakti hain."); return; }
  heroState.push({ pill: "", title: "", subtitle: "", button: "SHOP NOW", image: "", visible: true });
  renderHeroEditor();
};
function fillSettings(s){
  $("#setStoreName").value = s.store_name;
  $("#setWhatsapp").value = s.whatsapp_number;
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
}
async function loadSettings(){
  settingsLoaded = true;
  const msg = $("#settingsMsg");
  try {
    const { data, error } = await sb.from("settings").select("data").eq("store_id", STORE_ID).maybeSingle();
    if (error) throw error;
    SETTINGS_STATE = mergeAdminSettings(data && data.data);
    fillSettings(SETTINGS_STATE);
  } catch (e) {
    SETTINGS_STATE = mergeAdminSettings(null);
    fillSettings(SETTINGS_STATE);
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
  homepageFilled = true;
  renderHomepage();
}
function renderHomepage(){
  const wrap = $("#sectionsWrap");
  if (!wrap) return;
  wrap.innerHTML = HP_ORDER.map(e => {
    if (e.key.startsWith("custom:")){
      const id = e.key.slice(7);
      const c = HP_CUSTOM[id] || { heading: "", text: "", img: "", btn_label: "", btn_link: "" };
      return `<div class="sec-row" data-seckey="${esc(e.key)}">
        <div class="sec-line">
          <span class="drag-handle" title="Drag karke tartib badlein">⠿</span>
          <span class="sec-name">🧩 Custom Section<small data-cusname>${esc(c.heading || "Bina heading ke")}</small></span>
          <label class="checkline" style="border:0;padding:2px"><input type="checkbox" data-secvis ${e.visible ? "checked" : ""}> 👁 Show</label>
          <button class="btn small danger" type="button" data-secdel>Delete</button>
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
    return `<div class="sec-row" data-seckey="${esc(e.key)}">
      <div class="sec-line">
        <span class="drag-handle" title="Drag karke tartib badlein">⠿</span>
        <span class="sec-name">${esc(def.label)}<small>${esc(def.sub)}</small></span>
        <label class="checkline" style="border:0;padding:2px"><input type="checkbox" data-secvis ${e.visible ? "checked" : ""}> 👁 Show</label>
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
  wrap.querySelectorAll("[data-fdel]").forEach(b => b.onclick = () => b.closest(".fld-row").remove());
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
  body.innerHTML = STYLE_SECTION_KEYS_ADMIN.map(k => {
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
const SP_FIELDS = [["name", "Naam", "text"], ["product", "Product", "text"], ["city", "Sheher", "text"], ["amount", "Amount", "text"], ["timeText", "Waqt exact", "text"]]; /* V3.6: Instagram reels + blog (Content tab) */ const REEL_FIELDS = [["video", "Video link (MP4 ya Instagram reel link)", "text"], ["poster", "Poster/thumbnail image URL", "text"], ["title", "Title", "text"]]; const BLOG_FIELDS = [["title", "Post title", "text"], ["excerpt", "Short excerpt", "textarea"], ["img", "Image URL", "text"], ["link", "Read-more link (optional)", "text"]];
function escAttr(v){ return String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
function cntRowHtml(fields, row, rowClass){
  let h = `<div class="${rowClass || "cnt-row"}">`;
  fields.forEach(([k, label, type]) => {
    const v = escAttr(row[k] ?? "");
    h += `<label style="font-size:13px;color:var(--muted)">${label}</label>`;
    if (type === "textarea") h += `<textarea data-f="${k}" rows="2">${v}</textarea>`;
    else if (type === "number") h += `<input data-f="${k}" type="number" min="1" max="5" step="0.1" value="${v}">`;
    else h += `<input data-f="${k}" type="text" value="${v}">`;
  });
  h += `<div class="cnt-row-actions"><button class="btn small" type="button" data-cnt-up>↑ Upar</button><button class="btn small" type="button" data-cnt-down>↓ Neeche</button><button class="btn small danger" type="button" data-cnt-del>Delete</button></div></div>`;
  return h;
}
function bindCntRows(wrap){
  if (!wrap) return;
  wrap.querySelectorAll(".cnt-row").forEach(row => {
    row.querySelector("[data-cnt-up]").onclick = () => { const p = row.previousElementSibling; if (p) wrap.insertBefore(row, p); };
    row.querySelector("[data-cnt-down]").onclick = () => { const n = row.nextElementSibling; if (n) wrap.insertBefore(n, row); };
    row.querySelector("[data-cnt-del]").onclick = () => row.remove();
  });
}
function renderCntList(wrapId, rows, fields, rowClass){
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  wrap.innerHTML = (rows || []).map(r => cntRowHtml(fields, r, rowClass)).join("");
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
function fillContent(s){
  const g = id => document.getElementById(id);
  if (g("cntAboutHeading")) g("cntAboutHeading").value = s.about_heading || "";
  if (g("cntAboutText")) g("cntAboutText").value = s.about_text || "";
  if (g("cntFooterText")) g("cntFooterText").value = s.footer_text || "";
  renderCntList("cntHowWrap", s.howSteps || [], HOW_FIELDS);
  renderCntList("cntFaqWrap", s.faqs || [], FAQ_FIELDS);
  renderCntList("cntReviewsWrap", s.reviews || [], REVIEW_FIELDS);
  renderCntList("cntBudgetWrap", s.budgetTiles || [], BUDGET_FIELDS);
  renderCntList("cntTrustWrap", s.trustItems || [], TRUST_FIELDS); /* V3.6: Instagram + blog (checkboxes: stored false ho to uncheck). */ if (g("cntInstaHandle")) g("cntInstaHandle").value = s.instaHandle || ""; if (g("cntShowReels")) g("cntShowReels").checked = s.showReels !== false; if (g("cntShowBlog")) g("cntShowBlog").checked = s.showBlog !== false; renderCntList("cntReelsWrap", s.instaReels || [], REEL_FIELDS); renderCntList("cntBlogWrap", s.blogPosts || [], BLOG_FIELDS);
  contentFilled = true;
}
function addCntRow(wrapId, fields, rowClass){
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  wrap.insertAdjacentHTML("beforeend", cntRowHtml(fields, {}, rowClass));
  bindCntRows(wrap);
}
$("#addCntHowBtn").onclick = () => addCntRow("cntHowWrap", HOW_FIELDS);
$("#addCntFaqBtn").onclick = () => addCntRow("cntFaqWrap", FAQ_FIELDS);
$("#addCntReviewsBtn").onclick = () => addCntRow("cntReviewsWrap", REVIEW_FIELDS);
$("#addCntBudgetBtn").onclick = () => addCntRow("cntBudgetWrap", BUDGET_FIELDS);
$("#addCntTrustBtn").onclick = () => addCntRow("cntTrustWrap", TRUST_FIELDS); $("#addCntReelsBtn").onclick = () => addCntRow("cntReelsWrap", REEL_FIELDS); $("#addCntBlogBtn").onclick = () => addCntRow("cntBlogWrap", BLOG_FIELDS);
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
async function persistAllSettings(){
  const saveBtns = [...document.querySelectorAll(".js-save, #globalSaveBtn")];
  const savedLabels = saveBtns.map(b => b.innerHTML);
  saveBtns.forEach(b => { b.disabled = true; b.textContent = "Saving…"; });
  const msgEls = { settings: $("#settingsMsg"), homepage: $("#homepageMsg"), appearance: $("#appearanceMsg"), style: $("#styleMsg"), content: $("#contentMsg") };
  Object.values(msgEls).forEach(m => { if (m){ m.textContent = ""; m.className = "msg"; } });
  const topMsg = $("#topSaveMsg");
  if (topMsg) topMsg.textContent = "";
  try {
    const data = JSON.parse(JSON.stringify(SETTINGS_STATE || mergeAdminSettings(null)));
    /* Hero slides (pending file uploads samet) */
    const hero = await collectHeroSlides();
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
    data.logo_url = appLogo || profLogo;
    if (data.logo_url){
      data.profile.logo_url = data.logo_url;
      if ($("#profLogo").value.trim() !== data.logo_url) $("#profLogo").value = data.logo_url;
    }
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
      data.trustItems = readCntList("cntTrustWrap", TRUST_FIELDS); /* V3.6: Instagram + blog (Content tab bhara ho to wahi jeet-ta hai). */ data.instaHandle = (document.getElementById("cntInstaHandle") ? document.getElementById("cntInstaHandle").value.trim() : ""); data.showReels = document.getElementById("cntShowReels") ? document.getElementById("cntShowReels").checked : true; data.showBlog = document.getElementById("cntShowBlog") ? document.getElementById("cntShowBlog").checked : true; data.instaReels = readCntList("cntReelsWrap", REEL_FIELDS); data.blogPosts = readCntList("cntBlogWrap", BLOG_FIELDS);
    }
    /* Per-store settings: upsert store_id par hota hai (platform migration
       mein settings.store_id par unique index hai; id sequence se auto
       aata hai nayi row par). */
    const { error } = await sb.from("settings").upsert({ store_id: STORE_ID, data }, { onConflict: "store_id" });
    if (error) throw error;
    SETTINGS_STATE = data;
    renderHeroEditor();
    const okText = "✅ Save ho gaya — store reload karke changes dekhein.";
    Object.values(msgEls).forEach(m => { if (m){ m.textContent = okText; m.className = "msg ok"; } });
    if (topMsg){ topMsg.textContent = "✅ Save ho gaya"; setTimeout(() => { topMsg.textContent = ""; }, 3500); }
  } catch (e) {
    Object.values(msgEls).forEach(m => { if (m){ m.textContent = "Save fail: " + e.message; m.className = "msg err"; } });
    if (topMsg) topMsg.textContent = "";
    alert("Save fail: " + e.message);
  } finally {
    saveBtns.forEach((b, i) => { b.disabled = false; b.innerHTML = savedLabels[i]; });
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
      lines.map(i => `${i.name} x${i.qty}`).join("; "), o.total || 0, o.status || ""]);
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
    loadDomain();
  } catch (e) {
    msg.textContent = "Domain save fail: " + e.message; msg.className = "msg err";
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
$("#globalSaveBtn").onclick = persistAllSettings;

/* ---------- Tabs ---------- */
const TAB_VIEWS = {
  dashboard: ["tabDashboard", "dashboardPanel"],
  orders: ["tabOrders", "ordersPanel"],
  products: ["tabProducts", "productsPanel"],
  categories: ["tabCategories", "categoriesPanel"],
  coupons: ["tabCoupons", "couponsPanel"],
  team: ["tabTeam", "teamPanel"],
  homepage: ["tabHomepage", "homepagePanel"],
  appearance: ["tabAppearance", "appearancePanel"],
  style: ["tabStyle", "stylePanel"],
  content: ["tabContent", "contentPanel"],
  settings: ["tabSettings", "settingsPanel"]
};
/* In tabs par topbar wala global Save button nazar aata hai. */
const SAVEABLE_TABS = ["settings", "homepage", "appearance", "style", "content"];
Object.entries(TAB_VIEWS).forEach(([view, [tabId]]) => {
  document.getElementById(tabId).onclick = () => switchTab(view);
});
function switchTab(view){
  CURRENT_TAB = view;
  Object.entries(TAB_VIEWS).forEach(([key, [tabId, panelId]]) => {
    document.getElementById(tabId).classList.toggle("active", key === view);
    document.getElementById(panelId).classList.toggle("hidden", key !== view);
  });
  $("#globalSaveBtn").classList.toggle("hidden", !SAVEABLE_TABS.includes(view));
}
