// Edge Function: create-payment
// Recebe { gift_id, buyer_name, amount_cents, payment_method } do site,
// cria o pedido e devolve o Pix ou URL de checkout do Stripe.

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
    const { gift_id, buyer_name, amount_cents, payment_method, buyer_message } = await req.json();

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

    const selectedMethod = payment_method || "pix_direct";

    const { data: order, error: orderError } = await supabase
      .from("gift_orders")
      .insert({
        gift_id,
        buyer_name: buyer_name.trim(),
        buyer_message: buyer_message ? String(buyer_message).trim() : null,
        amount_cents: finalAmount,
        payment_method: selectedMethod,
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      return json({ error: "Não foi possível criar o pedido." }, 500);
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "https://exemplo.com";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    // 1. Stripe Checkout
    if (selectedMethod === "card" && stripeKey) {
      const stripeParams = new URLSearchParams();
      stripeParams.append("payment_method_types[]", "card");
      stripeParams.append("payment_method_types[]", "boleto");
      stripeParams.append("line_items[0][price_data][currency]", "brl");
      stripeParams.append("line_items[0][price_data][product_data][name]", `Presente: ${gift.name} — Iasmin & Gutenberg`);
      stripeParams.append("line_items[0][price_data][unit_amount]", String(finalAmount));
      stripeParams.append("line_items[0][quantity]", "1");
      stripeParams.append("mode", "payment");
      stripeParams.append("client_reference_id", order.id);
      stripeParams.append("success_url", `${siteUrl}?pagamento=sucesso&presente=${gift_id}`);
      stripeParams.append("cancel_url", `${siteUrl}?pagamento=falhou&presente=${gift_id}`);

      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: stripeParams.toString(),
      });

      const stripeData = await stripeRes.json();
      if (!stripeRes.ok) {
        return json({ error: "Erro ao criar checkout no Stripe.", detail: stripeData }, 502);
      }

      await supabase
        .from("gift_orders")
        .update({ stripe_session_id: stripeData.id })
        .eq("id", order.id);

      return json({ provider: "stripe", init_point: stripeData.url, order_id: order.id });
    }

    // 2. Pix Direto Instantâneo
    const pixKey = Deno.env.get("PIX_KEY") || "gutenberg23@gmail.com";
    const receiverName = Deno.env.get("PIX_RECEIVER_NAME") || "Iasmin e Gutenberg";
    const receiverCity = Deno.env.get("PIX_RECEIVER_CITY") || "Rio de Janeiro";

    // Simulação ou Pix code
    return json({
      provider: "pix_direct",
      order_id: order.id,
      amount_cents: finalAmount,
      pix_key: pixKey,
      receiver_name: receiverName,
      receiver_city: receiverCity,
    });
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
