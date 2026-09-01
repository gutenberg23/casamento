// Edge Function: admin-gifts
// Gerencia o catálogo de presentes (listar, criar, editar, excluir).
// Protegida por um código de administrador guardado como secret (ADMIN_CODE),
// nunca exposto no site. Usa a service role key para poder escrever na
// tabela `gifts`, que não tem policy pública de escrita.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function slugify(text: string): string {
  return text
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "presente";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { code, action, gift } = body;

    const adminCode = Deno.env.get("ADMIN_CODE");
    if (!adminCode || code !== adminCode) {
      return json({ error: "Código incorreto." }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "list") {
      const { data, error } = await supabase.from("gifts").select("*").order("sort_order");
      if (error) return json({ error: error.message }, 500);
      return json({ gifts: data });
    }

    if (action === "create") {
      if (!gift?.name || !gift?.price_cents) {
        return json({ error: "Nome e preço são obrigatórios." }, 400);
      }
      let id = slugify(gift.name);
      const { data: clash } = await supabase.from("gifts").select("id").eq("id", id).maybeSingle();
      if (clash) id = `${id}-${Math.random().toString(36).slice(2, 6)}`;

      const { error } = await supabase.from("gifts").insert({
        id,
        name: gift.name,
        description: gift.description ?? "",
        price_cents: gift.price_cents,
        unique_item: gift.unique_item ?? true,
        active: gift.active ?? true,
        sort_order: gift.sort_order ?? 0,
      });
      if (error) return json({ error: error.message }, 500);

      const { data } = await supabase.from("gifts").select("*").order("sort_order");
      return json({ gifts: data });
    }

    if (action === "update") {
      if (!gift?.id) return json({ error: "Presente não identificado." }, 400);
      const { id, ...rest } = gift;
      const { error } = await supabase.from("gifts").update(rest).eq("id", id);
      if (error) return json({ error: error.message }, 500);

      const { data } = await supabase.from("gifts").select("*").order("sort_order");
      return json({ gifts: data });
    }

    if (action === "delete") {
      if (!gift?.id) return json({ error: "Presente não identificado." }, 400);
      const { error } = await supabase.from("gifts").delete().eq("id", gift.id);
      if (error) return json({ error: error.message }, 500);

      const { data } = await supabase.from("gifts").select("*").order("sort_order");
      return json({ gifts: data });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (err) {
    return json({ error: "Erro inesperado.", detail: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
