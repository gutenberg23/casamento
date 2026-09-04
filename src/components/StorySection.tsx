import React from 'react';

export const StorySection: React.FC = () => {
  return (
    <section id="recado" className="py-16 px-6 relative bg-transparent text-center">
      <div className="max-w-2xl mx-auto relative">
        <hr className="border-t border-[#3A2E22]/15 w-16 mx-auto mb-8" />

        <div className="mb-8">
          <p className="font-serif-display italic text-xl sm:text-2xl text-[#3A2E22] leading-relaxed max-w-xl mx-auto">
            “Acima de tudo, porém, revistam-se do amor, que é o elo perfeito.”
          </p>
          <span className="block text-xs uppercase tracking-widest text-[#5C6748] mt-2.5 font-semibold">
            Colossenses 3:14
          </span>
        </div>

        <p className="text-lg sm:text-xl text-[#7A6A57] leading-relaxed font-normal">
          Preparamos uma tarde especial de comida boa, música e gente querida
          no <strong className="text-[#3A2E22] font-semibold">Espaço Picnic</strong>, e nada nos deixaria mais felizes
          do que ter você lá com a gente para brindar a essa nova etapa.
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
