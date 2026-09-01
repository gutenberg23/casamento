// Edge Function: mp-webhook
// O Mercado Pago chama esta URL toda vez que o status de um pagamento muda.
// Buscamos os detalhes do pagamento e atualizamos o pedido no banco.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    let paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
    const topic = url.searchParams.get("type") ?? url.searchParams.get("topic");

    if (!paymentId && req.method === "POST") {
      const body = await req.json().catch(() => null);
      paymentId = body?.data?.id ?? null;
    }

    if (!paymentId || (topic && topic !== "payment")) {
      return new Response("ok", { status: 200 });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}` },
    });

    if (!mpRes.ok) {
      return new Response("payment not found", { status: 200 });
    }

    const payment = await mpRes.json();
    const orderId = payment.external_reference;
    if (!orderId) return new Response("no external_reference", { status: 200 });

    const statusMap: Record<string, string> = {
      approved: "approved",
      rejected: "rejected",
      cancelled: "cancelled",
      pending: "pending",
      in_process: "pending",
    };
    const newStatus = statusMap[payment.status] ?? "pending";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase
      .from("gift_orders")
      .update({
        status: newStatus,
        mp_payment_id: String(payment.id),
        installments: payment.installments ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("ok", { status: 200 });
  }
});
