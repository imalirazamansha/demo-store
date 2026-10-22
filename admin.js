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
const PLACEHOLDER_IMG = "https://placehold.co/600x400/eef6fa/0A2B4E?text=No+Image";
function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

let settingsLoaded = false;
let MY_EMAIL = null;
let MY_ROLE = null;          // CURRENT store mein is user ki team role (platform-only ho to null)
/* ---------- Multi-tenant store context ---------- */
let IS_PLATFORM = false;     // platform_admins mein hai? (super admin)
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

const isAdminPlus = () => effRole() === "owner" || effRole() === "admin";

/* Storefront defaults — script.js ke DEFAULT_SETTINGS se match. */
const ADMIN_DEFAULT_SETTINGS = {
  store_name: "ShopNest",
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
  whatsapp_number: "",
  sections: { best: true, hot: true, arrivals: true, deals: true, budget: true, about: true, howto: true, faq: true, reviews: true, promos: true },
  policies: { shipping: "", refund: "", privacy: "", terms: "", contact: "" },
  profile: { logo_url: "", email: "", phone: "", address: "" }
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
    const { data: storeRows, error: storeErr } = await sb.from("stores").select("id, slug, name, status");
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
function enterStore(store){
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
  $("#superAdminLink").classList.toggle("hidden", !IS_PLATFORM);
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
  const adminOnlyTabs = ["tabCategories", "tabCoupons", "tabSettings"];
  adminOnlyTabs.forEach(id => document.getElementById(id).classList.toggle("hidden", !isAdminPlus()));
  switchTab("dashboard");
  loadAll();
  if (isAdminPlus() && !settingsLoaded) loadSettings();
}
$("#refreshBtn").onclick = loadAll;

async function loadAll(){
  await Promise.all([loadOrders(), loadProducts(), loadCategories()]);
  await loadDashboard();
  if (isAdminPlus()) loadCoupons();
  if (effRole() === "owner") loadTeam();
}

/* ---------- Image upload (Supabase Storage: product-images) ---------- */
async function uploadImage(file, folder){
  if (!file) throw new Error("Koi image file select nahi hui.");
  if (!String(file.type || "").startsWith("image/")) throw new Error("Sirf image file select karein.");
  const match = String(file.name || "").match(/\.([a-zA-Z0-9]+)$/);
  const ext = match ? "." + match[1].toLowerCase() : "";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  const path = `${folder}/${uniqueName}`;
  const { error } = await sb.storage.from("product-images").upload(path, file, { upsert: true, contentType: file.type });
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
  if (error){ wrap.innerHTML = `<p class="empty-note">Orders load nahi ho sakay: ${esc(error.message)}</p>`; ORDERS_CACHE = []; return; }
  ORDERS_CACHE = data || [];
  $("#statOrders").textContent = ORDERS_CACHE.length;
  $("#statPending").textContent = ORDERS_CACHE.filter(o => o.status === "Pending").length;
  $("#statRevenue").textContent = fmt(ORDERS_CACHE.filter(o => o.status === "Delivered").reduce((s,o) => s + Number(o.total || 0), 0));
  renderOrders();
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
      <td><button class="btn small danger" data-del-order="${o.id}">Delete</button></td>
    </tr>`; }).join("")}</tbody></table>`;
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

/* ---------- Products ---------- */
async function loadProducts(){
  const { data, error } = await sb.from("products").select("*").eq("store_id", STORE_ID).order("id", { ascending: true });
  const wrap = $("#productsWrap");
  if (error){ wrap.innerHTML = `<p class="empty-note">Products load nahi ho sakay: ${esc(error.message)}</p>`; return; }
  PRODUCTS_CACHE = data || [];
  $("#statProducts").textContent = PRODUCTS_CACHE.length;
  refreshCatList();
  wrap.innerHTML = PRODUCTS_CACHE.map(p => prodCard(p)).join("");
  bindProdCards(wrap);
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
    <img class="img-preview" data-preview src="${esc(p.img || PLACEHOLDER_IMG)}" alt="">
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
    <label>Description</label><textarea data-f="desc" rows="6">${esc(p.desc||"")}</textarea>
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
      setUploadMsg(msg, `Selected: ${file.name} — Save dabane par upload hogi.`);
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
        setUploadMsg(msg, "✅ Image upload complete — ab product save ho raha hai.", "ok");
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
      img: imageUrl,
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
  const { error } = await sb.from("products").insert({
    store_id: STORE_ID,
    name: "New Product", cat: "General", price: 999, rating: 4.5, reviews: 0, delivery_fee: 0, discount_pct: null, stock: "in", featured: false, img: "", desc: "", active: false,
  });
  if (error) alert("Add fail: " + error.message);
  else { loadProducts(); alert("Naya product add ho gaya hai (abhi hidden hai) — usi product card mein details aur image file upload karke, 'Show on store' = Yes karke Save karein."); }
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
      <td><img class="thumb-sm" data-cprev src="${esc(c.image || PLACEHOLDER_IMG)}" alt=""></td>
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
  el.innerHTML = `<div class="bars">${values.map((v, i) => `<div class="bar-col"><span class="bar-val">${opts.format ? opts.format(v) : v}</span><div class="bar ${opts.sales ? "sales" : ""}" style="height:${Math.max(3, Math.round(v / max * 100))}%"></div><span class="bar-lab">${labels[i]}</span></div>`).join("")}</div>`;
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
  if (typeof raw.whatsapp_number === "string") out.whatsapp_number = raw.whatsapp_number.trim();
  if (raw.sections && typeof raw.sections === "object") Object.keys(out.sections).forEach(k => { if (typeof raw.sections[k] === "boolean") out.sections[k] = raw.sections[k]; });
  if (raw.policies && typeof raw.policies === "object") Object.keys(out.policies).forEach(k => { if (typeof raw.policies[k] === "string") out.policies[k] = raw.policies[k]; });
  if (raw.profile && typeof raw.profile === "object") Object.keys(out.profile).forEach(k => { if (typeof raw.profile[k] === "string") out.profile[k] = raw.profile[k]; });
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
}
async function loadSettings(){
  settingsLoaded = true;
  const msg = $("#settingsMsg");
  try {
    const { data, error } = await sb.from("settings").select("data").eq("store_id", STORE_ID).maybeSingle();
    if (error) throw error;
    fillSettings(mergeAdminSettings(data && data.data));
  } catch (e) {
    fillSettings(mergeAdminSettings(null));
    msg.textContent = "Settings load nahi huye (migration run hai?); defaults dikhaye ja rahe hain: " + e.message;
    msg.className = "msg err";
  }
}
$("#saveSettingsBtn").onclick = async () => {
  const btn = $("#saveSettingsBtn");
  const msg = $("#settingsMsg");
  btn.disabled = true; btn.textContent = "Saving…"; msg.textContent = ""; msg.className = "msg";
  try {
    const hero = await collectHeroSlides();
    heroState = JSON.parse(JSON.stringify(hero));
    let logoUrl = $("#profLogo").value.trim();
    const logoFile = $("#profLogoFile").files[0];
    if (logoFile){
      setUploadMsg($("#profLogoMsg"), "Logo upload ho raha hai…");
      logoUrl = await uploadImage(logoFile, "profile");
      $("#profLogo").value = logoUrl;
      $("#profLogoFile").value = "";
      setUploadMsg($("#profLogoMsg"), "✅ Logo upload complete.", "ok");
    }
    const sections = {};
    document.querySelectorAll("[data-sec]").forEach(cb => { sections[cb.dataset.sec] = cb.checked; });
    const policies = {};
    document.querySelectorAll("[data-pol]").forEach(ta => { policies[ta.dataset.pol] = ta.value; });
    const data = {
      store_name: $("#setStoreName").value.trim() || ADMIN_DEFAULT_SETTINGS.store_name,
      announcements: [1,2,3,4].map(i => document.getElementById("setAnn" + i).value.trim()),
      hero,
      promo: [1,2].map(n => ({
        kicker: document.getElementById(`setP${n}Kicker`).value.trim(),
        heading: document.getElementById(`setP${n}Heading`).value.trim(),
        text: document.getElementById(`setP${n}Text`).value.trim(),
        category: document.getElementById(`setP${n}Category`).value.trim()
      })),
      about_heading: $("#setAboutHeading").value.trim(),
      about_text: $("#setAboutText").value.trim(),
      whatsapp_number: $("#setWhatsapp").value.trim(),
      sections,
      policies,
      profile: {
        logo_url: logoUrl,
        email: $("#profEmail").value.trim(),
        phone: $("#profPhone").value.trim(),
        address: $("#profAddress").value.trim()
      }
    };
    /* Per-store settings: upsert store_id par hota hai (platform migration
       mein settings.store_id par unique index hai; id sequence se auto
       aata hai nayi row par). */
    const { error } = await sb.from("settings").upsert({ store_id: STORE_ID, data }, { onConflict: "store_id" });
    if (error) throw error;
    renderHeroEditor();
    msg.textContent = "✅ Settings save ho gayi hain — store reload karke changes dekhein.";
    msg.className = "msg ok";
  } catch (e) {
    msg.textContent = "Settings save fail: " + e.message;
    msg.className = "msg err";
    alert("Settings save fail: " + e.message);
  } finally {
    btn.disabled = false; btn.textContent = "💾 Save Settings";
  }
};

/* ---------- Tabs ---------- */
const TAB_VIEWS = {
  dashboard: ["tabDashboard", "dashboardPanel"],
  orders: ["tabOrders", "ordersPanel"],
  products: ["tabProducts", "productsPanel"],
  categories: ["tabCategories", "categoriesPanel"],
  coupons: ["tabCoupons", "couponsPanel"],
  team: ["tabTeam", "teamPanel"],
  settings: ["tabSettings", "settingsPanel"]
};
Object.entries(TAB_VIEWS).forEach(([view, [tabId]]) => {
  document.getElementById(tabId).onclick = () => switchTab(view);
});
function switchTab(view){
  Object.entries(TAB_VIEWS).forEach(([key, [tabId, panelId]]) => {
    document.getElementById(tabId).classList.toggle("active", key === view);
    document.getElementById(panelId).classList.toggle("hidden", key !== view);
  });
}
