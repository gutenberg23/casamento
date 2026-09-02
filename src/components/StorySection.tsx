import React from 'react';

export const StorySection: React.FC = () => {
  return (
    <section id="recado" className="py-16 px-6 relative bg-transparent text-center">
      <div className="max-w-2xl mx-auto relative">
        <hr className="border-t border-[#3A2E22]/15 w-16 mx-auto mb-8" />

        <p className="text-lg sm:text-xl text-[#7A6A57] leading-relaxed font-normal">
          Já assinamos os papéis — agora é hora de brindar. Preparamos uma tarde de comida boa, música e gente querida
          no <strong className="text-[#3A2E22] font-semibold">Espaço Picnic</strong>, e nada nos deixaria mais felizes
          do que ter você lá com a gente.
        </p>

        <span className="block mt-7 font-serif-display italic text-2xl sm:text-3xl text-[#A25A32]">
          Com carinho, Iasmin &amp; Gutenberg
        </span>

        {/* Decorative Jasmine Blooms */}
        <div className="flex justify-center items-center gap-6 mt-6 opacity-80 pointer-events-none">
          <svg className="w-16 rotate-[-10deg]" viewBox="0 0 120 130">
            <use href="#jasmine-sprig-small" />
          </svg>
          <svg className="w-16 rotate-[10deg] -scale-x-100 hidden sm:block" viewBox="0 0 120 130">
            <use href="#jasmine-sprig-small" />
          </svg>
        </div>
      </div>
    </section>
  );
};
