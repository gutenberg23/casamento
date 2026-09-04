import React, { useState } from 'react';
import { Gift, GiftOrder, GiftContributor } from '../types';
import { formatBRL, formatDateBR } from '../utils/formatters';
import { doesOrderMatchGift } from '../utils/gifts';
import { JasmineIcon } from './FloralMotifs';
import { Gift as GiftIcon, Heart, Sparkles, Check, Clock, Search, Filter, Users, X, MessageSquare, CheckCircle2 } from 'lucide-react';

interface GiftRegistrySectionProps {
  gifts: Gift[];
  orders?: GiftOrder[];
  onSelectGift: (gift: Gift) => void;
}

export const GiftRegistrySection: React.FC<GiftRegistrySectionProps> = ({ gifts, orders = [], onSelectGift }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewingContributorsGift, setViewingContributorsGift] = useState<Gift | null>(null);

  const categories = [
    { id: 'todos', label: 'Todos os presentes' },
    { id: 'Cozinha', label: 'Cozinha' },
    { id: 'Eletros', label: 'Eletroportáteis' },
    { id: 'Quarto', label: 'Quarto' },
    { id: 'Banho', label: 'Banho' },
    { id: 'Casa', label: 'Casa & Decoração' },
    { id: 'Lazer', label: 'Lazer' },
    { id: 'Lua de Mel', label: 'Cotas Lua de Mel' },
  ];

  const filteredGifts = gifts
    .filter(g => g.active !== false)
    .filter(g => {
      if (selectedCategory === 'todos') return true;
      return g.category === selectedCategory || (!g.category && selectedCategory === 'Casa');
    })
    .filter(g => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        g.name.toLowerCase().includes(term) ||
        (g.description && g.description.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Helper para buscar todos os contribuintes de um presente
  const getGiftContributors = (gift: Gift): GiftContributor[] => {
    const matchingOrders = orders.filter(o => doesOrderMatchGift(o, gift) && o.status !== 'rejected');
    
    // Constrói lista combinada entre gift.contributors e orders
    const map = new Map<string, GiftContributor>();

    if (Array.isArray(gift.contributors)) {
      gift.contributors.forEach(c => {
        const key = c.id || `${c.buyer_name}_${c.created_at || ''}`;
        map.set(key, c);
      });
    }

    matchingOrders.forEach(o => {
      map.set(o.id, {
        id: o.id,
        buyer_name: o.buyer_name,
        buyer_message: o.buyer_message,
        amount_cents: o.amount_cents,
        status: o.status,
        created_at: o.created_at
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );
  };

  const selectedGiftContributors = viewingContributorsGift ? getGiftContributors(viewingContributorsGift) : [];
  const selectedGiftTotalCents = selectedGiftContributors.reduce((sum, c) => sum + (c.amount_cents || 0), 0);

  return (
    <section id="presentes" className="py-20 px-6 relative">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center sm:text-left">
          <p className="text-sm font-semibold tracking-wide text-[#5C6748] mb-1 flex items-center justify-center sm:justify-start gap-1.5 uppercase">
            <JasmineIcon size={13} />
            <span>Lista de presentes</span>
          </p>
          <h2 className="font-serif-display text-3xl sm:text-4xl text-[#3A2E22] font-medium">
            Um mimo pra nossa nova casa
          </h2>
          <p className="mt-3 text-[#7A6A57] text-base max-w-2xl leading-relaxed">
            Sua presença já é o presente mais importante. Se quiser nos ajudar a montar a nossa casa, escolha um item
            abaixo e pague direto por aqui — <strong>Pix instantâneo</strong> ou <strong>cartão de crédito parcelado</strong> via Stripe.
          </p>
        </div>

        {/* Note banner */}
        <div className="bg-[#FCF9F3] border border-[#3A2E22]/15 rounded-md p-4 mb-8 text-sm text-[#7A6A57] flex items-center gap-3 shadow-2xs">
          <Sparkles className="w-5 h-5 text-[#C67C4E] shrink-0" />
          <span>
            Presentes únicos saem da lista com o nome de quem presenteou. Presentes de cota flexível aceitam contribuições de vários convidados com visualização de todos os contribuintes.
          </span>
        </div>

        {/* Search & Categories Bar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center mb-8">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#7A6A57] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar presente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#FCF9F3] border border-[#3A2E22]/15 rounded-md text-sm text-[#3A2E22] placeholder-[#7A6A57]/60 focus:outline-none focus:border-[#C67C4E]"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#C67C4E] text-[#FCF9F3] shadow-xs font-semibold'
                    : 'bg-[#FCF9F3] text-[#7A6A57] border border-[#3A2E22]/15 hover:border-[#C67C4E]/40 hover:text-[#3A2E22]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gift Grid */}
        {filteredGifts.length === 0 ? (
          <div className="bg-[#FCF9F3] border border-[#3A2E22]/15 rounded-md p-10 text-center text-[#7A6A57]">
            <GiftIcon className="w-8 h-8 text-[#C67C4E]/60 mx-auto mb-2" />
            <p className="font-medium text-[#3A2E22]">Nenhum presente encontrado nessa categoria ou busca.</p>
            <p className="text-xs mt-1">Experimente limpar os filtros de busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGifts.map(gift => {
              const matchingOrders = orders.filter(o => doesOrderMatchGift(o, gift) && o.status !== 'rejected');
              const approvedOrder = matchingOrders.find(o => o.status === 'approved');
              const awaitingOrder = matchingOrders.find(o => o.status === 'awaiting_confirmation' || o.status === 'pending');

              // Status derivado dos pedidos e do presente garantindo sincronização instantânea
              const effectiveStatus = approvedOrder
                ? 'approved'
                : (awaitingOrder ? (awaitingOrder.status || 'awaiting_confirmation') : gift.order_status);

              const effectiveBuyer = approvedOrder?.buyer_name || awaitingOrder?.buyer_name || gift.buyer_name;

              const isApproved = effectiveStatus === 'approved';
              const isAwaiting = !isApproved && (effectiveStatus === 'awaiting_confirmation' || effectiveStatus === 'pending');
              const isTaken = gift.unique_item && isApproved;
              const isLockedAwaiting = gift.unique_item && isAwaiting;

              const contributors = getGiftContributors(gift);
              const contributorsCount = contributors.length;

              return (
                <div
                  key={gift.id}
                  className={`bg-[#FCF9F3] border rounded-md p-6 flex flex-col justify-between transition-all duration-200 ${
                    isTaken
                      ? 'border-[#3A2E22]/10 opacity-75'
                      : isLockedAwaiting
                      ? 'border-amber-700/30 bg-[#FAF5EE]'
                      : 'border-[#3A2E22]/15 hover:border-[#C67C4E]/50 hover:shadow-sm'
                  }`}
                >
                  <div>
                    {/* Status Badge */}
                    <div className="mb-3">
                      {isTaken ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#C67C4E]/15 text-[#A25A32]">
                            <Heart className="w-3 h-3 fill-current" />
                            Presenteado por {effectiveBuyer || 'Convidado'}
                          </span>
                          {contributors.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingContributorsGift(gift);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#7A6A57] hover:text-[#3A2E22] border border-[#3A2E22]/15 hover:border-[#C67C4E] transition-all cursor-pointer shadow-2xs"
                              title="Ver detalhes da contribuição"
                            >
                              <Users className="w-2.5 h-2.5" />
                              <span>Ver</span>
                            </button>
                          )}
                        </div>
                      ) : isLockedAwaiting ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60">
                            <Clock className="w-3 h-3 text-amber-700 animate-pulse" />
                            {effectiveBuyer ? `Escolhido por ${effectiveBuyer} · Aguardando confirmação` : 'Aguardando confirmação'}
                          </span>
                          {contributors.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingContributorsGift(gift);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-amber-900 border border-amber-300 hover:bg-amber-50 transition-all cursor-pointer shadow-2xs"
                              title="Ver detalhes da confirmação"
                            >
                              <Users className="w-2.5 h-2.5" />
                              <span>Ver</span>
                            </button>
                          )}
                        </div>
                      ) : gift.unique_item ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#7C8862]/15 text-[#5C6748]">
                          <Check className="w-3 h-3" />
                          Disponível
                        </span>
                      ) : (
                        /* Presente de múltiplas contribuições com botão de ver contribuintes */
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#7C8862]/15 text-[#5C6748]">
                            <Sparkles className="w-3 h-3" />
                            Aceita várias contribuições
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingContributorsGift(gift);
                            }}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all cursor-pointer border shadow-2xs ${
                              contributorsCount > 0
                                ? 'bg-[#C67C4E]/15 text-[#A25A32] hover:bg-[#C67C4E] hover:text-white border-[#C67C4E]/40'
                                : 'bg-white text-[#7A6A57] hover:text-[#3A2E22] border-[#3A2E22]/15 hover:border-[#C67C4E]'
                            }`}
                            title="Ver todos os convidados que já contribuíram com este presente"
                          >
                            <Users className="w-3 h-3" />
                            <span>
                              {contributorsCount > 0
                                ? `${contributorsCount} ${contributorsCount === 1 ? 'contribuinte' : 'contribuintes'} (Ver)`
                                : 'Ver contribuintes'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="font-serif-display text-lg font-semibold text-[#3A2E22] leading-snug mb-1">
                      {gift.name}
                    </h3>

                    <p className="text-base font-bold text-[#A25A32] mb-2 font-serif-display">
                      {formatBRL(gift.price_cents)}
                      {!gift.unique_item && (
                        <span className="text-xs font-normal text-[#7A6A57] ml-1.5 font-sans">(cota sugerida)</span>
                      )}
                    </p>

                    <p className="text-xs text-[#7A6A57] line-clamp-2 leading-relaxed">
                      {gift.description || 'Presente especial para nossa nova fase.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#3A2E22]/10 flex flex-col gap-2">
                    <span className="text-[11px] text-[#7C8862] text-center">Pix instantâneo ou Cartão de Crédito</span>
                    {isTaken ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded border border-[#3A2E22]/15 text-[#7A6A57] bg-[#EFE3D0]/40 text-xs font-semibold cursor-not-allowed text-center flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-[#5C6748]" />
                        <span>Já foi presenteado{effectiveBuyer ? ` (${effectiveBuyer})` : ''}</span>
                      </button>
                    ) : isLockedAwaiting ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded border border-amber-300 text-amber-900 bg-amber-50/80 text-xs font-semibold cursor-not-allowed text-center flex items-center justify-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Aguardando confirmação</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectGift(gift)}
                        className="w-full py-2.5 px-4 rounded border border-[#C67C4E] text-[#A25A32] hover:bg-[#C67C4E] hover:text-[#FCF9F3] text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <GiftIcon className="w-3.5 h-3.5" />
                        <span>{gift.unique_item ? 'Presentear este item' : 'Contribuir com cota'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL: LISTA DE CONTRIBUINTES ================= */}
      {viewingContributorsGift && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3A2E22]/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setViewingContributorsGift(null)}
        >
          <div
            className="relative bg-[#FCF9F3] border border-[#3A2E22]/15 rounded-lg max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 pb-4 border-b border-[#3A2E22]/10 flex items-center justify-between bg-[#EFE3D0]/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-full bg-[#C67C4E]/15 text-[#A25A32]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-display text-lg font-semibold text-[#3A2E22] leading-tight">
                    Contribuintes do Presente
                  </h3>
                  <p className="text-xs text-[#7A6A57]">
                    {viewingContributorsGift.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingContributorsGift(null)}
                className="text-[#7A6A57] hover:text-[#3A2E22] transition-colors p-1.5 rounded-full hover:bg-black/5 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header / Summary Info */}
            <div className="p-4 bg-white border-b border-[#3A2E22]/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-[#7A6A57] block">Total arrecadado:</span>
                <strong className="text-base font-bold text-[#A25A32] font-serif-display">
                  {formatBRL(selectedGiftTotalCents)}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[#7A6A57] block">Contribuições registradas:</span>
                <span className="font-semibold text-[#5C6748] px-2.5 py-0.5 rounded-full bg-[#7C8862]/15 inline-block mt-0.5">
                  {selectedGiftContributors.length} {selectedGiftContributors.length === 1 ? 'pessoa' : 'pessoas'}
                </span>
              </div>
            </div>

            {/* Contributors List */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {selectedGiftContributors.length === 0 ? (
                <div className="py-10 text-center text-[#7A6A57]">
                  <Heart className="w-8 h-8 text-[#C67C4E]/40 mx-auto mb-2" />
                  <p className="font-medium text-sm text-[#3A2E22]">Nenhuma contribuição registrada ainda.</p>
                  <p className="text-xs mt-1 max-w-xs mx-auto">
                    Seja a primeira pessoa a fazer parte deste presente especial para Iasmin e Gutenberg!
                  </p>
                </div>
              ) : (
                selectedGiftContributors.map((c, idx) => {
                  const isConfirmed = c.status === 'approved';
                  const initials = c.buyer_name
                    ? c.buyer_name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(n => n[0].toUpperCase())
                        .join('')
                    : 'C';

                  return (
                    <div
                      key={c.id || idx}
                      className="p-3.5 bg-white border border-[#3A2E22]/15 rounded-md flex flex-col gap-2 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#EFE3D0] text-[#A25A32] font-serif-display font-bold flex items-center justify-center text-xs shrink-0 border border-[#C67C4E]/20">
                            {initials}
                          </div>
                          <div>
                            <strong className="text-sm text-[#3A2E22] block font-medium">
                              {c.buyer_name || 'Convidado'}
                            </strong>
                            <span className="text-[10px] text-[#7A6A57]">
                              {formatDateBR(c.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          {c.amount_cents ? (
                            <span className="font-bold text-sm text-[#A25A32] font-serif-display block">
                              {formatBRL(c.amount_cents)}
                            </span>
                          ) : null}
                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#5C6748]">
                              <CheckCircle2 className="w-3 h-3" />
                              Confirmado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800">
                              <Clock className="w-3 h-3" />
                              Aguardando
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Recado / Mensagem de carinho */}
                      {c.buyer_message && (
                        <div className="mt-1 p-2.5 rounded bg-[#FCF9F3] border border-[#3A2E22]/10 text-xs text-[#7A6A57] flex items-start gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-[#C67C4E] shrink-0 mt-0.5" />
                          <p className="italic leading-relaxed">"{c.buyer_message}"</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer / Call to action */}
            <div className="p-4 border-t border-[#3A2E22]/10 bg-[#EFE3D0]/30 flex items-center justify-between gap-3">
              <button
                onClick={() => setViewingContributorsGift(null)}
                className="py-2 px-4 rounded border border-[#3A2E22]/20 text-xs font-semibold text-[#7A6A57] hover:text-[#3A2E22] bg-white transition-all cursor-pointer"
              >
                Fechar
              </button>

              <button
                onClick={() => {
                  const gift = viewingContributorsGift;
                  setViewingContributorsGift(null);
                  onSelectGift(gift);
                }}
                className="py-2 px-4 rounded bg-[#C67C4E] hover:bg-[#A25A32] text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <GiftIcon className="w-3.5 h-3.5" />
                <span>{viewingContributorsGift.unique_item ? 'Presentear este item' : 'Contribuir com este presente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
