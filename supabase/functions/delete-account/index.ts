import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deleteAccountData } from "../_shared/account-deletion.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const STORAGE_BUCKET = "atestados";

serve(async (req) => {
  const appUrl = Deno.env.get("APP_URL");
  if (!appUrl) return new Response(JSON.stringify({ error: "Serviço indisponível" }), { status: 503, headers: JSON_HEADERS });
  const CORS = buildCorsHeaders(req.headers.get("Origin"), appUrl);

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Método não permitido" }), { status: 405, headers: { ...CORS, ...JSON_HEADERS } });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Sessão inválida. Entre novamente e tente de novo." }), { status: 401, headers: { ...CORS, ...JSON_HEADERS } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "Serviço indisponível. Tente novamente mais tarde." }), { status: 503, headers: { ...CORS, ...JSON_HEADERS } });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida. Entre novamente e tente de novo." }), { status: 401, headers: { ...CORS, ...JSON_HEADERS } });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // The RPC is unreachable until inventory and removal of all owned files succeed.
    await deleteAccountData(admin, STORAGE_BUCKET, user.id);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...CORS, ...JSON_HEADERS } });
  } catch {
    // Never log user IDs, object names, uploaded documents, or provider error payloads.
    return new Response(JSON.stringify({ error: "Não foi possível confirmar a exclusão. Se a conta ainda permitir login, tente novamente; caso contrário, contate o suporte." }), { status: 500, headers: { ...CORS, ...JSON_HEADERS } });
  }
});
