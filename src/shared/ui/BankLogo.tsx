import React from 'react';
import { BankPreset } from '@/shared/lib/banks';

export interface BankLogoProps {
  bank?: BankPreset;
  size?: 'xs' | 'sm' | 'md';
  fallback?: React.ReactNode;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<BankLogoProps['size']>, string> = {
  xs: 'w-4 h-4 rounded-[5px]',
  sm: 'w-8 h-8 rounded-xl',
  md: 'w-10 h-10 rounded-xl',
};

function renderBankGlyph(bank: BankPreset, size: NonNullable<BankLogoProps['size']>): React.ReactNode {
  const isTiny = size === 'xs';

  switch (bank.id) {
    case 'nubank':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M8.5 22.5V13.2c0-2.6 1.8-4.2 4-4.2 2 0 3.5 1.3 3.5 3.6v9.9h2.2v-9.9c0-2.3 1.5-3.6 3.5-3.6 2.2 0 3.8 1.6 3.8 4.2v9.3"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={isTiny ? 3 : 2.3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'itau':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <rect x="4" y="4" width="24" height="24" rx="6" fill="#003399" />
          <text
            x="16"
            y="19.5"
            textAnchor="middle"
            fill="#FCEE21"
            fontSize="9.5"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
            letterSpacing="-0.4"
          >
            Itaú
          </text>
        </svg>
      );

    case 'inter':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <circle cx="16" cy="9.5" r="2.2" fill="#FFFFFF" />
          <path
            d="M16 14v9"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'bradesco':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M8.5 22c1.2-6 6-10 12.8-10.5M12.5 22.5c1-4 4.3-6.5 8.8-6.8M16 16.5v6"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'santander':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M16 7.5c-1.5 2.4-1.2 4.2.4 5.9 1.3 1.4 1.4 3 .2 4.6m-4.8-5.8c-1.5 2.2-1.2 3.9.4 5.4 1.2 1.2 1.3 2.6.2 4.1m7.6-9.5c-1.4 2.1-1.1 3.8.4 5.3 1.2 1.2 1.2 2.7.1 4.2"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M7.5 22.5c2.2 1.8 5.2 2.6 8.5 2.6s6.3-.8 8.5-2.6"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'bb':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M16 6l8.5 5.8-8.5 5.8-8.5-5.8L16 6zm0 8.4l8.5 5.8L16 26l-8.5-5.8 8.5-5.8z"
            fill="none"
            stroke="#0038A8"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'caixa':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path d="M9 10l6.5 6L9 22" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M23 10l-6.5 6L23 22" stroke="#F39200" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );

    case 'btg':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <text
            x="16"
            y="19.5"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
            letterSpacing="-0.5"
          >
            BTG
          </text>
        </svg>
      );

    case 'c6':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <rect x="2.5" y="2.5" width="27" height="27" rx="7" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.4" />
          <text
            x="16"
            y="20"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="11.5"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
            letterSpacing="-0.5"
          >
            C6
          </text>
        </svg>
      );

    case 'mercadopago':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <ellipse cx="16" cy="16" rx="10.5" ry="7.2" fill="none" stroke="#FFFFFF" strokeWidth="2.1" />
          <path
            d="M10.5 16.2c2-1.8 4-1.8 5.5 0s3.5 1.8 5.5 0"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'picpay':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M12 22.5V9.5h5.2a4.3 4.3 0 010 8.6H12"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'xp':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <rect x="2.5" y="2.5" width="27" height="27" rx="7" fill="none" stroke="#FACC15" strokeOpacity="0.45" strokeWidth="1.4" />
          <text
            x="16"
            y="20"
            textAnchor="middle"
            fill="#FACC15"
            fontSize="11.5"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            letterSpacing="-0.5"
          >
            XP
          </text>
        </svg>
      );

    case 'sicredi':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M16 7.5v17M7.5 16h17M10 10l12 12M22 10L10 22"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'sicoob':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M16 8l8.5 14.5h-17L16 8z"
            fill="none"
            stroke="#00AE9D"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="17.5" r="2.2" fill="#FFFFFF" />
        </svg>
      );

    case 'neon':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M10.5 22V10.5l11 11V10.5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export const BankLogo: React.FC<BankLogoProps> = ({
  bank,
  size = 'md',
  fallback,
  className = '',
}) => {
  const sizeClass = SIZE_CLASSES[size];

  if (!bank) {
    return (
      <div
        className={`${sizeClass} bg-[var(--surface-2)] flex items-center justify-center text-[var(--primary)] shrink-0 ${className}`}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${className}`}
      style={{ backgroundColor: bank.bgColor, color: bank.fgColor }}
    >
      {renderBankGlyph(bank, size)}
    </div>
  );
};
