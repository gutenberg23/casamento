const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
};

const defaultGifts = [];

function normalizeStr(s) {
  if (!s) return "";
  return String(s)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://sxivkbppdhzpelzfppud.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const [gRes, oRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/gifts?select=*&order=sort_order`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        }).catch(() => null),
        fetch(`${SUPABASE_URL}/rest/v1/gift_orders?select=*`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        }).catch(() => null)
      ]);

      const gifts = gRes && gRes.ok ? await gRes.json().catch(() => null) : null;
      const orders = oRes && oRes.ok ? await oRes.json().catch(() => null) : null;

      const baseGifts = Array.isArray(gifts) ? gifts : [];
      const nonRejectedOrders = Array.isArray(orders)
        ? orders.filter(o => o && o.status !== "rejected")
        : [];

      const consolidated = baseGifts.map(g => {
        const gId = String(g.id || '').trim().toLowerCase();
        const gName = String(g.name || '').trim().toLowerCase();
        const normGId = normalizeStr(gId);
        const normGName = normalizeStr(gName);

        const matchingOrders = nonRejectedOrders.filter(o => {
          if (!o || !o.gift_id) return false;
          const oGId = String(o.gift_id).trim().toLowerCase();
          const normOGId = normalizeStr(oGId);
          return oGId === gId || oGId === gName || (normOGId && (normOGId === normGId || normOGId === normGName));
        });

        const activeOrder = 
          matchingOrders.find(o => o.status === "approved") ||
          matchingOrders.find(o => o.status === "awaiting_confirmation") ||
          matchingOrders.find(o => o.status === "pending");

        const contributors = matchingOrders.map(o => ({
          id: o.id,
          buyer_name: o.buyer_name,
          buyer_message: o.buyer_message || null,
          amount_cents: o.amount_cents,
          status: o.status,
          created_at: o.created_at
        }));

        return {
          ...g,
          order_id: activeOrder?.id || null,
          buyer_name: activeOrder?.buyer_name || null,
          order_status: activeOrder?.status || null,
          order_amount_cents: activeOrder?.amount_cents || null,
          payment_method: activeOrder?.payment_method || null,
          contributors,
          contributors_count: contributors.length
        };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(consolidated)
      };
    } catch (e) {
      console.error("Erro na função gifts:", e);
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify([])
  };
}
