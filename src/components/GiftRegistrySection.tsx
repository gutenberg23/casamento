import React, { useState } from 'react';
import { Gift } from '../types';
import { formatBRL } from '../utils/formatters';
import { JasmineIcon } from './FloralMotifs';
import { Gift as GiftIcon, Heart, Sparkles, Check, Clock, Search, Filter } from 'lucide-react';

interface GiftRegistrySectionProps {
  gifts: Gift[];
  onSelectGift: (gift: Gift) => void;
}

export const GiftRegistrySection: React.FC<GiftRegistrySectionProps> = ({ gifts, onSelectGift }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

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
            Assim que o pagamento é concluído, o presente sai da lista com o seu nome gravado, para ninguém presentear o mesmo item duas vezes.
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
              const isApproved = gift.order_status === 'approved';
              const isPending = gift.order_status === 'pending';
              const isTaken = gift.unique_item && isApproved;
              const isAwaiting = gift.unique_item && isPending;

              return (
                <div
                  key={gift.id}
                  className={`bg-[#FCF9F3] border rounded-md p-6 flex flex-col justify-between transition-all duration-200 ${
                    isTaken
                      ? 'border-[#3A2E22]/10 opacity-75'
                      : 'border-[#3A2E22]/15 hover:border-[#C67C4E]/50 hover:shadow-sm'
                  }`}
                >
                  <div>
                    {/* Status Badge */}
                    <div className="mb-3">
                      {isTaken ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#C67C4E]/15 text-[#A25A32]">
                          <Heart className="w-3 h-3 fill-current" />
                          Escolhido por {gift.buyer_name || 'Convidado'}
                        </span>
                      ) : isAwaiting ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#C67C4E]/10 text-[#7A6A57]">
                          <Clock className="w-3 h-3" />
                          Pagamento em processamento
                        </span>
                      ) : gift.unique_item ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#7C8862]/15 text-[#5C6748]">
                          <Check className="w-3 h-3" />
                          Disponível
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#7C8862]/15 text-[#5C6748]">
                          <Sparkles className="w-3 h-3" />
                          Aceita várias contribuições
                        </span>
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
                        className="w-full py-2.5 px-4 rounded border border-[#3A2E22]/15 text-[#7A6A57] bg-[#EFE3D0]/40 text-xs font-semibold cursor-not-allowed text-center"
                      >
                        Já foi presenteado
                      </button>
                    ) : isAwaiting ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded border border-[#3A2E22]/15 text-[#7A6A57] bg-[#EFE3D0]/40 text-xs font-semibold cursor-not-allowed text-center"
                      >
                        Aguardando confirmação
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
    </section>
  );
};
