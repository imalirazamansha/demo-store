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

/* Storefront defaults. Admin Settings in values ko settings table se override kar sakta hai. */
const DEFAULT_SETTINGS = {
  store_name: "ShopNest",
  announcements: [
    "⚡ {STORE} — PAKISTAN KA SMART STORE",
    "💵 CASH ON DELIVERY ALL OVER PAKISTAN",
    "🚚 FAST DELIVERY 3–5 DAYS",
    "🔥 HOT DEALS — LIMITED STOCK"
  ],
  hero: [
    {
      pill: "🔥 MEGA SALE — 50% TAK OFF",
      title: "SMART GADGETS, SMART LIFE!",
      subtitle: "Pakistan ke best smart gadgets — quality checked, Cash on Delivery ke saath, seedha aapke ghar tak.",
      button: "SHOP BEST SELLERS",
      image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=80",
      visible: true
    },
    {
      pill: "🎧 AUDIO, WEARABLES & MORE",
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
  whatsapp_number: ""
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
  return f === 0 ? "🚚 FREE Delivery" : "🚚 Delivery: " + fmt(f);
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
  document.title = name + " — Pakistan Ka Smart Store";
  $("#logoName").textContent = name;
  $("#footerLogoName").textContent = name;
  $("#copyStoreName").textContent = name;
  /* Profile logo: image set ho to header mein text ki jagah logo image. */
  const logoUrl = (SETTINGS.profile && SETTINGS.profile.logo_url) || "";
  const logoImg = $("#logoImg");
  if (logoImg){
    if (logoUrl){ logoImg.src = logoUrl; logoImg.alt = name; logoImg.hidden = false; $("#logoHome").classList.add("has-logo"); }
    else { logoImg.hidden = true; logoImg.removeAttribute("src"); $("#logoHome").classList.remove("has-logo"); }
  }
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
        <img class="hero-img" src="${esc(s.image)}" alt="${esc(s.title)}">
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
  $("#footerAbout").textContent = SETTINGS.about_text;
  const wa = $("#waFloat");
  const digits = String(SETTINGS.whatsapp_number || "").replace(/\D/g, "");
  if (digits){ wa.href = "https://wa.me/" + digits; wa.hidden = false; } else { wa.hidden = true; wa.removeAttribute("href"); }
  /* Section toggles: flag false ho to poora section hide. */
  const SECTION_IDS = { best: "bestSection", hot: "hotSection", arrivals: "newSection", deals: "dealsSection", budget: "budgetSection", about: "aboutSection", howto: "howSection", faq: "faqSection", reviews: "reviewsSection", promos: "promoSection" };
  Object.entries(SECTION_IDS).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.hidden = SETTINGS.sections[key] === false;
  });
  /* Footer contact lines (profile se) — jo field bhara ho sirf wohi line. */
  const fc = $("#footerContact");
  if (fc){
    const prof = SETTINGS.profile || {};
    const lines = [];
    if (prof.email) lines.push(`<p>✉️ <a href="mailto:${esc(prof.email)}">${esc(prof.email)}</a></p>`);
    if (prof.phone) lines.push(`<p>📞 ${esc(prof.phone)}</p>`);
    if (prof.address) lines.push(`<p>📍 ${esc(prof.address)}</p>`);
    fc.innerHTML = lines.join("");
    fc.hidden = lines.length === 0;
  }
  watchReveals();
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
}
function renderCats(){
  const cats = ["All", ...CAT_LIST];
  $("#catNav").innerHTML = cats.map(c => `<button type="button" class="${c === activeCat ? "active" : ""}" data-nav-cat="${esc(c)}">${esc(c)}</button>`).join("");
  $$("[data-nav-cat]").forEach(b => b.onclick = () => setFilter({ cat: b.dataset.navCat, maxPrice: null }));
  $("#catTiles").innerHTML = CAT_LIST.map(c => {
    const row = CATEGORIES.find(x => x.name === c);
    const p = PRODUCTS.find(x => x.cat === c);
    const tileImg = (row && row.image) || (p ? p.img : "");
    return `<button class="cat-tile reveal ${c === activeCat ? "active" : ""}" type="button" data-tile-cat="${esc(c)}"><img src="${esc(tileImg)}" alt="${esc(c)}"><span>${esc(c)}</span></button>`;
  }).join("");
  $$("[data-tile-cat]").forEach(b => b.onclick = () => setFilter({ cat: b.dataset.tileCat, maxPrice: null }));
  watchReveals();
  $("#footerCats").innerHTML = CAT_LIST.map(c => `<button type="button" data-footer-cat="${esc(c)}">${esc(c)}</button>`).join("");
  $$("[data-footer-cat]").forEach(b => b.onclick = () => setFilter({ cat: b.dataset.footerCat, maxPrice: null }));
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
  return `<article class="card reveal ${out ? "is-oos" : ""}">
    <div class="card-imgwrap" data-view="${p.id}"><img src="${esc(p.img || "")}" alt="${esc(p.name)}" loading="lazy">${badge}${oosBadge}</div>
    <div class="card-body">
      <h3 class="card-title" data-view="${p.id}">${esc(p.name)}</h3>
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

/* Demo review copy sirf code mein demo hai; page par koi demo label nahi dikhaya jata. */
const DEMO_REVIEWS = [
  "Product bilkul tasveer jaisa mila. Quality boht achi hai aur delivery bhi time par ho gayi.",
  "Cash on Delivery ki wajah se bina tension order kiya. Packing aur product dono zabardast thay.",
  "Price ke hisaab se quality boht behtar hai. Main apni family ko bhi recommend karoon ga.",
  "Order confirm karne ke liye call aayi aur do din mein parcel mil gaya. Boht satisfied hoon.",
  "Pehle thoda doubt tha, lekin product test kiya hua aur bilkul fresh mila. Highly recommended!",
  "Customer service ne call par achi guidance di. Product roz ke use mein boht kaam ka hai."
];
const DEMO_NAMES = ["Ahmed Raza — Lahore", "Fatima Khan — Karachi", "Usman Ali — Islamabad", "Ayesha Noor — Faisalabad", "Bilal Ahmed — Rawalpindi", "Hira Shahid — Multan"];
function renderReviews(){
  const top = [...PRODUCTS].sort((a,b) => ratingOf(b) - ratingOf(a) || reviewsOf(b) - reviewsOf(a)).slice(0, 6);
  $("#reviewTrack").innerHTML = top.map((p, i) => `<article class="review-card reveal">
    <div class="review-product"><img src="${esc(p.img || "")}" alt="${esc(p.name)}"><strong>${esc(p.name)}</strong></div>
    <p class="stars">${stars(p.rating)} <small>${ratingOf(p).toFixed(1)}</small></p>
    <p>${esc(DEMO_REVIEWS[i % DEMO_REVIEWS.length])}</p>
    <p class="verified">✓ Verified Purchase</p><p class="reviewer">${esc(DEMO_NAMES[i % DEMO_NAMES.length])}</p>
  </article>`).join("");
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

/* ---------- FAQ ---------- */
const FAQS = [
  ["Kya Cash on Delivery available hai?", "Ji haan, poore Pakistan mein Cash on Delivery available hai. Product milne ke baad payment karein."],
  ["Delivery kitne din mein hoti hai?", "Aam taur par delivery 3–5 working days mein ho jati hai. Kuch shehron mein is se jaldi bhi mil sakti hai."],
  ["Order confirm kaise hoga?", "Order place karne ke baad humari team aapko call karke naam, address aur product details confirm karegi."],
  ["Agar product damaged ya wrong aa jaye to?", "Damaged ya wrong product ki soorat mein hum se foran rabta karein. Policy ke mutabiq easy exchange ki sahulat available hai."],
  ["Kya products original aur tested hain?", "Har product dispatch se pehle quality-check aur test kiya jata hai taa ke aapko sahi aur working product mile."]
];
function renderFaq(){
  $("#faqWrap").innerHTML = FAQS.map(([q,a], i) => `<div class="faq-item ${i === 0 ? "open" : ""}"><button class="faq-q" type="button">${esc(q)}<i>${i === 0 ? "−" : "+"}</i></button><div class="faq-a">${esc(a)}</div></div>`).join("");
  $$(".faq-item").forEach(item => item.querySelector(".faq-q").onclick = () => {
    const open = item.classList.toggle("open");
    item.querySelector(".faq-q i").textContent = open ? "−" : "+";
  });
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
  $("#pdpImg").src = p.img || ""; $("#pdpImg").alt = p.name;
  $("#pdpThumb").src = p.img || ""; $("#pdpThumb").alt = p.name;
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
  pdpOrderBtn.disabled = isOut; pdpOrderBtn.textContent = isOut ? "OUT OF STOCK" : "🔒 ORDER NOW";
  liveSold = (Number(p.id) * 137) % 900 + 120;
  liveVisiting = Math.min(240, Math.max(12, (Number(p.id) * 53) % 40 + 8));
  $("#pdpSold").textContent = liveSold.toLocaleString("en-PK");
  $("#pdpVisiting").textContent = liveVisiting;
  $("#pdpFee").textContent = delivText(p);
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
      <img src="${esc(p.img || "")}" alt="${esc(p.name)}">
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
  $("#cpDelivery").textContent = n === 0 ? "—" : (fee === 0 ? "FREE 🎉" : fmt(fee));
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
    return `<div class="co-item"><img src="${esc(p.img || "")}" alt=""><div class="co-item-info"><h4>${esc(p.name)}</h4><p>${fmt(p.price)} × ${q} • ${delivText(p)}</p></div><strong>${fmt(Number(p.price) * q)}</strong></div>`;
  }).join("");
  const { sub, fee, discount, total } = checkoutTotals();
  $("#coSubtotal").textContent = fmt(sub);
  $("#coDelivery").textContent = fee === 0 ? "FREE 🎉" : fmt(fee);
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
  if (appliedCoupon) $("#couponAppliedText").textContent = `${appliedCoupon.code} — ${appliedCoupon.pct}% OFF laga diya gaya hai 🎉`;
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
    msg.textContent = `✅ Coupon ${code} lag gaya — ${pct}% discount!`;
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
function showCheckoutPage(){ renderCheckoutSummary(); showPage("checkoutPage"); }
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
  const err = $("#checkoutError");
  err.textContent = "";
  btn.disabled = true; btn.textContent = "Order save ho raha hai…";
  const f = new FormData(e.target);
  const { total, discount } = checkoutTotals();
  const lines = checkoutState.entries.map(([id,q]) => {
    const p = findP(id);
    return { id: p.id, name: p.name, price: p.price, qty: q, delivery_fee: feeOf(p) };
  });
  /* items jsonb ab ek object hai: { lines, coupon, discount } — line items ke
     saath coupon meta bhi save hota hai. Purane orders plain array thay;
     admin dono shapes ko parh leta hai. */
  const items = { lines, coupon: appliedCoupon ? appliedCoupon.code : null, discount };
  const orderRow = {
    customer_name: String(f.get("name") || "").trim(),
    phone: String(f.get("phone") || "").trim(),
    city: String(f.get("city") || "").trim(),
    address: String(f.get("address") || "").trim(),
    items, total, status: "Pending"
  };
  if (STORE_ID) orderRow.store_id = STORE_ID;
  const { error } = await sb.from("orders").insert(orderRow);
  btn.disabled = false; btn.textContent = "✅ ORDER PLACE KAREIN";
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

/* ---------- Header, filters, footer, misc ---------- */
$("#logoHome").onclick = e => { e.preventDefault(); showHome(); };
$("#searchToggle").onclick = () => {
  const bar = $("#searchBar");
  bar.hidden = !bar.hidden;
  if (!bar.hidden) $("#searchInput").focus();
};
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
$$("[data-budget]").forEach(b => b.onclick = () => {
  if (b.dataset.budget === "top") setFilter({ cat: "All", maxPrice: null, sort: "rating" });
  else setFilter({ cat: "All", maxPrice: Number(b.dataset.budget), sort: "price-low" });
});
const POLICIES = {
  contact: ["Contact Us", "<p>Order, delivery ya product ke baray mein sawal ho to store ke WhatsApp ya admin se rabta karein. Humari team aapko order ki sahi maloomat aur guidance degi.</p>"],
  shipping: ["Shipping Policy", "<p>Orders aam taur par 3–5 working days mein deliver kiye jate hain. Delivery charges har product par alag ho sakte hain aur checkout par wazeh dikhaye jate hain.</p><p>Har parcel dispatch se pehle quality-check kiya jata hai.</p>"],
  refund: ["Refund Policy", "<p>Damaged ya wrong product milne par foran rabta karein. Masla verify hone ke baad exchange ya refund policy ke mutabiq process kiya jata hai.</p><p>Product unused aur original packing mein hona chahiye, siwaye damaged delivery ke.</p>"],
  privacy: ["Privacy Policy", "<p>Aapka naam, phone number, city aur address sirf order processing aur delivery ke liye istemal hota hai. Hum aapki maloomat kisi irrelevant third party ko nahi bechte.</p>"],
  terms: ["Terms of Service", "<p>Order place karke aap product details, price aur delivery terms se ittefaq karte hain. Confirmation call par order verify hone ke baad hi parcel dispatch kiya jata hai.</p><p>Prices aur stock baghair notice change ho sakte hain.</p>"]
};
$$("[data-policy]").forEach(b => b.onclick = () => {
  const key = b.dataset.policy;
  const p = POLICIES[key]; if (!p) return;
  $("#policyTitle").textContent = p[0];
  /* Admin Settings mein policy text likha ho to wohi; warna built-in default. */
  const custom = SETTINGS.policies && SETTINGS.policies[key];
  $("#policyBody").innerHTML = (typeof custom === "string" && custom.trim()) ? descHtml(custom) : p[1];
  $("#policyModal").classList.add("open");
});
$$("[data-close]").forEach(b => b.onclick = () => $("#policyModal").classList.remove("open"));
$("#policyModal").addEventListener("click", e => { if (e.target.id === "policyModal") e.currentTarget.classList.remove("open"); });
document.addEventListener("keydown", e => { if (e.key === "Escape") $("#policyModal").classList.remove("open"); });
$("#subForm").onsubmit = e => {
  e.preventDefault();
  $("#subMsg").textContent = "✅ Shukriya! Aap subscribe ho gaye hain.";
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

applySettings();
renderFaq();
boot();
