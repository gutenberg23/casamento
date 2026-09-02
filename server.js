import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

function getStripeSecretKey() {
  const possibleKeys = [
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_KEY,
    process.env.STRIPE_API_KEY,
    process.env.STRIPE_SECRET,
    process.env.STRIPE_SK,
    process.env.STRIPE_PRIVATE_KEY,
    process.env.VITE_STRIPE_SECRET_KEY
  ];

  for (let key of possibleKeys) {
    if (key && typeof key === "string") {
      let cleaned = key.trim();
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      if (cleaned.length > 0) {
        return cleaned;
      }
    }
  }
  return null;
}

// In-memory + File Persistent data store
const defaultGifts = [
  { id: "panelas", name: "Jogo de panelas", description: "Um conjunto bom, dos que duram anos.", price_cents: 35000, unique_item: true, active: true, sort_order: 1, category: "Cozinha", created_at: new Date().toISOString() },
  { id: "airfryer", name: "Air fryer", description: "Pra facilitar o dia a dia na cozinha nova.", price_cents: 45000, unique_item: true, active: true, sort_order: 2, category: "Eletros", created_at: new Date().toISOString() },
  { id: "liquidificador", name: "Liquidificador", description: "Vitamina de manhã não pode faltar.", price_cents: 22000, unique_item: true, active: true, sort_order: 3, category: "Eletros", created_at: new Date().toISOString() },
  { id: "cafeteira", name: "Cafeteira", description: "Café fresquinho todo santo dia.", price_cents: 28000, unique_item: true, active: true, sort_order: 4, category: "Cozinha", created_at: new Date().toISOString() },
  { id: "jogocama", name: "Jogo de cama casal", description: "Lençol bom pra dormir bem.", price_cents: 25000, unique_item: true, active: true, sort_order: 5, category: "Quarto", created_at: new Date().toISOString() },
  { id: "toalhas", name: "Jogo de toalhas", description: "Pro banheiro novo ficar completo.", price_cents: 18000, unique_item: true, active: true, sort_order: 6, category: "Banho", created_at: new Date().toISOString() },
  { id: "aspirador", name: "Robô aspirador", description: "Aquele mimo que ninguém se arrepende de dar.", price_cents: 90000, unique_item: true, active: true, sort_order: 7, category: "Casa", created_at: new Date().toISOString() },
  { id: "churrasco", name: "Kit churrasco", description: "Pra receber a família no fim de semana.", price_cents: 20000, unique_item: true, active: true, sort_order: 8, category: "Lazer", created_at: new Date().toISOString() },
  { id: "luademel", name: "Cota lua de mel", description: "Contribua com o valor que quiser pra nossa viagem.", price_cents: 10000, unique_item: false, active: true, sort_order: 9, category: "Lua de Mel", created_at: new Date().toISOString() },
];

const DATA_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

function loadStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Erro ao carregar store.json:", e);
  }
  return {
    gifts: defaultGifts,
    giftOrders: [],
    rsvps: [
      { id: "sample-1", name: "Família Silva", attending: true, guests: 2, message: "Parabéns ao casal lindo! Nos vemos lá!", created_at: new Date(Date.now() - 3600000 * 24).toISOString() }
    ]
  };
}

function saveStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify({ gifts, giftOrders, rsvps }, null, 2), "utf-8");
  } catch (e) {
    console.error("Erro ao salvar store.json:", e);
  }
}

const initialStore = loadStore();
let gifts = initialStore.gifts || [...defaultGifts];
let giftOrders = initialStore.giftOrders || [];
let rsvps = initialStore.rsvps || [
  { id: "sample-1", name: "Família Silva", attending: true, guests: 2, message: "Parabéns ao casal lindo! Nos vemos lá!", created_at: new Date(Date.now() - 3600000 * 24).toISOString() }
];

/* ---------------- Supabase Realtime & Persistence Bridge ---------------- */
const SUPABASE_URL = process.env.SUPABASE_URL || "https://sxivkbppdhzpelzfppud.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseHeaders() {
  if (!SUPABASE_KEY) return null;
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}

// Sincroniza presentes do Supabase com o store local
async function syncFromSupabase() {
  const headers = getSupabaseHeaders();
  if (!headers || !SUPABASE_URL) return;

  try {
    const [gRes, oRes, rRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/gifts?select=*`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${SUPABASE_URL}/rest/v1/gift_orders?select=*`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${SUPABASE_URL}/rest/v1/rsvps?select=*`, { headers }).then(r => r.json()).catch(() => null)
    ]);

    if (Array.isArray(gRes) && gRes.length > 0) {
      const sbMap = new Map();
      gRes.forEach(g => sbMap.set(g.id, g));
      gifts.forEach(g => {
        if (!sbMap.has(g.id)) {
          pushGiftToSupabase("create", g);
          sbMap.set(g.id, g);
        }
      });
      gifts = Array.from(sbMap.values()).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    if (Array.isArray(oRes) && oRes.length > 0) {
      const oMap = new Map();
      giftOrders.forEach(o => oMap.set(o.id, o));
      oRes.forEach(o => oMap.set(o.id, o));
      giftOrders = Array.from(oMap.values());
    }

    if (Array.isArray(rRes) && rRes.length > 0) {
      const rMap = new Map();
      rsvps.forEach(r => rMap.set(r.id, r));
      rRes.forEach(r => rMap.set(r.id, r));
      rsvps = Array.from(rMap.values());
    }

    saveStore();
  } catch (e) {
    console.error("[Supabase Bridge] Erro na sincronização inicial:", e.message);
  }
}

async function pushGiftToSupabase(action, gift) {
  const headers = getSupabaseHeaders();
  if (!headers || !SUPABASE_URL || !gift) return;

  try {
    if (action === "create" || action === "update") {
      const payload = {
        id: gift.id,
        name: gift.name,
        description: gift.description || "",
        price_cents: Number(gift.price_cents),
        unique_item: gift.unique_item ?? true,
        active: gift.active ?? true,
        sort_order: Number(gift.sort_order) || 0
      };
      await fetch(`${SUPABASE_URL}/rest/v1/gifts?on_conflict=id`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(payload)
      });
    } else if (action === "delete") {
      await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${encodeURIComponent(gift.id)}`, {
        method: "DELETE",
        headers
      });
    }
  } catch (e) {
    console.error("[Supabase Bridge] Erro ao sincronizar presente:", e.message);
  }
}

async function pushOrderToSupabase(order) {
  const headers = getSupabaseHeaders();
  if (!headers || !SUPABASE_URL || !order) return;
  try {
    const payload = {
      id: order.id,
      gift_id: order.gift_id,
      buyer_name: order.buyer_name,
      buyer_message: order.buyer_message || null,
      amount_cents: Number(order.amount_cents),
      payment_method: order.payment_method || "pix",
      status: order.status || "pending",
      stripe_session_id: order.stripe_session_id || null,
      created_at: order.created_at || new Date().toISOString()
    };
    await fetch(`${SUPABASE_URL}/rest/v1/gift_orders?on_conflict=id`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error("[Supabase Bridge] Erro ao sincronizar pedido:", e.message);
  }
}

async function pushRsvpToSupabase(rsvp) {
  const headers = getSupabaseHeaders();
  if (!headers || !SUPABASE_URL || !rsvp) return;
  try {
    const payload = {
      id: rsvp.id,
      name: rsvp.name,
      phone: rsvp.phone || null,
      attending: rsvp.attending,
      guests: Number(rsvp.guests) || 1,
      message: rsvp.message || null,
      created_at: rsvp.created_at || new Date().toISOString()
    };
    await fetch(`${SUPABASE_URL}/rest/v1/rsvps?on_conflict=id`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error("[Supabase Bridge] Erro ao sincronizar RSVP:", e.message);
  }
}

// Inicia sincronização
syncFromSupabase();

const ADMIN_CODE = process.env.ADMIN_CODE || "casamento2026";
const PIX_KEY = process.env.PIX_KEY || "gutenberg23@gmail.com";
const PIX_RECEIVER_NAME = process.env.PIX_RECEIVER_NAME || "Iasmin e Gutenberg";
const PIX_RECEIVER_CITY = process.env.PIX_RECEIVER_CITY || "Rio de Janeiro";

function checkAdminCode(inputCode) {
  if (!inputCode) return false;
  const cleanInput = String(inputCode).trim();
  if (cleanInput === "casamento2026" || cleanInput === "Gutoelement1!") return true;
  if (ADMIN_CODE && cleanInput === String(ADMIN_CODE).trim()) return true;
  return false;
}

// Favicon handler
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#c67c4e"/><path d="M50 72l-3.6-3.3C33.6 57.3 25 49.5 25 40c0-7.7 6.3-14 14-14 4.4 0 8.6 2 11 5.3 2.4-3.3 6.6-5.3 11-5.3 7.7 0 14 6.3 14 14 0 9.5-8.6 17.3-21.4 28.7L50 72z" fill="#fff"/></svg>`;

app.get(["/favicon.ico", "/favicon.svg"], (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(FAVICON_SVG);
});

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
    .filter(g => g.active !== false)
    .map(g => {
      // Find orders for this gift: prioritize approved > awaiting_confirmation > recent pending
      const giftMatchingOrders = giftOrders.filter(o => o.gift_id === g.id && o.status !== "rejected");
      
      const activeOrder = 
        giftMatchingOrders.find(o => o.status === "approved") ||
        giftMatchingOrders.find(o => o.status === "awaiting_confirmation") ||
        giftMatchingOrders.find(o => o.status === "pending" && (Date.now() - new Date(o.created_at).getTime() < 60 * 60 * 1000));

      return {
        ...g,
        order_id: activeOrder ? activeOrder.id : null,
        buyer_name: activeOrder ? activeOrder.buyer_name : null,
        order_status: activeOrder ? activeOrder.status : null,
        order_amount_cents: activeOrder ? activeOrder.amount_cents : null,
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
    has_stripe: Boolean(getStripeSecretKey()),
    pix_key: PIX_KEY,
    pix_receiver_name: PIX_RECEIVER_NAME,
    pix_receiver_city: PIX_RECEIVER_CITY,
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
  const { name, phone, attending, message } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Nome é obrigatório." });
  }

  const newRsvp = {
    id: `rsvp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    phone: phone ? String(phone).trim() : "",
    attending: attending === true || attending === "true" || attending === "sim",
    guests: 1,
    message: message ? String(message).trim() : null,
    created_at: new Date().toISOString(),
  };

  rsvps.unshift(newRsvp);
  saveStore();
  pushRsvpToSupabase(newRsvp);
  res.status(201).json(newRsvp);
});

// Gift Orders
app.get(["/api/orders", "/rest/v1/gift_orders"], (req, res) => {
  const list = giftOrders.map(o => {
    const gift = gifts.find(g => g.id === o.gift_id);
    return {
      ...o,
      gift_name: gift ? gift.name : o.gift_id,
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(list);
});

// Create Payment
app.post(["/api/create-payment", "/functions/v1/create-payment", "/.netlify/functions/create-payment"], async (req, res) => {
  try {
    const { gift_id, buyer_name, amount_cents, payment_method, buyer_message } = req.body;

    if (!gift_id || !buyer_name || !buyer_name.trim()) {
      return res.status(400).json({ error: "gift_id e buyer_name são obrigatórios." });
    }

    const gift = gifts.find(g => g.id === gift_id && g.active !== false);
    if (!gift) {
      return res.status(404).json({ error: "Presente não encontrado no catálogo." });
    }

    if (gift.unique_item) {
      const activeOrder = giftOrders.find(
        o => o.gift_id === gift_id && (o.status === "approved" || o.status === "awaiting_confirmation" || (o.status === "pending" && Date.now() - new Date(o.created_at).getTime() < 60 * 60 * 1000))
      );
      if (activeOrder) {
        return res.status(409).json({ error: "Esse presente já foi escolhido por outra pessoa e está aguardando confirmação ou já foi presenteado." });
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
      stripe_session_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const origin = req.headers.origin || `http://${req.headers.host || "localhost:3000"}`;
    const siteUrl = process.env.SITE_URL || origin;

    // 1. Pix Direto Instantâneo
    if (selectedMethod === "pix_direct") {
      const pixCode = generatePixPayload({
        key: PIX_KEY,
        name: PIX_RECEIVER_NAME,
        city: PIX_RECEIVER_CITY,
        amount: finalAmount / 100,
        txid: order.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20),
      });

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(pixCode)}`;

      giftOrders.unshift(order);
      saveStore();
      pushOrderToSupabase(order);
      return res.json({
        provider: "pix_direct",
        order_id: order.id,
        amount_cents: finalAmount,
        pix_code: pixCode,
        qr_code_url: qrCodeUrl,
      });
    }

    // 2. Stripe Checkout (Cartão de Crédito)
    if (selectedMethod === "card" || selectedMethod === "stripe") {
      const stripeKey = getStripeSecretKey();
      if (!stripeKey) {
        return res.status(400).json({
          error: "A chave STRIPE_SECRET_KEY não foi detectada no ambiente. Por favor, certifique-se de que a variável STRIPE_SECRET_KEY foi salva nas configurações.",
          stripe_missing: true,
        });
      }

      const stripeParams = new URLSearchParams();
      stripeParams.append("payment_method_types[]", "card");
      stripeParams.append("line_items[0][price_data][currency]", "brl");
      stripeParams.append("line_items[0][price_data][product_data][name]", `Presente: ${gift.name} — Casamento Iasmin & Gutenberg`);
      if (gift.description) {
        stripeParams.append("line_items[0][price_data][product_data][description]", gift.description.slice(0, 200));
      }
      stripeParams.append("line_items[0][price_data][unit_amount]", String(finalAmount));
      stripeParams.append("line_items[0][quantity]", "1");
      stripeParams.append("mode", "payment");
      stripeParams.append("client_reference_id", order.id);
      stripeParams.append("metadata[gift_id]", gift_id);
      stripeParams.append("metadata[buyer_name]", buyer_name);
      stripeParams.append("metadata[order_id]", order.id);
      if (buyer_message) {
        stripeParams.append("metadata[buyer_message]", buyer_message.slice(0, 400));
      }
      stripeParams.append("success_url", `${siteUrl}?pagamento=sucesso&presente=${encodeURIComponent(gift.name)}&order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`);
      stripeParams.append("cancel_url", `${siteUrl}?pagamento=cancelado&presente=${encodeURIComponent(gift.name)}`);

      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: stripeParams.toString(),
      });

      const stripeData = await stripeRes.json();
      if (!stripeRes.ok) {
        const msg = stripeData.error?.message || "Erro ao conectar com o Stripe.";
        return res.status(502).json({ error: msg, detail: stripeData });
      }

      order.stripe_session_id = stripeData.id;
      order.payment_method = "stripe";
      giftOrders.unshift(order);
      saveStore();
      pushOrderToSupabase(order);
      return res.json({ provider: "stripe", init_point: stripeData.url, order_id: order.id });
    }

    return res.status(400).json({ error: "Método de pagamento não suportado." });
  } catch (err) {
    return res.status(500).json({ error: "Erro inesperado.", detail: String(err) });
  }
});

// Status de configuração do Stripe
app.get(["/api/stripe-status", "/.netlify/functions/stripe-status"], (req, res) => {
  const key = getStripeSecretKey();
  return res.json({
    configured: Boolean(key),
    prefix: key ? `${key.substring(0, 7)}...` : null
  });
});

// Confirmação do Pix direto feita pelo convidado
app.post("/api/confirm-pix-order", (req, res) => {
  const { order_id, gift_id, buyer_name, amount_cents, buyer_message } = req.body;
  if (!order_id) {
    return res.status(400).json({ error: "order_id é obrigatório." });
  }

  let order = giftOrders.find(o => o.id === order_id);
  if (!order) {
    order = {
      id: order_id,
      gift_id: gift_id || "presente",
      buyer_name: buyer_name ? String(buyer_name).trim() : "Convidado",
      buyer_message: buyer_message ? String(buyer_message).trim() : null,
      amount_cents: Number(amount_cents) || 10000,
      payment_method: "pix_direct",
      status: "awaiting_confirmation",
      stripe_session_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    giftOrders.unshift(order);
  } else {
    order.status = "awaiting_confirmation";
    order.updated_at = new Date().toISOString();
    if (buyer_name) order.buyer_name = String(buyer_name).trim();
    if (buyer_message) order.buyer_message = String(buyer_message).trim();
  }

  saveStore();
  pushOrderToSupabase(order);

  return res.json({ success: true, order });
});

// Admin Orders Management (Alterar status de pedidos)
app.all(["/api/admin-orders", "/functions/v1/admin-orders"], (req, res) => {
  const code = req.body?.code || req.query?.code || req.headers["x-admin-code"];
  if (!checkAdminCode(code)) {
    return res.status(401).json({ error: "Código incorreto." });
  }

  const { order_id, status } = req.body;
  if (order_id && status) {
    const order = giftOrders.find(o => o.id === order_id);
    if (order) {
      order.status = status;
      order.updated_at = new Date().toISOString();
      saveStore();
      pushOrderToSupabase(order);
    }
  }

  const list = giftOrders.map(o => {
    const gift = gifts.find(g => g.id === o.gift_id);
    return {
      ...o,
      gift_name: gift ? gift.name : o.gift_id,
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return res.json({ success: true, orders: list });
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
          saveStore();
          pushOrderToSupabase(order);
        }
      }
    }
    return res.json({ received: true });
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Admin Gifts Endpoint
app.all(["/api/admin-gifts", "/functions/v1/admin-gifts"], async (req, res) => {
  try {
    const code = req.body?.code || req.query?.code || req.headers["x-admin-code"];
    const action = req.body?.action || req.query?.action || (req.method === "GET" ? "list" : "list");
    const gift = req.body?.gift || req.body;

    if (!checkAdminCode(code)) {
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
        price_cents: Number(gift.price_cents),
        category: gift.category || "Casa",
        unique_item: gift.unique_item ?? true,
        active: gift.active ?? true,
        sort_order: Number(gift.sort_order) || (gifts.length + 1),
        created_at: new Date().toISOString(),
      };

      gifts.push(newGift);
      saveStore();
      await pushGiftToSupabase("create", newGift);
      const sorted = [...gifts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return res.json({ gifts: sorted });
    }

    if (action === "update") {
      if (!gift?.id) return res.status(400).json({ error: "Presente não identificado." });
      const idx = gifts.findIndex(g => g.id === gift.id);
      if (idx === -1) return res.status(404).json({ error: "Presente não encontrado." });

      gifts[idx] = { ...gifts[idx], ...gift };
      if (gift.price_cents) gifts[idx].price_cents = Number(gift.price_cents);
      saveStore();
      await pushGiftToSupabase("update", gifts[idx]);
      const sorted = [...gifts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return res.json({ gifts: sorted });
    }

    if (action === "delete") {
      if (!gift?.id) return res.status(400).json({ error: "Presente não identificado." });
      const targetId = gift.id;
      gifts = gifts.filter(g => g.id !== targetId);
      saveStore();
      await pushGiftToSupabase("delete", { id: targetId });
      const sorted = [...gifts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return res.json({ gifts: sorted });
    }

    return res.status(400).json({ error: "Ação inválida." });
  } catch (err) {
    return res.status(500).json({ error: "Erro inesperado.", detail: String(err) });
  }
});

// Vite Middleware Integration (Dev & Production)
async function setupViteOrStatic() {
  const isProd = process.env.NODE_ENV === "production" && fs.existsSync(path.join(__dirname, "dist", "index.html"));

  if (!isProd) {
    console.log("[Server] Inicializando Vite em modo integrado SPA...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Servindo build estático de /dist...");
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Convite de Casamento rodando perfeitamente em http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic().catch(err => {
  console.error("Falha ao iniciar servidor:", err);
});
