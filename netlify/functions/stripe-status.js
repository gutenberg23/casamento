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

  const key = getStripeSecretKey();
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      configured: Boolean(key),
      prefix: key ? `${key.substring(0, 7)}...` : null,
      runtime: "netlify-function",
      available_env_count: Object.keys(process.env).length
    })
  };
}
