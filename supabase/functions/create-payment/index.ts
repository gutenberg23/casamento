// Edge Function: create-payment
// Recebe { gift_id, buyer_name, amount_cents } do site,
// cria um pedido no banco e uma preferência de pagamento no Mercado Pago,
// devolve a URL de checkout (init_point) para o navegador redirecionar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { gift_id, buyer_name, amount_cents } = await req.json();

    if (!gift_id || !buyer_name || !buyer_name.trim()) {
      return json({ error: "gift_id e buyer_name são obrigatórios." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: gift, error: giftError } = await supabase
      .from("gifts")
      .select("*")
      .eq("id", gift_id)
      .eq("active", true)
      .single();

    if (giftError || !gift) {
      return json({ error: "Presente não encontrado." }, 404);
    }

    // se for item único, confere se já não está reservado/aprovado
    if (gift.unique_item) {
      const { data: existing } = await supabase
        .from("gift_status")
        .select("order_status")
        .eq("id", gift_id)
        .maybeSingle();

      if (existing && existing.order_status) {
        return json({ error: "Esse presente já foi escolhido por outra pessoa." }, 409);
      }
    }

    const finalAmount = gift.unique_item
      ? gift.price_cents
      : (amount_cents && amount_cents >= 1000 ? amount_cents : gift.price_cents);

    const { data: order, error: orderError } = await supabase
      .from("gift_orders")
      .insert({
        gift_id,
        buyer_name: buyer_name.trim(),
        amount_cents: finalAmount,
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      return json({ error: "Não foi possível criar o pedido." }, 500);
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "https://exemplo.com";

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: `Presente: ${gift.name} — Iasmin & Gutenberg`,
            quantity: 1,
            unit_price: finalAmount / 100,
            currency_id: "BRL",
          },
        ],
        payer: { name: buyer_name.trim() },
        payment_methods: {
          installments: 12,
          excluded_payment_types: [{ id: "ticket" }],
        },
        back_urls: {
          success: `${siteUrl}?pagamento=sucesso&presente=${gift_id}`,
          failure: `${siteUrl}?pagamento=falhou&presente=${gift_id}`,
          pending: `${siteUrl}?pagamento=pendente&presente=${gift_id}`,
        },
        auto_return: "approved",
        external_reference: order.id,
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
        statement_descriptor: "CASAMENTO IEG",
      }),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      await supabase.from("gift_orders").update({ status: "cancelled" }).eq("id", order.id);
      return json({ error: "Erro ao criar cobrança no Mercado Pago.", detail: mpData }, 502);
    }

    await supabase
      .from("gift_orders")
      .update({ mp_preference_id: mpData.id })
      .eq("id", order.id);

    return json({ init_point: mpData.init_point, order_id: order.id });
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
