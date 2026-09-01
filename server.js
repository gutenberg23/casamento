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
const PIX_KEY = process.env.PIX_KEY || "gutenberg23@gmail.com";
const PIX_RECEIVER_NAME = process.env.PIX_RECEIVER_NAME || "Iasmin e Gutenberg";
const PIX_RECEIVER_CITY = process.env.PIX_RECEIVER_CITY || "Rio de Janeiro";

function slugify(text) {
  return text
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "presente";
}

// Gera payload Pix oficial no padrão BACEN (EMV BR Code)
function generatePixPayload({ key, name, city, amount, txid = "***" }) {
  const cleanName = (name || PIX_RECEIVER_NAME)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 25);
  const cleanCity = (city || PIX_RECEIVER_CITY)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 15);
  const cleanKey = key || PIX_KEY;
  const cleanTxid = (txid || "***").replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";

  const formatField = (id, value) => {
    const len = String(value.length).padStart(2, "0");
    return `${id}${len}${value}`;
  };

  const merchantAccountInfo =
    formatField("00", "br.gov.bcb.pix") +
    formatField("01", cleanKey);

  let payload =
    formatField("00", "01") +
    formatField("26", merchantAccountInfo) +
    formatField("52", "0000") +
    formatField("53", "986");

  if (amount && amount > 0) {
    const formattedAmount = Number(amount).toFixed(2);
    payload += formatField("54", formattedAmount);
  }

  payload +=
    formatField("58", "BR") +
    formatField("59", cleanName) +
    formatField("60", cleanCity) +
    formatField("62", formatField("05", cleanTxid)) +
    "6304";

  // CRC16-CCITT (0x1021)
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, "0");
  return payload + crcHex;
}

function getGiftStatusList() {
  return gifts
    .filter(g => g.active)
    .map(g => {
      const activeOrder = giftOrders.find(
        o => o.gift_id === g.id && (o.status === "approved" || (o.status === "pending" && (Date.now() - new Date(o.created_at).getTime() < 60 * 60 * 1000)))
      );

      return {
        ...g,
        order_id: activeOrder ? activeOrder.id : null,
        buyer_name: activeOrder ? activeOrder.buyer_name : null,
        order_status: activeOrder ? activeOrder.status : null,
        order_amount_cents: activeOrder ? activeOrder.amount_cents : null,
        installments: activeOrder ? activeOrder.installments : null,
        payment_method: activeOrder ? activeOrder.payment_method : null,
      };
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

// API Config
app.get("/api/config", (req, res) => {
  res.json({
    supabase_url: process.env.SUPABASE_URL || null,
    supabase_anon_key: process.env.SUPABASE_ANON_KEY || null,
    has_stripe: !!process.env.STRIPE_SECRET_KEY,
    pix_key: PIX_KEY,
    pix_receiver_name: PIX_RECEIVER_NAME,
    pix_receiver_city: PIX_RECEIVER_CITY,
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

// Create Payment (Pix Direto, Stripe, Asaas, Mercado Pago or Simulation)
app.post(["/api/create-payment", "/functions/v1/create-payment"], async (req, res) => {
  try {
    const { gift_id, buyer_name, amount_cents, payment_method, buyer_message } = req.body;

    if (!gift_id || !buyer_name || !buyer_name.trim()) {
      return res.status(400).json({ error: "gift_id e buyer_name são obrigatórios." });
    }

    const gift = gifts.find(g => g.id === gift_id && g.active);
    if (!gift) {
      return res.status(404).json({ error: "Presente não encontrado." });
    }

    if (gift.unique_item) {
      const activeOrder = giftOrders.find(
        o => o.gift_id === gift_id && (o.status === "approved" || (o.status === "pending" && Date.now() - new Date(o.created_at).getTime() < 60 * 60 * 1000))
      );
      if (activeOrder) {
        return res.status(409).json({ error: "Esse presente já foi escolhido por outra pessoa." });
      }
    }

    const finalAmount = gift.unique_item
      ? gift.price_cents
      : (amount_cents && amount_cents >= 1000 ? amount_cents : gift.price_cents);

    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const selectedMethod = payment_method || "pix_direct";

    const order = {
      id: orderId,
      gift_id,
      buyer_name: buyer_name.trim(),
      buyer_message: buyer_message ? String(buyer_message).trim() : null,
      amount_cents: finalAmount,
      payment_method: selectedMethod,
      status: "pending",
      mp_preference_id: null,
      stripe_session_id: null,
      asaas_payment_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const siteUrl = process.env.SITE_URL || `http://${req.headers.host || "localhost:3000"}`;

    // 1. Pix Direto Instantâneo (QR Code & Copia e Cola dos noivos)
    if (selectedMethod === "pix_direct" || (!process.env.STRIPE_SECRET_KEY && selectedMethod !== "card_simulation")) {
      const pixCode = generatePixPayload({
        key: PIX_KEY,
        name: PIX_RECEIVER_NAME,
        city: PIX_RECEIVER_CITY,
        amount: finalAmount / 100,
        txid: order.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20),
      });

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(pixCode)}`;

      giftOrders.push(order);
      return res.json({
        provider: "pix_direct",
        order_id: order.id,
        amount_cents: finalAmount,
        pix_code: pixCode,
        qr_code_url: qrCodeUrl,
        pix_key: PIX_KEY,
        receiver_name: PIX_RECEIVER_NAME,
        receiver_city: PIX_RECEIVER_CITY,
      });
    }

    // 2. Stripe Checkout (Cartão de Crédito e Pix)
    if (selectedMethod === "stripe" || (process.env.STRIPE_SECRET_KEY && selectedMethod === "card")) {
      if (process.env.STRIPE_SECRET_KEY) {
        const stripeParams = new URLSearchParams();
        stripeParams.append("payment_method_types[]", "card");
        stripeParams.append("payment_method_types[]", "boleto");
        stripeParams.append("line_items[0][price_data][currency]", "brl");
        stripeParams.append("line_items[0][price_data][product_data][name]", `Presente: ${gift.name} — Iasmin & Gutenberg`);
        stripeParams.append("line_items[0][price_data][unit_amount]", String(finalAmount));
        stripeParams.append("line_items[0][quantity]", "1");
        stripeParams.append("mode", "payment");
        stripeParams.append("client_reference_id", order.id);
        stripeParams.append("success_url", `${siteUrl}?pagamento=sucesso&presente=${gift_id}`);
        stripeParams.append("cancel_url", `${siteUrl}?pagamento=falhou&presente=${gift_id}`);

        const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: stripeParams.toString(),
        });

        const stripeData = await stripeRes.json();
        if (!stripeRes.ok) {
          return res.status(502).json({ error: "Erro ao criar checkout no Stripe.", detail: stripeData });
        }

        order.stripe_session_id = stripeData.id;
        giftOrders.push(order);
        return res.json({ provider: "stripe", init_point: stripeData.url, order_id: order.id });
      }
    }

    // 3. Fallback para demonstração / preview
    order.status = "approved";
    giftOrders.push(order);
    const mockSuccessUrl = `/?pagamento=sucesso&presente=${gift_id}`;
    return res.json({ provider: "simulation", init_point: mockSuccessUrl, order_id: order.id });
  } catch (err) {
    return res.status(500).json({ error: "Erro inesperado.", detail: String(err) });
  }
});

// Confirmação do Pix direto feita pelo convidado
app.post("/api/confirm-pix-order", (req, res) => {
  const { order_id } = req.body;
  if (!order_id) {
    return res.status(400).json({ error: "order_id é obrigatório." });
  }

  const order = giftOrders.find(o => o.id === order_id);
  if (!order) {
    return res.status(404).json({ error: "Pedido não encontrado." });
  }

  order.status = "approved";
  order.updated_at = new Date().toISOString();

  return res.json({ success: true, order });
});

// Stripe Webhook
app.post("/api/stripe-webhook", (req, res) => {
  try {
    const event = req.body;
    if (event?.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.client_reference_id;
      if (orderId) {
        const order = giftOrders.find(o => o.id === orderId);
        if (order) {
          order.status = "approved";
          order.updated_at = new Date().toISOString();
        }
      }
    }
    return res.json({ received: true });
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
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
