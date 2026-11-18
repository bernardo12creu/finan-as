import React from 'react';
import { SubscriptionPreset } from '@/shared/lib/subscriptions';

export interface SubscriptionLogoProps {
  subscription?: SubscriptionPreset;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fallback?: React.ReactNode;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<SubscriptionLogoProps['size']>, string> = {
  xs: 'w-4 h-4 rounded-[5px]',
  sm: 'w-7 h-7 rounded-lg',
  md: 'w-9 h-9 rounded-xl',
  lg: 'w-11 h-11 rounded-2xl',
};

function renderSubscriptionGlyph(sub: SubscriptionPreset): React.ReactNode {
  switch (sub.id) {
    case 'netflix':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path d="M9 25V7h3.5v18H9z" fill="#B20710" />
          <path d="M19.5 25V7H23v18h-3.5z" fill="#B20710" />
          <path d="M9 7h3.5L23 25h-3.5L9 7z" fill="#E50914" />
        </svg>
      );

    case 'spotify':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M8.2 12.2c5.3-1.6 11.4-1.2 16 .9"
            fill="none"
            stroke="#000000"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M9.5 16.5c4.4-1.3 9.4-.9 13.1.8"
            fill="none"
            stroke="#000000"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M10.8 20.6c3.4-.9 7.3-.6 10.2.7"
            fill="none"
            stroke="#000000"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'hbomax':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <text
            x="16"
            y="19.5"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            letterSpacing="-0.6"
          >
            MAX
          </text>
          <circle cx="15.8" cy="15.8" r="1.4" fill="#002BE7" />
        </svg>
      );

    case 'primevideo':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <text
            x="16"
            y="15.5"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="8.2"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
            letterSpacing="-0.3"
          >
            prime
          </text>
          <path
            d="M8 19.5c4.8 3.6 10.8 3.8 15.8.4"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M21.2 18.8l3.2.8-.9 3.1"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'disneyplus':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M6.5 14c4.5-6.2 14.5-6.2 19 0"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <text
            x="16"
            y="22.5"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="12.5"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
            letterSpacing="-0.4"
          >
            D+
          </text>
        </svg>
      );

    case 'youtube':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <rect x="4.5" y="7.5" width="23" height="17" rx="5" fill="#FFFFFF" />
          <path d="M13.5 12v8l7-4-7-4z" fill="#FF0000" />
        </svg>
      );

    case 'globoplay':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <circle cx="16" cy="16" r="9.5" fill="none" stroke="#FFFFFF" strokeWidth="2.3" />
          <path d="M13.5 11.5v9l7-4.5-7-4.5z" fill="#FFFFFF" />
        </svg>
      );

    case 'apple':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M11 22h10.2a4.3 4.3 0 00.6-8.5 5.6 5.6 0 00-10.7-1.4A4.6 4.6 0 0011 22z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'chatgpt':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <polygon
            points="16,6 24.5,11 24.5,21 16,26 7.5,21 7.5,11"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="16" r="3" fill="#FFFFFF" />
        </svg>
      );

    case 'meliplus':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <text
            x="16"
            y="20.5"
            textAnchor="middle"
            fill="#2D3277"
            fontSize="12.5"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            letterSpacing="-0.5"
          >
            M+
          </text>
        </svg>
      );

    case 'xbox':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <circle cx="16" cy="16" r="9.5" fill="none" stroke="#FFFFFF" strokeWidth="2.1" />
          <path
            d="M10.5 10.5c3.5 3.2 7.5 6.8 11 11M21.5 10.5c-3.5 3.2-7.5 6.8-11 11"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'psplus':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path d="M16 8.5v15M8.5 16h15" stroke="#FACC15" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case 'crunchyroll':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <circle cx="16" cy="16" r="9" fill="#FFFFFF" />
          <circle cx="18.2" cy="15.2" r="4.6" fill="#F47521" />
        </svg>
      );

    case 'deezer':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M8.5 22v-5M13.5 22v-9M18.5 22v-12M23.5 22v-7"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'wellhub':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M7.5 11.5l4.2 10 4.3-7 4.3 7 4.2-10"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'canva':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <path
            d="M21.5 11.8a6.8 6.8 0 100 8.4"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'gemini':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient
              id="geminiGrad"
              x1="6"
              y1="6"
              x2="26"
              y2="26"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#4E82EE" />
              <stop offset="50%" stopColor="#9B72CB" />
              <stop offset="100%" stopColor="#D96570" />
            </linearGradient>
          </defs>
          <path
            d="M16 4C16.8 11.4 20.6 15.2 28 16C20.6 16.8 16.8 20.6 16 28C15.2 20.6 11.4 16.8 4 16C11.4 15.2 15.2 11.4 16 4Z"
            fill="url(#geminiGrad)"
          />
        </svg>
      );
  }
}

export const SubscriptionLogo: React.FC<SubscriptionLogoProps> = ({
  subscription,
  size = 'sm',
  fallback,
  className = '',
}) => {
  const sizeClass = SIZE_CLASSES[size];

  if (!subscription) {
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
      style={{ backgroundColor: subscription.bgColor, color: subscription.fgColor }}
    >
      {renderSubscriptionGlyph(subscription)}
    </div>
  );
};
