// V5 Phase 5 Part B2 — CAPI token server-side save (Deno Edge Function).
// Admin ka Save Meta yahan POST karta hai; token server par hi save hota hai.
// Kyun: store_meta_secrets par koi SELECT policy nahi (by design — token kabhi
// client se parha na jaye), is liye client-side UPSERT/DELETE purani row ko dekh
// hi nahi sakta aur 403 deta hai (plain INSERT chalta hai, UPDATE/DELETE nahi).
// Ye function caller ka JWT verify karke (owner/admin/platform admin) service_role
// se upsert/delete karta hai (RLS bypass). Token kabhi response mein nahi aata.
// Env: SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY (Supabase auto-provides).
// Deploy: Supabase Dashboard -> Edge Functions -> Create "meta-token-save" -> paste -> Deploy.
//
// B2 (F-A2) — AAL2 enforcement (2026-11-08, STAGING): jab caller platform admin
// ke zariye authorize ho (team owner/admin nahi), to JWT ka `aal` claim
// 'aal2' hona LAZMI hai (verified TOTP MFA session). AAL1 session se platform
// admin ka token overwrite/delete DENY hota hai (403). AAL sirf us JWT se parhi
// jati hai jo auth.getUser() se cryptographically verify ho chuki ho — body
// ke kisi field par bharosa nahi. Store owner/admin path (team) par AAL2 ki
// shart nahi (D1: MFA sirf Platform Admin ke liye).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// B2: JWT ke payload se `aal` claim parhein. YE SIRF US WAQT SAFE HAI jab
// token pehle auth.getUser() se cryptographically verify ho chuka ho (signature
// + expiry Auth server se check). Verify kiye baghair decode karna kabhi safe
// nahi — is liye ye helper sirf getUser() ke kamyab hone ke BAAD call hoti hai.
// Koi bhi body field AAL ke liye use nahi hoti. Returns 'aal1' | 'aal2' | null.
function jwtAal(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload?.aal === "string" ? payload.aal : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ ok: false, error: "unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Caller ka JWT verify karein (Auth server se) — body par bharosa nahi.
    const userClient = createClient(url, anonKey);
    const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !user || !user.email) return json({ ok: false, error: "unauthorized" }, 401);
    const email = String(user.email);
    // B2: AAL sirf verified JWT se parhein (getUser kamyab ho chuka hai).
    const aal = jwtAal(token);
    const body = await req.json().catch(() => ({}));
    const store_id = typeof body.store_id === "string" ? body.store_id.trim() : "";
    const capi_token = typeof body.capi_token === "string" ? body.capi_token.trim() : "";
    const del = body.delete === true;
    if (!store_id) return json({ ok: false, error: "store_id missing" }, 400);
    if (!del && !capi_token) return json({ ok: false, error: "capi_token missing" }, 400);
    if (capi_token.length > 1000) return json({ ok: false, error: "capi_token too long" }, 400);
    // Authorize: store ka owner/admin, ya platform admin (service_role se — RLS bypass).
    // B2: platform-admin path ke liye verified AAL2 LAZMI hai. AAL1 session se
    // platform admin (email match hone ke bawajood) DENY hota hai. Store
    // owner/admin path par AAL2 ki shart nahi (D1).
    const admin = createClient(url, serviceKey);
    const { data: teamRow } = await admin.from("team").select("role").eq("store_id", store_id).eq("email", email).maybeSingle();
    let allowed = !!teamRow && (teamRow.role === "owner" || teamRow.role === "admin");
    if (!allowed) {
      const { data: pa } = await admin.from("platform_admins").select("email").eq("email", email).maybeSingle();
      allowed = !!pa && aal === "aal2";
    }
    if (!allowed) return json({ ok: false, error: "forbidden" }, 403);
    if (del) {
      const { error } = await admin.from("store_meta_secrets").delete().eq("store_id", store_id);
      if (error) return json({ ok: false, error: "delete failed" }, 500);
    } else {
      const { error } = await admin.from("store_meta_secrets").upsert({ store_id, capi_token, updated_at: new Date().toISOString() }, { onConflict: "store_id" });
      if (error) return json({ ok: false, error: "save failed" }, 500);
    }
    console.log("meta-token-save", store_id, del ? "delete" : "upsert", "ok");
    return json({ ok: true });
  } catch (e) {
    console.error("meta-token-save error", e && (e as Error).message ? (e as Error).message : "unknown");
    return json({ ok: false, error: "server error" }, 500);
  }
});
