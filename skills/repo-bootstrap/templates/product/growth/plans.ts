/**
 * WHAT: Plans as data (growth module): the tier order, each tier's limits and features, and the
 *   limit → feature table that says where each limit is enforced and which error the UI receives.
 *   The server imports it to gate paid work; the UI imports it to render plan cards and upgrade
 *   prompts. Prices are NOT here: they come from the billing provider's catalog (synced or read at
 *   render time) so a price change never needs a deploy. If the repo must keep prices in config,
 *   they live only in this file, and `check-hardcoded-prices.mjs` keeps them out of the UI.
 * REPO SIGNAL: plans, quotas, trials or paywalls; a billing provider.
 * CONFIGURE: TIERS, LIMITS, FEATURES, LIMIT_TABLE. When the provider's product metadata holds the
 *   live limits, this file is the typed fallback and must mirror the dashboard, not the reverse.
 *   Erasable TypeScript only.
 */

export const TIERS = ['free', 'starter', 'pro'] as const
export type Tier = (typeof TIERS)[number]

export type LimitKey = 'generationsPerMonth' | 'projects' | 'seats'
export type FeatureKey = 'export' | 'autoPublish' | 'prioritySupport'

/** `null` = unlimited. */
export const LIMITS: Record<Tier, Record<LimitKey, number | null>> = {
  free: { generationsPerMonth: 7, projects: 1, seats: 1 },
  starter: { generationsPerMonth: 50, projects: 1, seats: 1 },
  pro: { generationsPerMonth: 400, projects: 10, seats: null },
}

export const FEATURES: Record<Tier, readonly FeatureKey[]> = {
  free: ['export'],
  starter: ['export', 'autoPublish'],
  pro: ['export', 'autoPublish', 'prioritySupport'],
}

/**
 * Where each limit and feature is enforced. `enforcedIn` names the server entry points that check
 * it before the paid work starts; `errorCode` is the typed error the UI maps to an upgrade prompt.
 */
export const LIMIT_TABLE: Record<LimitKey | FeatureKey, { enforcedIn: readonly string[]; errorCode: string }> = {
  generationsPerMonth: { enforcedIn: ['<generate entry point>'], errorCode: 'QUOTA_EXHAUSTED' },
  projects: { enforcedIn: ['<create project entry point>'], errorCode: 'PROJECT_LIMIT_REACHED' },
  seats: { enforcedIn: ['<invite member entry point>'], errorCode: 'SEAT_LIMIT_REACHED' },
  export: { enforcedIn: ['<export entry point>'], errorCode: 'FEATURE_NOT_IN_PLAN' },
  autoPublish: { enforcedIn: ['<toggle auto-publish entry point>', '<publish job>'], errorCode: 'FEATURE_NOT_IN_PLAN' },
  prioritySupport: { enforcedIn: ['<support routing>'], errorCode: 'FEATURE_NOT_IN_PLAN' },
}

export const hasFeature = (tier: Tier, feature: FeatureKey): boolean => FEATURES[tier].includes(feature)

export type LimitCheck = { ok: true; remaining: number | null } | { ok: false; code: string; limit: number }

/** Server-side check at the moment the paid work starts; `used` comes from the server's own count. */
export function checkLimit(tier: Tier, limit: LimitKey, used: number): LimitCheck {
  const max = LIMITS[tier][limit]
  if (max === null) return { ok: true, remaining: null }
  if (used >= max) return { ok: false, code: LIMIT_TABLE[limit].errorCode, limit: max }
  return { ok: true, remaining: max - used }
}

/** The cheapest tier that includes a feature, for the upgrade prompt. */
export const lowestTierWith = (feature: FeatureKey): Tier | undefined => TIERS.find((t) => hasFeature(t, feature))
