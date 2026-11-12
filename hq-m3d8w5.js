/* ================= ShopNest Platform — SUPER ADMIN =================
   Shopify-partner-style platform panel: saari client stores, billing,
   domain tracking. Gate: login email public.platform_admins mein hona
   chahiye (RLS: apni row sirf platform admin ko hi nazar aati hai).
   Sirf anon client use hota hai — koi service key yahan NAHI hai. */
const SUPABASE_URL = "https://vyiwiqcbituttdjgsuwe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXdpcWNiaXR1dHRkamdzdXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTQ0MTYsImV4cCI6MjEwODA5MDQxNn0.fQDW8_b27GzTpu5XBi_Nqw12mmJlJodE0yB3Ei1KLNo";
/* FE-P4: agar CDN + local fallback dono fail hon to window.supabase nahi
   hoga — khaali/toota page dikhane ke bajaye saaf error dikha kar ruk jayein.
   (HTML mein bhi isi id ka banner banta hai — duplicate na bane is liye check.) */
if (!window.supabase || typeof window.supabase.createClient !== "function") {
  if (!document.getElementById("sbLoadError")) {
    const _sbErr = document.createElement("div");
    _sbErr.id = "sbLoadError";
    _sbErr.style.cssText = "background:#fee2e2;color:#991b1b;border:2px solid #ef4444;border-radius:12px;padding:16px 18px;margin:20px;font:700 15px/1.6 system-ui,sans-serif";
    _sbErr.textContent = "❌ Supabase library load nahi ho saki (CDN aur local copy dono fail). Internet check karke page reload karein — agar masla rahe to platform owner se rabta karein.";
    document.body.prepend(_sbErr);
  }
  throw new Error("Supabase client library missing (CDN + local fallback failed)");
}
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = s => document.querySelector(s);
const fmt = n => "Rs." + Number(n || 0).toLocaleString("en-PK");
function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
/* V3 Part B security: escapeHtml = esc. */
const escapeHtml = esc;

let MY_EMAIL = null;
let STORES = [];
let STORE_SETTINGS = {};   // store_id -> settings.data (theme/font dot + edit panel ke liye)
let accessCheckedFor = null;
let hqRefreshArmed = false; /* HQ stats refresh (L8): boot ke baad true — tab wapas aane par stats refresh chalega. */

/* Appearance options — p-x7k94f.js ke FONTS/THEME_SWATCHES se match.
   font_family settings mein OBJECT hota hai: { name, stack, google }. */
const FONTS = {
  "": { name: "", stack: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", google: "" },
  "Poppins": { name: "Poppins", stack: "'Poppins', system-ui, sans-serif", google: "Poppins:wght@400;500;600;700;800" },
  "Inter": { name: "Inter", stack: "'Inter', system-ui, sans-serif", google: "Inter:wght@400;500;600;700;800" },
  "Roboto": { name: "Roboto", stack: "'Roboto', system-ui, sans-serif", google: "Roboto:wght@400;500;700" },
  "Montserrat": { name: "Montserrat", stack: "'Montserrat', system-ui, sans-serif", google: "Montserrat:wght@400;500;600;700;800" },
  "Playfair Display": { name: "Playfair Display", stack: "'Playfair Display', Georgia, serif", google: "Playfair+Display:wght@500;600;700;800" },
  "Rubik": { name: "Rubik", stack: "'Rubik', system-ui, sans-serif", google: "Rubik:wght@400;500;600;700" }
};
const FONT_NAMES = ["", "Poppins", "Inter", "Roboto", "Montserrat", "Playfair Display", "Rubik"];
const THEME_SWATCHES = ["#0A2B4E", "#22C55E", "#7f1d1d", "#6d28d9", "#0f766e", "#111111", "#db2777"];
function fontObjFromName(name){ const f = FONTS[name] || FONTS[""]; return { name: f.name, stack: f.stack, google: f.google }; }
function fontNameOf(ff){
  if (!ff) return "";
  if (typeof ff === "string") return FONTS[ff] ? ff : "";
  return ff.name && FONTS[ff.name] ? ff.name : "";
}

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
  /* B2 MFA: platform admin ke liye AAL2 zaroori hai. AAL1 par platform_admins
     row nazar nahi aati (backend RLS), is liye pehle AAL dekhein — AAL1 ho to
     MFA prompt dikhayein, bare "no access" nahi. */
  const aal = await mfaGetAAL();
  if (!aal || aal.currentLevel === "aal1"){
    accessCheckedFor = null; // MFA ke baad dobara check ho sake
    await mfaShowGate(email);
    return;
  }
  const { data, error } = await sb.from("platform_admins").select("email").eq("email", email).maybeSingle();
  if (error || !data){ showNoAccess(email); return; }
  showDash();
}
/* ---------- B2 MFA (authenticator app) ----------
   Supabase Auth TOTP: magic link (AAL1) ke baad 6-digit code se AAL2.
   Secret/QR/code kabhi log nahi hota, kabhi localStorage mein nahi jata —
   sirf memory mein rehta hai aur verify ke baad saaf ho jata hai.
   Recovery codes istemal NAHI hote (experimental, disabled by default). */
let mfaEnrollFactorId = null; // sirf enrolment ke dauran, memory mein
let mfaGateDone = null; // MFA view se wapas aane par kya karna hai
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
  ["#loginView", "#dashView", "#noAccessView"].forEach(s => $(s).classList.add("hidden"));
  $("#mfaView").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");
}
/* MFA gate: AAL1 user ko challenge ya enrolment dikhayein. onDone MFA
   kamyab hone par chalta hai (dashboard check dobara hota hai). */
async function mfaShowGate(email){
  mfaClearSecrets();
  mfaHideAllViews();
  $("#mfaChallengeBox").classList.add("hidden");
  $("#mfaEnrollBox").classList.add("hidden");
  $("#mfaQrWrap").classList.add("hidden");
  $("#mfaChallengeMsg").textContent = ""; $("#mfaChallengeMsg").className = "msg";
  $("#mfaEnrollMsg").textContent = ""; $("#mfaEnrollMsg").className = "msg";
  $("#mfaIntro").innerHTML = "Platform admin ke liye <strong>doosri pehchan (MFA)</strong> zaroori hai. Pehle apne authenticator app (Google Authenticator / Authy) se 6-digit code dein.";
  const factors = await mfaListTotp();
  if (factors.length){
    // Pehle se enrolled — challenge dikhayein (2 factors hon to select karein).
    const sel = $("#mfaFactorSelect");
    sel.innerHTML = factors.map((f, i) => `<option value="${esc(f.id)}">Authenticator ${i + 1}${f.friendly_name ? " — " + esc(f.friendly_name) : ""}</option>`).join("");
    $("#mfaFactorPick").classList.toggle("hidden", factors.length < 2);
    $("#mfaChallengeBox").classList.remove("hidden");
    $("#mfaChallengeCode").focus();
  } else {
    // Abhi koi factor nahi — enrolment dikhayein.
    $("#mfaEnrollBox").classList.remove("hidden");
  }
  mfaGateDone = async () => {
    mfaClearSecrets();
    accessCheckedFor = null;
    const { data } = await sb.auth.getSession();
    if (data.session) checkPlatform(data.session);
  };
}
$("#mfaLogoutBtn").onclick = async () => { mfaClearSecrets(); await sb.auth.signOut(); location.reload(); };
$("#mfaCopySecretBtn").onclick = async function(){
  const sec = $("#mfaSecretText").textContent || "";
  if (!sec) return;
  await copyText(sec, this);
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
/* ---------- MFA manage (dashboard, sirf AAL2) ---------- */
async function loadMfaManage(){
  const list = $("#mfaFactorsList"), msg = $("#mfaManageMsg");
  if (!list) return;
  list.innerHTML = "<p class='empty-note'>Loading…</p>";
  if (msg){ msg.textContent = ""; msg.className = "msg"; }
  const aal = await mfaGetAAL();
  if (!aal || aal.currentLevel !== "aal2"){ list.innerHTML = "<p class='empty-note'>MFA verify nahi hua — pehle authenticator code se verify karein.</p>"; return; }
  const factors = await mfaListTotp();
  if (!factors.length){ list.innerHTML = "<p class='empty-note'>Abhi koi authenticator enrolled nahi hai.</p>"; return; }
  list.innerHTML = factors.map((f, i) => {
    const created = f.created_at ? new Date(f.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";
    return `<div class="mfa-factor-row"><span>📱 <strong>Authenticator ${i + 1}</strong>${f.friendly_name ? " — " + esc(f.friendly_name) : ""}<br><small>TOTP • Verified • ${esc(created)}</small></span><button class="btn danger small" data-mfa-remove="${esc(f.id)}" data-mfa-last="${factors.length === 1 ? "1" : "0"}">Remove</button></div>`;
  }).join("");
  list.querySelectorAll("[data-mfa-remove]").forEach(b => b.onclick = async () => {
    const factorId = b.dataset.mfaRemove;
    const isLast = b.dataset.mfaLast === "1";
    const ok = confirm(isLast
      ? "⚠️ Yeh AAKHRI authenticator hai — remove karne se MFA BAND ho jayega aur platform admin sirf magic link se login hoga. Kya aap waqai remove karna chahte hain?"
      : "Is authenticator ko remove kar dein?");
    if (!ok) return;
    if (msg){ msg.textContent = "Remove ho raha hai…"; msg.className = "msg"; }
    try {
      const { error } = await sb.auth.mfa.unenroll({ factorId });
      if (error) throw new Error(error.message || "Remove nahi ho saka");
      if (msg){ msg.textContent = "✅ Authenticator remove ho gaya."; msg.className = "msg ok"; }
      await loadMfaManage();
    } catch (e) {
      if (msg){ msg.textContent = "Error: " + (e && e.message ? e.message : "Remove nahi ho saka"); msg.className = "msg err"; }
    }
  });
}
$("#mfaAddFactorBtn").onclick = async () => {
  /* Doosra factor: MFA view mein enrolment dikhayein, phir dashboard par wapas. */
  mfaClearSecrets();
  mfaHideAllViews();
  $("#mfaChallengeBox").classList.add("hidden");
  $("#mfaEnrollBox").classList.remove("hidden");
  $("#mfaQrWrap").classList.add("hidden");
  $("#mfaEnrollStartBtn").classList.remove("hidden");
  $("#mfaEnrollMsg").textContent = "Doosra authenticator add kar rahe hain — yeh pehle wale se alag device/app par rakhein."; $("#mfaEnrollMsg").className = "msg";
  $("#mfaIntro").innerHTML = "Doosra authenticator add kar rahe hain — <strong>alag device ya app</strong> par rakhein, taa ke pehla kho jaye to doosra kaam aaye.";
  mfaGateDone = async () => {
    mfaClearSecrets();
    accessCheckedFor = null;
    const { data } = await sb.auth.getSession();
    if (data.session) checkPlatform(data.session);
  };
};
/* V3 Part B: Platform audit log — best-effort, action ko kabhi nahi rokta.
   platform_audit table par sirf platform admin ki policy hai (migration 5). */
async function audit(action, store_id, details){
  try {
    await sb.from("platform_audit").insert({
      actor_email: (typeof MY_EMAIL !== "undefined" && MY_EMAIL) || null,
      store_id: store_id || null,
      action,
      details: details || {}
    });
  } catch (e) {
    console.warn("Audit log fail (action phir bhi ho gaya):", e.message);
  }
}
function showNoAccess(email){
  $("#loginView").classList.add("hidden");
  $("#dashView").classList.add("hidden");
  $("#mfaView").classList.add("hidden");
  $("#noAccessView").classList.remove("hidden");
  $("#noAccessEmail").textContent = email || "";
  $("#logoutBtn").classList.remove("hidden");
}
function showDash(){
  $("#loginView").classList.add("hidden");
  $("#noAccessView").classList.add("hidden");
  $("#mfaView").classList.add("hidden");
  $("#dashView").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");
  loadMfaManage();
  loadAll();
}
$("#refreshBtn").onclick = loadAll;
/* HQ stats refresh lag (L8): admin ko J3 fix (visibilitychange → refresh)
   mila tha, HQ ko nahi — loadPlatformStats() sirf boot par chalta tha, is
   liye tab par wapas aane par numbers purane dikhte thay. Sirf STATS refresh
   karte hain (loadAll nahi): loadStores() → renderStores() khula hua store
   edit panel (data-editpanel inputs) mita deta — stats sirf text nodes hain.
   Store count (#psStores) STORES cache se aata hai; doosri session se store
   badle to ↻ Refresh dabayein. */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && hqRefreshArmed) loadPlatformStats();
});

async function loadAll(){
  await loadStores();
  loadPlatformStats();
  hqRefreshArmed = true; /* boot ho gaya — ab tab wapas aane par stats refresh chalega. */
}

/* ---------- Platform stats (FE-P2) ----------
   Purani load har store ka har order (total, status) bina limit ke parhti
   thi — PostgREST ~1000 rows par khamoshi se kaat deta hai, to revenue
   undercount hota. Ab: server-side aggregate RPC (platform_stats:
   COUNT/SUM/GROUP BY — DEC-20) pehle; RPC na ho to bounded read
   (1000 rows, newest first) + 1000-row note fallback. Revenue Cancelled
   orders ko EXCLUDE karta hai (DEC-20) — purana sum bhi yahi karta tha. */
async function loadPlatformStats(){
  /* FE-P2 / DEC-20: server-side aggregate RPC (platform_stats) pehle —
     exact counts, koi PostgREST 1000-row cap nahi. RPC na ho (abhi
     production mein deploy nahi hua) to purana bounded-read fallback. */
  try {
    const { data, error } = await sb.rpc("platform_stats");
    if (!error && data && data.length) {
      const r = data[0];
      $("#psOrders").textContent = r.order_count ?? "–";
      /* revenue_total Cancelled orders ko EXCLUDE karta hai (DEC-20) —
         purana client-side sum bhi yahi karta tha; number tab badlega
         jab Cancelled orders hon (correction, regression nahi). */
      $("#psRevenue").textContent = fmt(r.revenue_total ?? 0);
      const note = $("#psLimitNote");
      if (note) note.classList.add("hidden");
    } else {
      throw error || new Error("platform_stats unavailable");
    }
  } catch (e) {
    /* Fallback: bounded client-side read (1000 rows, newest first) + note. */
    try {
      const { count: orderCount } = await sb.from("orders").select("id", { count: "exact", head: true });
      $("#psOrders").textContent = orderCount ?? "–";
      const { data: orders } = await sb.from("orders").select("total, status").order("created_at", { ascending: false }).limit(1000);
      const list = orders || [];
      $("#psRevenue").textContent = fmt(list.filter(o => o.status !== "Cancelled").reduce((s, o) => s + Number(o.total || 0), 0));
      const note = $("#psLimitNote");
      if (note) note.classList.toggle("hidden", !(orderCount != null && orderCount > 1000));
    } catch (e2) { /* stats khaali rahenge */ }
  }
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
  /* FE-P2: select("*") ki jagah sirf zaroori columns (settings JSON aur
     baaki columns ab nahi aate). */
  const { data, error } = await sb.from("stores").select("id, name, slug, owner_email, plan, monthly_fee, fee_status, next_due, status, custom_domain, domain_status, theme, allowed_themes, created_at").order("created_at", { ascending: true });
  if (error){ wrap.innerHTML = `<p class="empty-note">Stores load nahi ho sakin: ${esc(error.message)}</p>`; STORES = []; return; }
  STORES = data || [];
  /* Saari stores ki settings EK query mein (theme color dot + edit panel
     ke font/theme values ke liye) — settings par public read policy hai.
     FE-P2 NOTE: yeh abhi bhi har store ka POORA settings JSON load karta
     hai (customCode/Meta samet). Sahi fix: sirf selected store ki settings
     load karna + platform_stats RPC (DEC-20) — SQL agent ki prepared
     migrations par munhasir hai; yahan tab tak yahi rehta hai. */
  try {
    const { data: srows } = await sb.from("settings").select("store_id, data");
    STORE_SETTINGS = {};
    (srows || []).forEach(r => { STORE_SETTINGS[r.store_id] = r.data || {}; });
  } catch (e) { STORE_SETTINGS = {}; }
  renderStores();
  renderBilling();
  fillTemplateSources();
  fillAuditStoreFilter();
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
  wrap.innerHTML = list.map(s => { const sset = STORE_SETTINGS[s.id] || {}; const theme = /^#[0-9a-fA-F]{6}$/.test(sset.theme_color || "") ? sset.theme_color : ""; return `
  <div class="store-card ${s.status === "suspended" ? "suspended" : ""}" data-store="${esc(s.id)}">
    <div class="store-head">
      <div>
        <h4>🏪 ${theme ? `<span class="color-dot" style="background:${esc(theme)}" title="Theme color: ${esc(theme)}"></span>` : ""}${esc(s.name)} ${statusPill(s)} ${feePill(s)}</h4>
        <div class="store-meta">
          🔗 Slug: <strong>${esc(s.slug)}</strong> • 👤 Owner: ${esc(s.owner_email || "—")}<br>
          📦 Plan: <strong>${esc(s.plan)}</strong> • 💰 Fee: <strong>${fmt(s.monthly_fee)}</strong>/month • 📅 Next due: <strong>${fmtDate(s.next_due)}</strong><br>
          🌐 Domain: ${s.custom_domain ? `<strong>${esc(s.custom_domain)}</strong> (${esc(s.domain_status)})` : "koi nahi"} • 🗓 Banayi gayi: ${fmtDate((s.created_at || "").slice(0, 10))}<br>
          🎨 Theme: <strong>${esc((window.SHOPNEST_THEME && window.SHOPNEST_THEME(s.theme || "general").name) || "General Store")}</strong> • ${(!Array.isArray(s.allowed_themes) || s.allowed_themes.length === 0) ? "sab themes allowed" : (s.allowed_themes.length + " themes allowed")}
        </div>
        <div class="linkrow">
          <a href="${esc(pageUrl("index.html", s.slug))}" target="_blank">🔗 Storefront</a>
          <button class="btn small ghost" data-copy="${esc(pageUrl("index.html", s.slug))}">📋 Link copy</button>
          <a href="${esc(pageUrl("p-x7k94f.html", s.slug))}" target="_blank">🛠️ Admin</a>
          <button class="btn small ghost" data-copy="${esc(pageUrl("p-x7k94f.html", s.slug))}">📋 Admin link copy</button>
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
      ${s.slug === "shopnest" ? "" : `<button class="btn small" data-luxcopy="${esc(s.id)}">👑 ${esc(v4ThemeDisplayName("luxury"))} setup copy</button>`}
      <button class="btn small danger" data-del="${esc(s.id)}">🗑 Delete</button>
    </div>
    <div class="store-edit hidden" data-editpanel="${esc(s.id)}">
      <div class="addform" style="margin-bottom:6px">
        <div><label>Store name</label><input data-e="name" value="${esc(s.name)}"></div>
        <div><label>Owner email (login email)</label><input data-e="owner_email" type="email" value="${esc(s.owner_email || "")}"></div>
        <p class="hint" style="grid-column:1 / -1">⚠️ <strong>Owner email badalne par:</strong> sirf store + team record update hoga — Supabase <strong>Auth user ka email Dashboard → Authentication → Users se ALAG se badalna hoga</strong>, warna owner naye email se login nahi kar sakega (purana Auth email hi kaam karega, magic link naye email par nahi aayega). Mismatch risk audit log mein darj hota hai. (HQ-A-05 / DEC-28a)</p>
        <div><label>Plan</label><select data-e="plan">${["Basic", "Pro", "Custom"].map(p => `<option ${p === s.plan ? "selected" : ""}>${p}</option>`).join("")}</select></div>
        <div><label>Monthly fee (Rs)</label><input data-e="monthly_fee" type="number" min="0" value="${s.monthly_fee || 0}"></div>
        <div><label>Next due date</label><input data-e="next_due" type="date" value="${esc(s.next_due || "")}"></div>
        <div><label>Custom domain (e.g. shop.client.com)</label><input data-e="custom_domain" value="${esc(s.custom_domain || "")}" placeholder="khaali = koi domain nahi"></div>
        <div><label>Domain status</label><select data-e="domain_status">${[["none", "None"], ["pending", "Pending"], ["live", "Live"]].map(([v, l]) => `<option value="${v}" ${v === s.domain_status ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div><label>🎨 Theme color (store ki pehchan)</label><input data-e="theme_color" type="color" value="${esc(theme || "#0A2B4E")}" style="width:100%;height:40px;border:1.5px solid var(--line);border-radius:8px;background:#fff;padding:3px">
          <span class="swatches">${THEME_SWATCHES.map(c => `<button type="button" class="swatch" data-eswatch="${c}" style="background:${c}" title="${c}"></button>`).join("")}</span></div>
        <div><label>🔤 Font family</label><select data-e="font_family">${FONT_NAMES.map(n => `<option value="${esc(n)}" ${n === fontNameOf(sset.font_family) ? "selected" : ""}>${n === "" ? "Default (system)" : esc(n)}</option>`).join("")}</select></div>
        <div style="grid-column:1 / -1"><label>🎨 Themes — is store ko kon se themes milenge?</label>
          <label class="checkline" style="border:0;padding:2px 0"><input type="checkbox" data-e="allow_all_themes" ${(!Array.isArray(s.allowed_themes) || s.allowed_themes.length === 0) ? "checked" : ""}> Sab themes allow karein (default)</label>
          <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:6px">${(window.SHOPNEST_THEMES || []).map(t => `<label class="checkline" style="border:0;padding:2px 6px"><input type="checkbox" data-theme-check="${t.key}" ${(Array.isArray(s.allowed_themes) && s.allowed_themes.length > 0 && s.allowed_themes.indexOf(t.key) === -1) ? "" : "checked"}> ${esc(t.name)} <small>(${esc(t.business)})</small></label>`).join("")}</div>
          <label style="margin-top:8px">Default theme (store ka active theme)</label>
          <select data-e="theme"><option value="">General (default look)</option>${(window.SHOPNEST_THEMES || []).map(t => `<option value="${t.key}" ${t.key === s.theme ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>
          <p class="hint" style="margin-top:4px">Store admin ko sirf allowed themes dikhengi. Default theme wohi hoga jo store kholte hi lagega — jab tak store admin khud koi aur allowed theme na chune.</p>
        </div>
      </div>
      <button class="btn small" data-saveedit="${esc(s.id)}">💾 Save changes</button>
      <p class="msg" data-editmsg></p>
      <div class="domain-help">
        <strong>🌐 Domain live karne ke steps:</strong><br>
        1) Client apna domain khareede (Namecheap/Hostinger).<br>
        2) Hosting Cloudflare Pages par shift hone ke baad, Super Admin Cloudflare mein domain add karega.<br>
        3) Client ko DNS mein CNAME record lagana hoga (details Cloudflare dega).<br>
        4) Yahan domain likh kar status 'live' karein.<br>
        <strong>Verify:</strong> 'Live' sirf tab karein jab domain asal mein store khol raha ho (browser mein domain khol kar check karein) — warna customers ko band store milega.<br>
        <em>Note: Abhi hosting GitHub Pages par hai — domain tab kaam karega jab Phase 2 (Cloudflare) hoga. Slug links abhi se kaam karte hain.</em>
      </div>
    </div>
  </div>`; }).join("");
  renderDeletedStores();
  reinjectThemeCopyResult(wrap);
 bindStoreActions(wrap);
}
function bindStoreActions(wrap){
  wrap.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => copyText(b.dataset.copy, b));
 wrap.querySelectorAll("[data-luxcopy]").forEach(b => b.onclick = () => openThemeCopyPanel("luxury", b.dataset.luxcopy, b));
  wrap.querySelectorAll("[data-suspend]").forEach(b => b.onclick = async () => {
    const s = STORES.find(x => x.id === b.dataset.suspend);
    if (!confirm(`"${s.name}" ko SUSPEND kar dein? Storefront band ho jayega (data mehfooz rahega).`)) return;
    await storeUpdate(s.id, { status: "suspended" });
    audit("store_suspended", s.id, { slug: s.slug });
  });
  wrap.querySelectorAll("[data-activate]").forEach(b => b.onclick = async () => {
    const _as = STORES.find(x => x.id === b.dataset.activate);
    await storeUpdate(b.dataset.activate, { status: "active" });
    audit("store_activated", b.dataset.activate, { slug: _as ? _as.slug : null });
  });
  wrap.querySelectorAll("[data-feepaid]").forEach(b => b.onclick = async () => {
    const s = STORES.find(x => x.id === b.dataset.feepaid);
    await storeUpdate(s.id, { fee_status: "paid", next_due: nextDueAfterPayment(s) });
    audit("fee_paid", s.id, { slug: s.slug, monthly_fee: s.monthly_fee });
  });
  wrap.querySelectorAll("[data-feeunpaid]").forEach(b => b.onclick = async () => {
    const _fu = STORES.find(x => x.id === b.dataset.feeunpaid);
    await storeUpdate(b.dataset.feeunpaid, { fee_status: "unpaid" });
    audit("fee_unpaid", b.dataset.feeunpaid, { slug: _fu ? _fu.slug : null });
  });
  wrap.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    const s = STORES.find(x => x.id === b.dataset.del);
    if (!confirm(`"${s.name}" ko DELETE kar dein? Yeh soft delete hai — store har jagah se gayab ho jayegi, data database mein rahega.`)) return;
    await storeUpdate(s.id, { status: "deleted" });
    audit("store_deleted", s.id, { slug: s.slug });
  });
  wrap.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => {
    const panel = wrap.querySelector(`[data-editpanel="${CSS.escape(b.dataset.edit)}"]`);
    if (panel) panel.classList.toggle("hidden");
  });
  wrap.querySelectorAll('[data-e="allow_all_themes"]').forEach(cb => cb.onchange = () => {
    if (!cb.checked) return;
    const panel = cb.closest(".store-edit");
    if (panel) panel.querySelectorAll("[data-theme-check]").forEach(c => { c.checked = true; });
  });
  wrap.querySelectorAll("[data-eswatch]").forEach(b => b.onclick = () => {
    const panel = b.closest(".store-edit");
    const input = panel && panel.querySelector('[data-e="theme_color"]');
    if (input) input.value = b.dataset.eswatch;
  });
  wrap.querySelectorAll("[data-saveedit]").forEach(b => b.onclick = async () => {
    const id = b.dataset.saveedit;
    const panel = b.closest(".store-edit");
    const get = k => panel.querySelector(`[data-e="${k}"]`).value;
    const msg = panel.querySelector("[data-editmsg]");
    const domain = get("custom_domain").trim();
    const allowAll = panel.querySelector('[data-e="allow_all_themes"]') && panel.querySelector('[data-e="allow_all_themes"]').checked;
    const checkedThemes = [...panel.querySelectorAll("[data-theme-check]:checked")].map(c => c.dataset.themeCheck);
    const _old = STORES.find(x => x.id === id) || {};
    const _newStatus = get("domain_status");
    const payload = {
      name: get("name").trim(),
      plan: get("plan"),
      monthly_fee: Math.max(0, parseInt(get("monthly_fee")) || 0),
      next_due: get("next_due") || null,
      /* V3 themes: [] = sab allowed; warna sirf checked keys. */
      allowed_themes: allowAll ? [] : checkedThemes,
      theme: get("theme") || null
    };
    if (!payload.name){ msg.textContent = "Store name khaali nahi ho sakta."; msg.className = "msg err"; return; }
    /* HQ-A-05 owner email (DEC-28a): stores.owner_email + team owner email
       dono update honge. Auth user ka email frontend se NAHI badal sakta
       (Auth Admin API ko service_role chahiye — anon key se nahi milti) —
       is liye confirm + warning + audit; Dashboard step laazmi hai. */
    const newOwnerEmail = get("owner_email").trim().toLowerCase();
    const ownerEmailChanged = newOwnerEmail && newOwnerEmail !== ((_old.owner_email || "").toLowerCase());
    if (newOwnerEmail && !newOwnerEmail.includes("@")){ msg.textContent = "Owner email durust nahi hai."; msg.className = "msg err"; return; }
    if (ownerEmailChanged){
      const okEmail = confirm(`Owner email "${_old.owner_email || "—"}" se "${newOwnerEmail}" kar rahe hain.\n\n⚠️ Yeh sirf store + team record badlega. Supabase Auth user ka email Dashboard → Authentication → Users se ALAG se badalna hoga — warna owner naye email se login nahi kar sakega (purana Auth email hi kaam karega, magic link naye email par nahi aayega).\n\nJaari rakhein?`);
      if (!okEmail) return;
      payload.owner_email = newOwnerEmail;
    }
    const { error } = await sb.from("stores").update(payload).eq("id", id);
    if (error){ msg.textContent = "Save fail: " + error.message; msg.className = "msg err"; return; }
    /* HQ-A-05: owner email badla ho to team owner row bhi update karein
       (team store update policy platform admin ko allow karti hai). */
    let ownerEmailNote = "";
    if (ownerEmailChanged){
      try {
        const { error: te } = await sb.from("team").update({ email: newOwnerEmail }).eq("store_id", id).eq("role", "owner");
        if (te) throw te;
        audit("store_owner_email_changed", id, { slug: _old.slug, old_email: _old.owner_email || null, new_email: newOwnerEmail, auth_user_must_be_updated_in_dashboard: true });
      } catch (te) {
        ownerEmailNote = " (⚠️ Team owner email update fail: " + te.message + " — store email badal gaya, team email purana reh gaya. Auth user bhi Dashboard se badalna hai.)";
      }
    }
    /* V3 Part B: domain sirf set_store_domain RPC se (yehi waahid rasta) —
       platform admin 'live' bhi isi se karta hai. */
    let domainNote = "";
    try {
      const { error: de } = await sb.rpc("set_store_domain", { p_store_id: id, p_domain: domain, p_status: _newStatus });
      if (de) throw de;
      if (_old.domain_status !== "live" && _newStatus === "live")
        audit("domain_live", id, { slug: _old.slug, domain: domain || null });
      else if (_old.custom_domain !== (domain || null) || _old.domain_status !== _newStatus)
        audit("domain_changed", id, { slug: _old.slug, domain: domain || null, domain_status: _newStatus });
    } catch (de) {
      domainNote = " (Domain save fail: " + de.message + " — baaki save ho gaya.)";
    }
    /* Appearance: USI store ki settings row mein theme_color + font_family
       merge karke upsert (baaki settings mehfooz) — platform3 migration ki
       policy isay allow karti hai. */
    try {
      const { data: fresh, error: fe } = await sb.from("settings").select("data").eq("store_id", id).maybeSingle();
      if (fe) throw fe;
      const merged = { ...((fresh && fresh.data) || STORE_SETTINGS[id] || {}) };
      merged.theme_color = get("theme_color");
      merged.font_family = fontObjFromName(get("font_family"));
      const { error: se } = await sb.from("settings").upsert({ store_id: id, data: merged }, { onConflict: "store_id" });
      if (se) throw se;
      STORE_SETTINGS[id] = merged;
      /* V3 Part B: theme allocation ya default theme badla ho to audit. */
      const _newAllowed = allowAll ? [] : checkedThemes;
      const _oldAllowed = Array.isArray(_old.allowed_themes) ? _old.allowed_themes : [];
      if (JSON.stringify([..._newAllowed].sort()) !== JSON.stringify([..._oldAllowed].sort()) || (_old.theme || null) !== (get("theme") || null))
        audit("theme_allocation_changed", id, { slug: _old.slug, allowed_themes: _newAllowed, theme: get("theme") || null });
      msg.textContent = "✅ Save ho gaya (Appearance samet)." + domainNote + ownerEmailNote; msg.className = "msg ok";
    } catch (e) {
      msg.textContent = "Store save ho gaya, lekin Appearance save fail: " + e.message + " (platform3 migration run hai?)";
      msg.className = "msg err";
    }
    loadStores();
  });
}
async function storeUpdate(id, payload){
  const { error } = await sb.from("stores").update(payload).eq("id", id);
  if (error) alert("Update fail: " + error.message);
  else loadStores();
}

/* ---------- HQ-A-05: Deleted stores — Restore (DEC-28a) ----------
   Soft-deleted stores pehle HQ mein kahin nazar nahi aati thin (sirf
   Dashboard/SQL se restore hoti thin). Yahan list + Restore (status wapas
   "active") — hard delete kabhi nahi hota. */
function renderDeletedStores(){
  const wrap = $("#deletedStoresWrap");
  if (!wrap) return;
  const list = STORES.filter(s => s.status === "deleted");
  if (!list.length){ wrap.innerHTML = `<p class="empty-note">Koi deleted store nahi hai.</p>`; return; }
  wrap.innerHTML = list.map(s => `
  <div class="store-card" data-deleted-store="${esc(s.id)}">
    <h4>🗑 ${esc(s.name)}</h4>
    <div class="store-meta">
      🔗 Slug: <strong>${esc(s.slug)}</strong> • 👤 Owner: ${esc(s.owner_email || "—")}<br>
      📦 Plan: <strong>${esc(s.plan)}</strong> • 💰 Fee: <strong>${fmt(s.monthly_fee)}</strong>/month • 🗓 Banayi gayi: ${fmtDate((s.created_at || "").slice(0, 10))}
    </div>
    <div class="store-actions">
      <button class="btn small" data-restore="${esc(s.id)}">↩️ Restore karein (wapas Active)</button>
    </div>
  </div>`).join("");
  wrap.querySelectorAll("[data-restore]").forEach(b => b.onclick = async () => {
    const s = STORES.find(x => x.id === b.dataset.restore);
    if (!s) return;
    if (!confirm(`"${s.name}" ko wapas ACTIVE kar dein? Storefront dobara khul jayegi.`)) return;
    await storeUpdate(s.id, { status: "active" });
    audit("store_restored", s.id, { slug: s.slug });
  });
}

/* ---------- HQ-A-04: Orphan cleanup (DEC-11 interim) ----------
   Orphan = store jis ka team mein koi owner row nahi (adhoori creation ya
   compensation se reh gaya). Cleanup = soft-delete (status "deleted") —
   slug free ho jata hai (create handler deleted slug ko dobara istemal
   karne deta hai) aur data DB mein rehta hai (hard delete nahi). */
async function scanOrphans(){
  const wrap = $("#orphanWrap"), msg = $("#orphanMsg");
  if (!wrap) return;
  wrap.innerHTML = "<p class='empty-note'>Scan ho raha hai…</p>";
  if (msg){ msg.textContent = ""; msg.className = "msg"; }
  try {
    const { data: teams, error: te } = await sb.from("team").select("store_id, email, role").eq("role", "owner");
    if (te) throw te;
    const ownerStoreIds = new Set((teams || []).map(t => t.store_id));
    const orphans = STORES.filter(s => !ownerStoreIds.has(s.id));
    if (!orphans.length){
      wrap.innerHTML = "<p class='empty-note'>✅ Koi orphan store nahi mili — har store ka owner team row maujood hai.</p>";
      return;
    }
    wrap.innerHTML = orphans.map(s => {
      const noSettings = !(STORE_SETTINGS[s.id]);
      return `
  <div class="store-card" data-orphan-store="${esc(s.id)}">
    <h4>⚠️ ${esc(s.name)} <span class="pill red">Orphan</span></h4>
    <div class="store-meta">
      🔗 Slug: <strong>${esc(s.slug)}</strong> • 👤 Owner email: ${esc(s.owner_email || "—")} • Status: ${esc(s.status)}<br>
      Team owner row: <strong>nahi hai</strong>${noSettings ? " • Settings row: <strong>nahi hai</strong>" : ""} — is store mein koi owner login nahi kar sakta.
    </div>
    <div class="store-actions">
      <button class="btn small danger" data-orphan-cleanup="${esc(s.id)}">🧹 Cleanup (soft-delete + slug free)</button>
    </div>
  </div>`; }).join("") + `<p class="hint">Cleanup sirf soft-delete karta hai — store lists se gayab ho jayegi, slug dobara istemal ho sakega, data database mein mehfooz rahega aur "Deleted stores" se restore ho sakega.</p>`;
    wrap.querySelectorAll("[data-orphan-cleanup]").forEach(b => b.onclick = async () => {
      const s = STORES.find(x => x.id === b.dataset.orphanCleanup);
      if (!s) return;
      if (!confirm(`Orphan store "${s.name}" (${s.slug}) ko CLEANUP kar dein?\n\nYeh soft-delete hai: store har list se gayab ho jayegi, slug "${s.slug}" dobara istemal ho sakega, aur data DB mein rahega (Deleted stores se restore ho sakega).`)) return;
      await storeUpdate(s.id, { status: "deleted" });
      audit("store_orphan_cleaned", s.id, { slug: s.slug, owner_email: s.owner_email || null });
      scanOrphans();
    });
  } catch (e) {
    wrap.innerHTML = `<p class="empty-note">Scan fail: ${esc(e.message)}</p>`;
  }
}

/* ---------- HQ-A-06: Audit log viewer — READ-ONLY (DEC-28b) ----------
   platform_audit par platform-admin SELECT policy hai, is liye direct
   select chalta hai (get_store_audit RPC per-store hota hai — cross-store
   view ke liye yeh select sahi rasta hai). Details ke VALUES nahi dikhate
   (audit mein kabhi customer PII aa sakta hai — DEC-14) — sirf keys.
   Pagination 50/page (.range) — FE-P2. */
let AUDIT_PAGE = 0;
const AUDIT_PAGE_SIZE = 50;
function fillAuditStoreFilter(){
  const sel = $("#auditStoreFilter");
  if (!sel) return;
  const cur = sel.value || "";
  sel.innerHTML = `<option value="">Saari stores</option>` + STORES.map(s => `<option value="${esc(s.id)}">${esc(s.name)} (${esc(s.slug)})${s.status === "deleted" ? " — deleted" : ""}</option>`).join("");
  if (cur) sel.value = cur;
}
async function loadAuditLog(){
  const wrap = $("#auditWrap"), info = $("#auditPageInfo");
  const prevBtn = $("#auditPrevBtn"), nextBtn = $("#auditNextBtn");
  if (!wrap) return;
  wrap.innerHTML = "<p class='empty-note'>Audit log load ho raha hai…</p>";
  if (info) info.textContent = "";
  try {
    const storeId = ($("#auditStoreFilter") && $("#auditStoreFilter").value) || "";
    const action = ($("#auditActionFilter") && $("#auditActionFilter").value.trim()) || "";
    let q = sb.from("platform_audit").select("id, created_at, actor_email, store_id, action, details", { count: "exact" }).order("created_at", { ascending: false }).range(AUDIT_PAGE * AUDIT_PAGE_SIZE, AUDIT_PAGE * AUDIT_PAGE_SIZE + AUDIT_PAGE_SIZE - 1);
    if (storeId) q = q.eq("store_id", storeId);
    if (action) q = q.ilike("action", "%" + action + "%");
    const { data, error, count } = await q;
    if (error) throw error;
    const rows = data || [];
    const total = count ?? rows.length;
    const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
    if (!rows.length){
      wrap.innerHTML = `<p class="empty-note">Is filter par koi audit entry nahi mili.</p>`;
    } else {
      wrap.innerHTML = `<table>
        <thead><tr><th>Waqt</th><th>Actor</th><th>Action</th><th>Store</th><th>Details (keys)</th></tr></thead>
        <tbody>${rows.map(r => {
          const st = STORES.find(s => s.id === r.store_id);
          const keys = (r.details && typeof r.details === "object") ? Object.keys(r.details) : [];
          const when = r.created_at ? new Date(r.created_at).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
          return `<tr><td style="white-space:nowrap">${esc(when)}</td><td>${esc(r.actor_email || "—")}</td><td><strong>${esc(r.action)}</strong></td><td>${st ? esc(st.name) + " (" + esc(st.slug) + ")" : (r.store_id ? esc(String(r.store_id).slice(0, 8)) + "…" : "—")}</td><td><small style="color:var(--muted)">${keys.length ? esc(keys.join(", ")) : "—"}</small></td></tr>`;
        }).join("")}</tbody></table>`;
    }
    if (info) info.textContent = `Page ${AUDIT_PAGE + 1} / ${totalPages} — kul ${total} entries (50/page)`;
    if (prevBtn) prevBtn.disabled = AUDIT_PAGE === 0;
    if (nextBtn) nextBtn.disabled = AUDIT_PAGE + 1 >= totalPages;
  } catch (e) {
    wrap.innerHTML = `<p class="empty-note">Audit log load nahi ho saka: ${esc(e.message)}</p>`;
    if (info) info.textContent = "";
  }
}

/* ---------- HQ-A-06: Platform Admins — READ-ONLY list (DEC-28b) ----------
   platform_admins par platform-admin SELECT policy hai. Yeh sirf LIST hai —
   add/remove yahan se NAHI hota (DEC-28b ka add/remove hissa is batch mein
   implement nahi — naya admin Dashboard → Authentication mein user bana
   kar + platform_admins row insert karke banta hai; last admin ko remove
   karna mana hai). */
async function loadPlatformAdmins(){
  const wrap = $("#adminsWrap");
  if (!wrap) return;
  wrap.innerHTML = "<p class='empty-note'>Loading…</p>";
  try {
    const { data, error } = await sb.from("platform_admins").select("email").order("email");
    if (error) throw error;
    const rows = data || [];
    if (!rows.length){ wrap.innerHTML = `<p class="empty-note">Koi platform admin nahi mila.</p>`; return; }
    wrap.innerHTML = `<table>
      <thead><tr><th>Email</th><th></th></tr></thead>
      <tbody>${rows.map(r => `<tr><td><strong>${esc(r.email)}</strong></td><td>${r.email === MY_EMAIL ? "<span class='pill green'>Aap</span>" : ""}</td></tr>`).join("")}</tbody></table>
      <p class="hint" style="margin-top:8px">Read-only list hai — yahan se admin add/remove nahi hota. Naya platform admin: pehle Dashboard → Authentication → Users mein us ka Auth user banayein (MFA enrolment ke saath — B2: platform admin ke liye AAL2 zaroori hai), phir platform_admins mein us ki email wali row insert karein. Aakhri admin ko kabhi remove na karein.</p>`;
  } catch (e) {
    wrap.innerHTML = `<p class="empty-note">Platform admins load nahi ho sake: ${esc(e.message)}</p>`;
  }
}

/* ---------- V4 Phase 3: theme copy — def-driven (runThemeCopy) ----------
   Copy profile (categories, copyKeys, sourceSlug, displayName, setThemeDefault,
                 copyProductsDefault, reelsMp4Only, productsLabel, productsWarning) hamesha def
      (themes-v4.js) se aata hai — file ke andar koi theme-specific value hardcoded nahi.
      Luxury ke liye def wahi values deta hai jo pehle yahan likhi thin, is liye result
      byte-identical rehta hai. Def na mile to copy saaf error ke saath ruk jata hai
         (koi aadha kaam nahi hota). */
function v4ThemeCopyProfile(themeKey){
   var def = (typeof window!== "undefined" && typeof window.SHOPNEST_THEME_DEF === "function")? window.SHOPNEST_THEME_DEF(themeKey): null;
   if (!def ||!def.copyProfile) return null;
   return def.copyProfile;
}
function v4ThemeDisplayName(themeKey){

   var profile = v4ThemeCopyProfile(themeKey);
   if (profile && profile.displayName) return profile.displayName;
   return themeKey? (themeKey.charAt(0).toUpperCase() + themeKey.slice(1)): "Luxury";
         }
function v4ThemeSourceSlug(themeKey){
   var profile = v4ThemeCopyProfile(themeKey);
   return (profile && profile.sourceSlug)? profile.sourceSlug: "shopnest";
}
function v4CapFirst(s){
   s = String(s || "");
   return s? (s.charAt(0).toUpperCase() + s.slice(1)): s;
}

/* ---------- Theme setup copy (B) — def-driven, aik click mein ---------- */
/* (B) ke saare theme values ab def ke copyProfile mein hain
   (themes-v4.js) — categories, copyKeys, sourceSlug. Yahan koi
   hardcoded list nahi rehti. */

let LAST_THEME_COPY = null;   /* aakhri copy ka result — loadStores() ke baad dobara dikhane ke liye */

/* "Khaali" ka matlab: key maujood hi nahi, ya value khaali hai.
   boolean false / number 0 CONFIGURED value hain — kabhi overwrite nahi. */
function isEmptyCopyVal(key, v){
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object"){
    if (key === "pdpText" || key === "sectionText"){
      const vals = Object.values(v);
      return vals.length === 0 || vals.every(x => x === "" || x === null || x === undefined);
    }
    return Object.keys(v).length === 0;
  }
  return false;
}

function isMp4Url(u){
  return typeof u === "string" && /\.mp4(\?|#|$)/i.test(u.trim());
}

function themeCopyResultHtml(r){
  const lines = [];
  lines.push(`<strong>✅ ${esc(r.themeName || "Luxury")} setup copy ho gaya — "${esc(r.target.name)}"</strong>`);
  lines.push(`Categories: ${r.catsCreated} ban gayin, ${r.catsSkipped} pehle se maujood thin.`);
  lines.push(r.filled.length ? `Settings bhari gayin: ${esc(r.filled.join(", "))}.` : "Settings: koi khaali key nahi thi — kuch copy nahi hua.");
  if (r.skipped.length) lines.push(`Skip (pehle se configured): ${esc(r.skipped.join(", "))}.`);
  lines.push(r.themeSet ? `Theme: ${esc(r.themeName || "Luxury")} set ho gaya.` : "Theme: nahi badla (checkbox OFF tha).");
  lines.push(r.copyProducts ? `Products: ${r.prodsCopied} copy hue, ${r.prodsSkipped} naam pehle se maujood the (skip).` : "Products: copy nahi hue (checkbox OFF — default).");
  r.notes.forEach(n => lines.push("ℹ️ " + esc(n)));
  if (r.orderAppended && r.orderAppended.length) lines.push(`✅ Homepage order: ${esc(r.themeName || "Luxury")} sections add kar diye gaye: ` + esc(r.orderAppended.join(", ")) + ".");
  if (!r.filled.length && !r.catsCreated && !r.themeSet && !r.copyProducts && !(r.orderAppended && r.orderAppended.length)) lines.push("Kuch nahi badla — sab kuch pehle se maujood/configured tha (dobara chalane par bhi yahi hoga).");
  return lines.join("<br>");
}

/* ---------- Sections-order follow-up — (B) copy ke waqt missing theme keys append karo ---------- */ /* Sirf theme-only sections (def copyProfile.orderKeys) — Luxury defaultOrder ki tartib mein. hero / new_arrivals / reels / hot generic sections hain — unhein append karna owner ki deliberate removal ko wapas la sakta hai, is liye in 4 tak mehdood hai. */ function appendMissingOrderKeys(merged, def){ const keys = (def && def.copyProfile && Array.isArray(def.copyProfile.orderKeys))? def.copyProfile.orderKeys: []; const so = merged.sections_order; if (!Array.isArray(so) ||!so.length) return []; const have = new Set(so.map(e => (e && typeof e.key === "string")? e.key: e)); const appended = []; merged.sections_order = so.slice(); keys.forEach(k => { if (!have.has(k)){ merged.sections_order.push({ key: k, visible: true}); appended.push(k);}}); return appended;} async function runThemeCopy(themeKey, targetId, opts){
   var def = (typeof window!== "undefined" && typeof window.SHOPNEST_THEME_DEF === "function")? window.SHOPNEST_THEME_DEF(themeKey): null;
   var profile = (def && def.copyProfile)? def.copyProfile: null;
   if (!profile) throw new Error("Is theme ke liye copy profile nahi hai — themes-v4.js load nahi hua ya def mein copyProfile nahi.");
   var displayName = profile.displayName || themeKey;
  const target = STORES.find(s => s.id === targetId);
  const src = STORES.find(s => s.slug === profile.sourceSlug && s.status !== "deleted");
  if (!target) throw new Error("Target store nahi mili.");
  if (!src) throw new Error("Source store '" + profile.sourceSlug + "' nahi mili.");
  if (src.id === targetId) throw new Error(v4CapFirst(profile.sourceSlug) + " khud source hai — us par copy nahi chal sakta.");
  if (target.status === "deleted") throw new Error("Deleted store par copy nahi chal sakta.");

  const steps = [];
  const filled = [], skipped = [], notes = [];
  let catsCreated = 0, prodsCopied = 0, prodsSkipped = 0, themeSet = false;

  try {
    /* 1) Categories — 7 Luxury naam; jo naam target pe hai woh skip. */
    const { data: srcCats, error: ec1 } = await sb.from("categories").select("name, image, visible, sort").eq("store_id", src.id).in("name", profile.categories);
    if (ec1) throw new Error("Source categories: " + ec1.message);
    const { data: tgtCats, error: ec2 } = await sb.from("categories").select("name").eq("store_id", targetId);
    if (ec2) throw new Error("Target categories: " + ec2.message);
    const haveNames = new Set((tgtCats || []).map(c => c.name));
    const srcCatByName = {};
    (srcCats || []).forEach(c => { srcCatByName[c.name] = c; });
    const missing = profile.categories.filter(n => !haveNames.has(n));
    if (missing.length){
      const rows = missing.map(n => { const sc = srcCatByName[n] || {}; return { store_id: targetId, name: n, image: sc.image || "", visible: sc.visible !== false, sort: sc.sort ?? 0 }; });
      const { error: ei } = await sb.from("categories").insert(rows);
      if (ei) throw new Error("Categories insert: " + ei.message);
      catsCreated = missing.length;
    }
    const catsSkipped = profile.categories.length - catsCreated;
    steps.push(`✅ Categories: ${catsCreated} ban gayin, ${catsSkipped} pehle se maujood thin (skip)`);

    /* 2) Settings — fresh read, per-key sirf khaali keys bharo. */
    const { data: srcSet, error: esrc } = await sb.from("settings").select("data").eq("store_id", src.id).maybeSingle();
    if (esrc) throw new Error("Source settings: " + esrc.message);
    const srcData = (srcSet && srcSet.data) || {};
    const { data: tgtSet, error: es } = await sb.from("settings").select("data").eq("store_id", targetId).maybeSingle();
    if (es) throw new Error("Target settings: " + es.message);
    const merged = { ...((tgtSet && tgtSet.data) || {}) };
    let settingsDirty = false;

    profile.copyKeys.forEach(k => {
      /* HQ-A-15 / DEC-30: source store ka Instagram handle kabhi copy nahi
         hota — target ka apna handle (ya khaali) rehta hai. */
      if (k === "instaHandle"){ notes.push("instaHandle: source ka handle copy nahi hua — target ka apna handle rahega."); return; }
      if (k === "instaReels"){
        const mp4Only = profile.reelsMp4Only!== false;
         const filtered = Array.isArray(srcData.instaReels) ? srcData.instaReels.filter(r => r && (!mp4Only || isMp4Url(r.video))) : [];
        if (!filtered.length){ notes.push(mp4Only ? "Reels: source mein koi direct MP4 reel nahi — instaReels copy nahi hua." : "Reels: source mein koi reel nahi — instaReels copy nahi hua."); return; }
        if (isEmptyCopyVal(k, merged[k])){ merged[k] = JSON.parse(JSON.stringify(filtered)); filled.push(k + " (" + filtered.length + " reels)"); settingsDirty = true; }
        else skipped.push(k);
        return;
      }
      const sv = srcData[k];
      if (sv === undefined || sv === null){ notes.push(k + ": source pe khaali — copy nahi hua."); return; }
      if (isEmptyCopyVal(k, sv)){ notes.push(k + ": source pe khaali — copy nahi hua."); return; }
      if (isEmptyCopyVal(k, merged[k])){ merged[k] = JSON.parse(JSON.stringify(sv)); filled.push(k); settingsDirty = true; }
      else skipped.push(k);
    });

    /* 3) Theme — checkbox ON ho to settings.theme + stores.theme dono Luxury. */
    if (opts.setTheme){
      merged.theme = themeKey;
      settingsDirty = true;
      const storePatch = { theme: themeKey };
      if (Array.isArray(target.allowed_themes) && target.allowed_themes.length > 0 && target.allowed_themes.indexOf(themeKey) === -1)
        storePatch.allowed_themes = [...target.allowed_themes, themeKey];
      const { error: et } = await sb.from("stores").update(storePatch).eq("id", targetId);
      if (et) throw new Error("Theme set: " + et.message);
      themeSet = true;
    }

    /* 3b) Homepage order — missing theme keys end par append karo (object form). Saved order na ho (null/khaali) to kuch nahi — storefront tab theme defaultOrder istemal karta hai. Append hua to settings save karni hai. */ const orderAppended = appendMissingOrderKeys(merged, def); if (orderAppended.length) settingsDirty = true;     if (settingsDirty){
      const { error: eu } = await sb.from("settings").upsert({ store_id: targetId, data: merged }, { onConflict: "store_id" });
      if (eu) throw new Error("Settings save: " + eu.message);
      STORE_SETTINGS[targetId] = merged;
    }

    /* 4) Products — checkbox ON ho to, naam se skip (dobara copy = duplicate nahi). */
    let copyProducts = false;
    if (opts.copyProducts){
      copyProducts = true;
      const { data: srcProds, error: ep1 } = await sb.from("products").select("*").eq("store_id", src.id).in("cat", profile.categories);
      if (ep1) throw new Error("Source products: " + ep1.message);
      const { data: tgtProds, error: ep2 } = await sb.from("products").select("name").eq("store_id", targetId);
      if (ep2) throw new Error("Target products: " + ep2.message);
      const haveProdNames = new Set((tgtProds || []).map(p => p.name));
      const newProds = (srcProds || []).filter(p => !haveProdNames.has(p.name));
      prodsSkipped = (srcProds || []).length - newProds.length;
      if (newProds.length){
        const rows = newProds.map(p => { const { id, created_at, ...rest } = p; return { ...rest, store_id: targetId }; });
        const { error: ei } = await sb.from("products").insert(rows);
        if (ei) throw new Error("Products insert: " + ei.message);
        prodsCopied = newProds.length;
      }
      steps.push(`✅ Products: ${prodsCopied} copy hue, ${prodsSkipped} naam pehle se maujood the (skip)`);
    }

    /* 5) Homepage order — step 3b mein missing theme keys append ho chuki hain (upsert se pehle, taake save ho jayen). Yahan sirf audit + return. */
  
  


    audit(themeKey + "_setup_copied", targetId, { source: src.slug, categories_created: catsCreated, settings_filled: filled, theme_set: themeSet, products_copied: prodsCopied, order_appended: orderAppended });
    return { target, src, catsCreated, catsSkipped, filled, skipped, notes, themeSet, copyProducts, prodsCopied, prodsSkipped, orderAppended, steps, themeName: displayName };
  } catch (e) {
    e.stepsDone = steps.slice();
    throw e;
  }
}

/* Purana naam — alias, taa ke koi purana caller na toote. */
async function runLuxuryCopy(targetId, opts){ return runThemeCopy("luxury", targetId, opts);}
function openThemeCopyPanel(themeKey, storeId, btn){
  const card = btn.closest(".store-card");
  if (!card) return;
  const old = card.querySelector("[data-luxpanel]");
  if (old){ old.remove(); return; }   /* dobara click = band */
  const store = STORES.find(s => s.id === storeId);
   var profile = v4ThemeCopyProfile(themeKey);
   var displayName = v4ThemeDisplayName(themeKey);
   var sourceSlug = v4ThemeSourceSlug(themeKey);
  const panel = document.createElement("div");
  panel.className = "domain-help";
  panel.setAttribute("data-luxpanel", "");
  panel.style.marginTop = "8px";
  panel.innerHTML = `
    <strong>👑 ${esc(displayName)} setup copy — "${esc(store ? store.name : "")}"</strong><br>
    Source: <strong>${esc(sourceSlug)}</strong> (sirf read — us mein kuch nahi badlega).<br>
    <label class="checkline"><input type="checkbox" data-luxopt="theme"${profile && profile.setThemeDefault === false? "": " checked"}> Theme bhi <strong>${esc(displayName)}</strong> set karein</label><br>
    <label class="checkline"><input type="checkbox" data-luxopt="products"${profile && profile.copyProductsDefault? " checked": ""}> Demo products bhi copy karein (${esc((profile && profile.productsLabel) || "")})</label>
    ${(profile && profile.productsWarning)? `<p class="hint">⚠️ ${esc(profile.productsWarning)}</p>`: ""}
    <p class="hint">Settings sirf khaali keys mein bhari jayengi — store ki apni configured values kabhi overwrite nahi hongi. Categories naam se skip hongi.</p>
    <button class="btn small" data-luxgo>✅ Copy karein</button>
    <button class="btn small ghost" data-luxcancel>✖ Cancel</button>
    <p class="msg" data-luxmsg></p>`;
  card.appendChild(panel);
  panel.querySelector("[data-luxcancel]").onclick = () => panel.remove();
  panel.querySelector("[data-luxgo]").onclick = async () => {
    const goBtn = panel.querySelector("[data-luxgo]");
    const msg = panel.querySelector("[data-luxmsg]");
    goBtn.disabled = true; goBtn.textContent = "Copy ho raha hai…";
    msg.textContent = ""; msg.className = "msg";
    try {
      const res = await runThemeCopy(themeKey, storeId, {
        setTheme: panel.querySelector('[data-luxopt="theme"]').checked,
        copyProducts: panel.querySelector('[data-luxopt="products"]').checked
      });
      LAST_THEME_COPY = { storeId, html: themeCopyResultHtml(res) };
      loadStores();   /* result reinjectThemeCopyResult se dobara dikhega */
    } catch (e) {
      msg.textContent = "❌ Copy fail: " + e.message + (e.stepsDone && e.stepsDone.length ? " (Ho chuka tha: " + e.stepsDone.join(", ") + ")" : "");
      msg.className = "msg err";
      goBtn.disabled = false; goBtn.textContent = "✅ Copy karein";
    }
  };
}

function reinjectThemeCopyResult(wrap){
  if (!LAST_THEME_COPY) return;
  const card = wrap.querySelector(`[data-store="${CSS.escape(LAST_THEME_COPY.storeId)}"]`);
  if (!card) return;
  if (card.querySelector("[data-luxresult]")) return;
  const box = document.createElement("div");
  box.className = "domain-help";
  box.setAttribute("data-luxresult", "");
  box.style.marginTop = "8px";
  box.style.background = "#f0fdf4";
  box.style.borderColor = "#bbf7d0";
  box.innerHTML = LAST_THEME_COPY.html + `<br><button class="btn small ghost" data-luxdismiss>✖ Band karein</button>`;
  box.querySelector("[data-luxdismiss]").onclick = () => { LAST_THEME_COPY = null; box.remove(); };
  card.appendChild(box);
}

/* ---------- HQ-A-04: store creation compensation (DEC-11 interim) ----------
   TARGET ek server-side transactional `create_store_with_setup` RPC hai
   (store + team + settings + template ek transaction mein) — woh abhi
   nahi hai. Jab tak woh na aaye, yeh compensation hi hai: ulta order mein
   hard-delete (products → categories → settings → team → store row).
   Store row ka hard delete fail ho to fallback soft-delete (status
   "deleted") — slug phir bhi free ho jata hai (create handler deleted
   slug ko dobara istemal karne deta hai).
   MANUAL RUNBOOK (agar yeh compensation bhi fail ho):
   1) HQ → neeche "Orphan stores" section → Scan karein → us store ki row
      par "Cleanup" dabayein (soft-delete + slug free).
   2) Agar woh bhi fail ho to Supabase Dashboard → Table Editor → stores
      row ko status='deleted' karein, phir team/settings/categories/
      products rows (store_id = <id>) delete karein.
   3) Dobara banane se pehle slug check karein — deleted store ka slug
      dobara istemal ho sakta hai. */
async function compensatePartialStore(sid){
  const cleaned = [], failed = [];
  const del = async (label, query) => {
    try {
      const { error } = await query;
      if (error) throw error;
      cleaned.push(label);
    } catch (e) { failed.push(label + " (" + e.message + ")"); }
  };
  await del("products", sb.from("products").delete().eq("store_id", sid));
  await del("categories", sb.from("categories").delete().eq("store_id", sid));
  await del("settings", sb.from("settings").delete().eq("store_id", sid));
  await del("team", sb.from("team").delete().eq("store_id", sid));
  try {
    const { error } = await sb.from("stores").delete().eq("id", sid);
    if (error) throw error;
    cleaned.push("store row");
  } catch (e) {
    /* Fallback: soft-delete — slug free ho jata hai, store lists se gayab. */
    try {
      const { error: se } = await sb.from("stores").update({ status: "deleted" }).eq("id", sid);
      if (se) throw se;
      cleaned.push("store row (soft-delete fallback)");
    } catch (e2) { failed.push("store row (" + e2.message + ")"); }
  }
  let note = "";
  if (cleaned.length) note += ` — Cleanup: ${cleaned.join(", ")} saaf kar diye gaye; slug dobara istemal ho sakta hai.`;
  if (failed.length) note += ` — ⚠️ Cleanup NA-MUKAMMAL: ${failed.join("; ")}. "Orphan stores" section se dobara cleanup karein ya manual runbook (oopar comment) dekhein.`;
  return note;
}

/* ---------- Create store ---------- */
function slugify(name){
  return String(name || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
}
let slugAuto = true;
$("#csName").addEventListener("input", () => { if (slugAuto) $("#csSlug").value = slugify($("#csName").value); });
$("#csSlug").addEventListener("input", () => { slugAuto = false; });
$("#csSlug").addEventListener("blur", () => { $("#csSlug").value = slugify($("#csSlug").value); });
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
  /* HQ-A-07 / DEC-12: server-side Auth-user check (auth_user_exists RPC)
     pehle — agar RPC maujood hai to woh authoritative hai. RPC na ho
     (abhi production mein deploy nahi hua) ya call fail ho to purana
     checkbox gate (checklist-enforced runbook) lagta hai. */
  let authChecked = false;
  try {
    const { data: userExists, error: authErr } = await sb.rpc("auth_user_exists", { p_email: ownerEmail });
    if (!authErr && userExists === true) { authChecked = true; }
    else if (!authErr && userExists === false) {
      msg.textContent = "⛔ Is owner email ka Auth user nahi mila: pehle Supabase Dashboard → Authentication → Users → Add user → yahi owner email (" + ownerEmail + ") → phir dobara koshish karein. (Bina Auth user ke owner login hi nahi kar sakega — store banane se pehle yeh zaroori hai.)";
      msg.className = "msg err"; return;
    }
    /* authErr → RPC maujood nahi / call fail → neeche checkbox gate. */
  } catch (e) { /* RPC call fail → checkbox gate. */ }
  if (!authChecked && (!$("#csAuthUserCheck") || !$("#csAuthUserCheck").checked)){
    msg.textContent = "⛔ Pehle owner ka Auth user banayein: Supabase Dashboard → Authentication → Users → Add user → yahi owner email → phir neeche wala checkbox tick karein aur dobara koshish karein. (Bina Auth user ke owner login hi nahi kar sakega.)";
    msg.className = "msg err"; return;
  }
  btn.disabled = true; btn.textContent = "Store ban rahi hai…"; msg.textContent = ""; msg.className = "msg";
  const steps = [];
  let sid = null; /* HQ-A-04: rollback ke liye store id try ke bahar */
  try {
    /* 1) Stores row */
    const { data: store, error: e1 } = await sb.from("stores").insert({
      slug, name, owner_email: ownerEmail, plan,
      monthly_fee: fee, fee_status: fee > 0 ? "unpaid" : "paid",
      next_due: due, status: "active"
    }).select().single();
    if (e1) throw new Error("Store row: " + e1.message);
    sid = store.id;
    steps.push("✅ Store ban gayi");
    audit("store_created", sid, { slug, owner: ownerEmail });

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
              newData.store_name = name;         /* (C) Wart fix: template copy shopnest ki pehchan bhi copy kar deta tha —            nayi store ko shopnest ka WhatsApp / logo / socials / theme colour mil            jata tha. Inhein khaali kar dein (theme, sections_order, Luxury keys            copy hone dein — wahi maqsad hai). */         newData.whatsapp_number = "";         newData.logo_url = "";         newData.socials = { facebook: "", instagram: "", tiktok: "", youtube: "", x: "", whatsapp: ""};         newData.theme_color = "";         /* HQ-A-15 (theme copy wala hi usool): source ka Instagram handle bhi            nayi store par nahi jana chahiye — target ka apna handle (ya khaali)            rahega. */         newData.instaHandle = "";         /* Profile fallback bhi reset: storefront logo profile.logo_url se aur            WhatsApp float profile.phone se bhi parhta hai — sirf top-level keys            khaali karne se shopnest ka number phir bhi leak hota. */         if (newData.profile) { newData.profile.logo_url = ""; newData.profile.phone = "";}
         /* Stale-save / leak fix: source store ki Meta config (Pixel/CAPI/test code) aur
            custom code nayi store par nahi jani chahiye — nayi store ki apni Meta hogi. */
         delete newData.meta; delete newData.customCode;
      const { error: e4 } = await sb.from("settings").upsert({ store_id: sid, data: newData }, { onConflict: "store_id" });
      if (e4) throw new Error("Settings copy: " + e4.message);
              steps.push("✅ Settings copy ho gayein (store name naya wala)");         steps.push("✅ ShopNest identity reset — WhatsApp/logo/socials/theme colour khaali (nayi store ki apni pehchan hogi)");
    }

    const sf = pageUrl("index.html", slug), ad = pageUrl("p-x7k94f.html", slug);
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
    /* HQ-A-04 compensation (DEC-11 interim): store row banne ke baad koi
       step fail ho to partial store saaf karein — warna store "active"
       nazar aati hai jab ke us ka owner/settings nahi, aur slug bhi
       taken rehta hai (retry fail). */
    let cleanupNote = "";
    if (sid) {
      cleanupNote = await compensatePartialStore(sid);
      audit("store_create_rolled_back", sid, { slug, error: e.message, steps_done: steps });
      loadStores();
    }
    msg.textContent = "Store banane mein masla: " + e.message + (steps.length ? ` (Ho chuka tha: ${steps.join(", ")})` : "") + cleanupNote;
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
    audit("fee_paid", s.id, { slug: s.slug, monthly_fee: s.monthly_fee, via: "billing" });
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
const SUPER_TABS = { stores: ["tabStores", "storesPanel"], billing: ["tabBilling", "billingPanel"], audit: ["tabAudit", "auditPanel"], admins: ["tabAdmins", "adminsPanel"] };
Object.entries(SUPER_TABS).forEach(([view, [tabId]]) => {
  document.getElementById(tabId).onclick = () => switchSuperTab(view);
});
function switchSuperTab(view){
  Object.entries(SUPER_TABS).forEach(([key, [tabId, panelId]]) => {
    document.getElementById(tabId).classList.toggle("active", key === view);
    document.getElementById(panelId).classList.toggle("hidden", key !== view);
  });
  /* HQ-A-06: Audit/Admins tab khulte hi fresh load (lazy — har load par nahi). */
  if (view === "audit"){ AUDIT_PAGE = 0; loadAuditLog(); }
  if (view === "admins") loadPlatformAdmins();
}
/* HQ-A-04 orphan scan + HQ-A-06 audit controls (HTML mein hain). */
$("#orphanScanBtn").onclick = scanOrphans;
$("#auditLoadBtn").onclick = () => { AUDIT_PAGE = 0; loadAuditLog(); };
$("#auditPrevBtn").onclick = () => { if (AUDIT_PAGE > 0){ AUDIT_PAGE--; loadAuditLog(); } };
$("#auditNextBtn").onclick = () => { AUDIT_PAGE++; loadAuditLog(); };
