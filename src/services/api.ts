import { Gift, GiftOrder, Rsvp } from '../types';

const LOCAL_STORAGE_KEY_GIFTS = 'iasmin_gutenberg_gifts_v4';
const LOCAL_STORAGE_KEY_RSVPS = 'iasmin_gutenberg_rsvps_v4';
const LOCAL_STORAGE_KEY_ORDERS = 'iasmin_gutenberg_orders_v4';

export const defaultCatalog: Gift[] = [
  { id: 'panelas', name: 'Jogo de panelas', description: 'Um conjunto bom, dos que duram anos.', price_cents: 35000, unique_item: true, active: true, sort_order: 1, category: 'Cozinha' },
  { id: 'airfryer', name: 'Air fryer', description: 'Pra facilitar o dia a dia na cozinha nova.', price_cents: 45000, unique_item: true, active: true, sort_order: 2, category: 'Eletros' },
  { id: 'liquidificador', name: 'Liquidificador', description: 'Vitamina de manhã não pode faltar.', price_cents: 22000, unique_item: true, active: true, sort_order: 3, category: 'Eletros' },
  { id: 'cafeteira', name: 'Cafeteira', description: 'Café fresquinho todo santo dia.', price_cents: 28000, unique_item: true, active: true, sort_order: 4, category: 'Cozinha' },
  { id: 'jogocama', name: 'Jogo de cama casal', description: 'Lençol bom pra dormir bem.', price_cents: 25000, unique_item: true, active: true, sort_order: 5, category: 'Quarto' },
  { id: 'toalhas', name: 'Jogo de toalhas', description: 'Pro banheiro novo ficar completo.', price_cents: 18000, unique_item: true, active: true, sort_order: 6, category: 'Banho' },
  { id: 'aspirador', name: 'Robô aspirador', description: 'Aquele mimo que ninguém se arrepende de dar.', price_cents: 90000, unique_item: true, active: true, sort_order: 7, category: 'Casa' },
  { id: 'churrasco', name: 'Kit churrasco', description: 'Pra receber a família no fim de semana.', price_cents: 20000, unique_item: true, active: true, sort_order: 8, category: 'Lazer' },
  { id: 'luademel', name: 'Cota lua de mel', description: 'Contribua com o valor que quiser pra nossa viagem.', price_cents: 10000, unique_item: false, active: true, sort_order: 9, category: 'Lua de Mel' }
];

export function getLocalGifts(): Gift[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_GIFTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return defaultCatalog;
}

export function saveLocalGifts(gifts: Gift[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_GIFTS, JSON.stringify(gifts));
  } catch {}
}

export function getLocalRsvps(): Rsvp[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_RSVPS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    { id: 'sample-1', name: 'Mariana Silva', phone: '(21) 98888-7777', attending: true, guests: 1, message: 'Parabéns ao casal lindo! Estarei lá com certeza!', created_at: new Date(Date.now() - 86400000).toISOString() }
  ];
}

export function saveLocalRsvps(rsvps: Rsvp[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_RSVPS, JSON.stringify(rsvps));
  } catch {}
}

export function getLocalOrders(): GiftOrder[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ORDERS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveLocalOrders(orders: GiftOrder[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(orders));
  } catch {}
}

// Service methods
export async function fetchGifts(): Promise<Gift[]> {
  try {
    const res = await fetch('/api/gifts', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveLocalGifts(data);
        return data;
      }
    }
  } catch (e) {
    console.warn('API /api/gifts indisponível, usando cache local:', e);
  }
  return getLocalGifts();
}

export async function fetchRsvps(): Promise<Rsvp[]> {
  try {
    const res = await fetch('/api/rsvps', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        saveLocalRsvps(data);
        return data;
      }
    }
  } catch (e) {
    console.warn('API /api/rsvps indisponível, usando cache local:', e);
  }
  return getLocalRsvps();
}

export async function submitRsvp(payload: { name: string; phone: string; attending: boolean; message?: string }): Promise<Rsvp> {
  const newRsvp: Rsvp = {
    id: `rsvp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    attending: payload.attending,
    guests: 1,
    message: payload.message?.trim() || null,
    created_at: new Date().toISOString()
  };

  try {
    const res = await fetch('/api/rsvps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRsvp)
    });
    if (res.ok) {
      const data = await res.json();
      const list = getLocalRsvps();
      list.unshift(data || newRsvp);
      saveLocalRsvps(list);
      return data || newRsvp;
    }
  } catch (e) {
    console.warn('Fallback salvando RSVP localmente:', e);
  }

  const list = getLocalRsvps();
  list.unshift(newRsvp);
  saveLocalRsvps(list);
  return newRsvp;
}

export async function fetchOrders(): Promise<GiftOrder[]> {
  try {
    const res = await fetch('/api/orders', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        saveLocalOrders(data);
        return data;
      }
    }
  } catch (e) {
    console.warn('API /api/orders indisponível, usando cache local:', e);
  }
  return getLocalOrders();
}

export async function createPayment(params: {
  gift_id: string;
  buyer_name: string;
  amount_cents: number;
  payment_method: 'card' | 'pix_direct' | string;
  buyer_message?: string;
}): Promise<{ provider: string; init_point?: string; order_id: string; pix_code?: string; qr_code_url?: string; error?: string }> {
  const routes = ['/api/create-payment', '/.netlify/functions/create-payment'];
  let lastError = '';

  for (const route of routes) {
    try {
      const res = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && (data.init_point || data.provider || data.order_id)) {
        return data;
      }
      if (data?.error) {
        lastError = data.error;
      }
    } catch (e: any) {
      lastError = e?.message || 'Erro de conexão';
    }
  }

  throw new Error(lastError || 'Não foi possível iniciar o pagamento.');
}

export async function confirmPixOrder(
  orderId: string,
  giftId: string,
  buyerName: string,
  amountCents: number,
  buyerMessage?: string
): Promise<GiftOrder> {
  const order: GiftOrder = {
    id: orderId,
    gift_id: giftId,
    buyer_name: buyerName.trim(),
    buyer_message: buyerMessage?.trim() || null,
    amount_cents: amountCents,
    payment_method: 'pix_direct',
    status: 'awaiting_confirmation',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const res = await fetch('/api/confirm-pix-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        gift_id: giftId,
        buyer_name: buyerName.trim(),
        amount_cents: amountCents,
        buyer_message: buyerMessage?.trim() || null
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.order) {
        Object.assign(order, data.order);
      }
    }
  } catch (e) {
    console.warn('Erro ao chamar /api/confirm-pix-order:', e);
  }

  // Atualiza pedidos no cache local
  const orders = getLocalOrders();
  const existingIdx = orders.findIndex(o => o.id === orderId);
  if (existingIdx >= 0) {
    orders[existingIdx] = { ...orders[existingIdx], ...order, status: 'awaiting_confirmation' };
  } else {
    orders.unshift(order);
  }
  saveLocalOrders(orders);

  // Atualiza status do presente no cache local
  const gifts = getLocalGifts();
  const giftIndex = gifts.findIndex(g => g.id === giftId);
  if (giftIndex !== -1) {
    if (gifts[giftIndex].unique_item) {
      gifts[giftIndex].order_status = 'awaiting_confirmation';
      gifts[giftIndex].buyer_name = buyerName.trim();
      gifts[giftIndex].order_id = orderId;
      saveLocalGifts(gifts);
    }
  }

  return order;
}

export interface PaymentGatewayStatus {
  configured: boolean;
  prefix?: string | null;
  primary_provider?: 'mercadopago' | 'stripe' | null;
  stripe?: {
    configured: boolean;
    prefix?: string | null;
  };
  mercadopago?: {
    configured: boolean;
    prefix?: string | null;
    is_test?: boolean;
    public_key_configured?: boolean;
  };
}

export async function checkStripeStatus(): Promise<PaymentGatewayStatus> {
  const routes = ['/api/payment-status', '/api/stripe-status', '/.netlify/functions/stripe-status'];
  for (const r of routes) {
    try {
      const res = await fetch(r);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
  }
  return { configured: false };
}

export async function adminUpdateOrderStatus(
  code: string,
  orderId: string,
  status: 'approved' | 'rejected' | 'pending' | 'awaiting_confirmation'
): Promise<GiftOrder[]> {
  const cleanCode = code.trim();
  let updatedOrders: GiftOrder[] = [];

  try {
    const res = await fetch('/api/admin-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-code': cleanCode
      },
      body: JSON.stringify({ code: cleanCode, order_id: orderId, status })
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.orders)) {
        updatedOrders = data.orders;
        saveLocalOrders(data.orders);
      }
    }
  } catch {}

  if (updatedOrders.length === 0) {
    const orders = getLocalOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx >= 0) {
      orders[idx].status = status;
      orders[idx].updated_at = new Date().toISOString();
      saveLocalOrders(orders);
    }
    updatedOrders = orders;
  }

  // Sincroniza o presente correspondente no cache local
  const targetOrder = updatedOrders.find(o => o.id === orderId);
  if (targetOrder) {
    const gifts = getLocalGifts();
    const gIdx = gifts.findIndex(g => g.id === targetOrder.gift_id);
    if (gIdx >= 0 && gifts[gIdx].unique_item) {
      if (status === 'rejected') {
        // Se foi rejeitado/cancelado, libera o presente para novos compradores
        gifts[gIdx].order_status = null;
        gifts[gIdx].buyer_name = null;
        gifts[gIdx].order_id = null;
      } else if (status === 'approved') {
        gifts[gIdx].order_status = 'approved';
        gifts[gIdx].buyer_name = targetOrder.buyer_name;
        gifts[gIdx].order_id = targetOrder.id;
      } else if (status === 'awaiting_confirmation' || status === 'pending') {
        gifts[gIdx].order_status = 'awaiting_confirmation';
        gifts[gIdx].buyer_name = targetOrder.buyer_name;
        gifts[gIdx].order_id = targetOrder.id;
      }
      saveLocalGifts(gifts);
    }
  }

  return updatedOrders;
}

export async function adminGiftsAction(code: string, action: 'list' | 'create' | 'update' | 'delete', gift?: Partial<Gift>): Promise<Gift[]> {
  const cleanCode = code.trim();
  try {
    const res = await fetch('/api/admin-gifts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-code': cleanCode
      },
      body: JSON.stringify({ code: cleanCode, action, gift })
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.gifts) {
        saveLocalGifts(data.gifts);
        return data.gifts;
      }
    } else {
      const data = await res.json().catch(() => null);
      if (data?.error) throw new Error(data.error);
    }
  } catch (e: any) {
    if (e.message && e.message.includes('Código')) {
      throw e;
    }
  }

  // Local fallback admin
  if (cleanCode !== 'casamento2026' && cleanCode !== 'Gutoelement1!') {
    throw new Error('Código incorreto.');
  }

  let gifts = [...getLocalGifts()];
  if (action === 'list') return gifts;
  if (action === 'create' && gift) {
    const newG: Gift = {
      id: gift.name ? gift.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 5) : 'gift-' + Date.now(),
      name: gift.name || 'Novo Presente',
      description: gift.description || '',
      price_cents: Number(gift.price_cents) || 10000,
      unique_item: gift.unique_item ?? true,
      active: gift.active ?? true,
      sort_order: Number(gift.sort_order) || gifts.length + 1,
      category: gift.category || 'Casa'
    };
    gifts.push(newG);
  } else if (action === 'update' && gift && gift.id) {
    gifts = gifts.map(g => (g.id === gift.id ? { ...g, ...gift } : g));
  } else if (action === 'delete' && gift && gift.id) {
    gifts = gifts.filter(g => g.id !== gift.id);
  }
  saveLocalGifts(gifts);
  return gifts;
}
