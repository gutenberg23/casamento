import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// In-memory data store (fallback if Supabase is not connected)
const defaultGifts = [
  { id: "panelas", name: "Jogo de panelas", description: "Um conjunto bom, dos que duram anos.", price_cents: 35000, unique_item: true, active: true, sort_order: 1, created_at: new Date().toISOString() },
  { id: "airfryer", name: "Air fryer", description: "Pra facilitar o dia a dia na cozinha nova.", price_cents: 45000, unique_item: true, active: true, sort_order: 2, created_at: new Date().toISOString() },
  { id: "liquidificador", name: "Liquidificador", description: "Vitamina de manhã não pode faltar.", price_cents: 22000, unique_item: true, active: true, sort_order: 3, created_at: new Date().toISOString() },
  { id: "cafeteira", name: "Cafeteira", description: "Café fresquinho todo santo dia.", price_cents: 28000, unique_item: true, active: true, sort_order: 4, created_at: new Date().toISOString() },
  { id: "jogocama", name: "Jogo de cama casal", description: "Lençol bom pra dormir bem.", price_cents: 25000, unique_item: true, active: true, sort_order: 5, created_at: new Date().toISOString() },
  { id: "toalhas", name: "Jogo de toalhas", description: "Pro banheiro novo ficar completo.", price_cents: 18000, unique_item: true, active: true, sort_order: 6, created_at: new Date().toISOString() },
  { id: "aspirador", name: "Robô aspirador", description: "Aquele mimo que ninguém se arrepende de dar.", price_cents: 90000, unique_item: true, active: true, sort_order: 7, created_at: new Date().toISOString() },
  { id: "churrasco", name: "Kit churrasco", description: "Pra receber a família no fim de semana.", price_cents: 20000, unique_item: true, active: true, sort_order: 8, created_at: new Date().toISOString() },
  { id: "luademel", name: "Cota lua de mel", description: "Contribua com o valor que quiser pra nossa viagem.", price_cents: 10000, unique_item: false, active: true, sort_order: 9, created_at: new Date().toISOString() },
];

let gifts = [...defaultGifts];
let giftOrders = [];
let rsvps = [
  { id: "sample-1", name: "Família Silva", attending: true, guests: 2, message: "Parabéns ao casal lindo! Nos vemos lá!", created_at: new Date(Date.now() - 3600000 * 24).toISOString() }
];

const ADMIN_CODE = process.env.ADMIN_CODE || "casamento2026";

function slugify(text) {
  return text
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "presente";
}

function getGiftStatusList() {
  return gifts
    .filter(g => g.active)
    .map(g => {
      const activeOrder = giftOrders.find(
        o => o.gift_id === g.id && (o.status === "approved" || (o.status === "pending" && (Date.now() - new Date(o.created_at).getTime() < 30 * 60 * 1000)))
      );

      return {
        ...g,
        order_id: activeOrder ? activeOrder.id : null,
        buyer_name: activeOrder ? activeOrder.buyer_name : null,
        order_status: activeOrder ? activeOrder.status : null,
        order_amount_cents: activeOrder ? activeOrder.amount_cents : null,
        installments: activeOrder ? activeOrder.installments : null,
      };
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

// API Config
app.get("/api/config", (req, res) => {
  res.json({
    supabase_url: process.env.SUPABASE_URL || null,
    supabase_anon_key: process.env.SUPABASE_ANON_KEY || null,
    has_mp: !!process.env.MP_ACCESS_TOKEN,
    default_admin_code: process.env.NODE_ENV !== "production" ? ADMIN_CODE : undefined,
  });
});

// Gifts & Gift Status
app.get(["/api/gifts", "/rest/v1/gifts", "/rest/v1/gift_status"], (req, res) => {
  res.json(getGiftStatusList());
});

// RSVPs
app.get(["/api/rsvps", "/rest/v1/rsvps"], (req, res) => {
  const sorted = [...rsvps].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(sorted);
});

app.post(["/api/rsvps", "/rest/v1/rsvps"], (req, res) => {
  const { name, attending, guests, message } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Nome é obrigatório." });
  }

  const newRsvp = {
    id: `rsvp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    attending: attending === true || attending === "true" || attending === "sim",
    guests: parseInt(guests, 10) || 1,
    message: message ? String(message).trim() : null,
    created_at: new Date().toISOString(),
  };

  rsvps.push(newRsvp);
  res.status(201).json(newRsvp);
});

// Gift Orders
app.get(["/api/orders", "/rest/v1/gift_orders"], (req, res) => {
  const list = giftOrders.map(o => {
    const gift = gifts.find(g => g.id === o.gift_id);
    return {
      ...o,
      gifts: gift ? { name: gift.name } : { name: o.gift_id },
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(list);
});

// Create Payment (Mercado Pago or Mock simulation)
app.post(["/api/create-payment", "/functions/v1/create-payment"], async (req, res) => {
  try {
    const { gift_id, buyer_name, amount_cents } = req.body;

    if (!gift_id || !buyer_name || !buyer_name.trim()) {
      return res.status(400).json({ error: "gift_id e buyer_name são obrigatórios." });
    }

    const gift = gifts.find(g => g.id === gift_id && g.active);
    if (!gift) {
      return res.status(404).json({ error: "Presente não encontrado." });
    }

    if (gift.unique_item) {
      const activeOrder = giftOrders.find(
        o => o.gift_id === gift_id && (o.status === "approved" || (o.status === "pending" && Date.now() - new Date(o.created_at).getTime() < 30 * 60 * 1000))
      );
      if (activeOrder) {
        return res.status(409).json({ error: "Esse presente já foi escolhido por outra pessoa." });
      }
    }

    const finalAmount = gift.unique_item
      ? gift.price_cents
      : (amount_cents && amount_cents >= 1000 ? amount_cents : gift.price_cents);

    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const order = {
      id: orderId,
      gift_id,
      buyer_name: buyer_name.trim(),
      amount_cents: finalAmount,
      status: "approved", // In local mock mode, automatically approves for seamless UX
      mp_preference_id: null,
      mp_payment_id: `sim_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (process.env.MP_ACCESS_TOKEN) {
      // Real Mercado Pago integration
      const siteUrl = process.env.SITE_URL || `http://${req.headers.host || "localhost:3000"}`;
      order.status = "pending";

      const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          items: [
            {
              title: `Presente: ${gift.name} — Iasmin & Gutenberg`,
              quantity: 1,
              unit_price: finalAmount / 100,
              currency_id: "BRL",
            },
          ],
          payer: { name: buyer_name.trim() },
          payment_methods: {
            installments: 12,
            excluded_payment_types: [{ id: "ticket" }],
          },
          back_urls: {
            success: `${siteUrl}?pagamento=sucesso&presente=${gift_id}`,
            failure: `${siteUrl}?pagamento=falhou&presente=${gift_id}`,
            pending: `${siteUrl}?pagamento=pendente&presente=${gift_id}`,
          },
          auto_return: "approved",
          external_reference: order.id,
          notification_url: `${siteUrl}/api/mp-webhook`,
          statement_descriptor: "CASAMENTO IEG",
        }),
      });

      const mpData = await mpResponse.json();
      if (!mpResponse.ok) {
        return res.status(502).json({ error: "Erro ao criar cobrança no Mercado Pago.", detail: mpData });
      }

      order.mp_preference_id = mpData.id;
      giftOrders.push(order);
      return res.json({ init_point: mpData.init_point, order_id: order.id });
    }

    // Mock Mode fallback: Order is recorded as approved and redirected with success banner
    giftOrders.push(order);
    const mockSuccessUrl = `/?pagamento=sucesso&presente=${gift_id}`;
    return res.json({ init_point: mockSuccessUrl, order_id: order.id });
  } catch (err) {
    return res.status(500).json({ error: "Erro inesperado.", detail: String(err) });
  }
});

// Mercado Pago Webhook
app.all(["/api/mp-webhook", "/functions/v1/mp-webhook"], async (req, res) => {
  try {
    let paymentId = req.query["data.id"] || req.query.id;
    const topic = req.query.type || req.query.topic;

    if (!paymentId && req.method === "POST" && req.body) {
      paymentId = req.body?.data?.id || req.body?.id;
    }

    if (!paymentId || (topic && topic !== "payment")) {
      return res.status(200).send("ok");
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(200).send("ok");
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });

    if (mpRes.ok) {
      const payment = await mpRes.json();
      const orderId = payment.external_reference;
      if (orderId) {
        const order = giftOrders.find(o => o.id === orderId);
        if (order) {
          order.status = payment.status || "pending";
          order.mp_payment_id = String(payment.id);
          order.installments = payment.installments || null;
          order.updated_at = new Date().toISOString();
        }
      }
    }

    return res.status(200).send("ok");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).send("ok");
  }
});

// Admin Gifts Endpoint
app.post(["/api/admin-gifts", "/functions/v1/admin-gifts"], (req, res) => {
  try {
    const { code, action, gift } = req.body || {};

    if (!code || code !== ADMIN_CODE) {
      return res.status(401).json({ error: "Código incorreto." });
    }

    if (action === "list") {
      const sorted = [...gifts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return res.json({ gifts: sorted });
    }

    if (action === "create") {
      if (!gift?.name || !gift?.price_cents) {
        return res.status(400).json({ error: "Nome e preço são obrigatórios." });
      }
      let id = slugify(gift.name);
      if (gifts.some(g => g.id === id)) {
        id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
      }

      const newGift = {
        id,
        name: gift.name,
        description: gift.description || "",
        price_cents: gift.price_cents,
        unique_item: gift.unique_item ?? true,
        active: gift.active ?? true,
        sort_order: gift.sort_order ?? 0,
        created_at: new Date().toISOString(),
      };

      gifts.push(newGift);
      const sorted = [...gifts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return res.json({ gifts: sorted });
    }

    if (action === "update") {
      if (!gift?.id) return res.status(400).json({ error: "Presente não identificado." });
      const idx = gifts.findIndex(g => g.id === gift.id);
      if (idx === -1) return res.status(404).json({ error: "Presente não encontrado." });

      gifts[idx] = { ...gifts[idx], ...gift };
      const sorted = [...gifts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return res.json({ gifts: sorted });
    }

    if (action === "delete") {
      if (!gift?.id) return res.status(400).json({ error: "Presente não identificado." });
      gifts = gifts.filter(g => g.id !== gift.id);
      const sorted = [...gifts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return res.json({ gifts: sorted });
    }

    return res.status(400).json({ error: "Ação inválida." });
  } catch (err) {
    return res.status(500).json({ error: "Erro inesperado.", detail: String(err) });
  }
});

// Static assets
app.use(express.static(__dirname));

// Fallback to index.html for SPA/Hotsite routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Convite de Casamento rodando em http://0.0.0.0:${PORT}`);
});
