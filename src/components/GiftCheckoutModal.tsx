import React, { useState } from 'react';
import { Gift } from '../types';
import { formatBRL } from '../utils/formatters';
import { generatePixPayload, getPixQrCodeUrl, DEFAULT_PIX_KEY, DEFAULT_PIX_RECEIVER, DEFAULT_PIX_CITY } from '../utils/pix';
import { createPayment, confirmPixOrder } from '../services/api';
import confetti from 'canvas-confetti';
import { X, QrCode, CreditCard, Copy, Check, Heart, ShieldCheck, ArrowLeft, Loader2, Sparkles, Clock } from 'lucide-react';

interface GiftCheckoutModalProps {
  gift: Gift | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const GiftCheckoutModal: React.FC<GiftCheckoutModalProps> = ({ gift, onClose, onSuccess }) => {
  if (!gift) return null;

  const [step, setStep] = useState<'form' | 'pix' | 'success'>('form');
  const [buyerName, setBuyerName] = useState('');
  const [buyerMessage, setBuyerMessage] = useState('');
  const [customAmount, setCustomAmount] = useState<number>(
    gift.unique_item ? gift.price_cents / 100 : Math.max(100, (gift.price_cents || 10000) / 100)
  );
  const [paymentMethod, setPaymentMethod] = useState<'pix_direct' | 'card'>('pix_direct');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pix state
  const [pixPayload, setPixPayload] = useState('');
  const [pixQrUrl, setPixQrUrl] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);

  const presetAmounts = [50, 100, 200, 350, 500];

  const finalAmountCents = gift.unique_item
    ? gift.price_cents
    : Math.round(Number(customAmount) * 100);

  const fireConfetti = () => {
    confetti({
      particleCount: 85,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#C67C4E', '#7C8862', '#E7C0AC', '#A25A32']
    });
  };

  const handleStartPayment = async () => {
    setErrorMessage('');
    if (!buyerName.trim()) {
      setErrorMessage('Por favor, informe seu nome completo para identificação do presente.');
      return;
    }

    if (!gift.unique_item && (isNaN(customAmount) || customAmount < 10)) {
      setErrorMessage('O valor mínimo de contribuição é de R$ 10,00.');
      return;
    }

    setLoading(true);

    try {
      if (paymentMethod === 'card') {
        // Redireciona para o checkout oficial do Stripe
        const paymentRes = await createPayment({
          gift_id: gift.id,
          buyer_name: buyerName.trim(),
          amount_cents: finalAmountCents,
          payment_method: 'card',
          buyer_message: buyerMessage.trim() || undefined
        });

        if (paymentRes.init_point) {
          window.location.href = paymentRes.init_point;
          return;
        } else {
          throw new Error('Não recebemos o link seguro de pagamento do Stripe.');
        }
      }

      // Método Pix Instantâneo: Cria o pedido no backend imediatamente
      let generatedOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      let generatedPixCode = '';
      let generatedQrUrl = '';

      try {
        const pixRes = await createPayment({
          gift_id: gift.id,
          buyer_name: buyerName.trim(),
          amount_cents: finalAmountCents,
          payment_method: 'pix_direct',
          buyer_message: buyerMessage.trim() || undefined
        });

        if (pixRes.order_id) {
          generatedOrderId = pixRes.order_id;
        }
        if (pixRes.pix_code) {
          generatedPixCode = pixRes.pix_code;
        }
        if (pixRes.qr_code_url) {
          generatedQrUrl = pixRes.qr_code_url;
        }
      } catch (e) {
        console.warn('Fallback gerando Pix no client-side:', e);
      }

      // Se por algum motivo o backend não retornou o pixCode, gera com o gerador padrão BACEN
      if (!generatedPixCode) {
        const txid = `IG${Date.now().toString().slice(-8)}`;
        generatedPixCode = generatePixPayload({
          key: DEFAULT_PIX_KEY,
          name: DEFAULT_PIX_RECEIVER,
          city: DEFAULT_PIX_CITY,
          amount: finalAmountCents / 100,
          txid
        });
      }

      if (!generatedQrUrl) {
        generatedQrUrl = getPixQrCodeUrl(generatedPixCode, 280);
      }

      setPixPayload(generatedPixCode);
      setPixQrUrl(generatedQrUrl);
      setPendingOrderId(generatedOrderId);
      setStep('pix');
    } catch (err: any) {
      console.error('Erro ao iniciar pagamento:', err);
      setErrorMessage(
        err.message || 'Houve um imprevisto ao conectar ao processador de pagamento. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixPayload);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    } catch {
      const el = document.getElementById('pixCopyInput') as HTMLInputElement;
      if (el) {
        el.select();
        document.execCommand('copy');
        setCopiedPix(true);
        setTimeout(() => setCopiedPix(false), 3000);
      }
    }
  };

  const handleConfirmPix = async () => {
    setLoading(true);
    try {
      await confirmPixOrder(
        pendingOrderId || `order_${Date.now()}`,
        gift.id,
        buyerName.trim(),
        finalAmountCents,
        buyerMessage.trim() || undefined
      );
      fireConfetti();
      setStep('success');
      onSuccess();
    } catch (e) {
      fireConfetti();
      setStep('success');
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3A2E22]/50 backdrop-blur-xs animate-fade-in">
      <div
        className="relative bg-[#FCF9F3] border border-[#3A2E22]/15 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#7A6A57] hover:text-[#3A2E22] transition-colors p-1 cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ================= STEP 1: FORM ================= */}
        {step === 'form' && (
          <div>
            <div className="flex items-center gap-2 mb-1 text-[#5C6748] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#C67C4E]" />
              <span>Presentear os noivos</span>
            </div>
            <h3 className="font-serif-display text-2xl font-semibold text-[#3A2E22] mb-4">
              {gift.name}
            </h3>

            {/* Item summary box */}
            <div className="bg-[#EFE3D0]/60 border border-[#3A2E22]/10 rounded-md p-4 mb-6 flex justify-between items-center">
              <div>
                <p className="font-medium text-[#3A2E22] text-sm">{gift.name}</p>
                <p className="text-xs text-[#7A6A57] mt-0.5 line-clamp-1">{gift.description}</p>
              </div>
              <div className="text-right pl-3 shrink-0">
                <span className="font-serif-display text-lg font-bold text-[#A25A32]">
                  {formatBRL(finalAmountCents)}
                </span>
              </div>
            </div>

            {/* Quota amount selector if not unique */}
            {!gift.unique_item && (
              <div className="mb-5">
                <label className="block text-xs font-semibold text-[#7A6A57] uppercase tracking-wider mb-2">
                  Valor da sua contribuição (R$)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {presetAmounts.map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCustomAmount(val)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        customAmount === val
                          ? 'bg-[#C67C4E] text-[#FCF9F3] border-[#C67C4E] font-semibold'
                          : 'bg-[#FCF9F3] text-[#7A6A57] border-[#3A2E22]/15 hover:border-[#C67C4E]'
                      }`}
                    >
                      R$ {val}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="10"
                  step="5"
                  value={customAmount}
                  onChange={e => setCustomAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-[#fff] border border-[#3A2E22]/15 rounded-md text-sm text-[#3A2E22] focus:outline-none focus:border-[#C67C4E]"
                  placeholder="Ou digite outro valor (mínimo R$ 10)"
                />
              </div>
            )}

            {/* Buyer name */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#7A6A57] uppercase tracking-wider mb-1.5">
                Seu nome completo *
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
                placeholder="Como você deseja ser identificado no presente"
                className="w-full px-3.5 py-2.5 bg-[#fff] border border-[#3A2E22]/15 rounded-md text-sm text-[#3A2E22] focus:outline-none focus:border-[#C67C4E]"
              />
            </div>

            {/* Buyer message */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-[#7A6A57] uppercase tracking-wider mb-1.5">
                Recado para Iasmin &amp; Gutenberg (opcional)
              </label>
              <textarea
                rows={2}
                value={buyerMessage}
                onChange={e => setBuyerMessage(e.target.value)}
                placeholder="Deixe uma mensagem de carinho para os noivos..."
                className="w-full px-3.5 py-2.5 bg-[#fff] border border-[#3A2E22]/15 rounded-md text-sm text-[#3A2E22] focus:outline-none focus:border-[#C67C4E] resize-none"
              />
            </div>

            {/* Payment Method Selector */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-[#7A6A57] uppercase tracking-wider mb-2">
                Forma de pagamento
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix_direct')}
                  className={`p-3.5 rounded-md border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    paymentMethod === 'pix_direct'
                      ? 'border-[#C67C4E] bg-[#C67C4E]/10 text-[#A25A32] shadow-2xs'
                      : 'border-[#3A2E22]/15 bg-[#FCF9F3] text-[#7A6A57] hover:border-[#C67C4E]/40'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm mb-1 text-[#3A2E22]">
                    <QrCode className="w-4 h-4 text-[#C67C4E]" />
                    <span>Pix Instantâneo</span>
                  </div>
                  <span className="text-[11px] text-[#7A6A57]">QR Code &amp; Copia e Cola</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3.5 rounded-md border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'border-[#C67C4E] bg-[#C67C4E]/10 text-[#A25A32] shadow-2xs'
                      : 'border-[#3A2E22]/15 bg-[#FCF9F3] text-[#7A6A57] hover:border-[#C67C4E]/40'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm mb-1 text-[#3A2E22]">
                    <CreditCard className="w-4 h-4 text-[#C67C4E]" />
                    <span>Cartão de Crédito</span>
                  </div>
                  <span className="text-[11px] text-[#7A6A57]">Parcelamento em até 12x</span>
                </button>
              </div>
            </div>

            {/* Card Note */}
            {paymentMethod === 'card' && (
              <div className="bg-[#EFE3D0]/60 border border-[#3A2E22]/10 rounded-md p-3.5 mb-6 text-xs text-[#7A6A57] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#5C6748] shrink-0 mt-0.5" />
                <span>
                  Você será redirecionado para o checkout oficial seguro do <strong>Mercado Pago</strong> com opção de <strong>parcelamento em até 12x no cartão de crédito</strong>.
                </span>
              </div>
            )}

            {/* Error Display */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md">
                {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleStartPayment}
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-md bg-[#C67C4E] hover:bg-[#A25A32] text-[#FCF9F3] font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Conectando ao checkout seguro...</span>
                </>
              ) : paymentMethod === 'pix_direct' ? (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Gerar Pix ({formatBRL(finalAmountCents)})</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pagar no Cartão (em até 12x)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ================= STEP 2: PIX QR CODE & COPY ================= */}
        {step === 'pix' && (
          <div>
            <button
              onClick={() => setStep('form')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A25A32] hover:text-[#C67C4E] mb-3 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>

            <h3 className="font-serif-display text-2xl font-semibold text-[#3A2E22] mb-1">
              Pague com Pix
            </h3>
            <p className="text-xs text-[#7A6A57] mb-5 leading-relaxed">
              Abra o aplicativo do seu banco, escaneie o QR Code abaixo ou use o botão <strong>Copiar código Pix</strong>:
            </p>

            <div className="bg-[#EFE3D0]/60 border border-dashed border-[#C67C4E]/40 rounded-lg p-5 text-center mb-5">
              {/* QR Code */}
              {pixQrUrl && (
                <div className="bg-white p-2.5 rounded-md inline-block shadow-2xs border border-[#3A2E22]/10 mb-4">
                  <img
                    src={pixQrUrl}
                    alt="QR Code Pix"
                    className="w-44 h-44 object-contain block mx-auto"
                  />
                </div>
              )}

              {/* Copy Code */}
              <label className="block text-left text-[11px] font-semibold text-[#7A6A57] uppercase tracking-wider mb-1.5">
                Código Pix Copia e Cola:
              </label>
              <div className="flex gap-2 mb-4">
                <input
                  id="pixCopyInput"
                  type="text"
                  readOnly
                  value={pixPayload}
                  className="flex-1 px-3 py-2 bg-white border border-[#3A2E22]/15 rounded-md text-xs font-mono text-[#7A6A57] truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className={`px-4 py-2 rounded-md text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer ${
                    copiedPix ? 'bg-[#5C6748]' : 'bg-[#C67C4E] hover:bg-[#A25A32]'
                  }`}
                >
                  {copiedPix ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>

              {/* Details breakdown */}
              <div className="text-left text-xs border-t border-[#3A2E22]/10 pt-3 flex flex-col gap-1 text-[#7A6A57]">
                <div className="flex justify-between">
                  <span>Valor:</span>
                  <strong className="text-[#3A2E22] font-semibold">{formatBRL(finalAmountCents)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Beneficiário:</span>
                  <span className="text-[#3A2E22]">{DEFAULT_PIX_RECEIVER}</span>
                </div>
                <div className="flex justify-between">
                  <span>Chave Pix:</span>
                  <span className="text-[#3A2E22] font-mono">{DEFAULT_PIX_KEY}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmPix}
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-md bg-[#5C6748] hover:bg-[#485337] text-[#FCF9F3] font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando confirmação...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Já realizei o Pix (Avisar os noivos)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ================= STEP 3: CELEBRATION ================= */}
        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-amber-100 border border-amber-300 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-800">
              <Clock className="w-7 h-7 animate-pulse text-amber-700" />
            </div>

            <h3 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#A25A32] mb-2">
              Muito obrigado pelo carinho!
            </h3>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 text-xs font-semibold mb-4">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>Status: Aguardando confirmação</span>
            </div>

            <p className="text-sm text-[#7A6A57] max-w-sm mx-auto leading-relaxed mb-6">
              Sua contribuição para <strong>{gift.name}</strong> foi registrada! O item já ficou reservado na lista e os noivos irão validar o recebimento do Pix no painel.
            </p>

            <div className="bg-[#EFE3D0]/60 border border-[#3A2E22]/10 rounded-md p-4 mb-6 text-xs text-[#3A2E22] text-left space-y-1">
              <p>Presente: <strong>{gift.name}</strong></p>
              <p>Em nome de: <strong>{buyerName}</strong></p>
              <p>Valor: <strong>{formatBRL(finalAmountCents)}</strong></p>
            </div>

            <button
              onClick={onClose}
              className="py-3 px-8 rounded-md bg-[#C67C4E] hover:bg-[#A25A32] text-[#FCF9F3] font-semibold text-sm transition-all shadow-sm cursor-pointer"
            >
              Concluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
