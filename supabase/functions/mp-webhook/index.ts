import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addCalendarMonths } from "../_shared/entitlement-period.ts";
import { matchesExpectedMercadoPagoPayment } from "../_shared/mercado-pago-payment.ts";
import { isPaidPlanId, PLAN_CATALOG } from "../_shared/plan-catalog.ts";
import {
  matchesMercadoPagoDataId,
  verifyMercadoPagoSignature,
} from "../_shared/mercado-pago-signature.ts";

const responseHeaders = { "Content-Type": "text/plain; charset=utf-8" };
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

    const signatureDataIds = requestUrl.searchParams.getAll("data.id");
    const signatureDataId = signatureDataIds.length === 1 ? signatureDataIds[0].trim() : "";
    const bodyPaymentId = String(data?.id ?? body["data.id"] ?? "").trim();
    if (!matchesMercadoPagoDataId(signatureDataId, bodyPaymentId)) {
      return new Response("missing payment id", { status: 400, headers: responseHeaders });
    }
    const paymentId = bodyPaymentId || signatureDataId;

    // Validação de origem (x-signature) — recomendado pelo Mercado Pago
    // Mercado Pago assina o data.id da query string; IDs alfanuméricos são normalizados em minúsculas.
    const xRequestId = req.headers.get("x-request-id");
    if (!xRequestId || !await verifyMercadoPagoSignature(
      MP_WEBHOOK_SECRET,
      signatureDataId,
      xRequestId,
      req.headers.get("x-signature"),
    )) {
      return new Response("invalid signature headers", { status: 401, headers: responseHeaders });
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
    if (!isPaidPlanId(plano)) {
      return new Response("invalid reference", { status: 400, headers: responseHeaders });
    }
    const selectedPlan = PLAN_CATALOG[plano];
    const expectedPrice = selectedPlan.amountCents / 100;
    const amount = typeof payment.transaction_amount === "number"
      ? payment.transaction_amount
      : Number.NaN;
    const currency = String(payment.currency_id || "");
    const collectorId = String(payment.collector_id || "");
    if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
      return new Response("invalid reference", { status: 400, headers: responseHeaders });
    }
    if (!matchesExpectedMercadoPagoPayment(amount, currency, collectorId, expectedPrice, MP_COLLECTOR_ID)) {
      console.error("Payment validation failed", { paymentId, plano, amount, currency, collectorId });
      return new Response("invalid payment", { status: 400, headers: responseHeaders });
    }

    const status = String(payment.status || "unknown");
    const approvedAt = typeof payment.date_approved === "string" ? payment.date_approved : null;
    const providerUpdatedAt = typeof payment.date_last_updated === "string" ? payment.date_last_updated : null;
    const updatedDate = providerUpdatedAt ? new Date(providerUpdatedAt) : null;
    const approvedDate = approvedAt ? new Date(approvedAt) : null;
    if (!updatedDate || Number.isNaN(updatedDate.getTime()) ||
      (status === "approved" && (!approvedDate || Number.isNaN(approvedDate.getTime())))) {
      console.error("Mercado Pago payment timestamps are invalid", { paymentId });
      return new Response("invalid payment timestamps", { status: 502, headers: responseHeaders });
    }

    const expiresAt = status === "approved"
      ? addCalendarMonths(approvedDate!, selectedPlan.durationMonths).toISOString()
      : null;
    const { data: eventApplied, error: applyError } = await supabase.rpc("apply_mp_payment_event", {
      p_payment_id: String(paymentId),
      p_user_id: userId,
      p_plan: plano,
      p_status: status,
      p_status_detail: String(payment.status_detail || ""),
      p_amount: amount,
      p_currency: currency,
      p_preference_id: String(payment.preference_id || "") || null,
      p_collector_id: collectorId,
      p_external_reference: externalRef,
      p_approved_at: approvedDate?.toISOString() ?? null,
      p_provider_updated_at: updatedDate.toISOString(),
      p_expires_at: expiresAt,
      p_raw_payload: payment,
    });
    if (applyError) {
      console.error("Atomic payment event apply failed", { paymentId, code: applyError.code });
      return new Response("db error", { status: 500, headers: responseHeaders });
    }
    if (eventApplied) console.log("Payment event applied", { paymentId, status, plano, userId });
    return new Response("ok", { headers: responseHeaders });

  } catch (err: unknown) {
    console.error("mp-webhook error", err instanceof Error ? err.message : "unknown error");
    return new Response("internal error", {
      status: 500,
      headers: responseHeaders,
    });
  }
});
