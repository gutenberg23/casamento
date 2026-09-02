import React, { useState } from 'react';
import { Rsvp } from '../types';
import { submitRsvp } from '../services/api';
import { JasmineIcon } from './FloralMotifs';
import confetti from 'canvas-confetti';
import { Users, CheckCircle2, HeartHandshake, Loader2, Sparkles, Send } from 'lucide-react';

interface RsvpSectionProps {
  rsvps: Rsvp[];
  onRsvpSuccess: () => void;
}

export const RsvpSection: React.FC<RsvpSectionProps> = ({ rsvps, onRsvpSuccess }) => {
  const [name, setName] = useState('');
  const [attending, setAttending] = useState<'sim' | 'nao'>('sim');
  const [guests, setGuests] = useState<number>(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const confirmedGuestsCount = rsvps
    .filter(r => r.attending)
    .reduce((sum, r) => sum + (r.guests || 1), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!name.trim()) {
      setStatusMessage({ type: 'err', text: 'Por favor, preencha o seu nome completo antes de confirmar.' });
      return;
    }

    setLoading(true);
    try {
      await submitRsvp({
        name: name.trim(),
        attending: attending === 'sim',
        guests: attending === 'sim' ? guests : 0,
        message: message.trim() || undefined
      });

      if (attending === 'sim') {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#7C8862', '#C67C4E', '#E7C0AC']
        });
      }

      setStatusMessage({
        type: 'ok',
        text: attending === 'sim'
          ? 'Presença confirmada com sucesso! A gente te espera no dia 21 de outubro.'
          : 'Obrigado por nos avisar! Sentiremos sua falta na comemoração.'
      });

      setName('');
      setMessage('');
      onRsvpSuccess();
    } catch (err: any) {
      setStatusMessage({
        type: 'err',
        text: err.message || 'Não foi possível salvar a confirmação agora. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="confirmar" className="py-20 px-6 bg-[#EFE3D0]/60 relative border-t border-[#3A2E22]/10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center sm:text-left">
          <p className="text-sm font-semibold tracking-wide text-[#5C6748] mb-1 flex items-center justify-center sm:justify-start gap-1.5 uppercase">
            <JasmineIcon size={13} />
            <span>Confirmação</span>
          </p>
          <h2 className="font-serif-display text-3xl sm:text-4xl text-[#3A2E22] font-medium">
            Confirme sua presença
          </h2>
          <p className="mt-3 text-[#7A6A57] text-base max-w-xl leading-relaxed">
            Precisamos fechar o número com o espaço, então por favor confirme sua presença até o dia <strong>10 de outubro</strong>.
          </p>
        </div>

        <div className="bg-[#FCF9F3] border border-[#3A2E22]/15 rounded-lg p-6 sm:p-10 max-w-xl shadow-xs">
          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-[#7A6A57] uppercase tracking-wider mb-2">
                Seu nome completo *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nome e sobrenome"
                className="w-full px-3.5 py-2.5 bg-white border border-[#3A2E22]/15 rounded-md text-sm text-[#3A2E22] focus:outline-none focus:border-[#C67C4E]"
              />
            </div>

            {/* Attendance Toggle */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-[#7A6A57] uppercase tracking-wider mb-2">
                Você vai? *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAttending('sim')}
                  className={`py-2.5 px-4 rounded-md text-sm font-semibold border transition-all cursor-pointer ${
                    attending === 'sim'
                      ? 'bg-[#7C8862] text-white border-[#5C6748] shadow-2xs'
                      : 'bg-white text-[#7A6A57] border-[#3A2E22]/15 hover:border-[#7C8862]'
                  }`}
                >
                  ✓ Vou com tudo
                </button>
                <button
                  type="button"
                  onClick={() => setAttending('nao')}
                  className={`py-2.5 px-4 rounded-md text-sm font-semibold border transition-all cursor-pointer ${
                    attending === 'nao'
                      ? 'bg-[#A25A32] text-white border-[#A25A32] shadow-2xs'
                      : 'bg-white text-[#7A6A57] border-[#3A2E22]/15 hover:border-[#A25A32]'
                  }`}
                >
                  ✕ Não vou conseguir
                </button>
              </div>
            </div>

            {/* Guest Count (if attending) */}
            {attending === 'sim' && (
              <div className="mb-5 animate-fade-in">
                <label className="block text-xs font-semibold text-[#7A6A57] uppercase tracking-wider mb-2">
                  Quantas pessoas (incluindo você)?
                </label>
                <select
                  value={guests}
                  onChange={e => setGuests(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#3A2E22]/15 rounded-md text-sm text-[#3A2E22] focus:outline-none focus:border-[#C67C4E]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'pessoa' : 'pessoas'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Message */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-[#7A6A57] uppercase tracking-wider mb-2">
                Recado para os noivos (opcional)
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Deixe um carinho, um pedido musical ou o que quiser dizer aos noivos..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#3A2E22]/15 rounded-md text-sm text-[#3A2E22] focus:outline-none focus:border-[#C67C4E] resize-none"
              />
            </div>

            {/* Status Feedback */}
            {statusMessage && (
              <div
                className={`mb-5 p-3.5 rounded-md text-xs font-medium flex items-start gap-2.5 ${
                  statusMessage.type === 'ok'
                    ? 'bg-[#7C8862]/15 border border-[#7C8862]/30 text-[#5C6748]'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {statusMessage.type === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#5C6748] shrink-0 mt-0.5" />
                ) : null}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-md bg-[#C67C4E] hover:bg-[#A25A32] text-[#FCF9F3] font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando confirmação...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Confirmar presença</span>
                </>
              )}
            </button>
          </form>

          {/* Live RSVP Counter */}
          <div className="mt-6 pt-5 border-t border-[#3A2E22]/10 flex items-center gap-2 text-xs text-[#7A6A57]">
            <Users className="w-4 h-4 text-[#C67C4E]" />
            {confirmedGuestsCount === 0 ? (
              <span>Seja a primeira pessoa a confirmar!</span>
            ) : (
              <span>
                <strong className="text-[#A25A32] text-sm font-bold">{confirmedGuestsCount}</strong>{' '}
                {confirmedGuestsCount === 1 ? 'pessoa confirmada' : 'pessoas confirmadas'} até agora
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
