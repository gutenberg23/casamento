import React from 'react';

export const JasmineSvgDefs: React.FC = () => (
  <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
    <defs>
      <g id="jasmine-bloom">
        <g fill="#FCF9F3" stroke="#C67C4E" strokeWidth="0.6">
          <ellipse cx="0" cy="-9" rx="3.6" ry="9" />
          <ellipse cx="0" cy="-9" rx="3.6" ry="9" transform="rotate(72)" />
          <ellipse cx="0" cy="-9" rx="3.6" ry="9" transform="rotate(144)" />
          <ellipse cx="0" cy="-9" rx="3.6" ry="9" transform="rotate(216)" />
          <ellipse cx="0" cy="-9" rx="3.6" ry="9" transform="rotate(288)" />
        </g>
        <circle cx="0" cy="0" r="2.3" fill="#C67C4E" />
      </g>

      <g id="jasmine-bloom-blush">
        <g fill="#E7C0AC" stroke="#A25A32" strokeWidth="0.6">
          <ellipse cx="0" cy="-9" rx="3.6" ry="9" />
          <ellipse cx="0" cy="-9" rx="3.6" ry="9" transform="rotate(72)" />
          <ellipse cx="0" cy="-9" rx="3.6" ry="9" transform="rotate(144)" />
          <ellipse cx="0" cy="-9" rx="3.6" ry="9" transform="rotate(216)" />
          <ellipse cx="0" cy="-9" rx="3.6" ry="9" transform="rotate(288)" />
        </g>
        <circle cx="0" cy="0" r="2.3" fill="#A25A32" />
      </g>

      <symbol id="jasmine-sprig" viewBox="0 0 160 220">
        <path d="M80,214 C74,174 88,144 70,114 C58,94 74,64 62,32" fill="none" stroke="#7C8862" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M70,114 C86,108 98,96 114,100" fill="none" stroke="#7C8862" strokeWidth="2" strokeLinecap="round" />
        <path d="M76,156 C62,154 52,164 42,158" fill="none" stroke="#7C8862" strokeWidth="2" strokeLinecap="round" />
        <path d="M48,156 C42,150 42,142 50,138 C56,144 56,152 48,156 Z" fill="#7C8862" />
        <path d="M110,102 C116,96 124,96 128,104 C122,110 114,108 110,102 Z" fill="#5C6748" />
        <path d="M66,64 C60,58 60,50 68,46 C74,52 74,60 66,64 Z" fill="#7C8862" />
        <ellipse cx="84" cy="76" rx="3" ry="5" fill="#E7C0AC" transform="rotate(24 84 76)" />
        <use href="#jasmine-bloom" transform="translate(62,28) scale(1.4)" />
        <use href="#jasmine-bloom" transform="translate(116,100) scale(0.9)" />
        <use href="#jasmine-bloom" transform="translate(40,156) scale(0.75)" />
      </symbol>

      <symbol id="jasmine-sprig-small" viewBox="0 0 120 130">
        <path d="M60,126 C56,98 66,80 54,58 C48,46 58,30 50,14" fill="none" stroke="#7C8862" strokeWidth="2" strokeLinecap="round" />
        <path d="M54,58 C66,54 74,46 84,50" fill="none" stroke="#7C8862" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M40,50 C35,45 35,39 41,36 C46,41 46,48 40,50 Z" fill="#7C8862" />
        <path d="M80,46 C85,41 91,41 94,47 C90,52 84,51 80,46 Z" fill="#5C6748" />
        <use href="#jasmine-bloom-blush" transform="translate(50,13) scale(1.1)" />
        <use href="#jasmine-bloom" transform="translate(86,49) scale(0.7)" />
      </symbol>
    </defs>
  </svg>
);

export const JasmineIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 16 }) => (
  <svg
    viewBox="-12 -12 24 24"
    width={size}
    height={size}
    className={`inline-block align-middle ${className}`}
    aria-hidden="true"
  >
    <use href="#jasmine-bloom" />
  </svg>
);
