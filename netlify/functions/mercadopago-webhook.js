function getMercadoPagoAccessToken() {
  const envKeys = [
    "MERCADO_PAGO_ACCESS_TOKEN",
    "MERCADOPAGO_ACCESS_TOKEN",
    "MP_ACCESS_TOKEN",
    "MERCADO_PAGO_TOKEN",
    "VITE_MERCADO_PAGO_ACCESS_TOKEN"
  ];

  for (const k of envKeys) {
    const val = process.env[k];
    if (val && typeof val === "string") {
      let cleaned = val.trim();
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      if (cleaned.length > 5) return cleaned;
    }
  }

  for (const [k, val] of Object.entries(process.env)) {
    if (k.toLowerCase().includes("mercadopago") || k.toLowerCase().includes("mercado_pago") || k === "MP_ACCESS_TOKEN") {
      let cleaned = String(val).trim();
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      if (cleaned.startsWith("APP_USR-") || cleaned.startsWith("TEST-")) {
        return cleaned;
      }
    }
  }

  return null;
}

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

  try {
    let body = {};
    if (event.body) {
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    }

    const q = event.queryStringParameters || {};
    const topic = q.topic || q.type || body.type || body.action;
    const paymentId = q.id || q["data.id"] || body?.data?.id || body.id;
    const mpToken = getMercadoPagoAccessToken();

    if ((topic === "payment" || topic === "payment.created" || topic === "payment.updated") && paymentId && mpToken) {
      const pRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${mpToken}`
        }
      });

      if (pRes.ok) {
        const paymentData = await pRes.json();
        const externalRef = paymentData.external_reference;
        const status = paymentData.status; // 'approved', 'rejected', 'cancelled', 'pending'

        const SUPABASE_URL = process.env.SUPABASE_URL || "https://sxivkbppdhzpelzfppud.supabase.co";
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

        if (externalRef && SUPABASE_URL && SUPABASE_KEY) {
          const newStatus = status === "approved" ? "approved" : (status === "rejected" || status === "cancelled" ? "rejected" : "pending");
          const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/gift_orders?id=eq.${encodeURIComponent(externalRef)}`, {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=representation"
            },
            body: JSON.stringify({
              status: newStatus,
              updated_at: new Date().toISOString()
            })
          });

          const patchedData = patchRes && patchRes.ok ? await patchRes.json().catch(() => []) : [];
          if ((!Array.isArray(patchedData) || patchedData.length === 0) && newStatus === "approved") {
            const metaGift = paymentData.metadata?.gift_id || paymentData.additional_info?.items?.[0]?.id;
            const buyerName = paymentData.metadata?.buyer_name || paymentData.payer?.first_name || "Convidado";
            const amountCents = Math.round((paymentData.transaction_amount || 0) * 100);
            if (metaGift) {
              await fetch(`${SUPABASE_URL}/rest/v1/gift_orders?on_conflict=id`, {
                method: "POST",
                headers: {
                  apikey: SUPABASE_KEY,
                  Authorization: `Bearer ${SUPABASE_KEY}`,
                  "Content-Type": "application/json",
                  Prefer: "resolution=merge-duplicates"
                },
                body: JSON.stringify({
                  id: externalRef,
                  gift_id: metaGift,
                  buyer_name: buyerName,
                  amount_cents: amountCents > 0 ? amountCents : 10000,
                  status: "approved",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
              }).catch(() => null);
            }
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true })
    };
  } catch (err) {
    console.error("Netlify webhook Mercado Pago error:", err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true, error: err.message })
    };
  }
}
