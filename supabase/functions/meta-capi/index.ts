// V5 Phase 5 Part B — Meta Conversions API Edge Function (Deno). HARDENED
// version (Meta CAPI fix, STAGING ONLY) — design §2.5.
// Storefront se POST aati hai; CAPI token server par hi rehta hai (kabhi browser ko nahi milta).
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ANON_KEY (auto-provided — koi secret code mein nahi).
// META_GRAPH_URL: default https://graph.facebook.com/v21.0; staging tests point it at meta-mock.
// Deploy: Supabase Dashboard -> Edge Functions -> "meta-capi" -> paste -> Deploy,
// ya CLI: supabase link --project-ref wpostzpztqaxgrbiwznv && supabase functions deploy meta-capi --project-ref wpostzpztqaxgrbiwznv
//
// HARDENING vs the original (design §2.5, in check order):
//  1. event_name = "Purchase" → 400 "use meta-purchase for Purchase" (Purchase
//     MUST go through the order-bound meta-purchase function now).
//  2. Allowlist: ONLY PageView, ViewContent, AddToCart, InitiateCheckout.
//     Any other name → 400 "event not allowed".
//  3. Rate limiting via Module 7 m7_check_limit (service_role RPC call):
//     meta:ip:<ip>:store:<store_id> 100/hr + meta:store:<store_id> 1000/hr.
//     The key is built HERE from this request's inbound headers (§1.7:
//     m7_client_ip() would see the Edge Function's own IP, not the shopper's).
//     RPC error → fail OPEN (continue).
//  4. test_event_code NEVER from the client — read server-side from
//     settings.data.meta.testEventCode.
//  5. Meta fetch gains the same 8 s AbortController timeout as sendCapiEvent
//     / meta-purchase, and the META_GRAPH_URL env target.
//  6. Everything else UNCHANGED: store/Pixel/token lookup, phone hashing
//     (PK normalize 0 → 92, then SHA-256), custom_data pass-through for the
//     four allowlisted events, CORS, response shape, log discipline.
//
// DEVIATION D1 (flagged, see deploy note §D1 — same as meta-purchase): the
// design's §2.5 step 5 fetch sends Content-Type only, but §5.1 requires the
// function to call the JWT-gated meta-mock with the anon key when the tests
// point META_GRAPH_URL at the mock. The fetch below therefore adds
// `Authorization: Bearer <SUPABASE_ANON_KEY>` + `apikey` headers ONLY when
// META_GRAPH_URL points somewhere other than the real Graph API. When the
// target IS the real Graph API the request is identical to the design
// (Content-Type only), because Meta treats an Authorization: Bearer header
// as an access token and a Supabase anon key there could override/conflict
// with the query-string CAPI token.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// VERIFY at deploy: Meta Graph API ka current version (Meta docs). v21.0 deploy waqt check karein.
const GRAPH_VERSION = "v21.0";
const META_TIMEOUT_MS = 8000;
const META_NON_PURCHASE_EVENTS = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout"];

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

// Client IP from THIS request's headers — same trust order as m7_client_ip():
// cf-connecting-ip → sb-forwarded-for → LAST x-forwarded-for entry → "unknown".
// (Do NOT use m7_client_ip() here: it would read the Edge Function's own
// outbound headers, not the shopper's — design §1.7.)
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
    const body = await req.json();
    const storeSlug = typeof body.store_slug === "string" ? body.store_slug : "";
    const eventName = typeof body.event_name === "string" ? body.event_name : "";
    const eventId = typeof body.event_id === "string" ? body.event_id : "";
    const eventTime = Number(body.event_time) || Math.floor(Date.now() / 1000);
    const customData = body.custom_data && typeof body.custom_data === "object" ? body.custom_data : {};
    const userData = body.user_data && typeof body.user_data === "object" ? body.user_data : {};
    // NOTE (§2.5 step 4): client-supplied test_event_code is NEVER read.
    // It is read server-side from settings below. A test_event_code in the
    // request body is ignored entirely.
    if (!storeSlug || !eventName || !eventId) {
      return json({ ok: false, error: "missing store_slug/event_name/event_id" }, 400);
    }
    // §2.5 step 1: Purchase must go through meta-purchase.
    if (eventName === "Purchase") {
      return json({ ok: false, error: "use meta-purchase for Purchase" }, 400);
    }
    // §2.5 step 2: allowlist for non-Purchase events.
    if (!META_NON_PURCHASE_EVENTS.includes(eventName)) {
      return json({ ok: false, error: "event not allowed" }, 400);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: store } = await supabase.from("stores").select("id").eq("slug", storeSlug).maybeSingle();
    if (!store) return json({ ok: false, error: "unknown store" });
    // §2.5 step 3: rate-limit gates (fail-open on RPC error).
    // Per-IP per-store + per-store gates. Key built here from this request's
    // headers (see §1.7 — m7_client_ip() would see the Edge Function's IP, not the shopper's).
    try {
      const { data: okIp } = await supabase.rpc("m7_check_limit", {
        p_key: "meta:ip:" + clientIp(req) + ":store:" + store.id, p_limit: 100, p_window_seconds: 3600,
      });
      if (okIp === false) return json({ ok: false, error: "RATE_LIMITED" }, 429);
    } catch (_e) { console.log("meta-capi rate-limit check (ip) failed, continuing"); }
    try {
      const { data: okStore } = await supabase.rpc("m7_check_limit", {
        p_key: "meta:store:" + store.id, p_limit: 1000, p_window_seconds: 3600,
      });
      if (okStore === false) return json({ ok: false, error: "RATE_LIMITED" }, 429);
    } catch (_e) { console.log("meta-capi rate-limit check (store) failed, continuing"); }
    const { data: settingsRow } = await supabase.from("settings").select("data").eq("store_id", store.id).maybeSingle();
    const pixelId = String(settingsRow?.data?.meta?.pixelId || "").replace(/[^0-9]/g, "");
    const { data: secretRow } = await supabase.from("store_meta_secrets").select("capi_token").eq("store_id", store.id).maybeSingle();
    const token = String(secretRow?.capi_token || "");
    if (!pixelId || !token) return json({ ok: false, error: "not_configured" });
    // test_event_code: server-side only, from settings — NEVER from the client.
    const testCode = String(settingsRow?.data?.meta?.testEventCode || "");
    // user_data: sirf hashed PII + browser identifiers. Phone: PK normalize (0 -> 92) phir SHA-256.
    const ud: Record<string, unknown> = {};
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) ud.client_ip_address = fwd.split(",")[0].trim();
    const ua = req.headers.get("user-agent");
    if (ua) ud.client_user_agent = ua;
    if (typeof userData.fbp === "string" && userData.fbp) ud.fbp = userData.fbp;
    if (typeof userData.fbc === "string" && userData.fbc) ud.fbc = userData.fbc;
    if (typeof userData.ph === "string" && userData.ph.trim()) {
      let digits = userData.ph.replace(/[^0-9]/g, "");
      if (digits.startsWith("0")) digits = "92" + digits.slice(1);
      ud.ph = [await sha256Hex(digits)];
    }
    const metaBody: Record<string, unknown> = {
      data: [{ event_name: eventName, event_time: eventTime, event_id: eventId, action_source: "website", user_data: ud, custom_data: customData }],
    };
    if (testCode) metaBody.test_event_code = testCode;
    // §2.5 step 5: META_GRAPH_URL target + 8 s timeout.
    const graphBase = Deno.env.get("META_GRAPH_URL") || `https://graph.facebook.com/${GRAPH_VERSION}`;
    // DEVIATION D1: anon-key gateway headers, ONLY when targeting the mock
    // (see file header). Real Graph API target → Content-Type only, as designed.
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
      metaRes = await fetch(`${graphBase}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
        method: "POST", headers: metaHeaders,
        body: JSON.stringify(metaBody), signal: ctrl.signal,
      });
    } catch (_e) {
      clearTimeout(to);
      console.log("meta-capi", storeSlug, eventName, "meta timeout/network");
      return json({ ok: false, error: "meta timeout" });
    }
    clearTimeout(to);
    const metaJson = await metaRes.json().catch(() => ({}));
    // Log mein sirf outcome — kabhi token ya raw PII nahi.
    console.log("meta-capi", storeSlug, eventName, "http", metaRes.status, "received", metaJson.events_received ?? null);
    return json({ ok: metaRes.ok, events_received: metaJson.events_received ?? 0, fbtrace_id: metaJson.fbtrace_id || null, error: metaJson.error?.message || null });
  } catch (e) {
    console.error("meta-capi error", e && (e as Error).message ? (e as Error).message : "unknown");
    return json({ ok: false, error: "server error" });
  }
});
