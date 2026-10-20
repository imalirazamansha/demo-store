/* ================= ShopNest Admin ================= */
const SUPABASE_URL = "https://vyiwiqcbituttdjgsuwe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXdpcWNiaXR1dHRkamdzdXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTQ0MTYsImV4cCI6MjEwODA5MDQxNn0.fQDW8_b27GzTpu5XBi_Nqw12mmJlJodE0yB3Ei1KLNo";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = s => document.querySelector(s);
const fmt = n => "Rs " + Number(n || 0).toLocaleString("en-PK");
const STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

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
}
$("#refreshBtn").onclick = loadAll;

async function loadAll(){ await Promise.all([loadOrders(), loadProducts()]); }

/* ---------- Orders ---------- */
async function loadOrders(){
  const { data, error } = await sb.from("orders").select("*").order("id", { ascending: false });
  const wrap = $("#ordersWrap");
  if (error){ wrap.innerHTML = `<p class="empty-note">Orders load nahi ho sakay: ${error.message}</p>`; return; }
  $("#statOrders").textContent = data.length;
  $("#statPending").textContent = data.filter(o => o.status === "Pending").length;
  $("#statRevenue").textContent = fmt(data.filter(o => o.status === "Delivered").reduce((s,o) => s + o.total, 0));
  if (!data.length){ wrap.innerHTML = `<p class="empty-note">Abhi tak koi order nahi aaya.</p>`; return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>#</th><th>Customer</th><th>Phone / City</th><th>Address</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead>
    <tbody>${data.map(o => `<tr>
      <td><strong>#${o.id}</strong><br><small style="color:var(--muted)">${new Date(o.created_at).toLocaleString("en-PK",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}</small></td>
      <td><strong>${esc(o.customer_name)}</strong></td>
      <td>${esc(o.phone)}<br><small style="color:var(--muted)">${esc(o.city)}</small></td>
      <td style="max-width:170px">${esc(o.address)}</td>
      <td class="order-items">${(o.items||[]).map(i => `${esc(i.name)} × ${i.qty}`).join("<br>")}</td>
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
    const { error } = await sb.from("orders").delete().eq("id", +b.dataset.delOrder);
    if (error) alert("Delete fail: " + error.message); else loadOrders();
  });
}

/* ---------- Products ---------- */
async function loadProducts(){
  const { data, error } = await sb.from("products").select("*").order("id", { ascending: true });
  const wrap = $("#productsWrap");
  if (error){ wrap.innerHTML = `<p class="empty-note">Products load nahi ho sakay: ${error.message}</p>`; return; }
  $("#statProducts").textContent = data.length;
  wrap.innerHTML = data.map(p => prodCard(p)).join("");
  bindProdCards(wrap);
}
function prodCard(p){
  return `<div class="prod" data-id="${p.id}">
    ${p.img ? `<img src="${p.img}" alt="">` : ""}
    <label>Product name</label><input data-f="name" value="${esc(p.name||"")}">
    <div class="row2">
      <div><label>Price (Rs)</label><input data-f="price" type="number" value="${p.price||0}"></div>
      <div><label>Old price (Rs, optional)</label><input data-f="old" type="number" value="${p.old||""}"></div>
    </div>
    <div class="row2">
      <div><label>Category</label><input data-f="cat" value="${esc(p.cat||"")}"></div>
      <div><label>Show on store?</label><select data-f="active"><option value="true" ${p.active?"selected":""}>Yes — live</option><option value="false" ${!p.active?"selected":""}>No — hidden</option></select></div>
    </div>
    <label>Image URL</label><input data-f="img" value="${esc(p.img||"")}">
    <label>Description</label><textarea data-f="desc" rows="2">${esc(p.desc||"")}</textarea>
    <div class="actions">
      <button class="btn small" data-save="${p.id}">💾 Save</button>
      <button class="btn small danger" data-del="${p.id}">Delete</button>
    </div>
  </div>`;
}
function bindProdCards(wrap){
  wrap.querySelectorAll("[data-save]").forEach(b => b.onclick = async () => {
    const card = b.closest(".prod");
    const get = f => card.querySelector(`[data-f="${f}"]`).value;
    const payload = {
      name: get("name").trim(),
      price: parseInt(get("price")) || 0,
      old: get("old") ? parseInt(get("old")) : null,
      cat: get("cat").trim() || "General",
      active: get("active") === "true",
      img: get("img").trim(),
      desc: get("desc").trim(),
    };
    const { error } = await sb.from("products").update(payload).eq("id", +b.dataset.save);
    if (error) alert("Save fail: " + error.message);
    else { b.textContent = "✅ Saved!"; setTimeout(() => b.textContent = "💾 Save", 1500); loadProducts(); }
  });
  wrap.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("Yeh product delete kar dein?")) return;
    const { error } = await sb.from("products").delete().eq("id", +b.dataset.del);
    if (error) alert("Delete fail: " + error.message); else loadProducts();
  });
}
$("#addProductBtn").onclick = async () => {
  const { error } = await sb.from("products").insert({
    name: "New Product", cat: "General", price: 999, img: "", desc: "", active: false,
  });
  if (error) alert("Add fail: " + error.message);
  else { loadProducts(); alert("Naya product add ho gaya hai (abhi hidden hai) — details bhar kar 'Show on store' = Yes karke Save karein."); }
};

/* ---------- Tabs ---------- */
$("#tabOrders").onclick = () => switchTab(true);
$("#tabProducts").onclick = () => switchTab(false);
function switchTab(orders){
  $("#tabOrders").classList.toggle("active", orders);
  $("#tabProducts").classList.toggle("active", !orders);
  $("#ordersPanel").classList.toggle("hidden", !orders);
  $("#productsPanel").classList.toggle("hidden", orders);
}

function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
