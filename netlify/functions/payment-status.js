function getStripeSecretKey() {
  const envKeys = [
    "STRIPE_SECRET_KEY",
    "STRIPE_KEY",
    "STRIPE_API_KEY",
    "STRIPE_SECRET",
    "STRIPE_SK",
    "STRIPE_PRIVATE_KEY",
    "VITE_STRIPE_SECRET_KEY"
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

function getMercadoPagoPublicKey() {
  const envKeys = [
    "MERCADO_PAGO_PUBLIC_KEY",
    "MERCADOPAGO_PUBLIC_KEY",
    "MP_PUBLIC_KEY",
    "VITE_MERCADO_PAGO_PUBLIC_KEY"
  ];
  for (const k of envKeys) {
    const val = process.env[k];
    if (val && typeof val === "string") {
      let cleaned = val.trim();
      if (cleaned.length > 5) return cleaned;
    }
  }
  return null;
}

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  const stripeKey = getStripeSecretKey();
  const mpToken = getMercadoPagoAccessToken();
  const mpPublicKey = getMercadoPagoPublicKey();

  console.log("[PaymentStatus Function] Checked gateways:", {
    hasStripe: Boolean(stripeKey),
    hasMercadoPago: Boolean(mpToken)
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      stripe: {
        configured: Boolean(stripeKey),
        prefix: stripeKey ? `${stripeKey.substring(0, 7)}...` : null
      },
      mercadopago: {
        configured: Boolean(mpToken),
        prefix: mpToken ? `${mpToken.substring(0, 8)}...` : null,
        is_test: mpToken ? mpToken.startsWith("TEST-") : false,
        public_key_configured: Boolean(mpPublicKey)
      },
      configured: Boolean(stripeKey || mpToken),
      primary_provider: mpToken ? "mercadopago" : (stripeKey ? "stripe" : null),
      prefix: mpToken ? `${mpToken.substring(0, 8)}...` : (stripeKey ? `${stripeKey.substring(0, 7)}...` : null),
      runtime: "netlify-function"
    })
  };
}
