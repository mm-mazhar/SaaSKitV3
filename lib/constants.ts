// lib/constants.ts

// glassmorphism design - light shade for better visibility
export const GLASS_CARD =
  'bg-white/[0.08] backdrop-blur-md border border-border ring-1 ring-border/50'

// ✅ NEXT APP
export const LOCAL_SITE_URL = process.env.LOCAL_SITE_URL || 'http://localhost:3000'
export const PRODUCTION_URL = process.env.PRODUCTION_URL || ''
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || ''

// ✅ COLOR SCHEME AND MODE
export const DEFAULT_COLOR_SCHEME = `theme-green` as string
export const DEFAULT_THEME_MODE = `dark` as string

// ✅ LOCALE
export const LOCALE = `en_US`
export const DEFAULT_CURRENCY = `USD`
export const OPENAPI_SPEC_VERSION = `1.0.0`

export function formatPrice(
  price: string | number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = LOCALE
) {
  const amount = typeof price === 'string' ? Number(price) : price
  const resolvedLocale = locale.replace('_', '-')
  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount}`
  }
}

// ✅ SOCIALS AND SEO
export const NEXT_PUBLIC_SITE_NAME = `SaaS Kit V3` as string
export const APP_SLOGAN = `⚡ SaaS Kit -> Starter Template.` as string
export const APP_DESCRIPTION = `Ship your SaaS in a weekend, not a quarter.` as string
export const APP_DESCRIPTION_LONG =
  `Organizations, workspaces, roles, billing, and auth — wired up and production-ready, so you can start shipping your product on day one.` as string
export const KEYWORDS_LST: string[] = [
  'Saas,Next.js',
  'TypeScript',
  'Tailwind CSS',
  'ShadCN,Kinde',
  'Supabase',
]
  .flatMap((keywordGroup) => keywordGroup.split(','))
  .map((keyword) => keyword.trim())

// Define the HANDLES as the single source of truth.
export const SOCIAL_HANDLES = {
  twitter: '@yourdomain',
  youtube: '@yourchannel',
  facebook: 'yourdomain', // No '@' for Facebook pages
  instagram: 'yourdomain', // No '@'
  tiktok: '@yourdomain',
  linkedin: 'yourcompany', // This is the company slug, not a handle
}

// CONSTRUCT the full links from the handles.
export const SOCIAL_LINKS = {
  twitter: `https://x.com/${SOCIAL_HANDLES.twitter.replace('@', '')}`,
  youtube: `https://youtube.com/${SOCIAL_HANDLES.youtube}`,
  facebook: `https://facebook.com/${SOCIAL_HANDLES.facebook}`,
  instagram: `https://instagram.com/${SOCIAL_HANDLES.instagram}`,
  tiktok: `https://tiktok.com/${SOCIAL_HANDLES.tiktok}`,
  linkedin: `https://linkedin.com/company/${SOCIAL_HANDLES.linkedin}`,
}

// ✅ Contact
export const APP_EMAIL = `mail@example.com` as string
export const APP_OFFICE_ADDRESS = `Building Number: 2200, Street Name: Fairmount Avenue, Street Address: Philadelphia Museum of Art, 'Rocky Steps'
State: PA
City: Philadelphia
Post Code: 19130` as string
export const APP_PHONE_1 = `+1 xxx xxxx` as string
export const APP_PHONE_2 = `+1 xxx xxxx` as string

// ✅ Pricing
export const STRIPE_PRICE_ID_PLAN_A = (process.env.STRIPE_PRICE_ID_PLAN_A || '') as string
export const STRIPE_PRICE_ID_PLAN_B = (process.env.STRIPE_PRICE_ID_PLAN_B || '') as string
export const STRIPE_PRICE_ID_PLAN_C = (process.env.STRIPE_PRICE_ID_PLAN_C || '') as string
export const STRIPE_PRICE_ID_PLAN_D = (process.env.STRIPE_PRICE_ID_PLAN_D || '') as string

// ✅ Pricing Plan IDs
export const PRICE_HEADING = `Flexible plans, no hidden complexity` as string
export const PLAN_IDS = {
  free: 'free_plan_6bed8afe06ef1fcf',
  PLAN_A: 'Starter_8e3ad7cef805904d',
  PLAN_B: 'Team_2cbe76770e9993ab',
  PLAN_C: 'Agency_031ee42c1dc39ad0',
  PLAN_D: 'Partner_7f834c8687d31875',
} as const

// Workspace limits, per pricing plan
// Change ONLY the numbers below to adjust how many workspaces an organization on a
// given plan may create. Everything that enforces this limit (WorkspaceService) reads
// from this map, so there is nothing else to touch.
export const WORKSPACE_LIMITS_BY_PLAN: Record<PlanId, number> = {
  [PLAN_IDS.free]: 1,
  [PLAN_IDS.PLAN_A]: 2,
  [PLAN_IDS.PLAN_B]: 5,
  [PLAN_IDS.PLAN_C]: 10,
  [PLAN_IDS.PLAN_D]: 25,
}

// Helper function to generate features with dynamic workspace count
function getPlanFeatures(planId: PlanId): string[] {
  const workspaceLimit = WORKSPACE_LIMITS_BY_PLAN[planId]
  const workspaceText = workspaceLimit === 1 ? '1 workspace' : `${workspaceLimit} workspaces`

  switch (planId) {
    case PLAN_IDS.free:
      return ['Create an account', workspaceText, 'Community support']

    case PLAN_IDS.PLAN_A:
      return [
        workspaceText,
        'Role-based access for your whole team',
        'Stripe billing built in',
        'Email support',
      ]

    case PLAN_IDS.PLAN_B:
      return [
        `Everything in Starter`,
        `${workspaceText}`,
        'Invite teammates with granular workspace access',
        'Priority credit refills',
        'Standard support SLA',
      ]

    case PLAN_IDS.PLAN_C:
      return [
        `Everything in Team`,
        `${workspaceText}`,
        'Manage multiple client organizations',
        'Advanced audit and usage visibility',
        'Priority support',
      ]

    case PLAN_IDS.PLAN_D:
      return [
        `Everything in Agency`,
        `${workspaceText}`,
        'Highest workspace and credit limits',
        'Dedicated onboarding',
        'Priority support with faster response times',
      ]

    default:
      return []
  }
}

export const CREDITS_FREE: number = 2
export const CREDITS_PLAN_A: number = 3
export const CREDITS_PLAN_B: number = 10
export const CREDITS_PLAN_C: number = 100
export const CREDITS_PLAN_D: number = 200

export type PlanId = (typeof PLAN_IDS)[keyof typeof PLAN_IDS]

export type PricingPlan = {
  id: PlanId
  title: string
  price: string
  priceSuffix: string
  description: string
  credits: number
  features: string[]
  stripePriceId?: string // Optional because 'Free' plan has no Stripe ID
}

// Define the plans using the pricing strategy
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: PLAN_IDS.free,
    title: 'Free',
    price: '0',
    priceSuffix: '',
    description: 'Try it out, no credit card required.',
    credits: CREDITS_FREE,
    features: getPlanFeatures(PLAN_IDS.free),
    stripePriceId: undefined,
  },
  {
    id: PLAN_IDS.PLAN_A,
    title: 'Starter',
    price: '29.99',
    priceSuffix: ' PAYG',
    description: `For solo builders getting started. ${CREDITS_PLAN_A} credits included.`,
    credits: CREDITS_PLAN_A,
    features: getPlanFeatures(PLAN_IDS.PLAN_A),
    stripePriceId: STRIPE_PRICE_ID_PLAN_A,
  },
  {
    id: PLAN_IDS.PLAN_B,
    title: 'Team',
    price: '59.99',
    priceSuffix: '/mo',
    description: `For small teams shipping together. ${CREDITS_PLAN_B} credits included.`,
    credits: CREDITS_PLAN_B,
    features: getPlanFeatures(PLAN_IDS.PLAN_B),
    stripePriceId: STRIPE_PRICE_ID_PLAN_B,
  },
  {
    id: PLAN_IDS.PLAN_C,
    title: 'Agency',
    price: '199.99',
    priceSuffix: '/mo',
    description: `For growing agencies with multiple clients. ${CREDITS_PLAN_C} credits included.`,
    credits: CREDITS_PLAN_C,
    features: getPlanFeatures(PLAN_IDS.PLAN_C),
    stripePriceId: STRIPE_PRICE_ID_PLAN_C,
  },
  {
    id: PLAN_IDS.PLAN_D,
    title: 'Partner',
    price: '499.99',
    priceSuffix: '/mo',
    description: `For partners running at scale. ${CREDITS_PLAN_D} credits included.`,
    credits: CREDITS_PLAN_D,
    features: getPlanFeatures(PLAN_IDS.PLAN_D),
    stripePriceId: STRIPE_PRICE_ID_PLAN_D,
  },
]

// Per-project kill switch for the Partner tier. Flip this to false to pull
// Partner out of anywhere a customer could newly subscribe to it (the
// marketing pricing table, the dashboard billing/upgrade cards, and the
// createSubscription API) for a SaaS instance that isn't offering it.
//
// Partner is deliberately left in PRICING_PLANS itself regardless of this
// flag -- resolvePlanId, the Stripe webhook's credit-allocation lookup, and
// the admin dashboard all need to keep resolving a plan for anyone who is
// ALREADY subscribed to Partner from before this was turned off. Toggling
// this flag only stops new purchases; it never touches an existing
// subscriber's entitlements.
export const PARTNER_PLAN_ENABLED = false

/**
 * Which plans a customer can currently pick to subscribe/upgrade to.
 * Exported as a pure function (rather than only a derived constant) so it's
 * unit-testable against both states of the flag without needing to reload
 * the module -- see tests/unit/purchasable-plans.test.ts.
 */
export function getPurchasablePlans(
  plans: PricingPlan[] = PRICING_PLANS,
  partnerEnabled: boolean = PARTNER_PLAN_ENABLED
): PricingPlan[] {
  return plans.filter((p) => p.id !== PLAN_IDS.PLAN_D || partnerEnabled)
}

// The plans a customer can currently buy or upgrade to. Use this (not
// PRICING_PLANS) anywhere a UI or API is offering a plan for *new* purchase;
// keep using PRICING_PLANS for resolving a plan an org already has.
export const PURCHASABLE_PLANS = getPurchasablePlans()

export const RENEWAL_REMINDER_DAYS_BEFORE = 3
export const CREDIT_REMINDER_THRESHOLD = 4
export const FREE_REFILL_DAYS = 30
export const SOFT_DELETE_RETENTION_DAYS = 30
// ✅ Subscription Renewal
export const SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD = 20
export const ENABLE_EMAILS = true
export const CHECK_DISPOSABLE_EMAILS = true
export const INVITE_EXPIRATION_MS = 60 * 60 * 1000

// ✅ Multi-Tenancy Limits & Configuration
const MAX_ORG_ENV_PUBLIC = Number(process.env.NEXT_PUBLIC_MAX_ORGANIZATIONS_PER_USER)
const MAX_ORG_ENV_SERVER = Number(process.env.MAX_ORGANIZATIONS_PER_USER)
const MAX_ORG_ENV =
  Number.isFinite(MAX_ORG_ENV_PUBLIC) && MAX_ORG_ENV_PUBLIC > 0
    ? MAX_ORG_ENV_PUBLIC
    : MAX_ORG_ENV_SERVER
const RESOLVED_MAX_ORGS =
  Number.isFinite(MAX_ORG_ENV) && MAX_ORG_ENV > 0 ? MAX_ORG_ENV : 1

export const LIMITS = {
  MAX_ORGANIZATIONS_PER_USER: RESOLVED_MAX_ORGS,
  MAX_MEMBERS_PER_ORGANIZATION: 5,
  MAX_PENDING_INVITES_PER_ORG: 3,
} as const

/**
 * Resolves an organization's current PlanId from its subscription's Stripe price id.
 * Falls back to the free plan when there is no active subscription.
 */
export function resolvePlanId(stripePriceId?: string | null): PlanId {
  if (!stripePriceId) return PLAN_IDS.free
  const plan = PRICING_PLANS.find(
    (p) => p.stripePriceId === stripePriceId || p.id === stripePriceId
  )
  return plan?.id ?? PLAN_IDS.free
}

/**
 * Resolves an organization's effective PlanId, accounting for plans sold as a
 * one-time Stripe Checkout payment (e.g. Starter -- see billingRouter's
 * `isOneTime` branch) in addition to recurring subscriptions.
 *
 * A one-time purchase never creates a Subscription row, so resolving strictly
 * from `subscription.planId` (the old behavior) permanently misclassifies a
 * legitimate one-time-plan purchaser as Free -- blocking plan-gated features
 * (workspace limits, invites) even though they paid. This resolver checks the
 * recurring subscription first and falls back to the organization's
 * `oneTimePlanId` (set by the webhook when a one-time payment succeeds).
 *
 * Deliberately does NOT infer a plan from `credits > 0`: leftover free-tier
 * credits or credits transferred in from a deleted organization are not
 * evidence of a purchased plan.
 */
export function resolveEffectivePlanId(
  subscriptionPlanId?: string | null,
  oneTimePlanId?: string | null
): PlanId {
  const fromSubscription = resolvePlanId(subscriptionPlanId)
  if (fromSubscription !== PLAN_IDS.free) return fromSubscription
  return resolvePlanId(oneTimePlanId)
}

/**
 * Returns the max number of workspaces an organization on the given plan may have.
 */
export function getWorkspaceLimit(planId: PlanId): number {
  return WORKSPACE_LIMITS_BY_PLAN[planId] ?? WORKSPACE_LIMITS_BY_PLAN[PLAN_IDS.free]
}

export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const

export type OrganizationRole = keyof typeof ROLES

// Testimonials section on Main Landing Page
export const TESTIMONIAL_TICKER_ENABLED = true

export type Testimonial = {
  quote: string
  name: string
  title: string
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      '“We went from an empty repo to billing customers in a weekend. The org and workspace model saved us weeks of scaffolding.”',
    name: 'Marcus T.',
    title: 'Founder, indie SaaS',
  },
  {
    quote:
      '“The role-based workspace access was exactly what we needed for client work — each client only sees their own space.”',
    name: 'Priya S.',
    title: 'Agency owner',
  },
  {
    quote:
      '“Stripe billing, invites, and RBAC all wired together out of the box. We just changed the copy and shipped.”',
    name: 'Daniel R.',
    title: 'CTO, early-stage startup',
  },
  {
    quote:
      '“Clean Prisma schema, typed API layer, sensible defaults everywhere. This is what a starter kit should feel like.”',
    name: 'Jasmine L.',
    title: 'Full-stack engineer',
  },
  {
    quote:
      '“Our team was managing three client workspaces within the first day, each with different access levels.”',
    name: 'Kevin M.',
    title: 'Product lead',
  },
  {
    quote:
      '“Saved us the multi-tenant auth headache entirely. We focused on our actual product from day one.”',
    name: 'Elena G.',
    title: 'Solo developer',
  },
]


export const LOGO_PATH = `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/storage/v1/object/public/assets/logo-01.png`;