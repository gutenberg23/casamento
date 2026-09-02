const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
};

const defaultGifts = [
  { id: "panelas", name: "Jogo de panelas", description: "Um conjunto bom, dos que duram anos.", price_cents: 35000, unique_item: true, active: true, sort_order: 1 },
  { id: "airfryer", name: "Air fryer", description: "Pra facilitar o dia a dia na cozinha nova.", price_cents: 45000, unique_item: true, active: true, sort_order: 2 },
  { id: "liquidificador", name: "Liquidificador", description: "Vitamina de manhã não pode faltar.", price_cents: 22000, unique_item: true, active: true, sort_order: 3 },
  { id: "cafeteira", name: "Cafeteira", description: "Café fresquinho todo santo dia.", price_cents: 28000, unique_item: true, active: true, sort_order: 4 },
  { id: "jogocama", name: "Jogo de cama casal", description: "Lençol bom pra dormir bem.", price_cents: 25000, unique_item: true, active: true, sort_order: 5 },
  { id: "toalhas", name: "Jogo de toalhas", description: "Pro banheiro novo ficar completo.", price_cents: 18000, unique_item: true, active: true, sort_order: 6 },
  { id: "aspirador", name: "Robô aspirador", description: "Aquele mimo que ninguém se arrepende de dar.", price_cents: 90000, unique_item: true, active: true, sort_order: 7 },
  { id: "churrasco", name: "Kit churrasco", description: "Pra receber a família no fim de semana.", price_cents: 20000, unique_item: true, active: true, sort_order: 8 },
  { id: "luademel", name: "Cota lua de mel", description: "Contribua com o valor que quiser pra nossa viagem.", price_cents: 10000, unique_item: false, active: true, sort_order: 9 }
];

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
        }),
        fetch(`${SUPABASE_URL}/rest/v1/gift_orders?select=*`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        })
      ]);

      const [gifts, orders] = await Promise.all([gRes.json(), oRes.json()]);

      if (Array.isArray(gifts) && gifts.length > 0) {
        const nonRejectedOrders = Array.isArray(orders)
          ? orders.filter(o => o.status !== "rejected")
          : [];

        const consolidated = gifts.map(g => {
          const matchingOrders = nonRejectedOrders.filter(o => o.gift_id === g.id);
          const activeOrder = 
            matchingOrders.find(o => o.status === "approved") ||
            matchingOrders.find(o => o.status === "awaiting_confirmation") ||
            matchingOrders.find(o => o.status === "pending");

          return {
            ...g,
            order_id: activeOrder?.id || null,
            buyer_name: activeOrder?.buyer_name || null,
            order_status: activeOrder?.status || null,
            order_amount_cents: activeOrder?.amount_cents || null,
            payment_method: activeOrder?.payment_method || null
          };
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(consolidated)
        };
      }
    } catch (e) {}
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(defaultGifts)
  };
}
