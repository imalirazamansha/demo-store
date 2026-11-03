// V5 Phase 5 Part B — Meta Conversions API Edge Function (Deno).
// Storefront se POST aati hai; CAPI token server par hi rehta hai (kabhi browser ko nahi milta).
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Supabase auto-provides — koi secret code mein nahi).
// Deploy: Supabase Dashboard -> Edge Functions -> Create "meta-capi" -> paste -> Deploy,
// ya CLI: supabase link --project-ref vyiwiqcbituttdjgsuwe && supabase functions deploy meta-capi
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// VERIFY at deploy: Meta Graph API ka current version (Meta docs). v21.0 deploy waqt check karein.
const GRAPH_VERSION = "v21.0";

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
    const testCode = typeof body.test_event_code === "string" ? body.test_event_code : "";
    if (!storeSlug || !eventName || !eventId) {
      return json({ ok: false, error: "missing store_slug/event_name/event_id" }, 400);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: store } = await supabase.from("stores").select("id").eq("slug", storeSlug).maybeSingle();
    if (!store) return json({ ok: false, error: "unknown store" });
    const { data: settingsRow } = await supabase.from("settings").select("data").eq("store_id", store.id).maybeSingle();
    const pixelId = String(settingsRow?.data?.meta?.pixelId || "").replace(/[^0-9]/g, "");
    const { data: secretRow } = await supabase.from("store_meta_secrets").select("capi_token").eq("store_id", store.id).maybeSingle();
    const token = String(secretRow?.capi_token || "");
    if (!pixelId || !token) return json({ ok: false, error: "not_configured" });
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
    const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metaBody),
    });
    const metaJson = await metaRes.json().catch(() => ({}));
    // Log mein sirf outcome — kabhi token ya raw PII nahi.
    console.log("meta-capi", storeSlug, eventName, "http", metaRes.status, "received", metaJson.events_received ?? null);
    return json({ ok: metaRes.ok, events_received: metaJson.events_received ?? 0, fbtrace_id: metaJson.fbtrace_id || null, error: metaJson.error?.message || null });
  } catch (e) {
    console.error("meta-capi error", e && (e as Error).message ? (e as Error).message : "unknown");
    return json({ ok: false, error: "server error" });
  }
});
