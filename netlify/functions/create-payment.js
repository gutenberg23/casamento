function getStripeSecretKey() {
  const envKeys = [
    "STRIPE_SECRET_KEY",
    "STRIPE_KEY",
    "STRIPE_API_KEY",
    "STRIPE_SECRET",
    "STRIPE_SK",
    "STRIPE_PRIVATE_KEY",
    "VITE_STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_SECRET_KEY",
    "REACT_APP_STRIPE_SECRET_KEY",
    "SECRET_KEY"
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
    if (k.toLowerCase().includes("stripe") && typeof val === "string") {
      let cleaned = val.trim();
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      if (cleaned.startsWith("sk_") || cleaned.startsWith("rk_")) {
        return cleaned;
      }
    }
  }

  return null;
}

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

const defaultGifts = [
  { id: "panelas", name: "Jogo de panelas", description: "Um conjunto bom, dos que duram anos.", price_cents: 35000, unique_item: true },
  { id: "airfryer", name: "Air fryer", description: "Pra facilitar o dia a dia na cozinha nova.", price_cents: 45000, unique_item: true },
  { id: "liquidificador", name: "Liquidificador", description: "Vitamina de manhã não pode faltar.", price_cents: 22000, unique_item: true },
  { id: "cafeteira", name: "Cafeteira", description: "Café fresquinho todo santo dia.", price_cents: 28000, unique_item: true },
  { id: "jogocama", name: "Jogo de cama casal", description: "Lençol bom pra dormir bem.", price_cents: 25000, unique_item: true },
  { id: "toalhas", name: "Jogo de toalhas", description: "Pro banheiro novo ficar completo.", price_cents: 18000, unique_item: true },
  { id: "aspirador", name: "Robô aspirador", description: "Aquele mimo que ninguém se arrepende de dar.", price_cents: 90000, unique_item: true },
  { id: "churrasco", name: "Kit churrasco", description: "Pra receber a família no fim de semana.", price_cents: 20000, unique_item: true },
  { id: "luademel", name: "Cota lua de mel", description: "Contribua com o valor que quiser pra nossa viagem.", price_cents: 10000, unique_item: false }
];

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Método não permitido." })
    };
  }

  try {
    let body = {};
    if (event.body) {
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    }
    const { gift_id, buyer_name, amount_cents, payment_method, buyer_message } = body;

    if (!gift_id || !buyer_name || !buyer_name.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Nome e presente são obrigatórios." })
      };
    }

    const stripeKey = getStripeSecretKey();
    const mpToken = getMercadoPagoAccessToken();

    if (!stripeKey && !mpToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Nem a chave do Mercado Pago (MERCADO_PAGO_ACCESS_TOKEN) nem a do Stripe (STRIPE_SECRET_KEY) foram encontradas no ambiente do Netlify.",
          stripe_missing: true,
          mercadopago_missing: true,
          env_keys_found: Object.keys(process.env).filter(k => !k.toLowerCase().includes("key") && !k.toLowerCase().includes("secret"))
        })
      };
    }

    // Busca detalhes do presente
    let gift = defaultGifts.find(g => g.id === gift_id);
    const SUPABASE_URL = process.env.SUPABASE_URL || "https://sxivkbppdhzpelzfppud.supabase.co";
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${encodeURIComponent(gift_id)}&select=*`, {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
          }
        });
        const sbData = await sbRes.json();
        if (Array.isArray(sbData) && sbData.length > 0) {
          gift = sbData[0];
        }
      } catch (e) {}
    }

    if (!gift) {
      gift = {
        id: gift_id,
        name: "Presente de Casamento",
        price_cents: amount_cents || 10000,
        description: ""
      };
    }

    const finalAmount = gift.unique_item
      ? Number(gift.price_cents)
      : (amount_cents && Number(amount_cents) >= 1000 ? Number(amount_cents) : Number(gift.price_cents));

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const origin = event.headers.origin || event.headers.referer || "https://iasminegutenberg.com.br";
    const cleanOrigin = origin.split("?")[0].replace(/\/$/, "");

    // 1. Mercado Pago Checkout Pro (se o método for mercadopago ou se mpToken estiver disponível)
    const useMercadoPago = payment_method === "mercadopago" || (mpToken && payment_method !== "stripe");

    if (useMercadoPago && mpToken) {
      // Registra pedido prévio no Supabase
      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/gift_orders`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              id: orderId,
              gift_id,
              buyer_name: buyer_name.trim(),
              buyer_message: buyer_message ? String(buyer_message).trim() : null,
              amount_cents: finalAmount,
              payment_method: "mercadopago",
              status: "pending",
              created_at: new Date().toISOString()
            })
          });
        } catch (e) {}
      }

      const mpBody = {
        items: [
          {
            id: gift.id,
            title: `Presente: ${gift.name} — Casamento Iasmin & Gutenberg`,
            description: (gift.description || "Presente de casamento para Iasmin e Gutenberg").substring(0, 200),
            quantity: 1,
            unit_price: Number((finalAmount / 100).toFixed(2)),
            currency_id: "BRL"
          }
        ],
        payer: {
          name: buyer_name.trim()
        },
        external_reference: orderId,
        metadata: {
          gift_id: gift_id,
          order_id: orderId,
          buyer_name: buyer_name.trim(),
          buyer_message: buyer_message ? String(buyer_message).trim() : ""
        },
        payment_methods: {
          installments: 12
        },
        back_urls: {
          success: `${cleanOrigin}?pagamento=sucesso&presente=${encodeURIComponent(gift.name || gift_id)}&order_id=${encodeURIComponent(orderId)}`,
          pending: `${cleanOrigin}?pagamento=pendente&presente=${encodeURIComponent(gift.name || gift_id)}&order_id=${encodeURIComponent(orderId)}`,
          failure: `${cleanOrigin}?pagamento=cancelado&presente=${encodeURIComponent(gift.name || gift_id)}`
        },
        auto_return: "approved",
        statement_descriptor: "CASAMENTO I&G"
      };

      const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mpToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(mpBody)
      });

      const mpData = await mpRes.json();
      if (!mpRes.ok) {
        const msg = mpData.message || mpData.error || "Erro retornado pela API do Mercado Pago.";
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: `Mercado Pago error: ${msg}`, detail: mpData })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          provider: "mercadopago",
          init_point: mpData.init_point || mpData.sandbox_init_point,
          order_id: orderId,
          preference_id: mpData.id
        })
      };
    }

    // 2. Stripe Checkout (Cartão de Crédito)
    if (stripeKey) {
      // Registra pedido prévio no Supabase
      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/gift_orders`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              id: orderId,
              gift_id,
              buyer_name: buyer_name.trim(),
              buyer_message: buyer_message ? String(buyer_message).trim() : null,
              amount_cents: finalAmount,
              payment_method: "stripe",
              status: "pending",
              created_at: new Date().toISOString()
            })
          });
        } catch (e) {}
      }

      const stripeParams = new URLSearchParams();
      stripeParams.append("payment_method_types[]", "card");
      stripeParams.append("payment_method_options[card][installments][enabled]", "true");
      stripeParams.append("line_items[0][price_data][currency]", "brl");
      stripeParams.append("line_items[0][price_data][product_data][name]", `Presente: ${gift.name} — Casamento Iasmin & Gutenberg`);
      if (gift.description) {
        stripeParams.append("line_items[0][price_data][product_data][description]", gift.description.substring(0, 200));
      }
      stripeParams.append("line_items[0][price_data][unit_amount]", String(finalAmount));
      stripeParams.append("line_items[0][quantity]", "1");
      stripeParams.append("mode", "payment");
      stripeParams.append("client_reference_id", orderId);
      stripeParams.append("metadata[gift_id]", gift_id);
      stripeParams.append("metadata[buyer_name]", buyer_name.trim());
      stripeParams.append("metadata[order_id]", orderId);
      if (buyer_message) {
        stripeParams.append("metadata[buyer_message]", String(buyer_message).substring(0, 400));
      }
      stripeParams.append("success_url", `${cleanOrigin}?pagamento=sucesso&presente=${encodeURIComponent(gift_id)}&order_id=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`);
      stripeParams.append("cancel_url", `${cleanOrigin}?pagamento=cancelado&presente=${encodeURIComponent(gift_id)}`);

      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: stripeParams.toString()
      });

      const stripeData = await stripeRes.json();
      if (!stripeRes.ok) {
        const msg = stripeData.error?.message || "Erro retornado pela API do Stripe.";
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: `Stripe error: ${msg}`, detail: stripeData })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          provider: "stripe",
          init_point: stripeData.url,
          order_id: orderId
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Nenhum método de pagamento disponível." })
    };
  } catch (err) {
    console.error("Netlify Function create-payment error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err.message || "Erro ao processar pagamento com Stripe."
      })
    };
  }
}
