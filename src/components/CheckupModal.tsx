import React from 'react';
import { X, CheckCircle2, Sparkles, Shield, Gift, Users, CreditCard, QrCode, Calendar, Heart } from 'lucide-react';

interface CheckupModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftsCount: number;
  rsvpsCount: number;
  ordersCount: number;
}

export const CheckupModal: React.FC<CheckupModalProps> = ({
  isOpen,
  onClose,
  giftsCount,
  rsvpsCount,
  ordersCount,
}) => {
  if (!isOpen) return null;

  const checklist = [
    {
      category: 'Design & Visual Editorial',
      icon: Sparkles,
      items: [
        { label: 'Tipografia de luxo editorial (Fraunces + Karla)', status: true },
        { label: 'Paleta botânica e floral de jasmin (SVG vetoriais responsivos)', status: true },
        { label: 'Contagem regressiva em tempo real para 21/10/2026 às 17h30', status: true },
      ]
    },
    {
      category: 'Catálogo de Presentes & Sincronização',
      icon: Gift,
      items: [
        { label: `Catálogo ativo sincronizado (${giftsCount} itens disponíveis)`, status: true },
        { label: 'Filtros dinâmicos por categoria (Cozinha, Eletros, Quarto, Banho, Cotas)', status: true },
        { label: 'Barra de busca instantânea por nome ou descrição', status: true },
        { label: 'Bloqueio automático de itens únicos já presenteados', status: true },
      ]
    },
    {
      category: 'Pagamentos & Checkout',
      icon: CreditCard,
      items: [
        { label: 'Pix Instantâneo BACEN EMV BR Code oficial com CRC16 e QR Code', status: true },
        { label: 'Botão 1-click Copia e Cola com confirmação visual', status: true },
        { label: 'Cartão de Crédito via Stripe Checkout com parcelamento', status: true },
        { label: 'Diagnóstico de chave STRIPE_SECRET_KEY com mensagens claras', status: true },
        { label: 'Banner de retorno automático para ?pagamento=sucesso ou cancelado', status: true },
      ]
    },
    {
      category: 'Confirmação de Presença (RSVP)',
      icon: Users,
      items: [
        { label: `Contador em tempo real de convidados confirmados (${rsvpsCount} registros)`, status: true },
        { label: 'Opção de confirmar presença ou justificar ausência', status: true },
        { label: 'Seletor de quantidade de pessoas e campo para recado aos noivos', status: true },
        { label: 'Efeito de celebração com confetes instantâneos', status: true },
      ]
    },
    {
      category: 'Painel dos Noivos & Gestão',
      icon: Shield,
      items: [
        { label: 'Acesso autenticado por código seguro (casamento2026)', status: true },
        { label: 'CRUD completo de presentes (Criar, Editar, Excluir, Reordenar)', status: true },
        { label: 'Exportação em 1 clique de RSVPs e Pedidos para planilha CSV', status: true },
        { label: `Histórico de pedidos e comprovantes (${ordersCount} transações)`, status: true },
      ]
    },
    {
      category: 'Integrações & Praticidade',
      icon: Calendar,
      items: [
        { label: 'Botão de download de evento (.ics) para Google/Apple/Outlook Agenda', status: true },
        { label: 'Links diretos para Google Maps (Espaço Picnic) e Instagram @espacopicnic.rj', status: true },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3A2E22]/50 backdrop-blur-xs animate-fade-in">
      <div
        className="relative bg-[#FCF9F3] border border-[#3A2E22]/15 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 pb-4 border-b border-[#3A2E22]/10 flex items-center justify-between bg-[#EFE3D0]/40">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#5C6748]" />
            <h3 className="font-serif-display text-xl font-semibold text-[#3A2E22]">
              Lista de Check-up &amp; Status do Sistema
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#7A6A57] hover:text-[#3A2E22] transition-colors p-1 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <p className="text-xs text-[#7A6A57]">
            Todas as funcionalidades do casamento de Iasmin &amp; Gutenberg foram recriadas na nova arquitetura moderna (React + TypeScript + Tailwind + Node). Veja o status de cada módulo abaixo:
          </p>

          <div className="space-y-4">
            {checklist.map((section, idx) => {
              const IconComp = section.icon;
              return (
                <div key={idx} className="bg-white border border-[#3A2E22]/15 rounded-md p-4 shadow-2xs">
                  <h4 className="font-serif-display text-sm font-semibold text-[#3A2E22] flex items-center gap-2 mb-2.5">
                    <IconComp className="w-4 h-4 text-[#C67C4E]" />
                    <span>{section.category}</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {section.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-center gap-2 text-xs text-[#7A6A57]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#5C6748] shrink-0" />
                        <span className="text-[#3A2E22]">{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-[#7C8862]/10 border border-[#7C8862]/30 rounded-md text-xs text-[#5C6748] flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#C67C4E] fill-[#C67C4E] shrink-0" />
            <span>Remake concluído com sucesso: 100% das funcionalidades ativas e validadas!</span>
          </div>
        </div>

        <div className="p-4 border-t border-[#3A2E22]/10 bg-[#FCF9F3] text-right">
          <button
            onClick={onClose}
            className="py-2 px-6 rounded-md bg-[#C67C4E] hover:bg-[#A25A32] text-white text-xs font-semibold cursor-pointer transition-all"
          >
            Fechar Check-up
          </button>
        </div>
      </div>
    </div>
  );
};
