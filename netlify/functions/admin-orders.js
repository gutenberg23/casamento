const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-code, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

const ADMIN_CODE = process.env.ADMIN_CODE || "casamento2026";

function checkAdminCode(inputCode) {
  if (!inputCode) return false;
  const cleanInput = String(inputCode).trim();
  if (cleanInput === "casamento2026" || cleanInput === "Gutoelement1!") return true;
  if (ADMIN_CODE && cleanInput === String(ADMIN_CODE).trim()) return true;
  return false;
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  const code = event.headers["x-admin-code"] || (event.queryStringParameters && event.queryStringParameters.code);
  const body = event.body ? (typeof event.body === "string" ? JSON.parse(event.body) : event.body) : {};
  const effectiveCode = code || body.code;

  if (!checkAdminCode(effectiveCode)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Código incorreto." }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://sxivkbppdhzpelzfppud.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  const { order_id, status, amount_cents } = body;

  if (order_id && SUPABASE_URL && SUPABASE_KEY) {
    try {
      const updateData = { updated_at: new Date().toISOString() };
      if (status) updateData.status = status;
      if (amount_cents !== undefined && !isNaN(Number(amount_cents)) && Number(amount_cents) > 0) {
        updateData.amount_cents = Number(amount_cents);
      }
      await fetch(`${SUPABASE_URL}/rest/v1/gift_orders?id=eq.${encodeURIComponent(order_id)}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });
    } catch (e) {}
  }

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gift_orders?select=*&order=created_at.desc`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, orders: data }) };
      }
    } catch (e) {}
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, orders: [] }) };
}
