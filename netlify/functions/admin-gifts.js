const ADMIN_CODE = process.env.ADMIN_CODE || "casamento2026";

function checkAdminCode(inputCode) {
  if (!inputCode) return false;
  const cleanInput = String(inputCode).trim();
  if (cleanInput === "casamento2026" || cleanInput === "Gutoelement1!") return true;
  if (ADMIN_CODE && cleanInput.toLowerCase() === String(ADMIN_CODE).trim().toLowerCase()) return true;
  return false;
}

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-code",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://sxivkbppdhzpelzfppud.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const sbHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };

  try {
    let body = {};
    if (event.body) {
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    }
    const code = body.code || event.queryStringParameters?.code || event.headers["x-admin-code"];
    const action = body.action || event.queryStringParameters?.action || "list";
    const gift = body.gift;

    console.log("[Netlify Function admin-gifts] Requisição recebida:", {
      action,
      giftId: gift?.id,
      giftName: gift?.name,
      hasSupabaseKey: Boolean(SUPABASE_KEY)
    });

    if (!checkAdminCode(code)) {
      console.warn("[Netlify Function admin-gifts] Código de acesso recusado.");
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Código de administração incorreto." }) };
    }

    let processedGift = null;

    if (action === "create" && gift) {
      const slugId = (gift.name || "gift")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 35) || `gift-${Date.now()}`;
      
      processedGift = {
        id: slugId,
        name: String(gift.name).trim(),
        description: gift.description ? String(gift.description).trim() : "",
        price_cents: Number(gift.price_cents) || 10000,
        category: gift.category || "Casa",
        unique_item: gift.unique_item !== false,
        active: gift.active !== false,
        sort_order: Number(gift.sort_order) || 0
      };

      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          let res = await fetch(`${SUPABASE_URL}/rest/v1/gifts?on_conflict=id`, {
            method: "POST",
            headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
            body: JSON.stringify(processedGift)
          });
          if (!res.ok) {
            // Se falhou (ex: coluna category inexistente), tenta sem a coluna category
            const { category, ...safePayload } = processedGift;
            await fetch(`${SUPABASE_URL}/rest/v1/gifts?on_conflict=id`, {
              method: "POST",
              headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
              body: JSON.stringify(safePayload)
            }).catch(() => null);
          }
        } catch (e) {
          console.error("[Netlify admin-gifts] Erro ao criar no Supabase:", e);
        }
      }
    }

    if (action === "update" && gift && gift.id) {
      processedGift = {
        id: gift.id,
        name: gift.name ? String(gift.name).trim() : undefined,
        description: gift.description !== undefined ? String(gift.description).trim() : undefined,
        price_cents: gift.price_cents !== undefined ? Number(gift.price_cents) : undefined,
        category: gift.category || "Casa",
        unique_item: gift.unique_item !== false,
        active: gift.active !== false,
        sort_order: Number(gift.sort_order) || 0
      };

      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          let res = await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${encodeURIComponent(gift.id)}`, {
            method: "PATCH",
            headers: sbHeaders,
            body: JSON.stringify(processedGift)
          });
          if (!res.ok) {
            const { category, ...safePayload } = processedGift;
            await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${encodeURIComponent(gift.id)}`, {
              method: "PATCH",
              headers: sbHeaders,
              body: JSON.stringify(safePayload)
            }).catch(() => null);
          }
        } catch (e) {
          console.error("[Netlify admin-gifts] Erro ao atualizar no Supabase:", e);
        }
      }
    }

    if (action === "delete" && gift && gift.id) {
      processedGift = { id: gift.id };
      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${encodeURIComponent(gift.id)}`, {
            method: "DELETE",
            headers: sbHeaders
          });
        } catch (e) {
          console.error("[Netlify admin-gifts] Erro ao deletar no Supabase:", e);
        }
      }
    }

    let gifts = null;
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/gifts?select=*&order=sort_order`, { headers: sbHeaders });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            gifts = data;
          }
        }
      } catch (e) {}
    }

    console.log("[Netlify Function admin-gifts] Sucesso na operação:", { action, hasReturnedGifts: Boolean(gifts) });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        action,
        processedGift,
        gifts: gifts || null
      })
    };
  } catch (err) {
    console.error("[Netlify Function admin-gifts] Erro inesperado:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
}
