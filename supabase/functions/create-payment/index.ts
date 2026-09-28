import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { selectCheckoutUrl } from "../_shared/checkout-url.ts";
import { recoverMercadoPagoCheckout } from "../_shared/checkout-recovery.ts";
import { isPaidPlanId, PLAN_CATALOG } from "../_shared/plan-catalog.ts";

serve(async (req) => {
  const baseUrl = Deno.env.get("APP_URL");
  if (!baseUrl) return new Response("APP_URL not configured", { status: 503 });
  const CORS = buildCorsHeaders(req.headers.get("Origin"), baseUrl);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: CORS });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const token = Deno.env.get("MP_ACCESS_TOKEN");
    if (!serviceRoleKey || !token) throw new Error("Payment service is not configured");
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Sessao invalida" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const requestBody = await req.json();
    const plano = requestBody && typeof requestBody === "object" ? requestBody.plano : null;
    const user_id = user.id;
    if (!isPaidPlanId(plano)) throw new Error("Plano inválido");
    const selectedPlan = PLAN_CATALOG[plano];

    const { data: reservation, error: reservationError } = await supabaseAuth.rpc("reserve_mp_checkout", {
      p_plan: plano,
    });
    if (reservationError || !Array.isArray(reservation) || reservation.length !== 1) {
      console.error("Unable to reserve checkout", { code: reservationError?.code ?? "invalid_reservation" });
      return new Response(JSON.stringify({ error: "Não foi possível reservar o checkout. Tente novamente." }), {
        status: 503,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const slot = reservation[0] as {
      reserved: boolean;
      preference_id: string | null;
      checkout_url: string | null;
      checkout_plan: string | null;
      external_reference: string | null;
    };
    if (!slot.reserved) {
      if (slot.preference_id && slot.checkout_url) {
        if (slot.checkout_plan !== plano) {
          const pendingPlan = slot.checkout_plan === "anual" ? "anual" : "mensal";
          return new Response(JSON.stringify({
            error: `Você já tem um checkout ${pendingPlan} aberto. Continue essa tentativa ou aguarde a confirmação antes de escolher outro plano.`,
          }), {
            status: 409,
            headers: { ...CORS, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ id: slot.preference_id, checkout_url: slot.checkout_url, resumed: true, plano: slot.checkout_plan }), {
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      if (slot.checkout_plan && slot.external_reference) {
        if (slot.checkout_plan !== plano) {
          const pendingPlan = slot.checkout_plan === "anual" ? "anual" : "mensal";
          return new Response(JSON.stringify({
            error: `Você já tem um checkout ${pendingPlan} em processamento. Retome essa tentativa antes de escolher outro plano.`,
          }), {
            status: 409,
            headers: { ...CORS, "Content-Type": "application/json" },
          });
        }

        const recovery = await recoverMercadoPagoCheckout(
          slot.external_reference,
          token,
          Deno.env.get("MP_CHECKOUT_MODE"),
        );
        if (recovery.kind !== "found") {
          const status = recovery.kind === "none" || recovery.kind === "multiple" ? 409 : 503;
          const message = recovery.kind === "none"
            ? "Seu checkout ainda está sendo confirmado pelo Mercado Pago. Aguarde alguns instantes e tente novamente."
            : recovery.kind === "multiple"
              ? "Encontramos mais de um checkout para a mesma tentativa. Não faça outro pagamento; procure o suporte."
              : recovery.kind === "invalid"
                ? "Não foi possível validar o checkout recuperado. Procure o suporte antes de pagar."
                : "Ainda estamos confirmando seu checkout. Tente novamente em instantes.";
          return new Response(JSON.stringify({ error: message }), {
            status,
            headers: { ...CORS, "Content-Type": "application/json" },
          });
        }
        const { error: recoverySaveError } = await supabaseAuth.rpc("complete_mp_checkout", {
          p_preference_id: recovery.id,
          p_checkout_url: recovery.url,
        });
        if (recoverySaveError) {
          console.error("Unable to store recovered checkout", { code: recoverySaveError.code });
          return new Response(JSON.stringify({ error: "Checkout encontrado, mas ainda não foi possível salvar o link. Tente novamente." }), {
            status: 503,
            headers: { ...CORS, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ id: recovery.id, checkout_url: recovery.url, resumed: true, plano: slot.checkout_plan }), {
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        error: "Sua conta já tem acesso PRO ativo. Confira seu plano antes de fazer outra compra.",
      }), {
        status: 409,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (!slot.external_reference) {
      console.error("Checkout reservation is missing its recovery reference");
      return new Response(JSON.stringify({ error: "Não foi possível validar a reserva do pagamento. Tente novamente." }), {
        status: 503,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const webhookUrl = Deno.env.get("MP_WEBHOOK_URL") || `${supabaseUrl}/functions/v1/mp-webhook`;

    const preference = {
      items: [
        {
          id: "hora-justa-" + plano,
          title: selectedPlan.mercadoPagoTitle,
          quantity: 1,
          currency_id: "BRL",
          unit_price: selectedPlan.amountCents / 100,
        },
      ],
      payer: {
        email: user.email ?? "",
      },
      back_urls: {
        success: `${baseUrl}/planos?payment=success&plano=${plano}`,
        failure: `${baseUrl}/planos?payment=failure`,
        pending: `${baseUrl}/planos?payment=pending`,
      },
      auto_return: "approved",
      notification_url: webhookUrl,
      external_reference: slot.external_reference,
      metadata: { user_id, plano },
      statement_descriptor: "HORA JUSTA",
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(preference),
    });
    const data = await mpRes.json();
    if (!mpRes.ok) {
      console.error("Mercado Pago preference error", { status: mpRes.status, code: data?.error });
      // Only a definitive client-side rejection proves that no preference was created.
      if (mpRes.status >= 400 && mpRes.status < 500 && mpRes.status !== 429) {
        const { error: releaseError } = await supabaseAdmin.rpc("release_mp_checkout", {
          p_user_id: user_id,
          p_status: "cancelled",
        });
        if (releaseError) console.error("Unable to release declined checkout reservation", { code: releaseError.code });
      }
      throw new Error("Não foi possível iniciar o pagamento");
    }

    const checkoutMode = Deno.env.get("MP_CHECKOUT_MODE");
    const checkoutUrl = selectCheckoutUrl(data, checkoutMode);
    if (!checkoutUrl) {
      console.error("Mercado Pago checkout URL missing", { mode: checkoutMode === "sandbox" ? "sandbox" : "production" });
      throw new Error("Checkout URL não retornada para o ambiente configurado");
    }

    const { error: completeError } = await supabaseAuth.rpc("complete_mp_checkout", {
      p_preference_id: String(data.id),
      p_checkout_url: checkoutUrl,
    });
    if (completeError) {
      console.error("Unable to store checkout preference", { code: completeError.code });
      return new Response(JSON.stringify({ error: "Pagamento criado, mas não conseguimos recuperar o link com segurança. Procure o suporte antes de tentar novamente." }), {
        status: 503,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ id: data.id, checkout_url: checkoutUrl, resumed: false, plano }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("create-payment error", err instanceof Error ? err.message : "unknown error");
    return new Response(JSON.stringify({ error: "Não foi possível iniciar o pagamento" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
