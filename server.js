import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
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

function getMercadoPagoAccessToken() {
  const possibleKeys = [
    process.env.MERCADO_PAGO_ACCESS_TOKEN,
    process.env.MERCADOPAGO_ACCESS_TOKEN,
    process.env.MP_ACCESS_TOKEN,
    process.env.MERCADO_PAGO_TOKEN,
    process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN
  ];

  for (let key of possibleKeys) {
    if (key && typeof key === "string") {
      let cleaned = key.trim();
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      if (cleaned.length > 5) {
        return cleaned;
      }
    }
  }
  return null;
}

function getMercadoPagoPublicKey() {
  const possibleKeys = [
    process.env.MERCADO_PAGO_PUBLIC_KEY,
    process.env.MERCADOPAGO_PUBLIC_KEY,
    process.env.MP_PUBLIC_KEY,
    process.env.VITE_MERCADO_PAGO_PUBLIC_KEY
  ];

  for (let key of possibleKeys) {
    if (key && typeof key === "string") {
      let cleaned = key.trim();
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      if (cleaned.length > 5) {
        return cleaned;
      }
    }
  }
  return null;
}

// In-memory data store strictly populated from Supabase database
const defaultGifts = [];

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
    gifts: [],
    giftOrders: [],
    rsvps: []
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
let gifts = initialStore.gifts || [];
let giftOrders = initialStore.giftOrders || [];
let rsvps = initialStore.rsvps || [];

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

function ensureUUID(id) {
  if (id && typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return crypto.randomUUID();
}

// Sincroniza presentes e dados exclusivamente a partir do Supabase
async function syncFromSupabase() {
  const headers = getSupabaseHeaders();
  if (!headers || !SUPABASE_URL) return;

  try {
    const [gRes, oRes, rRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/gifts?select=*`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${SUPABASE_URL}/rest/v1/gift_orders?select=*`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${SUPABASE_URL}/rest/v1/rsvps?select=*`, { headers }).then(r => r.json()).catch(() => null)
    ]);

    if (Array.isArray(gRes)) {
      gifts = gRes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    if (Array.isArray(oRes)) {
      giftOrders = oRes;
    }

    if (Array.isArray(rRes)) {
      rsvps = rRes.map(r => {
        let phone = r.phone || "";
        let cleanMessage = r.message || null;
        if (!phone && cleanMessage && cleanMessage.includes("[WhatsApp:")) {
          const match = cleanMessage.match(/\[WhatsApp:\s*([^\]]+)\]/);
          if (match) {
            phone = match[1].trim();
            cleanMessage = cleanMessage.replace(/\[WhatsApp:\s*[^\]]+\]\s*/, "").trim() || null;
          }
        }
        return {
          id: String(r.id),
          name: String(r.name || ""),
          phone,
          attending: Boolean(r.attending),
          guests: Number(r.guests) || 1,
          message: cleanMessage,
          created_at: r.created_at || new Date().toISOString()
        };
      });
    }

    saveStore();
  } catch (e) {
    console.error("[Supabase Bridge] Erro na sincronização com Supabase:", e.message);
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
        sort_order: Number(gift.sort_order) || 0,
        category: gift.category || "Casa"
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
  const orderId = ensureUUID(order.id);
  order.id = orderId;
  try {
    const fullPayload = {
      id: orderId,
      gift_id: order.gift_id,
      buyer_name: order.buyer_name,
      buyer_message: order.buyer_message || null,
      amount_cents: Number(order.amount_cents),
      payment_method: order.payment_method || "pix_direct",
      status: order.status || "pending",
      stripe_session_id: order.stripe_session_id || null,
      created_at: order.created_at || new Date().toISOString(),
      updated_at: order.updated_at || new Date().toISOString()
    };
    let res = await fetch(`${SUPABASE_URL}/rest/v1/gift_orders?on_conflict=id`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(fullPayload)
    });
    if (!res.ok) {
      // Retry with baseline columns supported by the current Supabase schema
      const basePayload = {
        id: orderId,
        gift_id: order.gift_id,
        buyer_name: order.buyer_name,
        amount_cents: Number(order.amount_cents),
        status: order.status || "pending",
        created_at: order.created_at || new Date().toISOString(),
        updated_at: order.updated_at || new Date().toISOString()
      };
      res = await fetch(`${SUPABASE_URL}/rest/v1/gift_orders?on_conflict=id`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(basePayload)
      });
      if (!res.ok) {
        console.error("[Supabase Bridge] Erro ao sincronizar pedido:", res.status, await res.text());
      } else {
        console.log("[Supabase Bridge] Pedido salvo com sucesso no Supabase (baseline):", orderId);
      }
    } else {
      console.log("[Supabase Bridge] Pedido salvo com sucesso no Supabase (full):", orderId);
    }
  } catch (e) {
    console.error("[Supabase Bridge] Erro ao sincronizar pedido:", e.message);
  }
}

async function pushRsvpToSupabase(rsvp) {
  const headers = getSupabaseHeaders();
  if (!headers || !SUPABASE_URL || !rsvp) return;
  const rsvpId = ensureUUID(rsvp.id);
  rsvp.id = rsvpId;
  const cleanPhone = rsvp.phone ? String(rsvp.phone).trim() : "";
  const userMsg = rsvp.message ? String(rsvp.message).trim() : "";

  try {
    const fullPayload = {
      id: rsvpId,
      name: rsvp.name,
      phone: cleanPhone || null,
      attending: Boolean(rsvp.attending),
      guests: Number(rsvp.guests) || 1,
      message: userMsg || null,
      created_at: rsvp.created_at || new Date().toISOString()
    };
    let res = await fetch(`${SUPABASE_URL}/rest/v1/rsvps?on_conflict=id`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(fullPayload)
    });
    if (!res.ok) {
      // Fallback: embed phone in message if phone column doesn't exist yet
      let combinedMessage = userMsg;
      if (cleanPhone) {
        combinedMessage = combinedMessage
          ? `[WhatsApp: ${cleanPhone}] ${combinedMessage}`
          : `[WhatsApp: ${cleanPhone}]`;
      }
      const fallbackPayload = {
        id: rsvpId,
        name: rsvp.name,
        attending: Boolean(rsvp.attending),
        guests: Number(rsvp.guests) || 1,
        message: combinedMessage || null,
        created_at: rsvp.created_at || new Date().toISOString()
      };
      res = await fetch(`${SUPABASE_URL}/rest/v1/rsvps?on_conflict=id`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(fallbackPayload)
      });
      if (!res.ok) {
        console.error("[Supabase Bridge] Erro ao sincronizar RSVP:", res.status, await res.text());
      } else {
        console.log("[Supabase Bridge] RSVP salvo com sucesso no Supabase (fallback):", rsvpId);
      }
    } else {
      console.log("[Supabase Bridge] RSVP salvo com sucesso no Supabase (full):", rsvpId);
    }
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

// Favicon handler - matching the logo heart icon (Lucide Heart, terracotta with 40% fill)
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="none"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" fill="rgba(198, 124, 78, 0.4)" stroke="#C67C4E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

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
      const gId = String(g.id || '').trim().toLowerCase();
      const gName = String(g.name || '').trim().toLowerCase();

      // Find orders for this gift: prioritize approved > awaiting_confirmation > recent pending
      const giftMatchingOrders = giftOrders.filter(o => {
        if (!o || o.status === "rejected" || !o.gift_id) return false;
        const oGId = String(o.gift_id).trim().toLowerCase();
        return oGId === gId || oGId === gName;
      });
      
      const activeOrder = 
        giftMatchingOrders.find(o => o.status === "approved") ||
        giftMatchingOrders.find(o => o.status === "awaiting_confirmation") ||
        giftMatchingOrders.find(o => o.status === "pending" && (Date.now() - new Date(o.created_at).getTime() < 60 * 60 * 1000));

      const contributors = giftMatchingOrders.map(o => ({
        id: o.id,
        buyer_name: o.buyer_name,
        buyer_message: o.buyer_message,
        amount_cents: o.amount_cents,
        status: o.status,
        created_at: o.created_at
      }));

      return {
        ...g,
        order_id: activeOrder ? activeOrder.id : null,
        buyer_name: activeOrder ? activeOrder.buyer_name : null,
        order_status: activeOrder ? activeOrder.status : null,
        order_amount_cents: activeOrder ? activeOrder.amount_cents : null,
        payment_method: activeOrder ? activeOrder.payment_method : null,
        contributors,
        contributors_count: contributors.length
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
app.get(["/api/gifts", "/rest/v1/gifts", "/rest/v1/gift_status"], async (req, res) => {
  try {
    await syncFromSupabase();
  } catch (e) {}
  res.json(getGiftStatusList());
});

// RSVPs
app.get(["/api/rsvps", "/rest/v1/rsvps"], async (req, res) => {
  try {
    await syncFromSupabase();
  } catch (e) {}
  const sorted = [...rsvps].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(sorted);
});

app.post(["/api/rsvps", "/rest/v1/rsvps"], (req, res) => {
  const { name, phone, attending, message } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Nome é obrigatório." });
  }

  const cleanPhone = phone ? String(phone).trim() : "";
  const userMsg = message ? String(message).trim() : null;

  const id = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "a" + Math.random().toString(36).substring(2, 10) + "-0000-4000-a000-" + Math.random().toString(36).substring(2, 14);

  const newRsvp = {
    id,
    name: name.trim(),
    phone: cleanPhone,
    attending: attending === true || attending === "true" || attending === "sim",
    guests: 1,
    message: userMsg,
    created_at: new Date().toISOString(),
  };

  rsvps.unshift(newRsvp);
  saveStore();
  pushRsvpToSupabase(newRsvp);
  res.status(201).json(newRsvp);
});

app.delete(["/api/rsvps/:id", "/api/rsvps"], async (req, res) => {
  const id = req.params.id || req.body?.id || req.query?.id;
  if (!id) {
    return res.status(400).json({ error: "ID obrigatório." });
  }

  rsvps = rsvps.filter(r => String(r.id) !== String(id));
  saveStore();

  const headers = getSupabaseHeaders();
  if (headers && SUPABASE_URL) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rsvps?id=eq.${id}`, {
        method: "DELETE",
        headers
      });
    } catch (e) {
      console.warn("[Supabase Bridge] Erro ao deletar RSVP:", e.message);
    }
  }

  res.json({ ok: true, id });
});

// Gift Orders
app.get(["/api/orders", "/rest/v1/gift_orders"], async (req, res) => {
  try {
    await syncFromSupabase();
  } catch (e) {}
  const list = giftOrders.map(o => {
    const oGId = String(o.gift_id || '').trim().toLowerCase();
    const gift = gifts.find(g => {
      const gId = String(g.id || '').trim().toLowerCase();
      const gName = String(g.name || '').trim().toLowerCase();
      return gId === oGId || gName === oGId;
    });
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

    const orderId = ensureUUID(req.body?.order_id);
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

    // 2. Mercado Pago Checkout Pro (Cartão de Crédito em até 12x / Parcelamento)
    if (selectedMethod === "mercadopago" || (selectedMethod === "card" && getMercadoPagoAccessToken())) {
      const mpToken = getMercadoPagoAccessToken();
      if (!mpToken) {
        return res.status(400).json({
          error: "O Token de Acesso do Mercado Pago (MERCADO_PAGO_ACCESS_TOKEN) não foi detectado no ambiente.",
          mercadopago_missing: true,
        });
      }

      const mpBody = {
        items: [
          {
            id: gift.id,
            title: `Presente: ${gift.name} — Casamento Iasmin & Gutenberg`,
            description: (gift.description || "Presente de casamento").slice(0, 200),
            quantity: 1,
            unit_price: Number((finalAmount / 100).toFixed(2)),
            currency_id: "BRL",
          },
        ],
        payer: {
          name: buyer_name.trim(),
        },
        external_reference: order.id,
        metadata: {
          gift_id: gift.id,
          order_id: order.id,
          buyer_name: buyer_name.trim(),
          buyer_message: buyer_message ? String(buyer_message).trim() : "",
        },
        payment_methods: {
          installments: 12,
        },
        back_urls: {
          success: `${siteUrl}?pagamento=sucesso&presente=${encodeURIComponent(gift.name)}&order_id=${order.id}`,
          pending: `${siteUrl}?pagamento=pendente&presente=${encodeURIComponent(gift.name)}&order_id=${order.id}`,
          failure: `${siteUrl}?pagamento=cancelado&presente=${encodeURIComponent(gift.name)}`,
        },
        auto_return: "approved",
        statement_descriptor: "CASAMENTO I&G",
      };

      const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mpToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mpBody),
      });

      const mpData = await mpRes.json();
      if (!mpRes.ok) {
        const msg = mpData.message || mpData.error || "Erro ao conectar com a API do Mercado Pago.";
        return res.status(502).json({ error: msg, detail: mpData });
      }

      const checkoutUrl = mpData.init_point || mpData.sandbox_init_point;
      order.payment_method = "mercadopago";
      order.stripe_session_id = mpData.id;
      giftOrders.unshift(order);
      saveStore();
      pushOrderToSupabase(order);
      return res.json({
        provider: "mercadopago",
        init_point: checkoutUrl,
        order_id: order.id,
        preference_id: mpData.id,
      });
    }

    // 3. Stripe Checkout (Cartão de Crédito)
    if (selectedMethod === "card" || selectedMethod === "stripe") {
      const stripeKey = getStripeSecretKey();
      if (!stripeKey) {
        return res.status(400).json({
          error: "Nem a chave do Mercado Pago (MERCADO_PAGO_ACCESS_TOKEN) nem a do Stripe (STRIPE_SECRET_KEY) foram detectadas no ambiente. Salve ao menos uma delas nas configurações.",
          stripe_missing: true,
          mercadopago_missing: true,
        });
      }

      const stripeParams = new URLSearchParams();
      stripeParams.append("payment_method_types[]", "card");
      stripeParams.append("payment_method_options[card][installments][enabled]", "true");
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

// Status de configuração de gateways de pagamento
app.get(["/api/payment-status", "/api/stripe-status", "/.netlify/functions/stripe-status", "/.netlify/functions/payment-status"], (req, res) => {
  const stripeKey = getStripeSecretKey();
  const mpToken = getMercadoPagoAccessToken();
  const mpPublicKey = getMercadoPagoPublicKey();

  return res.json({
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
    prefix: mpToken ? `${mpToken.substring(0, 8)}...` : (stripeKey ? `${stripeKey.substring(0, 7)}...` : null)
  });
});

// Confirmação do Pix direto feita pelo convidado
app.post("/api/confirm-pix-order", (req, res) => {
  const { order_id, gift_id, buyer_name, amount_cents, buyer_message } = req.body;
  const validOrderId = ensureUUID(order_id);

  let order = giftOrders.find(o => o.id === validOrderId || o.id === order_id);
  const matchedGift = gifts.find(g => g.id === gift_id || g.name === gift_id);
  const resolvedAmount = (amount_cents !== undefined && !isNaN(Number(amount_cents)) && Number(amount_cents) > 0)
    ? Number(amount_cents)
    : (matchedGift ? matchedGift.price_cents : 1000);

  if (!order) {
    order = {
      id: validOrderId,
      gift_id: matchedGift ? matchedGift.id : (gift_id || "presente"),
      buyer_name: buyer_name ? String(buyer_name).trim() : "Convidado",
      buyer_message: buyer_message ? String(buyer_message).trim() : null,
      amount_cents: resolvedAmount,
      payment_method: "pix_direct",
      status: "awaiting_confirmation",
      stripe_session_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    giftOrders.unshift(order);
  } else {
    order.id = validOrderId;
    order.status = "awaiting_confirmation";
    order.updated_at = new Date().toISOString();
    if (amount_cents && Number(amount_cents) > 0) {
      order.amount_cents = Number(amount_cents);
    } else if (matchedGift && (!order.amount_cents || order.amount_cents === 10000)) {
      order.amount_cents = matchedGift.price_cents;
    }
    if (buyer_name) order.buyer_name = String(buyer_name).trim();
    if (buyer_message) order.buyer_message = String(buyer_message).trim();
  }

  saveStore();
  pushOrderToSupabase(order);

  return res.json({ success: true, order });
});

// Confirmação/Verificação de pedido de cartão (Stripe / Mercado Pago) chamado após redirecionamento de sucesso
app.post("/api/confirm-card-order", async (req, res) => {
  const { order_id, session_id, payment_id, gift_name } = req.body;
  if (!order_id && !session_id && !payment_id) {
    return res.status(400).json({ error: "Identificador do pedido ou sessão é obrigatório." });
  }

  const validOrderId = ensureUUID(order_id);
  let order = giftOrders.find(o => o.id === validOrderId || o.id === order_id || (session_id && o.stripe_session_id === session_id));

  // Se não foi encontrado pelo ID mas veio gift_name e order_id, tenta localizar por nome ou cria se necessário
  if (!order && order_id) {
    let matchedGift = gifts.find(g => g.id === order_id || g.name === gift_name || g.id === gift_name);
    order = {
      id: validOrderId,
      gift_id: matchedGift ? matchedGift.id : (gift_name || "presente"),
      buyer_name: "Convidado",
      buyer_message: null,
      amount_cents: matchedGift ? matchedGift.price_cents : 1000,
      payment_method: session_id ? "stripe" : "card",
      status: "approved",
      stripe_session_id: session_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    giftOrders.unshift(order);
  } else if (order) {
    order.id = validOrderId;
    order.status = "approved";
    order.updated_at = new Date().toISOString();
    if (session_id && !order.stripe_session_id) {
      order.stripe_session_id = session_id;
    }
  }

  if (order) {
    saveStore();
    await pushOrderToSupabase(order);
  }

  return res.json({ success: true, order });
});

// Admin Orders Management (Alterar status ou valor de pedidos)
app.all(["/api/admin-orders", "/functions/v1/admin-orders"], (req, res) => {
  const code = req.body?.code || req.query?.code || req.headers["x-admin-code"];
  if (!checkAdminCode(code)) {
    return res.status(401).json({ error: "Código incorreto." });
  }

  const { order_id, status, amount_cents } = req.body;
  if (order_id) {
    const order = giftOrders.find(o => o.id === order_id);
    if (order) {
      if (status) order.status = status;
      if (amount_cents !== undefined && !isNaN(Number(amount_cents)) && Number(amount_cents) > 0) {
        order.amount_cents = Number(amount_cents);
      }
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

// Mercado Pago Webhook / IPN
app.all(["/api/mercadopago-webhook", "/api/mp-webhook"], async (req, res) => {
  try {
    const topic = req.query.topic || req.query.type || req.body?.type || req.body?.action;
    const paymentId = req.query.id || req.query["data.id"] || req.body?.data?.id || req.body?.id;
    const mpAccessToken = getMercadoPagoAccessToken();

    if ((topic === "payment" || topic === "payment.created" || topic === "payment.updated") && paymentId && mpAccessToken) {
      const pRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
        },
      });

      if (pRes.ok) {
        const paymentData = await pRes.json();
        const externalRef = paymentData.external_reference;
        const status = paymentData.status;

        if (externalRef) {
          const order = giftOrders.find(o => o.id === externalRef);
          if (order) {
            if (status === "approved") {
              order.status = "approved";
            } else if (status === "rejected" || status === "cancelled") {
              order.status = "rejected";
            }
            order.updated_at = new Date().toISOString();
            saveStore();
            pushOrderToSupabase(order);
          }
        }
      }
    }
    return res.json({ received: true });
  } catch (err) {
    console.error("Erro webhook Mercado Pago:", err);
    return res.status(200).json({ received: true, error: err.message });
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
        name: String(gift.name).trim(),
        description: gift.description ? String(gift.description).trim() : "",
        price_cents: Number(gift.price_cents) > 0 ? Number(gift.price_cents) : 1000,
        category: gift.category ? String(gift.category) : "Casa",
        unique_item: gift.unique_item !== false,
        active: gift.active !== false,
        sort_order: Number(gift.sort_order) || (gifts.length + 1),
        created_at: new Date().toISOString(),
      };

      gifts.push(newGift);
      saveStore();
      await pushGiftToSupabase("create", newGift);
      const sorted = [...gifts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return res.json({ success: true, gifts: sorted });
    }

    if (action === "update") {
      if (!gift?.id) return res.status(400).json({ error: "Presente não identificado." });
      const idx = gifts.findIndex(g => g.id === gift.id);
      if (idx === -1) return res.status(404).json({ error: "Presente não encontrado." });

      gifts[idx] = {
        ...gifts[idx],
        ...gift,
        name: gift.name !== undefined ? String(gift.name).trim() : gifts[idx].name,
        description: gift.description !== undefined ? String(gift.description).trim() : (gifts[idx].description || ""),
        price_cents: gift.price_cents !== undefined ? Number(gift.price_cents) : gifts[idx].price_cents,
        category: gift.category !== undefined ? String(gift.category) : (gifts[idx].category || "Casa"),
        unique_item: gift.unique_item !== undefined ? Boolean(gift.unique_item) : (gifts[idx].unique_item !== false),
        active: gift.active !== undefined ? Boolean(gift.active) : (gifts[idx].active !== false),
        sort_order: gift.sort_order !== undefined ? (Number(gift.sort_order) || 0) : (gifts[idx].sort_order || 0),
        updated_at: new Date().toISOString()
      };
      saveStore();
      await pushGiftToSupabase("update", gifts[idx]);
      const sorted = [...gifts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return res.json({ success: true, gifts: sorted });
    }

    if (action === "delete") {
      if (!gift?.id) return res.status(400).json({ error: "Presente não identificado." });
      const targetId = gift.id;
      gifts = gifts.filter(g => g.id !== targetId);
      saveStore();
      await pushGiftToSupabase("delete", { id: targetId });
      const sorted = [...gifts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return res.json({ success: true, gifts: sorted });
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
