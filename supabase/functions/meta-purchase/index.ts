// ShopNest Meta CAPI fix — order-bound Purchase dispatch (STAGING ONLY).
// Accepts ONLY {order_id, store_slug, tracking_token}. Builds the event from
// the canonical order row. Never trusts client-supplied value/contents/phone.
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ANON_KEY (auto),
//      META_GRAPH_URL (default https://graph.facebook.com/v21.0; staging tests
//      point it at the meta-mock function).
//
// Source: design doc §2.3.11 (meta-capi-staging-fix-design-2026-11-07.md),
// implemented verbatim except for the ONE flagged deviation below.
//
// DEVIATION D1 (flagged, see deploy note §D1): the design's §2.3.11 listing
// sends the Meta fetch with Content-Type only, but §2.3.8 + §5.1 require this
// function to call the JWT-gated meta-mock with the anon key. The fetch below
// therefore adds `Authorization: Bearer <SUPABASE_ANON_KEY>` + `apikey`
// headers ONLY when META_GRAPH_URL points somewhere other than the real
// Graph API (i.e. at the mock). When the target IS the real Graph API the
// request is byte-identical to the design listing (no extra headers), because
// Meta treats an Authorization: Bearer header as an access token and a
// Supabase anon key there could override/conflict with the query-string
// CAPI token. Phase 4 tests must verify the mock path returns 200 (not 401).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH_VERSION = "v21.0";
const META_TIMEOUT_MS = 8000;
const CLAIM_TTL_NOTE = "claim 5 min — see claim_meta_purchase";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function sha256Hex(input: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)).then((buf) =>
    [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("")
  );
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();
  const sb = req.headers.get("sb-forwarded-for");
  if (sb && sb.trim()) return sb.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) { const parts = xff.split(","); const last = parts[parts.length - 1].trim(); if (last) return last; }
  return "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.order_id === "number" && Number.isInteger(body.order_id) ? body.order_id : 0;
    const storeSlug = typeof body.store_slug === "string" ? body.store_slug.trim() : "";
    const trackingToken = typeof body.tracking_token === "string" ? body.tracking_token.trim() : "";
    if (!orderId || orderId <= 0) return json({ ok: false, error: "invalid order_id" }, 400);
    if (!storeSlug) return json({ ok: false, error: "missing store_slug" }, 400);
    if (!trackingToken || trackingToken.length > 64) return json({ ok: false, error: "invalid tracking_token" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 3. Per-IP rate limit (key built here — see §1.7; fail-open on RPC error).
    try {
      const { data: allowed } = await supabase.rpc("m7_check_limit", {
        p_key: "meta-purchase:ip:" + clientIp(req), p_limit: 60, p_window_seconds: 3600,
      });
      if (allowed === false) return json({ ok: false, error: "RATE_LIMITED" }, 429);
    } catch (_e) { console.log("meta-purchase rate-limit check failed, continuing"); }

    // 4-5. Order lookup + store derived FROM THE ORDER.
    const { data: order } = await supabase.from("orders")
      .select("id, store_id, status, total, items, phone, meta_tracking_token_hash, meta_tracking_token_expires_at, meta_purchase_sent_at, meta_purchase_event_id")
      .eq("id", orderId).maybeSingle();
    if (!order) return json({ ok: false, error: "unknown order" });
    const { data: store } = await supabase.from("stores").select("id, slug").eq("id", order.store_id).maybeSingle();
    if (!store) return json({ ok: false, error: "unknown store" });
    if (store.slug !== storeSlug) return json({ ok: false, error: "store_mismatch" });

    // 6. Status.
    if (order.status !== "Pending" && order.status !== "Confirmed") {
      return json({ ok: false, error: "order not eligible" });
    }

    // 7. Token: hash the presented token, compare with the stored hash; check expiry.
    const tokenHash = await sha256Hex(trackingToken);
    if (!order.meta_tracking_token_hash || order.meta_tracking_token_hash !== tokenHash) {
      return json({ ok: false, error: "invalid token" });
    }
    if (!order.meta_tracking_token_expires_at || new Date(order.meta_tracking_token_expires_at).getTime() <= Date.now()) {
      return json({ ok: false, error: "token expired" });
    }

    // 8. Already sent → idempotent success, no Meta call.
    if (order.meta_purchase_sent_at) {
      return json({ ok: true, already_sent: true, events_received: 0, event_id: order.meta_purchase_event_id || null });
    }

    // 9. Atomic claim (single derivation point for the event_id).
    const { data: claim } = await supabase.rpc("claim_meta_purchase", { p_order_id: orderId, p_token_hash: tokenHash });
    const claimRow = Array.isArray(claim) ? claim[0] : null;
    if (!claimRow || claimRow.claimed !== true || !claimRow.event_id) {
      return json({ ok: false, error: "already claimed" });
    }
    const eventId: string = claimRow.event_id;

    // 10. Canonical event data.
    const lines = (order.items && Array.isArray(order.items.lines)) ? order.items.lines : null;
    if (!lines) return json({ ok: false, error: "invalid order items" });
    const contents = lines.map((l: any) => ({ id: String(l.id), quantity: Number(l.qty) || 1, item_price: Number(l.price) || 0 }));
    const customData = {
      content_ids: contents.map((c: any) => c.id), contents,
      num_items: contents.reduce((a: number, c: any) => a + c.quantity, 0),
      value: Number(order.total) || 0, currency: "PKR",
    };
    const ud: Record<string, unknown> = {};
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) ud.client_ip_address = fwd.split(",")[0].trim();
    const ua = req.headers.get("user-agent");
    if (ua) ud.client_user_agent = ua;
    const rawPhone = String(order.phone || "");
    if (rawPhone.trim()) {
      let digits = rawPhone.replace(/[^0-9]/g, "");
      if (digits.startsWith("0")) digits = "92" + digits.slice(1);
      if (digits) ud.ph = [await sha256Hex(digits)];
    }

    // 11-12. Pixel + token + server-side test code.
    const { data: settingsRow } = await supabase.from("settings").select("data").eq("store_id", store.id).maybeSingle();
    const pixelId = String(settingsRow?.data?.meta?.pixelId || "").replace(/[^0-9]/g, "");
    const { data: secretRow } = await supabase.from("store_meta_secrets").select("capi_token").eq("store_id", store.id).maybeSingle();
    const capiToken = String(secretRow?.capi_token || "");
    if (!pixelId || !capiToken) return json({ ok: false, error: "not_configured" });
    const testCode = String(settingsRow?.data?.meta?.testEventCode || "");

    // 13. Meta call (8 s timeout, META_GRAPH_URL env, default real Graph API).
    const graphBase = Deno.env.get("META_GRAPH_URL") || `https://graph.facebook.com/${GRAPH_VERSION}`;
    const metaBody: Record<string, unknown> = {
      data: [{ event_name: "Purchase", event_time: Math.floor(Date.now() / 1000),
               event_id: eventId, action_source: "website", user_data: ud, custom_data: customData }],
    };
    if (testCode) metaBody.test_event_code = testCode;
    // DEVIATION D1: anon-key gateway headers, ONLY when targeting the mock
    // (see file header). Real Graph API target → headers stay exactly as
    // the design listing (Content-Type only).
    const metaHeaders: Record<string, string> = { "Content-Type": "application/json" };
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (anonKey && graphBase !== `https://graph.facebook.com/${GRAPH_VERSION}`) {
      metaHeaders["Authorization"] = "Bearer " + anonKey;
      metaHeaders["apikey"] = anonKey;
    }
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), META_TIMEOUT_MS);
    let metaRes: Response;
    try {
      metaRes = await fetch(`${graphBase}/${pixelId}/events?access_token=${encodeURIComponent(capiToken)}`, {
        method: "POST", headers: metaHeaders,
        body: JSON.stringify(metaBody), signal: ctrl.signal,
      });
    } catch (_e) {
      clearTimeout(to);
      console.log("meta-purchase", store.slug, eventId, "meta timeout/network");
      return json({ ok: false, error: "meta timeout", event_id: eventId });
    }
    clearTimeout(to);
    const metaJson = await metaRes.json().catch(() => ({}));

    // 14. Confirmation gate: ONLY 2xx + events_received >= 1 + successful mark.
    const received = Number(metaJson.events_received ?? 0);
    console.log("meta-purchase", store.slug, eventId, "http", metaRes.status, "received", received);
    if (metaRes.ok && received >= 1) {
      const { data: marked } = await supabase.rpc("mark_meta_purchase_sent", { p_order_id: orderId, p_event_id: eventId });
      if (marked !== true) return json({ ok: false, error: "mark failed", event_id: eventId });
      return json({ ok: true, events_received: received, already_sent: false, event_id: eventId, fbtrace_id: metaJson.fbtrace_id || null, error: null });
    }
    return json({ ok: false, error: (metaJson.error && metaJson.error.message) || "meta error", event_id: eventId });
  } catch (e) {
    console.error("meta-purchase error", e && (e as Error).message ? (e as Error).message : "unknown");
    return json({ ok: false, error: "server error" }, 500);
  }
});
