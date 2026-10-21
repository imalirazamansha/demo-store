/* ================= CONFIG =================
   Supabase project keys — admin dashboard isi database se chalta hai.
   (anon key public hoti hai; asal security database policies (RLS) se hai.) */
const SUPABASE_URL = "https://vyiwiqcbituttdjgsuwe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXdpcWNiaXR1dHRkamdzdXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTQ0MTYsImV4cCI6MjEwODA5MDQxNn0.fQDW8_b27GzTpu5XBi_Nqw12mmJlJodE0yB3Ei1KLNo";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const fmt = n => "Rs " + Number(n).toLocaleString("en-PK");
const $ = s => document.querySelector(s);

let PRODUCTS = [];
let CATEGORIES = ["All"];
let activeCat = "All";
let cart = JSON.parse(localStorage.getItem("shopnest_cart") || "{}");
let qvId = null, qvQty = 1;
/* Checkout state: { source: 'cart' | 'buynow', entries: [[productId, qty], ...] } */
let checkoutState = null;

function stars(r){ const f = Math.round(Number(r) || 0); return "★".repeat(f) + "☆".repeat(5 - f); }
function findP(id){ return PRODUCTS.find(x => x.id === +id); }
/* Har product ki apni delivery fee (admin se set hoti hai). 0 = FREE delivery.
   Fee product par EK dafa lagti hai — quantity jitni bhi ho. */
function feeOf(p){ return Math.max(0, Number(p && p.delivery_fee) || 0); }
function deliveryTotal(entries){
  return entries.reduce((sum, [id]) => sum + feeOf(findP(id)), 0);
}
function delivText(p){
  const f = feeOf(p);
  return f === 0 ? "🚚 FREE Delivery" : "🚚 Delivery: " + fmt(f);
}

/* ---------- Load products from database ---------- */
async function loadProducts(){
  const { data, error } = await sb.from("products")
    .select("*").eq("active", true).order("id", { ascending: true });
  if (error){ console.error(error); $("#loadError").hidden = false; $("#resultsText").textContent = ""; return; }
  PRODUCTS = data || [];
  CATEGORIES = ["All", ...new Set(PRODUCTS.map(p => p.cat))];
  renderCats(); renderGrid(); renderCart();
}

/* ---------- Categories ---------- */
function renderCats(){
  $("#catNav").innerHTML = CATEGORIES.map(c =>
    `<button class="${c===activeCat?'active':''}" data-cat="${c}">${c}</button>`).join("");
  document.querySelectorAll("#catNav button").forEach(b =>
    b.onclick = () => { activeCat = b.dataset.cat; renderCats(); renderGrid(); });
}

/* ---------- Product grid ---------- */
function currentList(){
  const q = $("#searchInput").value.trim().toLowerCase();
  let list = PRODUCTS.filter(p =>
    (activeCat === "All" || p.cat === activeCat) &&
    (!q || p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)));
  const s = $("#sortSelect").value;
  if (s === "price-low")  list = [...list].sort((a,b) => a.price - b.price);
  if (s === "price-high") list = [...list].sort((a,b) => b.price - a.price);
  if (s === "rating")     list = [...list].sort((a,b) => b.rating - a.rating);
  if (s === "popular")    list = [...list].sort((a,b) => b.reviews - a.reviews);
  return list;
}
function renderGrid(){
  const list = currentList();
  $("#resultsText").textContent = PRODUCTS.length ? list.length + " products" : "";
  $("#emptyMsg").hidden = !(PRODUCTS.length && list.length === 0);
  $("#grid").innerHTML = list.map(p => {
    const off = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
    const f = feeOf(p);
    return `<article class="card">
      <div class="imgwrap" data-view="${p.id}">
        <img src="${p.img || ''}" alt="${p.name}" loading="lazy">
        ${off > 0 ? `<span class="badge">-${off}% OFF</span>` : ""}
      </div>
      <div class="card-body">
        <p class="card-cat">${p.cat}</p>
        <h3 data-view="${p.id}">${p.name}</h3>
        <p class="stars">${stars(p.rating)} <small>${p.rating} (${p.reviews})</small></p>
        <div class="price"><strong>${fmt(p.price)}</strong>${p.old ? `<del>${fmt(p.old)}</del>` : ""}</div>
        <p class="deliv ${f === 0 ? '' : 'paid'}">${delivText(p)}</p>
        <div class="card-actions">
          <button class="btn cart-add" data-add="${p.id}">Add to Cart 🛒</button>
          <button class="btn order-now" data-order="${p.id}">Order Now ⚡</button>
        </div>
      </div>
    </article>`;
  }).join("");
  document.querySelectorAll("[data-add]").forEach(b => b.onclick = () => addToCart(+b.dataset.add, 1));
  document.querySelectorAll("[data-order]").forEach(b => b.onclick = () => buyNow(+b.dataset.order, 1));
  document.querySelectorAll("[data-view]").forEach(el => el.onclick = () => openQuick(+el.dataset.view));
}

/* ---------- Cart ---------- */
function saveCart(){ localStorage.setItem("shopnest_cart", JSON.stringify(cart)); }
function cartCount(){ return Object.values(cart).reduce((a,b) => a + b, 0); }
function cartSubtotal(){ return Object.entries(cart).reduce((sum,[id,q]) => {
  const p = findP(id); return p ? sum + p.price * q : sum; }, 0); }

function addToCart(id, qty){
  cart[id] = (cart[id] || 0) + qty;
  saveCart(); renderCart();
  const p = findP(id);
  if (p) toast(`Added: ${p.name}`);
}
function setQty(id, q){
  if (q <= 0) delete cart[id]; else cart[id] = q;
  saveCart(); renderCart();
}
function renderCart(){
  const n = cartCount();
  $("#cartCount").textContent = n;
  $("#drawerCount").textContent = n ? `(${n} items)` : "";
  const box = $("#cartItems");
  if (!n){
    box.innerHTML = `<p class="cart-empty">🛒 Your cart is empty.<br>Add something you like!</p>`;
  } else {
    box.innerHTML = Object.entries(cart).map(([id, q]) => {
      const p = findP(id);
      if (!p) return "";
      return `<div class="cart-item">
        <img src="${p.img || ''}" alt="${p.name}">
        <div class="ci-info">
          <h4>${p.name}</h4><p>${fmt(p.price)} × ${q} = <strong>${fmt(p.price*q)}</strong></p>
          <p class="ci-deliv">${delivText(p)}</p>
          <div class="ci-row">
            <button class="qty-btn" data-dec="${p.id}">−</button><span>${q}</span>
            <button class="qty-btn" data-inc="${p.id}">+</button>
            <button class="ci-remove" data-rem="${p.id}">Remove</button>
          </div>
        </div></div>`;
    }).join("");
    document.querySelectorAll("[data-inc]").forEach(b => b.onclick = () => setQty(+b.dataset.inc, cart[b.dataset.inc] + 1));
    document.querySelectorAll("[data-dec]").forEach(b => b.onclick = () => setQty(+b.dataset.dec, cart[b.dataset.dec] - 1));
    document.querySelectorAll("[data-rem]").forEach(b => b.onclick = () => setQty(+b.dataset.rem, 0));
  }
  const sub = cartSubtotal();
  const fee = deliveryTotal(Object.entries(cart));
  $("#subTotal").textContent = fmt(sub);
  $("#deliveryFee").textContent = sub === 0 ? "—" : (fee === 0 ? "FREE 🎉" : fmt(fee));
  $("#grandTotal").textContent = fmt(sub + fee);
  $("#freeNote").textContent = sub > 0 && fee === 0
    ? "🎉 Is order par delivery bilkul FREE hai!" : "";
  $("#checkoutBtn").disabled = !n;
  $("#checkoutBtn").style.opacity = n ? 1 : .5;
}

/* ---------- Drawer / modals (class-based) ---------- */
function openCart(){ $("#cartDrawer").classList.add("open"); $("#overlay").classList.add("show"); }
function closeAll(){
  $("#cartDrawer").classList.remove("open");
  $("#overlay").classList.remove("show");
  document.querySelectorAll(".modal.open").forEach(m => m.classList.remove("open"));
}
$("#cartBtn").onclick = openCart;
$("#closeCart").onclick = closeAll;
$("#overlay").onclick = closeAll;
document.querySelectorAll("[data-close]").forEach(b => b.onclick = closeAll);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeAll(); });

function openQuick(id){
  const p = findP(id); if (!p) return;
  qvId = id; qvQty = 1;
  $("#qvImg").src = p.img || ""; $("#qvImg").alt = p.name;
  $("#qvCat").textContent = p.cat;
  $("#qvName").textContent = p.name;
  $("#qvRating").textContent = `${stars(p.rating)} ${p.rating} (${p.reviews} reviews)`;
  $("#qvDesc").textContent = p.desc || "";
  $("#qvDeliv").textContent = delivText(p);
  $("#qvPrice").innerHTML = `${fmt(p.price)}${p.old ? `<del>${fmt(p.old)}</del>` : ""}`;
  $("#qvQty").textContent = "1";
  $("#quickModal").classList.add("open");
}
$("#qvMinus").onclick = () => { qvQty = Math.max(1, qvQty - 1); $("#qvQty").textContent = qvQty; };
$("#qvPlus").onclick  = () => { qvQty++; $("#qvQty").textContent = qvQty; };
$("#qvAdd").onclick = () => { addToCart(qvId, qvQty); closeAll(); openCart(); };
$("#qvOrder").onclick = () => buyNow(qvId, qvQty);

/* ---------- Checkout PAGE ---------- */
const SHOP_SECTIONS = [".hero", "#shop", ".features", ".footer"];
function setShopVisible(v){
  SHOP_SECTIONS.forEach(sel => { const el = document.querySelector(sel); if (el) el.style.display = v ? "" : "none"; });
}
function showCheckoutPage(){
  closeAll();
  renderCheckoutSummary();
  setShopVisible(false);
  $("#successPage").hidden = true;
  $("#checkoutPage").hidden = false;
  window.scrollTo({ top: 0 });
}
function hidePages(){
  $("#checkoutPage").hidden = true;
  $("#successPage").hidden = true;
  setShopVisible(true);
}
$("#backToShop").onclick = hidePages;
$("#continueBtn").onclick = hidePages;

function checkoutTotals(){
  const entries = checkoutState ? checkoutState.entries : [];
  const sub = entries.reduce((sum,[id,q]) => { const p = findP(id); return p ? sum + p.price * q : sum; }, 0);
  const fee = deliveryTotal(entries);
  return { sub, fee, total: sub + fee };
}
function renderCheckoutSummary(){
  const entries = checkoutState ? checkoutState.entries : [];
  $("#coItems").innerHTML = entries.map(([id, q]) => {
    const p = findP(id); if (!p) return "";
    return `<div class="co-item">
      <img src="${p.img || ''}" alt="">
      <div class="co-item-info">
        <h4>${p.name}</h4>
        <p>${fmt(p.price)} × ${q} &nbsp;•&nbsp; ${delivText(p)}</p>
      </div>
      <strong>${fmt(p.price * q)}</strong>
    </div>`;
  }).join("");
  const { sub, fee, total } = checkoutTotals();
  $("#coSubtotal").textContent = fmt(sub);
  $("#coDelivery").textContent = fee === 0 ? "FREE 🎉" : fmt(fee);
  $("#coTotal").textContent = fmt(total);
  $("#checkoutError").textContent = "";
}

/* Cart se checkout */
$("#checkoutBtn").onclick = () => {
  if (!cartCount()) return;
  checkoutState = { source: "cart", entries: Object.entries(cart).map(([id,q]) => [+id, q]) };
  showCheckoutPage();
};
/* Order Now — seedha checkout page, sirf yehi product */
function buyNow(id, qty){
  const p = findP(id); if (!p) return;
  checkoutState = { source: "buynow", entries: [[id, qty]] };
  showCheckoutPage();
}

/* Order place → database mein save */
$("#checkoutForm").onsubmit = async e => {
  e.preventDefault();
  if (!checkoutState || !checkoutState.entries.length) return;
  const btn = $("#placeOrderBtn");
  const err = $("#checkoutError");
  err.textContent = "";
  btn.disabled = true; btn.textContent = "Order save ho raha hai…";
  const f = new FormData(e.target);
  const { total } = checkoutTotals();
  const items = checkoutState.entries.map(([id, q]) => {
    const p = findP(id);
    return { id: p.id, name: p.name, price: p.price, qty: q, delivery_fee: feeOf(p) };
  });
  const { error } = await sb.from("orders").insert({
    customer_name: f.get("name").trim(),
    phone: f.get("phone").trim(),
    city: f.get("city").trim(),
    address: f.get("address").trim(),
    items, total, status: "Pending",
  });
  btn.disabled = false; btn.textContent = "✅ Order Place Karein";
  if (error){
    console.error(error);
    err.textContent = "Order save nahi ho saka — internet check karke dobara try karein.";
    return;
  }
  if (checkoutState.source === "cart"){ cart = {}; saveCart(); renderCart(); }
  checkoutState = null;
  e.target.reset();
  $("#checkoutPage").hidden = true;
  $("#successText").textContent = "Shukriya! Aapka order save ho gaya hai — hum jald call karke confirm karein ge.";
  $("#successOrderId").textContent = "Total (COD): " + fmt(total);
  $("#successPage").hidden = false;
  window.scrollTo({ top: 0 });
};

/* ---------- Search / sort / toast ---------- */
$("#searchBtn").onclick = renderGrid;
$("#searchInput").addEventListener("input", renderGrid);
$("#sortSelect").onchange = renderGrid;
$("#topRatedBtn").onclick = () => {
  $("#sortSelect").value = "rating";
  activeCat = "All"; renderCats(); renderGrid();
  document.querySelector("#shop").scrollIntoView({ behavior: "smooth" });
};

let toastTimer;
function toast(text){
  const t = $("#toast");
  t.textContent = text; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

loadProducts();
