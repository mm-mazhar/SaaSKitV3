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
export const APP_DESCRIPTION = `SaaS Kit V3.` as string
export const APP_DESCRIPTION_LONG =
  `Non eiusmod elit ipsum ea cillum eiusmod dolor ipsum sunt veniam nisi aliqua et tempor..` as string
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

// A new type definition for a pricing plan
export const PRICE_HEADING = `Flexible plans, no hidden complexity` as string
export const PLAN_IDS = {
  free: 'free_plan_6bed8afe06ef1fcf',
  PLAN_A: 'Starter_8e3ad7cef805904d',
  PLAN_B: 'Team_2cbe76770e9993ab',
  PLAN_C: 'Agency_031ee42c1dc39ad0',
  PLAN_D: 'Partner_7f834c8687d31875',
} as const

export const CREDITS_FREE: number = 0
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
    description: 'Create an account to save your search history.',
    credits: CREDITS_FREE,
    features: ['Account Creation', 'Save Search History'],
    stripePriceId: undefined,
  },
  {
    id: PLAN_IDS.PLAN_A,
    title: 'Starter', // old -> Basic Report
    price: '29.99',
    priceSuffix: ' one-time',
    description: `dolor officia proident eiusmod eiusmod. Credits: ${CREDITS_PLAN_A}`,
    credits: CREDITS_PLAN_A,
    features: [
      'Nulla culpa aute duis officia qui in duis do occaecat.',
      'Ut qui dolor esse dolor officia proident eiusmod eiusmod reprehenderit.',
      'Qui sit nulla sunt ea.',
      'Fugiat minim nostrud veniam mollit esse ipsum officia dolor esse eiusmod dolore dolor Lorem.',
    ],
    stripePriceId: STRIPE_PRICE_ID_PLAN_A,
  },
  {
    id: PLAN_IDS.PLAN_B,
    title: 'Team', // old -> Pro Plan
    price: '59.99',
    priceSuffix: '/mo',
    description: `For power Users/flippers. Credits: ${CREDITS_PLAN_B}`,
    credits: CREDITS_PLAN_B,
    features: [
      'Nulla culpa aute duis officia qui in duis do occaecat.',
      'Ut qui dolor esse dolor officia proident eiusmod eiusmod reprehenderit.',
      'Qui sit nulla sunt ea.',
      'Fugiat minim nostrud veniam mollit esse ipsum officia dolor esse eiusmod dolore dolor Lorem.',
    ],
    stripePriceId: STRIPE_PRICE_ID_PLAN_B,
  },
  {
    id: PLAN_IDS.PLAN_C,
    title: 'Agency', // old -> Dealer Core
    price: '199.99',
    priceSuffix: '/mo',
    description: `For small used car lots. Credits: ${CREDITS_PLAN_C}`,
    credits: CREDITS_PLAN_C,
    features: [
      'Nulla culpa aute duis officia qui in duis do occaecat.',
      'Ut qui dolor esse dolor officia proident eiusmod eiusmod reprehenderit.',
      'Qui sit nulla sunt ea.',
      'Fugiat minim nostrud veniam mollit esse ipsum officia dolor esse eiusmod dolore dolor Lorem.',
    ],
    stripePriceId: STRIPE_PRICE_ID_PLAN_C,
  },
  {
    id: PLAN_IDS.PLAN_D,
    title: 'Partner', // old -> Dealer Plus
    price: '499.99',
    priceSuffix: '/mo',
    description: `dolor officia proident. Credits: ${CREDITS_PLAN_D}`,
    credits: CREDITS_PLAN_D,
    features: [
      'Nulla culpa aute duis officia qui in duis do occaecat.',
      'Ut qui dolor esse dolor officia proident eiusmod eiusmod reprehenderit.',
      'Qui sit nulla sunt ea.',
      'Fugiat minim nostrud veniam mollit esse ipsum officia dolor esse eiusmod dolore dolor Lorem.',
    ],
    stripePriceId: STRIPE_PRICE_ID_PLAN_D,
  },
]

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
  MAX_WORKSPACES_PER_ORGANIZATION: 5,
  MAX_MEMBERS_PER_ORGANIZATION: 5,
  MAX_PENDING_INVITES_PER_ORG: 3,
} as const

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
      '“Eu ipsum magna esse sunt velit fugiat id deserunt laboris minim incididunt sunt nostrud reprehenderit.”',
    name: 'Marcus T.',
    title: 'Used truck shopper',
  },
  {
    quote:
      '“Enim qui amet ad Lorem qui fugiat aliquip do amet.”',
    name: 'Priya S.',
    title: 'First-time buyer'
  },
  {
    quote:
      '“Occaecat laboris occaecat quis consectetur irure laboris enim ad non mollit voluptate esse incididunt consectetur.”',
    name: 'Daniel R.',
    title: 'Remote marketplace buyer',
  },
  {
    quote:
      '“Enim qui amet ad Lorem qui fugiat aliquip do amet.”',
    name: 'Jasmine L.',
    title: 'Independent auto broker',
  },
  {
    quote:
      '“”',
    name: 'Kevin M.',
    title: 'Family SUV shopper',
  },
  {
    quote:
      '“t velit fugiat id deserunt laboris minim incididun”',
    name: 'Elena G.',
    title: 'Budget-conscious buyer',
  },
]

