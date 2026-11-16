import { describe, it, expect } from 'vitest';
import {
  POPULAR_SUBSCRIPTIONS,
  getSubscriptionById,
  matchSubscriptionByName,
} from './subscriptions';

describe('popular subscription presets & matching', () => {
  it('includes core requested streaming and music subscriptions', () => {
    const ids = POPULAR_SUBSCRIPTIONS.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining(['netflix', 'hbomax', 'primevideo', 'disneyplus', 'spotify'])
    );
    expect(POPULAR_SUBSCRIPTIONS).toHaveLength(16);
  });

  it('matches subscription names regardless of casing or extra details', () => {
    expect(matchSubscriptionByName('Netflix')?.id).toBe('netflix');
    expect(matchSubscriptionByName('Netflix 4K Família')?.id).toBe('netflix');
    expect(matchSubscriptionByName('HBO Max')?.id).toBe('hbomax');
    expect(matchSubscriptionByName('Max')?.id).toBe('hbomax');
    expect(matchSubscriptionByName('Prime Video')?.id).toBe('primevideo');
    expect(matchSubscriptionByName('Amazon Prime')?.id).toBe('primevideo');
    expect(matchSubscriptionByName('Disney+')?.id).toBe('disneyplus');
    expect(matchSubscriptionByName('Spotify Duo')?.id).toBe('spotify');
    expect(matchSubscriptionByName('YouTube Premium')?.id).toBe('youtube');
    expect(matchSubscriptionByName('ChatGPT Plus')?.id).toBe('chatgpt');
    expect(matchSubscriptionByName('iCloud+ 200GB')?.id).toBe('apple');
  });

  it('does not match unrelated descriptions', () => {
    expect(matchSubscriptionByName('Almoço Executivo')).toBeUndefined();
    expect(matchSubscriptionByName('Maximiliano Uber')).toBeUndefined();
    expect(matchSubscriptionByName('')).toBeUndefined();
    expect(getSubscriptionById('spotify')?.name).toBe('Spotify');
  });
});
