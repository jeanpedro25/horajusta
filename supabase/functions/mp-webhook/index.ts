import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const responseHeaders = { "Content-Type": "text/plain; charset=utf-8" };
const PLAN_PRICES: Record<string, number> = { pro: 9.90, anual: 89.90 };

function parseXSignature(xSignature: string | null): { ts: string; v1: string } | null {
  if (!xSignature) return null;
  const parts = xSignature.split(",").map(p => p.trim());
  const tsPart = parts.find(p => p.startsWith("ts="));
  const v1Part = parts.find(p => p.startsWith("v1="));
  if (!tsPart || !v1Part) return null;
  const ts = tsPart.split("=")[1];
  const v1 = v1Part.split("=")[1];
  if (!ts || !v1) return null;
  return { ts, v1 };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a.toLowerCase());
  const bBytes = new TextEncoder().encode(b.toLowerCase());
  let difference = aBytes.length ^ bBytes.length;
  const length = Math.max(aBytes.length, bBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (aBytes[index] ?? 0) ^ (bBytes[index] ?? 0);
  }
  return difference === 0;
}

function validWebhookTimestamp(value: string): boolean {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return false;
  const milliseconds = parsed > 10_000_000_000 ? parsed : parsed * 1000;
  return Math.abs(Date.now() - milliseconds) <= 5 * 60 * 1000;
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: responseHeaders });

  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET");
    const MP_COLLECTOR_ID = Deno.env.get("MP_COLLECTOR_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!MP_ACCESS_TOKEN || !MP_WEBHOOK_SECRET || !MP_COLLECTOR_ID || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("Required webhook secrets are not configured");
      return new Response("service unavailable", { status: 503, headers: responseHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Mercado Pago envia como form-urlencoded ou JSON
    let body: Record<string, unknown>;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await req.json() as Record<string, unknown>;
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      body = Object.fromEntries(params.entries());
    }

    const requestUrl = new URL(req.url);
    const type = body.type || requestUrl.searchParams.get("type");
    const data = body.data as { id?: string | number } | undefined;

    // Só processar eventos de pagamento aprovado
    if (type !== "payment") {
      return new Response("ok", { headers: responseHeaders });
    }

    const paymentId = data?.id || body["data.id"] || requestUrl.searchParams.get("data.id");
    if (!paymentId) {
      return new Response("missing payment id", { status: 400, headers: responseHeaders });
    }

    // Validação de origem (x-signature) — recomendado pelo Mercado Pago
    // Manifest: id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
    // Como aqui o paymentId vem do body, usamos o mesmo id para compor o manifest.
    const xRequestId = req.headers.get("x-request-id");
    const sig = parseXSignature(req.headers.get("x-signature"));
    if (!xRequestId || !sig || !validWebhookTimestamp(sig.ts)) {
      return new Response("invalid signature headers", { status: 401, headers: responseHeaders });
    }
    const manifest = `id:${paymentId};request-id:${xRequestId};ts:${sig.ts};`;
    const computed = await hmacSha256Hex(MP_WEBHOOK_SECRET, manifest);
    if (!safeEqual(computed, sig.v1)) {
      console.error("Invalid Mercado Pago signature", { paymentId, xRequestId });
      return new Response("invalid signature", { status: 401, headers: responseHeaders });
    }

    // Buscar detalhes do pagamento no MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) {
      console.error("Mercado Pago lookup failed", { paymentId, status: mpRes.status });
      return new Response("provider error", { status: 502, headers: responseHeaders });
    }
    const payment = await mpRes.json() as Record<string, unknown>;

    // external_reference format: "user_id|plano|timestamp"
    const externalRef = String(payment.external_reference || "");
    const [userId, plano] = externalRef.split("|");

    const expectedPrice = PLAN_PRICES[plano];
    const amount = Number(payment.transaction_amount);
    const currency = String(payment.currency_id || "");
    const collectorId = String(payment.collector_id || "");
    if (!userId || !expectedPrice || !/^[0-9a-f-]{36}$/i.test(userId)) {
      return new Response("invalid reference", { status: 400, headers: responseHeaders });
    }
    if (Math.abs(amount - expectedPrice) > 0.001 || currency !== "BRL" || collectorId !== MP_COLLECTOR_ID) {
      console.error("Payment validation failed", { paymentId, plano, amount, currency, collectorId });
      return new Response("invalid payment", { status: 400, headers: responseHeaders });
    }

    const status = String(payment.status || "unknown");
    const approvedAt = typeof payment.date_approved === "string" ? payment.date_approved : null;
    const { data: existing } = await supabase
      .from("payment_events")
      .select("status, entitlement_applied_at")
      .eq("provider", "mercado_pago")
      .eq("provider_payment_id", String(paymentId))
      .maybeSingle();

    const { error: ledgerError } = await supabase.from("payment_events").upsert({
      provider: "mercado_pago",
      provider_payment_id: String(paymentId),
      user_id: userId,
      plan: plano,
      status,
      status_detail: String(payment.status_detail || ""),
      amount,
      currency,
      preference_id: String(payment.preference_id || "") || null,
      collector_id: collectorId,
      external_reference: externalRef,
      approved_at: approvedAt,
      provider_updated_at: typeof payment.date_last_updated === "string" ? payment.date_last_updated : null,
      received_at: new Date().toISOString(),
      raw_payload: payment,
    }, { onConflict: "provider,provider_payment_id" });
    if (ledgerError) {
      console.error("Payment ledger error", { paymentId, code: ledgerError.code });
      return new Response("db error", { status: 500, headers: responseHeaders });
    }

    if (["refunded", "charged_back", "cancelled"].includes(status)) {
      const { error: revokeError } = await supabase.from("profiles").update({
        plano: "free",
        plano_vencimento: new Date().toISOString(),
        is_pro: false,
        subscription_status: status,
      }).eq("id", userId).eq("plano_payment_id", String(paymentId));
      if (revokeError) return new Response("db error", { status: 500, headers: responseHeaders });
      return new Response("ok", { headers: responseHeaders });
    }

    if (status !== "approved" || (existing?.status === "approved" && existing.entitlement_applied_at)) {
      return new Response("ok", { headers: responseHeaders });
    }

    // Calcular vencimento do plano
    const agora = approvedAt ? new Date(approvedAt) : new Date();
    let vencimento: Date;
    if (plano === "anual") {
      vencimento = new Date(agora.getFullYear() + 1, agora.getMonth(), agora.getDate());
    } else {
      vencimento = new Date(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
    }

    // Atualizar plano do usuário no Supabase
    const { error } = await supabase
      .from("profiles")
      .update({
        plano,
        plano_vencimento: vencimento.toISOString(),
        plano_payment_id: String(paymentId),
        is_pro: true,
        subscription_status: "active",
      } as Record<string, unknown>)
      .eq("id", userId);

    if (error) {
      console.error("Supabase update error:", error);
      return new Response("db error", { status: 500, headers: responseHeaders });
    }

    await supabase.from("payment_events").update({ entitlement_applied_at: new Date().toISOString() })
      .eq("provider", "mercado_pago").eq("provider_payment_id", String(paymentId));
    console.log("Payment entitlement updated", { paymentId, plano, userId });
    return new Response("ok", { headers: responseHeaders });

  } catch (err: unknown) {
    console.error("mp-webhook error", err instanceof Error ? err.message : "unknown error");
    return new Response("internal error", {
      status: 500,
      headers: responseHeaders,
    });
  }
});
