import { Gift, GiftOrder, GiftContributor } from '../types';

/**
 * Verifica de forma flexível se um pedido se refere a um presente específico,
 * comparando tanto por ID quanto pelo Nome do presente (sem distinção de maiúsculas/minúsculas).
 */
export function doesOrderMatchGift(
  order: GiftOrder | { gift_id?: string; gift_name?: string },
  gift: Gift
): boolean {
  if (!order || !gift) return false;
  const orderGiftId = String(order.gift_id || '').trim().toLowerCase();
  const giftId = String(gift.id || '').trim().toLowerCase();
  const giftName = String(gift.name || '').trim().toLowerCase();

  if (orderGiftId && (orderGiftId === giftId || orderGiftId === giftName)) {
    return true;
  }
  if ('gift_name' in order && order.gift_name) {
    const oName = String(order.gift_name).trim().toLowerCase();
    if (oName && (oName === giftName || oName === giftId)) {
      return true;
    }
  }
  return false;
}

/**
 * Consolida a lista de presentes com os pedidos reais recebidos do servidor/banco de dados.
 * Garante que:
 * 1. Presentes com pedidos aprovados tenham order_status = 'approved' e buyer_name preenchido.
 * 2. Presentes com pedidos aguardando confirmação tenham order_status = 'awaiting_confirmation'.
 * 3. Lista de contribuintes seja enriquecida com todos os pedidos.
 */
export function consolidateGiftsWithOrders(gifts: Gift[], orders: GiftOrder[]): Gift[] {
  if (!Array.isArray(gifts)) return [];
  const safeOrders = Array.isArray(orders) ? orders : [];

  return gifts.map(g => {
    // Busca todos os pedidos correspondentes que não foram cancelados/rejeitados
    const matchingOrders = safeOrders.filter(o => doesOrderMatchGift(o, g) && o.status !== 'rejected');

    // Pedido aprovado tem prioridade máxima
    const approvedOrder = matchingOrders.find(o => o.status === 'approved');
    const awaitingOrder = matchingOrders.find(o => o.status === 'awaiting_confirmation' || o.status === 'pending');
    const activeOrder = approvedOrder || awaitingOrder;

    // Combina contribuintes
    const contribMap = new Map<string, GiftContributor>();

    if (Array.isArray(g.contributors)) {
      g.contributors.forEach(c => {
        const key = c.id || `${c.buyer_name}_${c.created_at || ''}`;
        contribMap.set(key, c);
      });
    }

    matchingOrders.forEach(o => {
      contribMap.set(o.id, {
        id: o.id,
        buyer_name: o.buyer_name,
        buyer_message: o.buyer_message,
        amount_cents: o.amount_cents,
        status: o.status,
        created_at: o.created_at
      });
    });

    const contributors = Array.from(contribMap.values()).sort(
      (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );

    const orderStatus = approvedOrder
      ? 'approved'
      : (awaitingOrder ? (awaitingOrder.status as any) : (g.order_status || null));

    const buyerName = approvedOrder?.buyer_name || awaitingOrder?.buyer_name || g.buyer_name || null;
    const orderId = activeOrder?.id || g.order_id || null;
    const orderAmount = activeOrder?.amount_cents || g.order_amount_cents || null;

    return {
      ...g,
      order_id: orderId,
      buyer_name: buyerName,
      order_status: orderStatus,
      order_amount_cents: orderAmount,
      contributors,
      contributors_count: contributors.length
    };
  });
}
