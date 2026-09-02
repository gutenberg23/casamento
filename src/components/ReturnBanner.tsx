import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { confirmCardOrder } from '../services/api';

interface ReturnBannerProps {
  onPaymentApproved?: () => void;
}

export const ReturnBanner: React.FC<ReturnBannerProps> = ({ onPaymentApproved }) => {
  const [status, setStatus] = useState<'sucesso' | 'cancelado' | null>(null);
  const [giftName, setGiftName] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pag = params.get('pagamento');
    const presente = params.get('presente');
    const orderId = params.get('order_id');
    const sessionId = params.get('session_id');
    const paymentId = params.get('payment_id') || params.get('collection_id');

    if (pag === 'sucesso') {
      setStatus('sucesso');
      setGiftName(presente);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.3 },
        colors: ['#C67C4E', '#7C8862', '#E7C0AC', '#A25A32']
      });

      // Confirm card order in backend and local state
      confirmCardOrder(orderId, sessionId, paymentId, presente).then(() => {
        if (onPaymentApproved) {
          onPaymentApproved();
        }
      });

      // Clean query params from URL without reload
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (pag === 'cancelado') {
      setStatus('cancelado');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onPaymentApproved]);

  if (!status) return null;

  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] p-4 rounded-lg shadow-lg border animate-fade-in flex items-start justify-between gap-3 ${
        status === 'sucesso'
          ? 'bg-[#FCF9F3] border-[#7C8862] text-[#3A2E22]'
          : 'bg-[#FCF9F3] border-red-300 text-[#3A2E22]'
      }`}
    >
      <div className="flex items-start gap-3">
        {status === 'sucesso' ? (
          <CheckCircle2 className="w-5 h-5 text-[#5C6748] shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        )}
        <div>
          <h4 className="font-semibold text-sm">
            {status === 'sucesso'
              ? 'Pagamento aprovado com sucesso!'
              : 'O pagamento não foi concluído.'}
          </h4>
          <p className="text-xs text-[#7A6A57] mt-0.5">
            {status === 'sucesso'
              ? `Muito obrigado pelo presente ${giftName ? `"${giftName}"` : ''}! Iasmin e Gutenberg receberam sua contribuição.`
              : 'Você pode tentar novamente quando quiser ou optar pelo Pix Direto.'}
          </p>
        </div>
      </div>

      <button
        onClick={() => setStatus(null)}
        className="text-[#7A6A57] hover:text-[#3A2E22] p-1 cursor-pointer"
        aria-label="Fechar notificação"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
