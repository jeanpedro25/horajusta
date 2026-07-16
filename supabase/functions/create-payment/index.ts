import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function corsHeaders(origin: string | null, appUrl: string) {
  return {
    "Access-Control-Allow-Origin": origin === appUrl ? origin : appUrl,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const baseUrl = Deno.env.get("APP_URL");
  if (!baseUrl) return new Response("APP_URL not configured", { status: 503 });
  const CORS = corsHeaders(req.headers.get("Origin"), baseUrl);
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

    const { plano } = await req.json();
    const user_id = user.id;

    const token = Deno.env.get("MP_ACCESS_TOKEN");
    if (!token) throw new Error("MP_ACCESS_TOKEN não configurado");

    const webhookUrl = Deno.env.get("MP_WEBHOOK_URL") || `${supabaseUrl}/functions/v1/mp-webhook`;

    const PRICES: Record<string, number> = { pro: 9.90, anual: 89.90 };
    const TITLES: Record<string, string> = {
      pro: "Hora Justa PRO Mensal",
      anual: "Hora Justa PRO Anual",
    };
    if (!plano || PRICES[plano] == null) throw new Error("Plano inválido");

    const preference = {
      items: [
        {
          id: "hora-justa-" + plano,
          title: TITLES[plano],
          quantity: 1,
          currency_id: "BRL",
          unit_price: PRICES[plano],
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
      external_reference: `${user_id}|${plano}|${Date.now()}`,
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
      throw new Error("Não foi possível iniciar o pagamento");
    }

    return new Response(JSON.stringify({ id: data.id, init_point: data.init_point }), {
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
