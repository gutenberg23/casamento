import React from 'react';
import { Heart, Shield } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
  onOpenCheckup?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  return (
    <footer className="py-12 px-6 bg-[#FCF9F3] border-t border-[#3A2E22]/10 text-center text-xs text-[#7A6A57]">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
        <p className="font-serif-display italic text-lg text-[#A25A32] flex items-center gap-1.5">
          <span>Iasmin &amp; Gutenberg</span>
          <Heart className="w-3.5 h-3.5 fill-[#C67C4E] text-[#C67C4E]" />
        </p>

        <p className="max-w-md text-xs leading-relaxed">
          Celebrando o amor com nossos familiares e amigos mais queridos.<br />
          21 de outubro de 2026 · Espaço Picnic, Coelho da Rocha — RJ
        </p>

        <div className="flex items-center justify-center pt-2 border-t border-[#3A2E22]/10">
          <button
            onClick={onOpenAdmin}
            className="text-[11px] text-[#7A6A57] hover:text-[#A25A32] flex items-center gap-1 cursor-pointer"
          >
            <Shield className="w-3 h-3" />
            <span>Painel dos Noivos</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
