import { Gift, GiftOrder, Rsvp } from '../types';

const LOCAL_STORAGE_KEY_GIFTS = 'iasmin_gutenberg_gifts_v5';
const LOCAL_STORAGE_KEY_RSVPS = 'iasmin_gutenberg_rsvps_v5';
const LOCAL_STORAGE_KEY_ORDERS = 'iasmin_gutenberg_orders_v5';

// Purge legacy caches containing obsolete mock items
try {
  ['v1', 'v2', 'v3', 'v4'].forEach(v => {
    localStorage.removeItem(`iasmin_gutenberg_gifts_${v}`);
    localStorage.removeItem(`iasmin_gutenberg_rsvps_${v}`);
    localStorage.removeItem(`iasmin_gutenberg_orders_${v}`);
  });
} catch {}

export const defaultCatalog: Gift[] = [];

export function getLocalGifts(): Gift[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_GIFTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const legacyPlaceholderIds = new Set([
          'panelas', 'airfryer', 'liquidificador', 'cafeteira', 'jogocama',
          'toalhas', 'aspirador', 'churrasco', 'luademel'
        ]);
        const cleaned = parsed.filter(g => !legacyPlaceholderIds.has(String(g.id).toLowerCase()));
        if (cleaned.length > 0) return cleaned;
      }
    }
  } catch {}
  return [];
}

export function saveLocalGifts(gifts: Gift[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_GIFTS, JSON.stringify(gifts));
  } catch {}
}

export function getLocalRsvps(): Rsvp[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_RSVPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(r => r && r.id !== 'sample-1' && r.name !== 'Família Silva');
      }
    }
  } catch {}
  return [];
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
  const routes = ['/api/gifts', '/.netlify/functions/gifts'];
  for (const route of routes) {
    try {
      const res = await fetch(route, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          console.log(`[API] fetchGifts retornou ${data.length} presentes de ${route}.`);
          saveLocalGifts(data);
          return data;
        }
      }
    } catch (e) {
      console.warn(`[API] ${route} indisponível:`, e);
    }
  }
  const local = getLocalGifts();
  return local;
}

export async function fetchRsvps(): Promise<Rsvp[]> {
  const routes = ['/api/rsvps', '/.netlify/functions/rsvps'];
  let serverRsvps: Rsvp[] | null = null;

  for (const route of routes) {
    try {
      const res = await fetch(route, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          console.log(`[API] fetchRsvps retornou ${data.length} confirmações de ${route}.`);
          serverRsvps = data
            .filter((r: any) => r && r.id !== 'sample-1' && r.name !== 'Família Silva')
            .map((r: any) => {
            let phone = r.phone || '';
            let msg = r.message || null;
            if (!phone && msg && msg.includes('[WhatsApp:')) {
              const m = msg.match(/\[WhatsApp:\s*([^\]]+)\]/);
              if (m) {
                phone = m[1].trim();
                msg = msg.replace(/\[WhatsApp:\s*[^\]]+\]\s*/, '').trim() || null;
              }
            }
            return {
              id: String(r.id),
              name: String(r.name || ''),
              phone,
              attending: Boolean(r.attending),
              guests: Number(r.guests) || 1,
              message: msg,
              created_at: r.created_at || new Date().toISOString()
            };
          });
          break;
        }
      }
    } catch (e) {
      console.warn(`[API] ${route} indisponível para RSVPs:`, e);
    }
  }

  if (serverRsvps) {
    saveLocalRsvps(serverRsvps);
    return serverRsvps;
  }

  return getLocalRsvps();
}

export async function submitRsvp(payload: { name: string; phone: string; attending: boolean; message?: string }): Promise<Rsvp> {
  const cleanPhone = payload.phone ? payload.phone.trim() : '';
  const cleanMsg = payload.message ? payload.message.trim() : null;

  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'rsvp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

  const newRsvp: Rsvp = {
    id,
    name: payload.name.trim(),
    phone: cleanPhone,
    attending: payload.attending,
    guests: 1,
    message: cleanMsg,
    created_at: new Date().toISOString()
  };

  console.log('[API] Enviando confirmação RSVP:', newRsvp);

  // Salva imediatamente no cache local para atualização instantânea (0ms)
  const currentList = getLocalRsvps().filter(r => r.id !== id);
  currentList.unshift(newRsvp);
  saveLocalRsvps(currentList);

  const routes = ['/api/rsvps', '/.netlify/functions/rsvps'];
  for (const route of routes) {
    try {
      const res = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: newRsvp.name,
          phone: cleanPhone,
          attending: newRsvp.attending,
          message: cleanMsg,
          created_at: newRsvp.created_at
        })
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`[API] RSVP salvo com sucesso em ${route}:`, data);
        let phone = cleanPhone;
        let msg = data.message || cleanMsg;
        if (msg && msg.includes('[WhatsApp:')) {
          const m = msg.match(/\[WhatsApp:\s*([^\]]+)\]/);
          if (m) {
            phone = m[1].trim();
            msg = msg.replace(/\[WhatsApp:\s*[^\]]+\]\s*/, '').trim() || null;
          }
        }
        const savedItem: Rsvp = {
          id: String(data.id || id),
          name: data.name || newRsvp.name,
          phone,
          attending: data.attending !== undefined ? Boolean(data.attending) : newRsvp.attending,
          guests: Number(data.guests) || 1,
          message: msg,
          created_at: data.created_at || newRsvp.created_at
        };

        const updatedList = getLocalRsvps().filter(r => r.id !== id && r.id !== savedItem.id);
        updatedList.unshift(savedItem);
        saveLocalRsvps(updatedList);
        return savedItem;
      }
    } catch (e) {
      console.warn(`[API] Erro ao enviar RSVP para ${route}:`, e);
    }
  }

  return newRsvp;
}

export async function adminDeleteRsvp(id: string): Promise<boolean> {
  // Remove do local storage
  const current = getLocalRsvps().filter(r => String(r.id) !== String(id));
  saveLocalRsvps(current);

  const routes = [`/api/rsvps?id=${encodeURIComponent(id)}`, `/.netlify/functions/rsvps?id=${encodeURIComponent(id)}`];
  for (const route of routes) {
    try {
      const res = await fetch(route, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        console.log(`[API] RSVP deletado com sucesso em ${route}`);
        return true;
      }
    } catch (e) {
      console.warn(`[API] Erro ao deletar RSVP em ${route}:`, e);
    }
  }
  return true;
}

export async function fetchOrders(): Promise<GiftOrder[]> {
  const routes = ['/api/orders', '/.netlify/functions/orders'];
  let serverOrders: GiftOrder[] | null = null;

  for (const route of routes) {
    try {
      const res = await fetch(route, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          console.log(`[API] fetchOrders retornou ${data.length} pedidos de ${route}.`);
          serverOrders = data;
          break;
        }
      }
    } catch (e) {
      console.warn(`[API] Erro ao consultar ${route}:`, e);
    }
  }

  if (serverOrders) {
    saveLocalOrders(serverOrders);
    return serverOrders;
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

  const routes = ['/api/confirm-pix-order', '/.netlify/functions/confirm-pix-order'];
  for (const route of routes) {
    try {
      const res = await fetch(route, {
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
        break;
      }
    } catch (e) {
      console.warn(`[API] Erro ao chamar ${route}:`, e);
    }
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
    }
    // Adiciona o contribuinte ao array de contribuintes
    const prevContributors = gifts[giftIndex].contributors || [];
    const newContrib = {
      id: orderId,
      buyer_name: buyerName.trim(),
      amount_cents: amountCents,
      buyer_message: buyerMessage?.trim() || null,
      status: 'awaiting_confirmation',
      created_at: order.created_at
    };
    gifts[giftIndex].contributors = [newContrib, ...prevContributors.filter(c => c.id !== orderId)];
    gifts[giftIndex].contributors_count = gifts[giftIndex].contributors.length;
    saveLocalGifts(gifts);
  }

  return order;
}

export async function confirmCardOrder(
  orderId?: string | null,
  sessionId?: string | null,
  paymentId?: string | null,
  giftName?: string | null
): Promise<void> {
  if (!orderId && !sessionId && !paymentId) return;

  try {
    const res = await fetch('/api/confirm-card-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        session_id: sessionId,
        payment_id: paymentId,
        gift_name: giftName
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.order) {
        const orders = getLocalOrders();
        const existingIdx = orders.findIndex(o => o.id === data.order.id);
        if (existingIdx >= 0) {
          orders[existingIdx] = { ...orders[existingIdx], ...data.order, status: 'approved' };
        } else {
          orders.unshift(data.order);
        }
        saveLocalOrders(orders);

        // Update local gifts
        const gifts = getLocalGifts();
        const giftIdx = gifts.findIndex(g => g.id === data.order.gift_id || g.name === data.order.gift_id || g.name === giftName);
        if (giftIdx !== -1 && gifts[giftIdx].unique_item) {
          gifts[giftIdx].order_status = 'approved';
          gifts[giftIdx].buyer_name = data.order.buyer_name || 'Convidado';
          gifts[giftIdx].order_id = data.order.id;
          saveLocalGifts(gifts);
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao chamar /api/confirm-card-order:', e);
  }
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
  const routes = [
    '/api/payment-status',
    '/api/stripe-status',
    '/.netlify/functions/payment-status',
    '/.netlify/functions/stripe-status'
  ];
  for (const r of routes) {
    try {
      const res = await fetch(r);
      if (res.ok) {
        const data = await res.json();
        console.log(`[PaymentStatus] Status obtido da rota ${r}:`, data);
        return data;
      }
    } catch {}
  }
  return { configured: false };
}

export async function adminUpdateOrder(
  code: string,
  orderId: string,
  updates: {
    status?: 'approved' | 'rejected' | 'pending' | 'awaiting_confirmation';
    amount_cents?: number;
  }
): Promise<GiftOrder[]> {
  const cleanCode = code.trim();
  console.log('[Admin] Atualizando pedido:', { orderId, updates });
  let updatedOrders: GiftOrder[] = [];

  const routes = ['/api/admin-orders', '/.netlify/functions/admin-orders'];
  for (const route of routes) {
    try {
      const res = await fetch(route, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-code': cleanCode
        },
        body: JSON.stringify({
          code: cleanCode,
          order_id: orderId,
          status: updates.status,
          amount_cents: updates.amount_cents
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.orders) && data.orders.length > 0) {
          updatedOrders = data.orders;
          saveLocalOrders(data.orders);
          console.log('[Admin] Pedidos atualizados via servidor:', data.orders.length);
          break;
        }
      }
    } catch (e) {
      console.warn(`[Admin] Erro na rota ${route}:`, e);
    }
  }

  if (updatedOrders.length === 0) {
    console.log('[Admin] Atualizando pedido no armazenamento local...');
    const orders = getLocalOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx >= 0) {
      if (updates.status) orders[idx].status = updates.status;
      if (updates.amount_cents !== undefined && updates.amount_cents > 0) {
        orders[idx].amount_cents = updates.amount_cents;
      }
      orders[idx].updated_at = new Date().toISOString();
      saveLocalOrders(orders);
    }
    updatedOrders = orders;
  }

  // Sincroniza o presente correspondente no cache local
  const targetOrder = updatedOrders.find(o => o.id === orderId);
  if (targetOrder && updates.status) {
    const gifts = getLocalGifts();
    const gIdx = gifts.findIndex(g => {
      const gId = String(g.id || '').trim().toLowerCase();
      const gName = String(g.name || '').trim().toLowerCase();
      const oGId = String(targetOrder.gift_id || '').trim().toLowerCase();
      return gId === oGId || gName === oGId;
    });
    if (gIdx >= 0 && gifts[gIdx].unique_item) {
      if (updates.status === 'rejected') {
        // Se foi rejeitado/cancelado, libera o presente para novos compradores
        gifts[gIdx].order_status = null;
        gifts[gIdx].buyer_name = null;
        gifts[gIdx].order_id = null;
      } else if (updates.status === 'approved') {
        gifts[gIdx].order_status = 'approved';
        gifts[gIdx].buyer_name = targetOrder.buyer_name;
        gifts[gIdx].order_id = targetOrder.id;
      } else if (updates.status === 'awaiting_confirmation' || updates.status === 'pending') {
        gifts[gIdx].order_status = 'awaiting_confirmation';
        gifts[gIdx].buyer_name = targetOrder.buyer_name;
        gifts[gIdx].order_id = targetOrder.id;
      }
      saveLocalGifts(gifts);
    }
  }

  return updatedOrders;
}

export async function adminUpdateOrderStatus(
  code: string,
  orderId: string,
  status: 'approved' | 'rejected' | 'pending' | 'awaiting_confirmation'
): Promise<GiftOrder[]> {
  return adminUpdateOrder(code, orderId, { status });
}

export async function adminGiftsAction(
  code: string,
  action: 'list' | 'create' | 'update' | 'delete',
  gift?: Partial<Gift>
): Promise<Gift[]> {
  const cleanCode = code.trim();
  console.log(`[Admin] Executando ação "${action}" no catálogo de presentes:`, gift);

  let serverGifts: Gift[] | null = null;
  let serverProcessedGift: any = null;

  const routes = ['/api/admin-gifts', '/.netlify/functions/admin-gifts'];

  for (const route of routes) {
    try {
      console.log(`[Admin] Chamando endpoint administrativo: ${route}`);
      const res = await fetch(route, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-code': cleanCode
        },
        body: JSON.stringify({ code: cleanCode, action, gift })
      });

      console.log(`[Admin] Resposta do endpoint ${route} (${res.status})`);

      if (res.ok) {
        const data = await res.json();
        console.log(`[Admin] Dados retornados por ${route}:`, data);

        if (data?.gifts && Array.isArray(data.gifts) && data.gifts.length > 0) {
          serverGifts = data.gifts;
          saveLocalGifts(data.gifts);
          console.log('[Admin] Lista de presentes sincronizada do servidor:', data.gifts);
          return data.gifts;
        }

        if (data?.processedGift) {
          serverProcessedGift = data.processedGift;
        }

        if (data?.success) {
          break; // Ação processada com sucesso no backend
        }
      } else {
        const data = await res.json().catch(() => null);
        console.warn(`[Admin] Erro na resposta (${route}):`, data);
        if (data?.error && (res.status === 401 || res.status === 403)) {
          throw new Error(data.error);
        }
      }
    } catch (e: any) {
      if (e.message && (e.message.includes('Código') || e.message.includes('incorreto') || e.message.includes('Senha') || e.message.includes('administração'))) {
        throw e;
      }
      console.warn(`[Admin] Tentativa falhou em ${route}:`, e);
    }
  }

  // Se o servidor retornou uma lista completa de presentes
  if (serverGifts && serverGifts.length > 0) {
    saveLocalGifts(serverGifts);
    return serverGifts;
  }

  // Atualização persistente no armazenamento local
  console.log('[Admin] Aplicando alterações no cache local (localStorage)...');
  let gifts = [...getLocalGifts()];

  if (action === 'list') {
    return gifts;
  }

  if (action === 'create') {
    const itemToCreate = serverProcessedGift || gift;
    if (itemToCreate) {
      const slugId = itemToCreate.id || (itemToCreate.name ? itemToCreate.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 5) : 'gift-' + Date.now());
      const newG: Gift = {
        id: slugId,
        name: itemToCreate.name || 'Novo Presente',
        description: itemToCreate.description || '',
        price_cents: Number(itemToCreate.price_cents) > 0 ? Number(itemToCreate.price_cents) : 1000,
        unique_item: itemToCreate.unique_item !== false,
        active: itemToCreate.active !== false,
        sort_order: Number(itemToCreate.sort_order) || (gifts.length + 1),
        category: itemToCreate.category || 'Casa'
      };
      gifts.push(newG);
      console.log('[Admin] Novo presente adicionado ao armazenamento local:', newG);
    }
  } else if (action === 'update') {
    const itemToUpdate = serverProcessedGift || gift;
    if (itemToUpdate && itemToUpdate.id) {
      gifts = gifts.map(g => (g.id === itemToUpdate.id ? { ...g, ...itemToUpdate } : g));
      console.log('[Admin] Presente atualizado no armazenamento local:', itemToUpdate);
    }
  } else if (action === 'delete') {
    const itemToDelete = serverProcessedGift || gift;
    if (itemToDelete && itemToDelete.id) {
      gifts = gifts.filter(g => g.id !== itemToDelete.id);
      console.log('[Admin] Presente removido do armazenamento local:', itemToDelete.id);
    }
  }

  gifts.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  saveLocalGifts(gifts);
  console.log('[Admin] Catálogo de presentes atualizado:', gifts);
  return gifts;
}
