export type SubscriptionId =
  | 'netflix'
  | 'spotify'
  | 'hbomax'
  | 'primevideo'
  | 'disneyplus'
  | 'youtube'
  | 'globoplay'
  | 'apple'
  | 'chatgpt'
  | 'meliplus'
  | 'xbox'
  | 'psplus'
  | 'crunchyroll'
  | 'deezer'
  | 'wellhub'
  | 'canva';

export interface SubscriptionPreset {
  id: SubscriptionId;
  name: string;
  shortName: string;
  bgColor: string;
  fgColor: string;
  keywords: string[];
}

export const POPULAR_SUBSCRIPTIONS: SubscriptionPreset[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    shortName: 'N',
    bgColor: '#141414',
    fgColor: '#E50914',
    keywords: ['netflix'],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    shortName: 'Spot',
    bgColor: '#1DB954',
    fgColor: '#000000',
    keywords: ['spotify'],
  },
  {
    id: 'hbomax',
    name: 'HBO Max',
    shortName: 'MAX',
    bgColor: '#002BE7',
    fgColor: '#FFFFFF',
    keywords: ['hbo max', 'hbomax', 'hbo', 'max'],
  },
  {
    id: 'primevideo',
    name: 'Prime Video',
    shortName: 'Prime',
    bgColor: '#00A8E1',
    fgColor: '#FFFFFF',
    keywords: ['prime video', 'amazon prime', 'prime'],
  },
  {
    id: 'disneyplus',
    name: 'Disney+',
    shortName: 'D+',
    bgColor: '#040714',
    fgColor: '#38BDF8',
    keywords: ['disney+', 'disney plus', 'disney'],
  },
  {
    id: 'youtube',
    name: 'YouTube Premium',
    shortName: 'YT',
    bgColor: '#FF0000',
    fgColor: '#FFFFFF',
    keywords: ['youtube premium', 'youtube music', 'youtube'],
  },
  {
    id: 'globoplay',
    name: 'Globoplay',
    shortName: 'Globo',
    bgColor: '#FB0234',
    fgColor: '#FFFFFF',
    keywords: ['globoplay', 'globo play'],
  },
  {
    id: 'apple',
    name: 'Apple / iCloud+',
    shortName: 'Apple',
    bgColor: '#1C1C1E',
    fgColor: '#FFFFFF',
    keywords: ['icloud+', 'icloud', 'apple one', 'apple music', 'apple tv', 'apple'],
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT Plus',
    shortName: 'GPT',
    bgColor: '#10A37F',
    fgColor: '#FFFFFF',
    keywords: ['chatgpt', 'chat gpt', 'openai'],
  },
  {
    id: 'meliplus',
    name: 'Meli+',
    shortName: 'M+',
    bgColor: '#FFE600',
    fgColor: '#2D3277',
    keywords: ['meli+', 'meli mais', 'mercado livre'],
  },
  {
    id: 'xbox',
    name: 'Xbox Game Pass',
    shortName: 'Xbox',
    bgColor: '#107C10',
    fgColor: '#FFFFFF',
    keywords: ['game pass', 'xbox game pass', 'xbox'],
  },
  {
    id: 'psplus',
    name: 'PS Plus',
    shortName: 'PS+',
    bgColor: '#00439C',
    fgColor: '#FACC15',
    keywords: ['ps plus', 'playstation plus', 'psn'],
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    shortName: 'CR',
    bgColor: '#F47521',
    fgColor: '#FFFFFF',
    keywords: ['crunchyroll'],
  },
  {
    id: 'deezer',
    name: 'Deezer',
    shortName: 'Deezer',
    bgColor: '#A238FF',
    fgColor: '#FFFFFF',
    keywords: ['deezer'],
  },
  {
    id: 'wellhub',
    name: 'Wellhub / Gympass',
    shortName: 'Well',
    bgColor: '#FF5A5F',
    fgColor: '#FFFFFF',
    keywords: ['wellhub', 'gympass', 'totalpass'],
  },
  {
    id: 'canva',
    name: 'Canva Pro',
    shortName: 'Canva',
    bgColor: '#00C4CC',
    fgColor: '#FFFFFF',
    keywords: ['canva pro', 'canva'],
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function getSubscriptionById(subId?: string | null): SubscriptionPreset | undefined {
  if (!subId) return undefined;
  return POPULAR_SUBSCRIPTIONS.find((s) => s.id === subId);
}

export function matchSubscriptionByName(description: string): SubscriptionPreset | undefined {
  const normalized = normalizeText(description);
  if (!normalized) return undefined;

  const tokens = normalized.split(/[^a-z0-9+]+/).filter(Boolean);

  for (const sub of POPULAR_SUBSCRIPTIONS) {
    for (const kw of sub.keywords) {
      const normalizedKw = normalizeText(kw);
      if (normalizedKw.length <= 4) {
        if (tokens.includes(normalizedKw)) return sub;
      } else if (normalized.includes(normalizedKw)) {
        return sub;
      }
    }
  }

  return undefined;
}
