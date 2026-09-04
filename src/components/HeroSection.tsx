import React, { useState, useEffect } from 'react';
import { JasmineIcon } from './FloralMotifs';
import { Clock, Calendar, MapPin } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const targetDate = new Date('2026-10-21T17:30:00-03:00').getTime();

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <header className="relative overflow-hidden pt-20 pb-16 px-6 text-center">
      <div className="petal-field" />

      {/* Jasmine Sprig Motifs */}
      <svg
        className="absolute w-36 top-[-18px] left-[-24px] rotate-[-12deg] opacity-90 pointer-events-none"
        viewBox="0 0 160 220"
      >
        <use href="#jasmine-sprig" />
      </svg>
      <svg
        className="hidden md:block absolute w-32 bottom-[-10px] right-[-14px] rotate-[8deg] -scale-x-100 opacity-85 pointer-events-none"
        viewBox="0 0 160 220"
      >
        <use href="#jasmine-sprig" />
      </svg>

      <div className="max-w-2xl mx-auto relative z-10">
        <p className="text-sm font-semibold tracking-wider text-[#5C6748] mb-4 flex items-center justify-center gap-2 uppercase">
          <JasmineIcon size={14} />
          <span>Recepção de casamento</span>
          <JasmineIcon size={14} />
        </p>

        <h1 className="font-serif-display text-5xl sm:text-7xl md:text-8xl leading-none text-[#3A2E22] tracking-tight font-medium my-2">
          Iasmin
          <span className="block italic text-3xl sm:text-4xl md:text-5xl text-[#C67C4E] my-1 font-serif-display">
            &amp;
          </span>
          Gutenberg
        </h1>

        <div className="mt-8 space-y-3 text-[#7A6A57] text-lg sm:text-xl font-normal max-w-lg mx-auto leading-relaxed">
          <p>
            Em cada momento da nossa trajetória, Deus esteve conosco.
          </p>
          <p>
            E é com gratidão a Ele que queremos te convidar para essa nova etapa de nossas vidas.
          </p>
        </div>

        {/* Date Pill */}
        <div className="inline-flex flex-wrap items-center justify-center gap-3 mt-8 px-6 py-3 bg-[#FCF9F3] border border-[#3A2E22]/15 rounded-full text-[#3A2E22] text-sm sm:text-base shadow-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-4 h-4 text-[#C67C4E]" />
            21 de outubro de 2026
          </span>
          <span className="hidden sm:inline-block w-px h-4 bg-[#3A2E22]/20" />
          <span className="flex items-center gap-1.5 text-[#7A6A57]">
            <Clock className="w-4 h-4 text-[#7C8862]" />
            a partir das <b className="text-[#A25A32] font-semibold">17h30</b>
          </span>
        </div>

        {/* Live Countdown */}
        {!timeLeft.isPast && (
          <div className="mt-8 flex justify-center items-center gap-2 sm:gap-4 text-center">
            <div className="bg-[#FCF9F3]/90 border border-[#3A2E22]/10 rounded-lg px-3 py-2 min-w-[62px] sm:min-w-[72px] shadow-2xs">
              <span className="font-serif-display text-xl sm:text-2xl font-bold text-[#A25A32] block leading-tight">
                {timeLeft.days}
              </span>
              <span className="text-[10px] sm:text-xs text-[#7A6A57] uppercase tracking-wider">dias</span>
            </div>
            <span className="text-[#C67C4E] font-bold text-lg">:</span>
            <div className="bg-[#FCF9F3]/90 border border-[#3A2E22]/10 rounded-lg px-3 py-2 min-w-[62px] sm:min-w-[72px] shadow-2xs">
              <span className="font-serif-display text-xl sm:text-2xl font-bold text-[#A25A32] block leading-tight">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-[#7A6A57] uppercase tracking-wider">horas</span>
            </div>
            <span className="text-[#C67C4E] font-bold text-lg">:</span>
            <div className="bg-[#FCF9F3]/90 border border-[#3A2E22]/10 rounded-lg px-3 py-2 min-w-[62px] sm:min-w-[72px] shadow-2xs">
              <span className="font-serif-display text-xl sm:text-2xl font-bold text-[#A25A32] block leading-tight">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-[#7A6A57] uppercase tracking-wider">min</span>
            </div>
            <span className="text-[#C67C4E] font-bold text-lg">:</span>
            <div className="bg-[#FCF9F3]/90 border border-[#3A2E22]/10 rounded-lg px-3 py-2 min-w-[62px] sm:min-w-[72px] shadow-2xs">
              <span className="font-serif-display text-xl sm:text-2xl font-bold text-[#A25A32] block leading-tight">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-[#7A6A57] uppercase tracking-wider">seg</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
