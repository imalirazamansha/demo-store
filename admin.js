/* ================= ShopNest Admin ================= */
const SUPABASE_URL = "https://vyiwiqcbituttdjgsuwe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXdpcWNiaXR1dHRkamdzdXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTQ0MTYsImV4cCI6MjEwODA5MDQxNn0.fQDW8_b27GzTpu5XBi_Nqw12mmJlJodE0yB3Ei1KLNo";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = s => document.querySelector(s);
const fmt = n => "Rs." + Number(n || 0).toLocaleString("en-PK");
const STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];
const PLACEHOLDER_IMG = "https://placehold.co/600x400/eef6fa/0A2B4E?text=No+Image";
let settingsLoaded = false;

/* Storefront defaults — script.js ke DEFAULT_SETTINGS se match rakhay gaye hain. */
const ADMIN_DEFAULT_SETTINGS = {
  store_name: "ShopNest",
  announcements: [
    "⚡ {STORE} — PAKISTAN KA SMART STORE",
    "💵 CASH ON DELIVERY ALL OVER PAKISTAN",
    "🚚 FAST DELIVERY 3–5 DAYS",
    "🔥 HOT DEALS — LIMITED STOCK"
  ],
  hero: [
    { pill: "🔥 MEGA SALE — 50% TAK OFF", title: "SMART GADGETS, SMART LIFE!", subtitle: "Pakistan ke best smart gadgets — quality checked, Cash on Delivery ke saath, seedha aapke ghar tak.", button: "SHOP BEST SELLERS", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=80" },
    { pill: "🎧 AUDIO, WEARABLES & MORE", title: "HAR GHAR KI ZAROORAT!", subtitle: "Headphones, smart watches aur roz-marra ke useful products — honest prices aur fast dispatch.", button: "SHOP DEALS", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80" }
  ],
  promo: [
    { kicker: "HOME ESSENTIALS", heading: "GHAR KE LIYE SMART CHOICE", text: "Waqt aur mehnat dono bachayein — smart home products jo roz ka kaam asaan kar dein.", category: "Home & Living" },
    { kicker: "STYLE & FASHION", heading: "LOOK BHI, COMFORT BHI", text: "Trending fashion essentials — quality checked aur Cash on Delivery ke saath.", category: "Fashion" }
  ],
  about_heading: "PAKISTAN KA SMART STORE",
  about_text: "ShopNest par hum sirf wohi products rakhte hain jo pehle test kiye jayein. Har order dispatch se pehle quality-check hota hai aur payment Cash on Delivery hai — pehle product aapke haath mein, phir paisay. Poore Pakistan mein fast dispatch, aur damaged ya wrong product par easy exchange. Smart shopping, bina tension!",
  whatsapp_number: ""
};

/* ---------- Auth (magic link) ---------- */
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

sb.auth.onAuthStateChange((_event, session) => { if (session) showDash(); });
(async () => { const { data } = await sb.auth.getSession(); if (data.session) showDash(); })();

function showDash(){
  $("#loginView").classList.add("hidden");
  $("#dashView").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");
  loadAll();
  if (!settingsLoaded) loadSettings();
}
$("#refreshBtn").onclick = loadAll;

async function loadAll(){ await Promise.all([loadOrders(), loadProducts()]); }

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
async function loadOrders(){
  const { data, error } = await sb.from("orders").select("*").order("id", { ascending: false });
  const wrap = $("#ordersWrap");
  if (error){ wrap.innerHTML = `<p class="empty-note">Orders load nahi ho sakay: ${esc(error.message)}</p>`; return; }
  $("#statOrders").textContent = data.length;
  $("#statPending").textContent = data.filter(o => o.status === "Pending").length;
  $("#statRevenue").textContent = fmt(data.filter(o => o.status === "Delivered").reduce((s,o) => s + Number(o.total || 0), 0));
  if (!data.length){ wrap.innerHTML = `<p class="empty-note">Abhi tak koi order nahi aaya.</p>`; return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>#</th><th>Customer</th><th>Phone / City</th><th>Address</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead>
    <tbody>${data.map(o => `<tr>
      <td><strong>#${o.id}</strong><br><small style="color:var(--muted)">${new Date(o.created_at).toLocaleString("en-PK",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}</small></td>
      <td><strong>${esc(o.customer_name)}</strong></td>
      <td>${esc(o.phone)}<br><small style="color:var(--muted)">${esc(o.city)}</small></td>
      <td style="max-width:170px">${esc(o.address)}</td>
      <td class="order-items">${(o.items||[]).map(i => `${esc(i.name)} × ${i.qty}`).join("<br>")}${(o.items||[]).some(i => i.delivery_fee !== undefined) ? `<br><small>Delivery: ${(() => { const d = (o.items||[]).reduce((s,i) => s + (Number(i.delivery_fee)||0), 0); return d === 0 ? "FREE" : fmt(d); })()}</small>` : ""}</td>
      <td><strong>${fmt(o.total)}</strong></td>
      <td><select class="status" data-status="${o.id}">${STATUSES.map(s => `<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></td>
      <td><button class="btn small danger" data-del-order="${o.id}">Delete</button></td>
    </tr>`).join("")}</tbody></table>`;
  wrap.querySelectorAll("[data-status]").forEach(sel => sel.onchange = async () => {
    const { error } = await sb.from("orders").update({ status: sel.value }).eq("id", +sel.dataset.status);
    if (error) alert("Status update fail: " + error.message); else loadOrders();
  });
  wrap.querySelectorAll("[data-del-order]").forEach(b => b.onclick = async () => {
    if (!confirm("Yeh order delete kar dein?")) return;
    const id = +b.dataset.delOrder;
    const msg = $("#ordersMsg");
    b.disabled = true; b.textContent = "Deleting…";
    msg.textContent = `Order #${id} delete ho raha hai…`; msg.className = "msg";
    try {
      /* .select("id") forces PostgREST to return deleted rows. Is se hum sirf request
         success par nahi, asal deleted row par bharosa karte hain. */
      const { data: deleted, error } = await sb.from("orders").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!deleted || deleted.length === 0) throw new Error("Koi row delete nahi hui — Supabase ki orders delete RLS policy ya admin session check karein.");
      msg.textContent = `✅ Order #${id} delete ho gaya.`; msg.className = "msg ok";
      await loadOrders();
    } catch (e) {
      msg.textContent = "Delete fail: " + e.message; msg.className = "msg err";
      alert("Delete fail: " + e.message);
      b.disabled = false; b.textContent = "Delete";
    }
  });
}

/* ---------- Products ---------- */
async function loadProducts(){
  const { data, error } = await sb.from("products").select("*").order("id", { ascending: true });
  const wrap = $("#productsWrap");
  if (error){ wrap.innerHTML = `<p class="empty-note">Products load nahi ho sakay: ${esc(error.message)}</p>`; return; }
  $("#statProducts").textContent = data.length;
  const cats = [...new Set(data.map(p => p.cat).filter(Boolean))];
  $("#catList").innerHTML = cats.map(c => `<option value="${esc(c)}">`).join("");
  wrap.innerHTML = data.map(p => prodCard(p)).join("");
  bindProdCards(wrap);
}
function prodCard(p){
  return `<div class="prod" data-id="${p.id}">
    <img class="img-preview" data-preview src="${esc(p.img || PLACEHOLDER_IMG)}" alt="">
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
      rating: Math.min(5, Math.max(0, parseFloat(get("rating")) || 0)),
      reviews: Math.max(0, parseInt(get("reviews")) || 0),
      delivery_fee: Math.max(0, parseInt(get("delivery_fee")) || 0),
      discount_pct: (!discountNum || discountNum <= 0) ? null : Math.min(90, Math.round(discountNum)),
      active: get("active") === "true",
      img: imageUrl,
      desc: get("desc").trim(),
    };
    const { error } = await sb.from("products").update(payload).eq("id", +b.dataset.save);
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
    const { error } = await sb.from("products").delete().eq("id", +b.dataset.del);
    if (error) alert("Delete fail: " + error.message); else loadProducts();
  });
}
$("#addProductBtn").onclick = async () => {
  const { error } = await sb.from("products").insert({
    name: "New Product", cat: "General", price: 999, rating: 4.5, reviews: 0, delivery_fee: 0, discount_pct: null, img: "", desc: "", active: false,
  });
  if (error) alert("Add fail: " + error.message);
  else { loadProducts(); alert("Naya product add ho gaya hai (abhi hidden hai) — usi product card mein details aur image file upload karke, 'Show on store' = Yes karke Save karein."); }
};

/* ---------- Store Settings ---------- */
function mergeAdminSettings(raw){
  const out = JSON.parse(JSON.stringify(ADMIN_DEFAULT_SETTINGS));
  if (!raw || typeof raw !== "object") return out;
  if (typeof raw.store_name === "string" && raw.store_name.trim()) out.store_name = raw.store_name.trim();
  if (Array.isArray(raw.announcements)) out.announcements = out.announcements.map((d,i) => typeof raw.announcements[i] === "string" && raw.announcements[i].trim() ? raw.announcements[i] : d);
  if (Array.isArray(raw.hero)) out.hero = out.hero.map((d,i) => ({ ...d, ...(raw.hero[i] && typeof raw.hero[i] === "object" ? raw.hero[i] : {}) }));
  if (Array.isArray(raw.promo)) out.promo = out.promo.map((d,i) => ({ ...d, ...(raw.promo[i] && typeof raw.promo[i] === "object" ? raw.promo[i] : {}) }));
  if (typeof raw.about_heading === "string" && raw.about_heading.trim()) out.about_heading = raw.about_heading.trim();
  if (typeof raw.about_text === "string" && raw.about_text.trim()) out.about_text = raw.about_text.trim();
  if (typeof raw.whatsapp_number === "string") out.whatsapp_number = raw.whatsapp_number.trim();
  return out;
}
function fillSettings(s){
  $("#setStoreName").value = s.store_name;
  $("#setWhatsapp").value = s.whatsapp_number;
  s.announcements.forEach((a,i) => { document.getElementById("setAnn" + (i + 1)).value = a; });
  [1,2].forEach(n => {
    const h = s.hero[n - 1];
    document.getElementById(`setH${n}Pill`).value = h.pill || "";
    document.getElementById(`setH${n}Title`).value = h.title || "";
    document.getElementById(`setH${n}Subtitle`).value = h.subtitle || "";
    document.getElementById(`setH${n}Button`).value = h.button || "";
    document.getElementById(`setH${n}Image`).value = h.image || "";
    const p = s.promo[n - 1];
    document.getElementById(`setP${n}Kicker`).value = p.kicker || "";
    document.getElementById(`setP${n}Heading`).value = p.heading || "";
    document.getElementById(`setP${n}Text`).value = p.text || "";
    document.getElementById(`setP${n}Category`).value = p.category || "";
  });
  $("#setAboutHeading").value = s.about_heading;
  $("#setAboutText").value = s.about_text;
}
async function loadSettings(){
  settingsLoaded = true;
  const msg = $("#settingsMsg");
  try {
    const { data, error } = await sb.from("settings").select("data").eq("id", 1).maybeSingle();
    if (error) throw error;
    fillSettings(mergeAdminSettings(data && data.data));
  } catch (e) {
    fillSettings(mergeAdminSettings(null));
    msg.textContent = "Settings load nahi huye (migration run hai?); defaults dikhaye ja rahe hain: " + e.message;
    msg.className = "msg err";
  }
}
async function resolveHeroImage(n){
  const fileInput = document.getElementById(`setH${n}ImageFile`);
  const urlInput = document.getElementById(`setH${n}Image`);
  const msg = document.getElementById(`setH${n}UploadMsg`);
  const file = fileInput.files && fileInput.files[0];
  if (!file) return urlInput.value.trim();
  setUploadMsg(msg, "Hero image upload ho rahi hai…");
  const url = await uploadImage(file, `hero/slide-${n}`);
  urlInput.value = url;
  fileInput.value = "";
  setUploadMsg(msg, "✅ Hero image upload complete.", "ok");
  return url;
}
$("#saveSettingsBtn").onclick = async () => {
  const btn = $("#saveSettingsBtn");
  const msg = $("#settingsMsg");
  btn.disabled = true; btn.textContent = "Saving…"; msg.textContent = ""; msg.className = "msg";
  try {
    const heroImages = [await resolveHeroImage(1), await resolveHeroImage(2)];
    const data = {
      store_name: $("#setStoreName").value.trim() || ADMIN_DEFAULT_SETTINGS.store_name,
      announcements: [1,2,3,4].map(i => document.getElementById("setAnn" + i).value.trim()),
      hero: [1,2].map((n,i) => ({
        pill: document.getElementById(`setH${n}Pill`).value.trim(),
        title: document.getElementById(`setH${n}Title`).value.trim(),
        subtitle: document.getElementById(`setH${n}Subtitle`).value.trim(),
        button: document.getElementById(`setH${n}Button`).value.trim(),
        image: heroImages[i]
      })),
      promo: [1,2].map(n => ({
        kicker: document.getElementById(`setP${n}Kicker`).value.trim(),
        heading: document.getElementById(`setP${n}Heading`).value.trim(),
        text: document.getElementById(`setP${n}Text`).value.trim(),
        category: document.getElementById(`setP${n}Category`).value.trim()
      })),
      about_heading: $("#setAboutHeading").value.trim(),
      about_text: $("#setAboutText").value.trim(),
      whatsapp_number: $("#setWhatsapp").value.trim()
    };
    const { error } = await sb.from("settings").upsert({ id: 1, data }, { onConflict: "id" });
    if (error) throw error;
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
$("#tabOrders").onclick = () => switchTab("orders");
$("#tabProducts").onclick = () => switchTab("products");
$("#tabSettings").onclick = () => switchTab("settings");
function switchTab(view){
  $("#tabOrders").classList.toggle("active", view === "orders");
  $("#tabProducts").classList.toggle("active", view === "products");
  $("#tabSettings").classList.toggle("active", view === "settings");
  $("#ordersPanel").classList.toggle("hidden", view !== "orders");
  $("#productsPanel").classList.toggle("hidden", view !== "products");
  $("#settingsPanel").classList.toggle("hidden", view !== "settings");
}

function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
