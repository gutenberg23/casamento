import React, { useState } from 'react';
import { JasmineIcon } from './FloralMotifs';
import { Calendar, Clock, MapPin, ExternalLink, Download, Check } from 'lucide-react';

const InstagramIcon: React.FC<{ className?: string }> = ({ className = "w-3 h-3" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const DetailsSection: React.FC = () => {
  const [downloadedIcs, setDownloadedIcs] = useState(false);

  const handleDownloadIcs = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Casamento Iasmin & Gutenberg//PT',
      'BEGIN:VEVENT',
      'UID:casamento-iasmin-gutenberg-20261021@picnic',
      'DTSTAMP:20260901T120000Z',
      'DTSTART:20261021T203000Z',
      'DTEND:20261022T030000Z',
      'SUMMARY:Casamento Iasmin & Gutenberg (Recepção)',
      'DESCRIPTION:Recepção e comemoração do casamento de Iasmin & Gutenberg no Espaço Picnic.',
      'LOCATION:Espaço Picnic - R. Marcílio Dias, 28 - Coelho da Rocha, São João de Meriti - RJ',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'casamento-iasmin-e-gutenberg.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadedIcs(true);
    setTimeout(() => setDownloadedIcs(false), 3000);
  };

  return (
    <section id="detalhes" className="py-20 px-6 bg-[#EFE3D0]/60 relative border-y border-[#3A2E22]/10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center sm:text-left">
          <p className="text-sm font-semibold tracking-wide text-[#5C6748] mb-1 flex items-center justify-center sm:justify-start gap-1.5 uppercase">
            <JasmineIcon size={13} />
            <span>Detalhes</span>
          </p>
          <h2 className="font-serif-display text-3xl sm:text-4xl text-[#3A2E22] font-medium">
            Onde e quando
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#3A2E22]/15 border border-[#3A2E22]/15 rounded-sm overflow-hidden shadow-xs">
          {/* Card 1: Data */}
          <div className="bg-[#FCF9F3] p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#5C6748] text-xs uppercase tracking-wider font-semibold mb-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Data</span>
              </div>
              <p className="font-serif-display text-2xl sm:text-3xl text-[#3A2E22] font-medium mb-1">
                21 de outubro
              </p>
              <p className="text-sm text-[#7A6A57]">Quarta-feira, 2026</p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#3A2E22]/10">
              <button
                onClick={handleDownloadIcs}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A25A32] hover:text-[#C67C4E] transition-colors"
              >
                {downloadedIcs ? <Check className="w-3.5 h-3.5 text-[#5C6748]" /> : <Download className="w-3.5 h-3.5" />}
                <span>{downloadedIcs ? 'Adicionado ao calendário!' : 'Adicionar ao calendário'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Horário */}
          <div className="bg-[#FCF9F3] p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#5C6748] text-xs uppercase tracking-wider font-semibold mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Horário</span>
              </div>
              <p className="font-serif-display text-2xl sm:text-3xl text-[#3A2E22] font-medium mb-1">
                17h30
              </p>
              <p className="text-sm text-[#7A6A57]">Chegue no seu tempo, a celebração começa aí.</p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#3A2E22]/10">
              <span className="text-xs text-[#7A6A57]">Até as 22h!</span>
            </div>
          </div>

          {/* Card 3: Local */}
          <div className="bg-[#FCF9F3] p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#5C6748] text-xs uppercase tracking-wider font-semibold mb-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>Local</span>
              </div>
              <p className="font-serif-display text-2xl sm:text-3xl text-[#3A2E22] font-medium mb-1">
                Espaço Picnic
              </p>
              <p className="text-sm text-[#7A6A57] leading-snug">
                R. Marcílio Dias, 28 — Coelho da Rocha, São João de Meriti, RJ
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#3A2E22]/10 flex flex-col gap-2">
              <a
                href="https://maps.app.goo.gl/TyYCr2Bo8gVx3nkb7"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#A25A32] hover:text-[#C67C4E] transition-colors"
              >
                <span>Ver localização no mapa</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://www.instagram.com/espacopicnic.rj/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#7A6A57] hover:text-[#3A2E22] transition-colors"
              >
                <InstagramIcon className="w-3 h-3" />
                <span>@espacopicnic.rj</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
