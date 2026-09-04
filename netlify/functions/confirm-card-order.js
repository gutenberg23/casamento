import crypto from "crypto";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

function ensureUUID(id) {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id).trim())) {
    return String(id).trim();
  }
  return crypto.randomUUID();
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://sxivkbppdhzpelzfppud.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  try {
    const body = event.body ? (typeof event.body === "string" ? JSON.parse(event.body) : event.body) : {};
    const { order_id, session_id, payment_id, gift_name, buyer_name } = body;

    console.log("[ConfirmCardOrder Function] Recebido:", { order_id, session_id, payment_id, gift_name });

    if (!order_id && !session_id && !payment_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Identificador do pedido ausente." })
      };
    }

    const validId = ensureUUID(order_id);
    let resolvedGiftId = null;

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        // Primeiro tenta atualizar caso o pedido já exista
        if (order_id) {
          const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/gift_orders?id=eq.${encodeURIComponent(order_id)}`, {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=representation"
            },
            body: JSON.stringify({ status: "approved", updated_at: new Date().toISOString() })
          }).catch(() => null);

          if (patchRes && patchRes.ok) {
            const patched = await patchRes.json().catch(() => []);
            if (Array.isArray(patched) && patched.length > 0) {
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, order: patched[0] })
              };
            }
          }
        }

        // Se não foi atualizado, busca o presente correto para fazer o upsert
        const gRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts?select=id,name`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        }).catch(() => null);

        if (gRes && gRes.ok) {
          const gifts = await gRes.json().catch(() => []);
          if (Array.isArray(gifts) && gifts.length > 0) {
            const matched = gifts.find(g => 
              g.id.toLowerCase() === (gift_name || '').toLowerCase() || 
              g.name.toLowerCase() === (gift_name || '').toLowerCase()
            );
            resolvedGiftId = matched ? matched.id : gifts[0].id;
          }
        }

        if (resolvedGiftId) {
          const sbPayload = {
            id: validId,
            gift_id: resolvedGiftId,
            buyer_name: buyer_name ? String(buyer_name).trim() : "Convidado",
            amount_cents: 10000,
            status: "approved",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          await fetch(`${SUPABASE_URL}/rest/v1/gift_orders?on_conflict=id`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "resolution=merge-duplicates,return=representation"
            },
            body: JSON.stringify(sbPayload)
          }).catch(() => null);
        }
      } catch (e) {
        console.error("[ConfirmCardOrder] Erro ao sincronizar com Supabase:", e);
      }
    }

    const orderRecord = {
      id: validId,
      gift_id: resolvedGiftId || gift_name || "presente",
      buyer_name: buyer_name ? String(buyer_name).trim() : "Convidado",
      amount_cents: 10000,
      payment_method: session_id ? "stripe" : "mercadopago",
      status: "approved",
      mp_payment_id: payment_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

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
