# ShopNest — Demo E-Commerce Store

A small Shopify-style static store: product catalog, categories, search, sort, cart (saved in the browser), quick view, and **WhatsApp checkout** (Cash on Delivery). No server or database — it runs free on **GitHub Pages**.

## Files
- `index.html` — page structure
- `styles.css` — design (responsive, mobile-friendly)
- `script.js` — **all settings + products live here**

## Make it yours (2 minutes)
Open `script.js`:
1. **WhatsApp number:** top `STORE` block → `whatsapp: "923XXXXXXXXX"` (country code + number, no leading 0). Orders open in WhatsApp with the full cart pre-filled.
2. **Store name:** `STORE.name`, plus `<title>` and logo text in `index.html`.
3. **Products:** edit the `PRODUCTS` array — each product is one line: name, category (`cat`), `price`, `old` (compare-at price, or remove), `rating`, `reviews`, `img` (image URL), `desc`.
4. **Delivery:** `deliveryFee` and `freeDeliveryAbove` in the `STORE` block.

## Deploy on GitHub Pages
1. Create a GitHub repo (e.g. `demo-store`) and push these files to `main`.
2. Repo → Settings → Pages → Source: `main` branch, `/ (root)` → Save.
3. Live at `https://<your-username>.github.io/demo-store/` within ~1 minute.

## How checkout works
Customer adds items → Checkout form (name, phone, city, address) → the order opens in **WhatsApp** addressed to your number → you confirm and take payment via Cash on Delivery / JazzCash / EasyPaisa. No payment gateway or monthly fee needed.

## Notes
- This is a demo: product images are from Unsplash; replace them with your own product photos.
- Cart is stored in the visitor's browser (localStorage) — no accounts, no backend.
