/* ================= ShopNest Platform — SUPER ADMIN =================
   Shopify-partner-style platform panel: saari client stores, billing,
   domain tracking. Gate: login email public.platform_admins mein hona
   chahiye (RLS: apni row sirf platform admin ko hi nazar aati hai).
   Sirf anon client use hota hai — koi service key yahan NAHI hai. */
const SUPABASE_URL = "https://vyiwiqcbituttdjgsuwe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXdpcWNiaXR1dHRkamdzdXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTQ0MTYsImV4cCI6MjEwODA5MDQxNn0.fQDW8_b27GzTpu5XBi_Nqw12mmJlJodE0yB3Ei1KLNo";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = s => document.querySelector(s);
const fmt = n => "Rs." + Number(n || 0).toLocaleString("en-PK");
function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

let MY_EMAIL = null;
let STORES = [];
let accessCheckedFor = null;

/* ---------- Date helpers ---------- */
function pad2(n){ return String(n).padStart(2, "0"); }
function isoOf(d){ return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function todayISO(){ return isoOf(new Date()); }
function parseISO(s){ return s ? new Date(s + "T00:00:00") : null; }
function fmtDate(s){ const d = parseISO(s); return d ? d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—"; }
function addMonthsISO(isoStr, months){
  const d = parseISO(isoStr) || new Date();
  d.setMonth(d.getMonth() + months);
  return isoOf(d);
}
/* Fee mili: due date peeche ho to aaj se, aage ho to usi date se +1 month. */
function nextDueAfterPayment(store){
  const t = todayISO();
  const base = store.next_due && store.next_due >= t ? store.next_due : t;
  return addMonthsISO(base, 1);
}
function isOverdue(s){
  if (s.status !== "active") return false;
  return s.fee_status === "unpaid" || (s.next_due && s.next_due < todayISO());
}

/* ---------- Links / clipboard ---------- */
function pageUrl(file, slug){ return new URL(file + "?store=" + encodeURIComponent(slug), location.href).href; }
async function copyText(text, btn){
  const old = btn ? btn.textContent : "";
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e2) {}
    ta.remove();
  }
  if (btn){ btn.textContent = "✅ Copy ho gaya"; setTimeout(() => { btn.textContent = old; }, 1800); }
}

/* ---------- Auth (magic link) + platform gate ---------- */
$("#sendLinkBtn").onclick = async () => {
  const email = $("#loginEmail").value.trim();
  const msg = $("#loginMsg");
  if (!email){ msg.textContent = "Email likhein pehle."; msg.className = "msg err"; return; }
  msg.textContent = "Login link bheja ja raha hai…"; msg.className = "msg";
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href.split("#")[0] } });
  if (error){ msg.textContent = "Error: " + error.message; msg.className = "msg err"; }
  else { msg.textContent = "✅ Link bhej diya gaya hai — inbox check karke link par click karein."; msg.className = "msg ok"; }
};
$("#logoutBtn").onclick = async () => { await sb.auth.signOut(); location.reload(); };
$("#noAccessLogout").onclick = async () => { await sb.auth.signOut(); location.reload(); };

sb.auth.onAuthStateChange((_event, session) => { if (session) checkPlatform(session); });
(async () => { const { data } = await sb.auth.getSession(); if (data.session) checkPlatform(data.session); })();

async function checkPlatform(session){
  const email = session && session.user && session.user.email;
  if (!email) return;
  if (accessCheckedFor === email) return;
  accessCheckedFor = email;
  MY_EMAIL = email;
  const { data, error } = await sb.from("platform_admins").select("email").eq("email", email).maybeSingle();
  if (error || !data){ showNoAccess(email); return; }
  showDash();
}
function showNoAccess(email){
  $("#loginView").classList.add("hidden");
  $("#dashView").classList.add("hidden");
  $("#noAccessView").classList.remove("hidden");
  $("#noAccessEmail").textContent = email || "";
  $("#logoutBtn").classList.remove("hidden");
}
function showDash(){
  $("#loginView").classList.add("hidden");
  $("#noAccessView").classList.add("hidden");
  $("#dashView").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");
  loadAll();
}
$("#refreshBtn").onclick = loadAll;

async function loadAll(){
  await loadStores();
  loadPlatformStats();
}

/* ---------- Platform stats ---------- */
async function loadPlatformStats(){
  try {
    const { data: orders } = await sb.from("orders").select("total, status");
    const list = orders || [];
    $("#psOrders").textContent = list.length;
    $("#psRevenue").textContent = fmt(list.filter(o => o.status !== "Cancelled").reduce((s, o) => s + Number(o.total || 0), 0));
  } catch (e) { /* stats khaali rahenge */ }
  try {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { count } = await sb.from("visits").select("id", { count: "exact", head: true }).gte("created_at", since);
    $("#psVisits7").textContent = count ?? "–";
  } catch (e) { $("#psVisits7").textContent = "–"; }
  $("#psStores").textContent = STORES.filter(s => s.status !== "deleted").length;
}

/* ---------- Stores ---------- */
async function loadStores(){
  const wrap = $("#storesWrap");
  const { data, error } = await sb.from("stores").select("*").order("created_at", { ascending: true });
  if (error){ wrap.innerHTML = `<p class="empty-note">Stores load nahi ho sakin: ${esc(error.message)}</p>`; STORES = []; return; }
  STORES = data || [];
  renderStores();
  renderBilling();
  fillTemplateSources();
  loadPlatformStats();
}
function statusPill(s){
  if (s.status === "suspended") return `<span class="pill">⏸ Suspended</span>`;
  if (s.status === "deleted") return `<span class="pill red">🗑 Deleted</span>`;
  return `<span class="pill green">✅ Active</span>`;
}
function feePill(s){
  if (isOverdue(s)) return `<span class="pill red">🔴 Overdue</span>`;
  return s.fee_status === "unpaid" ? `<span class="pill">⚠️ Fee baaki</span>` : `<span class="pill green">💰 Paid</span>`;
}
function renderStores(){
  const wrap = $("#storesWrap");
  const list = STORES.filter(s => s.status !== "deleted");
  if (!list.length){ wrap.innerHTML = `<p class="empty-note">Abhi koi store nahi hai — upar wale form se pehli store banayein.</p>`; return; }
  wrap.innerHTML = list.map(s => `
  <div class="store-card ${s.status === "suspended" ? "suspended" : ""}" data-store="${esc(s.id)}">
    <div class="store-head">
      <div>
        <h4>🏪 ${esc(s.name)} ${statusPill(s)} ${feePill(s)}</h4>
        <div class="store-meta">
          🔗 Slug: <strong>${esc(s.slug)}</strong> • 👤 Owner: ${esc(s.owner_email || "—")}<br>
          📦 Plan: <strong>${esc(s.plan)}</strong> • 💰 Fee: <strong>${fmt(s.monthly_fee)}</strong>/month • 📅 Next due: <strong>${fmtDate(s.next_due)}</strong><br>
          🌐 Domain: ${s.custom_domain ? `<strong>${esc(s.custom_domain)}</strong> (${esc(s.domain_status)})` : "koi nahi"} • 🗓 Banayi gayi: ${fmtDate((s.created_at || "").slice(0, 10))}
        </div>
        <div class="linkrow">
          <a href="${esc(pageUrl("index.html", s.slug))}" target="_blank">🔗 Storefront</a>
          <button class="btn small ghost" data-copy="${esc(pageUrl("index.html", s.slug))}">📋 Link copy</button>
          <a href="${esc(pageUrl("admin.html", s.slug))}" target="_blank">🛠️ Admin</a>
          <button class="btn small ghost" data-copy="${esc(pageUrl("admin.html", s.slug))}">📋 Admin link copy</button>
        </div>
      </div>
    </div>
    <div class="store-actions">
      ${s.status === "active"
        ? `<button class="btn small amber" data-suspend="${esc(s.id)}">⏸ Suspend</button>`
        : `<button class="btn small" data-activate="${esc(s.id)}">▶ Activate</button>`}
      <button class="btn small" data-feepaid="${esc(s.id)}">💰 Fee mili</button>
      <button class="btn small ghost" data-feeunpaid="${esc(s.id)}">⚠️ Fee baaki</button>
      <button class="btn small ghost" data-edit="${esc(s.id)}">✏️ Edit</button>
      <button class="btn small danger" data-del="${esc(s.id)}">🗑 Delete</button>
    </div>
    <div class="store-edit hidden" data-editpanel="${esc(s.id)}">
      <div class="addform" style="margin-bottom:6px">
        <div><label>Store name</label><input data-e="name" value="${esc(s.name)}"></div>
        <div><label>Plan</label><select data-e="plan">${["Basic", "Pro", "Custom"].map(p => `<option ${p === s.plan ? "selected" : ""}>${p}</option>`).join("")}</select></div>
        <div><label>Monthly fee (Rs)</label><input data-e="monthly_fee" type="number" min="0" value="${s.monthly_fee || 0}"></div>
        <div><label>Next due date</label><input data-e="next_due" type="date" value="${esc(s.next_due || "")}"></div>
        <div><label>Custom domain (e.g. shop.client.com)</label><input data-e="custom_domain" value="${esc(s.custom_domain || "")}" placeholder="khaali = koi domain nahi"></div>
        <div><label>Domain status</label><select data-e="domain_status">${[["none", "None"], ["pending", "Pending"], ["live", "Live"]].map(([v, l]) => `<option value="${v}" ${v === s.domain_status ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      </div>
      <button class="btn small" data-saveedit="${esc(s.id)}">💾 Save changes</button>
      <p class="msg" data-editmsg></p>
      <div class="domain-help">
        <strong>🌐 Domain live karne ke steps:</strong><br>
        1) Client apna domain khareede (Namecheap/Hostinger).<br>
        2) Hosting Cloudflare Pages par shift hone ke baad, Super Admin Cloudflare mein domain add karega.<br>
        3) Client ko DNS mein CNAME record lagana hoga (details Cloudflare dega).<br>
        4) Yahan domain likh kar status 'live' karein.<br>
        <em>Note: Abhi hosting GitHub Pages par hai — domain tab kaam karega jab Phase 2 (Cloudflare) hoga. Slug links abhi se kaam karte hain.</em>
      </div>
    </div>
  </div>`).join("");
  bindStoreActions(wrap);
}
function bindStoreActions(wrap){
  wrap.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => copyText(b.dataset.copy, b));
  wrap.querySelectorAll("[data-suspend]").forEach(b => b.onclick = async () => {
    const s = STORES.find(x => x.id === b.dataset.suspend);
    if (!confirm(`"${s.name}" ko SUSPEND kar dein? Storefront band ho jayega (data mehfooz rahega).`)) return;
    await storeUpdate(s.id, { status: "suspended" });
  });
  wrap.querySelectorAll("[data-activate]").forEach(b => b.onclick = async () => {
    await storeUpdate(b.dataset.activate, { status: "active" });
  });
  wrap.querySelectorAll("[data-feepaid]").forEach(b => b.onclick = async () => {
    const s = STORES.find(x => x.id === b.dataset.feepaid);
    await storeUpdate(s.id, { fee_status: "paid", next_due: nextDueAfterPayment(s) });
  });
  wrap.querySelectorAll("[data-feeunpaid]").forEach(b => b.onclick = async () => {
    await storeUpdate(b.dataset.feeunpaid, { fee_status: "unpaid" });
  });
  wrap.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    const s = STORES.find(x => x.id === b.dataset.del);
    if (!confirm(`"${s.name}" ko DELETE kar dein? Yeh soft delete hai — store har jagah se gayab ho jayegi, data database mein rahega.`)) return;
    await storeUpdate(s.id, { status: "deleted" });
  });
  wrap.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => {
    const panel = wrap.querySelector(`[data-editpanel="${CSS.escape(b.dataset.edit)}"]`);
    if (panel) panel.classList.toggle("hidden");
  });
  wrap.querySelectorAll("[data-saveedit]").forEach(b => b.onclick = async () => {
    const id = b.dataset.saveedit;
    const panel = b.closest(".store-edit");
    const get = k => panel.querySelector(`[data-e="${k}"]`).value;
    const msg = panel.querySelector("[data-editmsg]");
    const domain = get("custom_domain").trim();
    const payload = {
      name: get("name").trim(),
      plan: get("plan"),
      monthly_fee: Math.max(0, parseInt(get("monthly_fee")) || 0),
      next_due: get("next_due") || null,
      custom_domain: domain || null,
      domain_status: get("domain_status")
    };
    if (!payload.name){ msg.textContent = "Store name khaali nahi ho sakta."; msg.className = "msg err"; return; }
    const { error } = await sb.from("stores").update(payload).eq("id", id);
    if (error){ msg.textContent = "Save fail: " + error.message; msg.className = "msg err"; return; }
    msg.textContent = "✅ Save ho gaya."; msg.className = "msg ok";
    loadStores();
  });
}
async function storeUpdate(id, payload){
  const { error } = await sb.from("stores").update(payload).eq("id", id);
  if (error) alert("Update fail: " + error.message);
  else loadStores();
}

/* ---------- Create store ---------- */
function slugify(name){
  return String(name || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
}
let slugAuto = true;
$("#csName").addEventListener("input", () => { if (slugAuto) $("#csSlug").value = slugify($("#csName").value); });
$("#csSlug").addEventListener("input", () => { slugAuto = false; $("#csSlug").value = slugify($("#csSlug").value); });
document.querySelectorAll('input[name="csMode"]').forEach(r => r.addEventListener("change", () => {
  const tpl = document.querySelector('input[name="csMode"]:checked').value === "template";
  $("#csTemplateOpts").classList.toggle("hidden", !tpl);
}));
function fillTemplateSources(){
  const sel = $("#csSourceStore");
  const list = STORES.filter(s => s.status !== "deleted");
  sel.innerHTML = list.map(s => `<option value="${esc(s.id)}">${esc(s.name)} (${esc(s.slug)})</option>`).join("");
}
/* Default due date: aaj se +30 din. */
$("#csDue").value = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return isoOf(d); })();

$("#csCreateBtn").onclick = async () => {
  const btn = $("#csCreateBtn");
  const msg = $("#csMsg");
  const result = $("#csResult");
  result.innerHTML = "";
  const name = $("#csName").value.trim();
  const slug = slugify($("#csSlug").value);
  const ownerEmail = $("#csOwnerEmail").value.trim().toLowerCase();
  const plan = $("#csPlan").value;
  const fee = Math.max(0, parseInt($("#csFee").value) || 0);
  const due = $("#csDue").value || null;
  const mode = document.querySelector('input[name="csMode"]:checked').value;
  if (!name){ msg.textContent = "Store name likhein."; msg.className = "msg err"; return; }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)){ msg.textContent = "Slug durust nahi — sirf chhoti letters, numbers aur '-' (e.g. karachi-shoes)."; msg.className = "msg err"; return; }
  if (!ownerEmail || !ownerEmail.includes("@")){ msg.textContent = "Owner ka sahi email likhein."; msg.className = "msg err"; return; }
  if (STORES.some(s => s.slug === slug && s.status !== "deleted")){ msg.textContent = `Slug "${slug}" pehle se istemal mein hai — doosra slug chunein.`; msg.className = "msg err"; return; }
  btn.disabled = true; btn.textContent = "Store ban rahi hai…"; msg.textContent = ""; msg.className = "msg";
  const steps = [];
  try {
    /* 1) Stores row */
    const { data: store, error: e1 } = await sb.from("stores").insert({
      slug, name, owner_email: ownerEmail, plan,
      monthly_fee: fee, fee_status: fee > 0 ? "unpaid" : "paid",
      next_due: due, status: "active"
    }).select().single();
    if (e1) throw new Error("Store row: " + e1.message);
    const sid = store.id;
    steps.push("✅ Store ban gayi");

    /* 2) Owner ko team mein owner role */
    const { error: e2 } = await sb.from("team").insert({ store_id: sid, email: ownerEmail, role: "owner" });
    if (e2) throw new Error("Team owner: " + e2.message);
    steps.push("✅ Owner team mein add ho gaya");

    /* 3) Settings row (khaali data — storefront naam stores.name se lega) */
    const { error: e3 } = await sb.from("settings").upsert({ store_id: sid, data: {} }, { onConflict: "store_id" });
    if (e3) throw new Error("Settings row: " + e3.message);
    steps.push("✅ Settings row ban gayi");

    /* 4) Template copy (optional) */
    if (mode === "template"){
      const srcId = $("#csSourceStore").value;
      const src = STORES.find(s => s.id === srcId);
      if (!src) throw new Error("Template store select nahi hua.");
      let catMap = {};
      if ($("#csCopyCategories").checked){
        const { data: cats, error: ec } = await sb.from("categories").select("name, image, visible, sort").eq("store_id", srcId).order("sort", { ascending: true });
        if (ec) throw new Error("Categories copy: " + ec.message);
        (cats || []).forEach(c => { catMap[c.name] = c.name; }); /* products.cat naam-string hai — map naam se hi banta hai */
        if (cats && cats.length){
          const { error: ei } = await sb.from("categories").insert(cats.map(c => ({ store_id: sid, name: catMap[c.name], image: c.image || "", visible: c.visible !== false, sort: c.sort ?? 0 })));
          if (ei) throw new Error("Categories copy: " + ei.message);
        }
        steps.push(`✅ Categories copy ho gayein (${(cats || []).length})`);
      }
      if ($("#csCopyProducts").checked){
        const { data: prods, error: ep } = await sb.from("products").select("*").eq("store_id", srcId);
        if (ep) throw new Error("Products copy: " + ep.message);
        if (prods && prods.length){
          const rows = prods.map(p => { const { id, created_at, ...rest } = p; return { ...rest, store_id: sid, cat: catMap[rest.cat] || rest.cat }; });
          const { error: ei } = await sb.from("products").insert(rows);
          if (ei) throw new Error("Products copy: " + ei.message);
        }
        steps.push(`✅ Products copy ho gaye (${(prods || []).length})`);
      }
      /* Settings data copy — store_name nayi store ka */
      const { data: srcSettings } = await sb.from("settings").select("data").eq("store_id", srcId).maybeSingle();
      const newData = JSON.parse(JSON.stringify((srcSettings && srcSettings.data) || {}));
      newData.store_name = name;
      const { error: e4 } = await sb.from("settings").upsert({ store_id: sid, data: newData }, { onConflict: "store_id" });
      if (e4) throw new Error("Settings copy: " + e4.message);
      steps.push("✅ Settings copy ho gayein (store name naya wala)");
    }

    const sf = pageUrl("index.html", slug), ad = pageUrl("admin.html", slug);
    result.innerHTML = `<div class="domain-help" style="background:#f0fdf4;border-color:#bbf7d0">
      <strong>🎉 Store "${esc(name)}" tayyar hai!</strong><br>
      ${steps.join("<br>")}
      <div class="linkrow">🔗 Storefront: <a href="${esc(sf)}" target="_blank">${esc(sf)}</a> <button class="btn small ghost" id="csCopySf">📋 Copy</button></div>
      <div class="linkrow">🛠️ Admin: <a href="${esc(ad)}" target="_blank">${esc(ad)}</a> <button class="btn small ghost" id="csCopyAd">📋 Copy</button></div>
      <p class="hint" style="margin-top:8px">Owner (${esc(ownerEmail)}) magic link se admin mein login kar sakta hai — agar link na aaye to pehle Supabase Dashboard → Authentication → Users mein us ka user banana hoga.</p>
    </div>`;
    $("#csCopySf").onclick = e => copyText(sf, e.target);
    $("#csCopyAd").onclick = e => copyText(ad, e.target);
    msg.textContent = "✅ Store ban gayi."; msg.className = "msg ok";
    $("#csName").value = ""; $("#csSlug").value = ""; $("#csOwnerEmail").value = ""; slugAuto = true;
    loadStores();
  } catch (e) {
    msg.textContent = "Store banane mein masla: " + e.message + (steps.length ? ` (Ho chuka tha: ${steps.join(", ")})` : "");
    msg.className = "msg err";
  } finally {
    btn.disabled = false; btn.textContent = "🏪 Store Banayein";
  }
};

/* ---------- Billing ---------- */
function renderBilling(){
  const alive = STORES.filter(s => s.status !== "deleted");
  const active = alive.filter(s => s.status === "active");
  $("#bTotal").textContent = alive.length;
  $("#bActive").textContent = active.length;
  $("#bMrr").textContent = fmt(active.reduce((s, x) => s + Number(x.monthly_fee || 0), 0));
  $("#bOverdue").textContent = alive.filter(isOverdue).length;
  const wrap = $("#billingWrap");
  if (!alive.length){ wrap.innerHTML = `<p class="empty-note">Abhi koi store nahi hai.</p>`; return; }
  const sorted = [...alive].sort((a, b) => (a.next_due || "9999-12-31") < (b.next_due || "9999-12-31") ? -1 : 1);
  wrap.innerHTML = `<table>
    <thead><tr><th>Store</th><th>Plan</th><th>Fee</th><th>Due date</th><th>Status</th><th></th></tr></thead>
    <tbody>${sorted.map(s => `<tr class="${isOverdue(s) ? "overdue" : ""}">
      <td><strong>${esc(s.name)}</strong><br><small style="color:var(--muted)">${esc(s.slug)} • ${esc(s.owner_email || "")}</small></td>
      <td>${esc(s.plan)}</td>
      <td><strong>${fmt(s.monthly_fee)}</strong></td>
      <td>${fmtDate(s.next_due)}</td>
      <td>${s.status === "suspended" ? `<span class="pill">⏸ Suspended</span>` : feePill(s)}</td>
      <td style="white-space:nowrap"><button class="btn small" data-bpaid="${esc(s.id)}">💰 Fee mili</button> <button class="btn small ghost" data-bremind="${esc(s.id)}">📩 WhatsApp reminder</button></td>
    </tr>`).join("")}</tbody></table>`;
  wrap.querySelectorAll("[data-bpaid]").forEach(b => b.onclick = async () => {
    const s = STORES.find(x => x.id === b.dataset.bpaid);
    await storeUpdate(s.id, { fee_status: "paid", next_due: nextDueAfterPayment(s) });
    $("#billingMsg").textContent = `✅ ${s.name} ki fee paid mark ho gayi — nayi due date ${fmtDate(nextDueAfterPayment(s))}.`;
    $("#billingMsg").className = "msg ok";
  });
  wrap.querySelectorAll("[data-bremind]").forEach(b => b.onclick = () => {
    const s = STORES.find(x => x.id === b.dataset.bremind);
    const text = `Assalamualaikum! Aap ke store '${s.name}' ki monthly fee Rs ${Number(s.monthly_fee || 0).toLocaleString("en-PK")} ki due date ${fmtDate(s.next_due)} hai. Barah-e-karam adaigi kar dein taake store chalta rahe. Shukriya! — Ali Baba Marketing`;
    copyText(text, b);
    $("#billingMsg").textContent = "📋 Reminder message copy ho gaya — WhatsApp par paste karke bhej dein.";
    $("#billingMsg").className = "msg ok";
  });
}

/* ---------- Tabs ---------- */
const SUPER_TABS = { stores: ["tabStores", "storesPanel"], billing: ["tabBilling", "billingPanel"] };
Object.entries(SUPER_TABS).forEach(([view, [tabId]]) => {
  document.getElementById(tabId).onclick = () => switchSuperTab(view);
});
function switchSuperTab(view){
  Object.entries(SUPER_TABS).forEach(([key, [tabId, panelId]]) => {
    document.getElementById(tabId).classList.toggle("active", key === view);
    document.getElementById(panelId).classList.toggle("hidden", key !== view);
  });
}
