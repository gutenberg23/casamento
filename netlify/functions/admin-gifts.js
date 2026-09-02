function getAdminCode() {
  return process.env.ADMIN_CODE || "casamento2026";
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

    if (!code || String(code).trim().toLowerCase() !== getAdminCode().toLowerCase()) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Código de administração incorreto." }) };
    }

    if (action === "create" && gift) {
      const slugId = (gift.name || "gift")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 35) || `gift-${Date.now()}`;
      
      const newGift = {
        id: slugId,
        name: gift.name,
        description: gift.description || "",
        price_cents: Number(gift.price_cents) || 10000,
        unique_item: gift.unique_item ?? true,
        active: gift.active ?? true,
        sort_order: Number(gift.sort_order) || 0
      };

      await fetch(`${SUPABASE_URL}/rest/v1/gifts?on_conflict=id`, {
        method: "POST",
        headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(newGift)
      });
    }

    if (action === "update" && gift && gift.id) {
      await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${encodeURIComponent(gift.id)}`, {
        method: "PATCH",
        headers: sbHeaders,
        body: JSON.stringify(gift)
      });
    }

    if (action === "delete" && gift && gift.id) {
      await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${encodeURIComponent(gift.id)}`, {
        method: "DELETE",
        headers: sbHeaders
      });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/gifts?select=*&order=sort_order`, { headers: sbHeaders });
    const gifts = await res.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ gifts: Array.isArray(gifts) ? gifts : [] })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
}
