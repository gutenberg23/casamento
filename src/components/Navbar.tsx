import React, { useState } from 'react';
import { Menu, X, Heart, Shield } from 'lucide-react';

interface NavbarProps {
  onOpenAdmin: () => void;
  onOpenCheckup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAdmin, onOpenCheckup }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'A recepção', href: '#recado' },
    { label: 'Detalhes', href: '#detalhes' },
    { label: 'Presentes', href: '#presentes' },
    { label: 'Confirmar presença', href: '#confirmar' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#F7F1E6]/95 backdrop-blur-md border-b border-[#3A2E22]/15 transition-all">
      <div className="max-w-4xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <a
          href="#"
          className="font-serif-display text-xl italic font-semibold text-[#A25A32] tracking-wide flex items-center gap-1.5 hover:opacity-85 transition-opacity"
        >
          <span>I &amp; G</span>
          <Heart className="w-3.5 h-3.5 text-[#C67C4E] fill-[#C67C4E]/40 inline" />
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-[#7A6A57]">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-[#A25A32] transition-colors py-1 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1.5px] after:bg-[#A25A32] hover:after:w-full after:transition-all"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={onOpenCheckup}
            className="text-xs px-2.5 py-1 rounded border border-[#7C8862]/40 text-[#5C6748] hover:bg-[#7C8862]/10 transition-colors flex items-center gap-1"
            title="Diagnóstico e status das integrações"
          >
            <span>Check-up</span>
          </button>
        </div>

        {/* Mobile Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onOpenCheckup}
            className="p-1.5 text-xs rounded border border-[#7C8862]/40 text-[#5C6748]"
            title="Check-up do Sistema"
          >
            Check
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 text-[#3A2E22] hover:text-[#A25A32] transition-colors"
            aria-label="Abrir menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[#FCF9F3] border-b border-[#3A2E22]/15 px-6 py-4 flex flex-col gap-3 shadow-sm animate-fade-in">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-[#3A2E22] font-medium py-2 border-b border-[#3A2E22]/10 hover:text-[#A25A32]"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => {
              setMobileOpen(false);
              onOpenAdmin();
            }}
            className="text-left text-sm text-[#7A6A57] py-2 flex items-center gap-2 hover:text-[#A25A32]"
          >
            <Shield className="w-4 h-4" />
            <span>Painel dos noivos</span>
          </button>
        </div>
      )}
    </nav>
  );
};
