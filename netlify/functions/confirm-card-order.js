const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://sxivkbppdhzpelzfppud.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const sbHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation"
  };

  try {
    const body = event.body ? (typeof event.body === "string" ? JSON.parse(event.body) : event.body) : {};
    const { order_id, session_id, payment_id, gift_name } = body;

    console.log("[ConfirmCardOrder Function] Recebido:", { order_id, session_id, payment_id, gift_name });

    if (!order_id && !session_id && !payment_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Identificador do pedido ausente." })
      };
    }

    const orderRecord = {
      id: order_id || `order_card_${Date.now()}`,
      gift_id: gift_name || "presente",
      buyer_name: "Convidado",
      amount_cents: 10000,
      payment_method: session_id ? "stripe" : "mercadopago",
      status: "approved",
      mp_payment_id: payment_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (SUPABASE_URL && SUPABASE_KEY) {
      if (order_id) {
        await fetch(`${SUPABASE_URL}/rest/v1/gift_orders?id=eq.${encodeURIComponent(order_id)}`, {
          method: "PATCH",
          headers: sbHeaders,
          body: JSON.stringify({ status: "approved", updated_at: new Date().toISOString() })
        }).catch(() => null);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, order: orderRecord })
    };
  } catch (err) {
    console.error("[ConfirmCardOrder Function] Erro:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
}
