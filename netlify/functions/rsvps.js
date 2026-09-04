import crypto from "crypto";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Content-Type": "application/json"
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://sxivkbppdhzpelzfppud.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (event.httpMethod === "GET") {
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rsvps?select=*&order=created_at.desc`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map(r => {
            let phone = r.phone || "";
            let cleanMsg = r.message || null;
            if (!phone && cleanMsg && cleanMsg.includes("[WhatsApp:")) {
              const match = cleanMsg.match(/\[WhatsApp:\s*([^\]]+)\]/);
              if (match) {
                phone = match[1].trim();
                cleanMsg = cleanMsg.replace(/\[WhatsApp:\s*[^\]]+\]\s*/, "").trim() || null;
              }
            }
            return {
              id: String(r.id),
              name: String(r.name || ""),
              phone,
              attending: Boolean(r.attending),
              guests: Number(r.guests) || 1,
              message: cleanMsg,
              created_at: r.created_at || new Date().toISOString()
            };
          });
          return { statusCode: 200, headers, body: JSON.stringify(mapped) };
        }
      } catch (e) {
        console.warn("[Netlify RSVPs] Erro ao consultar Supabase:", e);
      }
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify([])
    };
  }

  if (event.httpMethod === "POST") {
    try {
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      const { name, phone, attending, message } = body;
      if (!name || !name.trim()) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Nome é obrigatório." }) };
      }

      const cleanPhone = phone ? String(phone).trim() : "";
      const userMsg = message ? String(message).trim() : "";

      let combinedMessage = userMsg;
      if (cleanPhone) {
        combinedMessage = combinedMessage
          ? `[WhatsApp: ${cleanPhone}] ${combinedMessage}`
          : `[WhatsApp: ${cleanPhone}]`;
      }

      const id = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : "a" + Math.random().toString(36).substring(2, 10) + "-0000-4000-a000-" + Math.random().toString(36).substring(2, 14);

      const isAttending = attending === true || attending === "true" || attending === "sim";
      const createdAt = new Date().toISOString();

      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/rsvps`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=representation"
            },
            body: JSON.stringify({
              id,
              name: name.trim(),
              attending: isAttending,
              guests: 1,
              message: combinedMessage || null,
              created_at: createdAt
            })
          });

          if (sbRes.ok) {
            const inserted = await sbRes.json();
            if (Array.isArray(inserted) && inserted[0]) {
              const row = inserted[0];
              return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                  id: row.id,
                  name: row.name,
                  phone: cleanPhone,
                  attending: row.attending,
                  guests: 1,
                  message: userMsg || null,
                  created_at: row.created_at
                })
              };
            }
          } else {
            console.error("[Netlify RSVPs] Supabase erro:", await sbRes.text());
          }
        } catch (e) {
          console.error("[Netlify RSVPs] Falha na requisição Supabase:", e);
        }
      }

      const fallbackRsvp = {
        id,
        name: name.trim(),
        phone: cleanPhone,
        attending: isAttending,
        guests: 1,
        message: userMsg || null,
        created_at: createdAt
      };

      return { statusCode: 201, headers, body: JSON.stringify(fallbackRsvp) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  if (event.httpMethod === "DELETE") {
    try {
      const body = event.body ? (typeof event.body === "string" ? JSON.parse(event.body) : event.body) : {};
      const id = event.queryStringParameters?.id || body.id;
      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "ID obrigatório." }) };
      }

      if (SUPABASE_URL && SUPABASE_KEY) {
        await fetch(`${SUPABASE_URL}/rest/v1/rsvps?id=eq.${id}`, {
          method: "DELETE",
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        });
      }

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Método não permitido." }) };
}
