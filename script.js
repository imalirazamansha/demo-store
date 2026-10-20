/* ================= CONFIG — sirf yahan change karein ================= */
const STORE = {
  name: "ShopNest",
  whatsapp: "923000000000",      // <-- APNA WhatsApp number yahan likhein (92 ke saath, bina 0 ke) — abhi DEMO placeholder hai
  deliveryFee: 250,
  freeDeliveryAbove: 5000,
};

/* ================= DEMO PRODUCTS — baad mein apne products se replace karein ================= */
const PRODUCTS = [
  { id:1,  name:"Wireless Noise-Cancelling Headphones", cat:"Electronics",   price:8499,  old:12999, rating:4.8, reviews:231, img:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80", desc:"Bluetooth 5.0, 40-hour battery, deep bass aur crystal-clear calls ke liye built-in mic." },
  { id:2,  name:"Running Sneakers — Lightweight",       cat:"Fashion",       price:6999,  old:9499,  rating:4.7, reviews:189, img:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80", desc:"Breathable mesh upper, soft cushioned sole — roz ki running aur walking ke liye perfect." },
  { id:3,  name:"Classic Analog Watch",                 cat:"Fashion",       price:4299,  old:5999,  rating:4.6, reviews:98,  img:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80", desc:"Minimal dial, leather strap, water resistant — har outfit ke saath elegant look." },
  { id:4,  name:"Aviator Sunglasses (UV400)",           cat:"Fashion",       price:2499,  old:3999,  rating:4.5, reviews:143, img:"https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80", desc:"UV400 protection, metal frame — dhoop mein style ke saath safety." },
  { id:5,  name:"Leather Handbag for Women",            cat:"Fashion",       price:5499,  old:7999,  rating:4.7, reviews:76,  img:"https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80", desc:"Premium faux leather, spacious compartments, adjustable shoulder strap." },
  { id:6,  name:"Luxury Perfume — 100ml",               cat:"Beauty",        price:3999,  old:5499,  rating:4.8, reviews:264, img:"https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80", desc:"Long-lasting fragrance, din bhar freshness — gift ke liye bhi behtareen." },
  { id:7,  name:"Premium Cotton T-Shirt",               cat:"Fashion",       price:1499,  old:2199,  rating:4.4, reviews:312, img:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80", desc:"100% combed cotton, pre-shrunk, sizes S–XL. Garmiyon ka best friend." },
  { id:8,  name:"Mechanical Keyboard — RGB",            cat:"Electronics",   price:7299,  old:9999,  rating:4.7, reviews:158, img:"https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80", desc:"Hot-swappable switches, RGB backlight, typing aur gaming dono ke liye." },
  { id:9,  name:"Vitamin C Skincare Set (3 pcs)",       cat:"Beauty",        price:2899,  old:4299,  rating:4.6, reviews:203, img:"https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80", desc:"Cleanser + serum + moisturizer — glowing skin ke liye complete routine." },
  { id:10, name:"Indoor Plant with Ceramic Pot",        cat:"Home & Living", price:1899,  old:2499,  rating:4.5, reviews:64,  img:"https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80", desc:"Low-maintenance green plant, handmade ceramic pot ke saath — ghar ki fresh look." },
  { id:11, name:"Genuine Leather Wallet",               cat:"Fashion",       price:1799,  old:2799,  rating:4.6, reviews:177, img:"https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80", desc:"RFID-safe, 8 card slots, slim design — roz ke use ke liye durable." },
  { id:12, name:"Travel Backpack — 25L",                cat:"Fashion",       price:4999,  old:6999,  rating:4.7, reviews:129, img:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80", desc:"Padded laptop sleeve (15.6\"), water-repellent fabric, comfortable straps." },
  { id:13, name:"Steel Water Bottle — 1 Litre",         cat:"Home & Living", price:1299,  old:1899,  rating:4.5, reviews:221, img:"https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80", desc:"24 ghante thanda, 12 ghante garam — double-wall vacuum insulation." },
  { id:14, name:"Modern Table Lamp",                    cat:"Home & Living", price:3499,  old:4999,  rating:4.6, reviews:88,  img:"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80", desc:"Warm ambient light, minimalist design — bedroom aur study desk ke liye." },
];

const CATEGORIES = ["All", ...new Set(PRODUCTS.map(p => p.cat))];
const fmt = n => "Rs " + n.toLocaleString("en-PK");
const $ = s => document.querySelector(s);

let activeCat = "All";
let cart = JSON.parse(localStorage.getItem("shopnest_cart") || "{}");
let qvId = null, qvQty = 1;

function stars(r){ const f = Math.round(r); return "★".repeat(f) + "☆".repeat(5 - f); }

/* ---------- Render: categories ---------- */
function renderCats(){
  $("#catNav").innerHTML = CATEGORIES.map(c =>
    `<button class="${c===activeCat?'active':''}" data-cat="${c}">${c}</button>`).join("");
  document.querySelectorAll("#catNav button").forEach(b =>
    b.onclick = () => { activeCat = b.dataset.cat; renderCats(); renderGrid(); });
}

/* ---------- Render: product grid ---------- */
function currentList(){
  const q = $("#searchInput").value.trim().toLowerCase();
  let list = PRODUCTS.filter(p =>
    (activeCat === "All" || p.cat === activeCat) &&
    (!q || p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)));
  const s = $("#sortSelect").value;
  if (s === "price-low")  list.sort((a,b) => a.price - b.price);
  if (s === "price-high") list.sort((a,b) => b.price - a.price);
  if (s === "rating")     list.sort((a,b) => b.rating - a.rating);
  if (s === "popular")    list.sort((a,b) => b.reviews - a.reviews);
  return list;
}
function renderGrid(){
  const list = currentList();
  $("#resultsText").textContent = list.length + " products";
  $("#emptyMsg").hidden = list.length > 0;
  $("#grid").innerHTML = list.map(p => {
    const off = Math.round((1 - p.price / p.old) * 100);
    return `<article class="card">
      <div class="imgwrap" data-view="${p.id}">
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        ${off > 0 ? `<span class="badge">-${off}%</span>` : ""}
      </div>
      <div class="card-body">
        <p class="card-cat">${p.cat}</p>
        <h3 data-view="${p.id}">${p.name}</h3>
        <p class="stars">${stars(p.rating)} <small>${p.rating} (${p.reviews})</small></p>
        <div class="price"><strong>${fmt(p.price)}</strong>${p.old ? `<del>${fmt(p.old)}</del>` : ""}</div>
        <button class="btn primary" data-add="${p.id}">Add to Cart 🛒</button>
      </div>
    </article>`;
  }).join("");
  document.querySelectorAll("[data-add]").forEach(b => b.onclick = () => addToCart(+b.dataset.add, 1));
  document.querySelectorAll("[data-view]").forEach(el => el.onclick = () => openQuick(+el.dataset.view));
}

/* ---------- Cart ---------- */
function saveCart(){ localStorage.setItem("shopnest_cart", JSON.stringify(cart)); }
function cartCount(){ return Object.values(cart).reduce((a,b) => a + b, 0); }
function cartSubtotal(){ return Object.entries(cart).reduce((sum,[id,q]) => {
  const p = PRODUCTS.find(x => x.id === +id); return p ? sum + p.price * q : sum; }, 0); }

function addToCart(id, qty){
  cart[id] = (cart[id] || 0) + qty;
  saveCart(); renderCart();
  const p = PRODUCTS.find(x => x.id === id);
  toast(`Added: ${p.name}`);
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
      const p = PRODUCTS.find(x => x.id === +id);
      return `<div class="cart-item">
        <img src="${p.img}" alt="${p.name}">
        <div class="ci-info">
          <h4>${p.name}</h4><p>${fmt(p.price)} × ${q} = <strong>${fmt(p.price*q)}</strong></p>
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
  const fee = sub === 0 ? 0 : (sub >= STORE.freeDeliveryAbove ? 0 : STORE.deliveryFee);
  $("#subTotal").textContent = fmt(sub);
  $("#deliveryFee").textContent = sub === 0 ? "—" : (fee === 0 ? "FREE" : fmt(fee));
  $("#grandTotal").textContent = fmt(sub + fee);
  $("#freeNote").textContent = sub > 0 && fee > 0
    ? `Add ${fmt(STORE.freeDeliveryAbove - sub)} more for FREE delivery 🚚` : "";
  $("#checkoutBtn").disabled = !n;
  $("#checkoutBtn").style.opacity = n ? 1 : .5;
}

/* ---------- Drawer / modals ---------- */
function openCart(){ $("#cartDrawer").classList.add("open"); $("#overlay").hidden = false; }
function closeAll(){
  $("#cartDrawer").classList.remove("open");
  $("#overlay").hidden = true;
  $("#quickModal").hidden = true;
  $("#checkoutModal").hidden = true;
}
$("#cartBtn").onclick = openCart;
$("#closeCart").onclick = closeAll;
$("#overlay").onclick = closeAll;
document.querySelectorAll("[data-close]").forEach(b => b.onclick = closeAll);

function openQuick(id){
  const p = PRODUCTS.find(x => x.id === id); if (!p) return;
  qvId = id; qvQty = 1;
  $("#qvImg").src = p.img; $("#qvImg").alt = p.name;
  $("#qvCat").textContent = p.cat;
  $("#qvName").textContent = p.name;
  $("#qvRating").textContent = `${stars(p.rating)} ${p.rating} (${p.reviews} reviews)`;
  $("#qvDesc").textContent = p.desc;
  $("#qvPrice").innerHTML = `${fmt(p.price)}${p.old ? `<del>${fmt(p.old)}</del>` : ""}`;
  $("#qvQty").textContent = "1";
  $("#quickModal").hidden = false;
}
$("#qvMinus").onclick = () => { qvQty = Math.max(1, qvQty - 1); $("#qvQty").textContent = qvQty; };
$("#qvPlus").onclick  = () => { qvQty++; $("#qvQty").textContent = qvQty; };
$("#qvAdd").onclick = () => { addToCart(qvId, qvQty); closeAll(); openCart(); };

/* ---------- Checkout → WhatsApp ---------- */
$("#checkoutBtn").onclick = () => { closeAll(); $("#checkoutModal").hidden = false; };
$("#checkoutForm").onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const sub = cartSubtotal();
  const fee = sub >= STORE.freeDeliveryAbove ? 0 : STORE.deliveryFee;
  const lines = Object.entries(cart).map(([id, q], i) => {
    const p = PRODUCTS.find(x => x.id === +id);
    return `${i+1}. ${p.name} x${q} — ${fmt(p.price * q)}`;
  });
  const msg =
`🛍️ *New Order — ${STORE.name}*
Name: ${f.get("name")}
Phone: ${f.get("phone")}
City: ${f.get("city")}
Address: ${f.get("address")}

*Items:*
${lines.join("\n")}

Subtotal: ${fmt(sub)}
Delivery: ${fee === 0 ? "FREE" : fmt(fee)}
*Total (COD): ${fmt(sub + fee)}*`;
  window.open(`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  toast("Order ready in WhatsApp ✅");
  closeAll();
};

/* ---------- Search / sort / misc ---------- */
$("#searchBtn").onclick = renderGrid;
$("#searchInput").addEventListener("input", renderGrid);
$("#searchInput").addEventListener("keydown", e => { if (e.key === "Enter") renderGrid(); });
$("#sortSelect").onchange = renderGrid;

let toastTimer;
function toast(text){
  const t = $("#toast");
  t.textContent = text; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.hidden = true, 2200);
}

$("#footerPhone").textContent = STORE.whatsapp === "923000000000" ? "(demo — set your number)" : "+" + STORE.whatsapp;

renderCats();
renderGrid();
renderCart();
