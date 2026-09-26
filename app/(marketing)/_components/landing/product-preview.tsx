// app/(marketing)/_components/landing/product-preview.tsx

import { StatStrip, type Stat } from '@/components/cyber/stat-strip'
import { MARKETING_SURFACE_MAX_WIDTH } from '@/components/page-section'
import { Badge } from '@/components/ui/badge'
import { PLAN_IDS, PURCHASABLE_PLANS, ROLES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const HERO_LIGHT_IMAGE_PATH = '/HeroDark-02.png'
const HERO_DARK_IMAGE_PATH = '/HeroDark-03.png'

const CAPABILITIES = ['Multi-tenant orgs', 'Role-based access', 'Stripe billing', 'Type-safe API']

// Facts about the kit, derived from config so they can't drift from what ships.
const KIT_STATS: Stat[] = [
  { label: 'Roles', value: String(Object.keys(ROLES).length), hint: 'Owner · Admin · Member' },
  {
    label: 'Paid plans',
    value: String(PURCHASABLE_PLANS.filter((plan) => plan.id !== PLAN_IDS.free).length),
    hint: 'Stripe checkout + webhooks',
  },
  { label: 'Auth', value: 'Supabase', hint: 'Magic link + Google' },
  { label: 'API', value: 'oRPC', hint: 'End-to-end typed, OpenAPI docs' },
]

/** App screenshot that overlaps the hero, followed by the kit's key facts. */
export function ProductPreview() {
  return (
    <section className={cn('relative z-10 mx-auto -mt-12 px-4 sm:px-6 md:-mt-20 lg:px-8', MARKETING_SURFACE_MAX_WIDTH)}>
      <ul className='mb-6 flex flex-wrap items-center justify-center gap-2'>
        {CAPABILITIES.map((capability) => (
          <li key={capability}>
            <Badge variant='outline' className='bg-background/80 px-3 py-1 backdrop-blur'>
              {capability}
            </Badge>
          </li>
        ))}
      </ul>

      {/* The glow sits on an unclipped wrapper so it follows the chamfered frame. */}
      <div className='[filter:drop-shadow(0_0_28px_color-mix(in_srgb,var(--neon,var(--primary))_18%,transparent))]'>
        <div className='cyber-chamfer cyber-edge border-neon/30 bg-card rounded-xl border p-2 [--edge:color-mix(in_srgb,var(--neon,var(--primary))_30%,transparent)] md:p-3'>
          <Image
            className='bg-background relative hidden aspect-15/8 rounded-xl object-contain object-top dark:block'
            src={HERO_DARK_IMAGE_PATH}
            alt='The SaaS Kit dashboard: revenue, customers and visitor charts with a documents table'
            width='2700'
            height='1440'
            priority
          />
          <Image
            className='relative aspect-15/8 rounded-xl object-contain object-top dark:hidden'
            src={HERO_LIGHT_IMAGE_PATH}
            alt='The SaaS Kit dashboard: revenue, customers and visitor charts with a documents table'
            width='2700'
            height='1440'
          />
        </div>
      </div>

      <StatStrip stats={KIT_STATS} className='mt-16 md:mt-20' />
    </section>
  )
}
