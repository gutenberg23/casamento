const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { order_id, gift_id, buyer_name, amount_cents, buyer_message } = body;
    if (!order_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "order_id é obrigatório." }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || "https://sxivkbppdhzpelzfppud.supabase.co";
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    const orderPayload = {
      id: order_id,
      gift_id: gift_id || "presente",
      buyer_name: buyer_name ? String(buyer_name).trim() : "Convidado",
      buyer_message: buyer_message ? String(buyer_message).trim() : null,
      amount_cents: (amount_cents !== undefined && !isNaN(Number(amount_cents)) && Number(amount_cents) > 0) ? Number(amount_cents) : 1000,
      payment_method: "pix_direct",
      status: "awaiting_confirmation",
      stripe_session_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/gift_orders?on_conflict=id`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=representation"
          },
          body: JSON.stringify(orderPayload)
        });
      } catch (e) {
        console.error("Erro ao salvar pedido no Supabase:", e);
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, order: orderPayload }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
}
