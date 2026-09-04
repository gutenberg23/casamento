import crypto from "crypto";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { order_id, gift_id, buyer_name, amount_cents, buyer_message } = body;
    if (!order_id && !gift_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "order_id ou gift_id é obrigatório." }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || "https://sxivkbppdhzpelzfppud.supabase.co";
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    const validId = ensureUUID(order_id);
    const cleanBuyer = buyer_name ? String(buyer_name).trim() : "Convidado";
    const validAmount = (amount_cents !== undefined && !isNaN(Number(amount_cents)) && Number(amount_cents) > 0) ? Number(amount_cents) : 1000;

    let resolvedGiftId = gift_id ? String(gift_id).trim() : null;

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        // Obter presentes para garantir que gift_id bate com a chave estrangeira
        const gRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts?select=id,name`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        }).catch(() => null);

        if (gRes && gRes.ok) {
          const gifts = await gRes.json().catch(() => []);
          if (Array.isArray(gifts) && gifts.length > 0) {
            const matched = gifts.find(g => 
              g.id.toLowerCase() === (resolvedGiftId || '').toLowerCase() || 
              g.name.toLowerCase() === (resolvedGiftId || '').toLowerCase()
            );
            if (matched) {
              resolvedGiftId = matched.id;
            } else if (!resolvedGiftId) {
              resolvedGiftId = gifts[0].id;
            }
          }
        }

        if (resolvedGiftId) {
          // A tabela gift_orders possui estritamente as colunas: id, gift_id, buyer_name, amount_cents, status, created_at, updated_at
          const sbPayload = {
            id: validId,
            gift_id: resolvedGiftId,
            buyer_name: cleanBuyer,
            amount_cents: validAmount,
            status: "awaiting_confirmation",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/gift_orders?on_conflict=id`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "resolution=merge-duplicates,return=representation"
            },
            body: JSON.stringify(sbPayload)
          });

          if (!sbRes.ok) {
            const errText = await sbRes.text().catch(() => "");
            console.error("[confirm-pix-order] Erro PostgREST:", sbRes.status, errText);
          }
        }
      } catch (e) {
        console.error("Erro ao salvar pedido no Supabase:", e);
      }
    }

    const orderRecord = {
      id: validId,
      gift_id: resolvedGiftId || gift_id || "presente",
      buyer_name: cleanBuyer,
      buyer_message: buyer_message ? String(buyer_message).trim() : null,
      amount_cents: validAmount,
      payment_method: "pix_direct",
      status: "awaiting_confirmation",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, order: orderRecord }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
}
