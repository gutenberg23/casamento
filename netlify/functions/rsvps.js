const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
          return { statusCode: 200, headers, body: JSON.stringify(data) };
        }
      } catch (e) {}
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify([
        { id: "sample-1", name: "Família Silva", attending: true, guests: 2, message: "Parabéns ao casal!", created_at: new Date().toISOString() }
      ])
    };
  }

  if (event.httpMethod === "POST") {
    try {
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      const { name, attending, guests, message } = body;
      if (!name || !name.trim()) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Nome é obrigatório." }) };
      }

      const newRsvp = {
        id: `rsvp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim(),
        attending: attending === true || attending === "true" || attending === "sim",
        guests: attending ? parseInt(guests, 10) || 1 : 0,
        message: message ? String(message).trim() : null,
        created_at: new Date().toISOString()
      };

      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/rsvps`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(newRsvp)
          });
        } catch (e) {}
      }

      return { statusCode: 201, headers, body: JSON.stringify(newRsvp) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Método não permitido." }) };
}
