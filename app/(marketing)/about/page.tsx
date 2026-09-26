// app/(marketing)/about/page.tsx

import { SectionHeading } from '@/app/(marketing)/_components/landing/section-heading'
import { MarketingPageHeader } from '@/app/(marketing)/_components/marketing-page-header'
import { HudPanel } from '@/components/cyber/hud-panel'
import { IconFrame } from '@/components/cyber/icon-frame'
import {
  MARKETING_ALIGNED_CONTAINER_WIDTH,
  MARKETING_ALIGNED_CONTENT_WIDTH,
  MARKETING_CONTENT_SECTION_BOTTOM_SPACING,
  MARKETING_CONTENT_SECTION_TOP_SPACING,
  PageSection,
} from '@/components/page-section'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Globe, Lightbulb, Rocket, Sparkles, Target, Users, type LucideIcon } from 'lucide-react'

type Value = {
  title: string
  description: string
  icon: LucideIcon
}

const VALUES: Value[] = [
  {
    title: 'Innovation',
    description: 'We constantly push boundaries and explore new possibilities to create cutting-edge solutions.',
    icon: Lightbulb,
  },
  {
    title: 'Collaboration',
    description: 'We believe in the power of teamwork and diverse perspectives to achieve extraordinary results.',
    icon: Users,
  },
  {
    title: 'Excellence',
    description: 'We strive for perfection in everything we do, consistently delivering high-quality work.',
    icon: Sparkles,
  },
  {
    title: 'Impact',
    description: "We measure our success by the positive difference we make in people's lives and businesses.",
    icon: Globe,
  },
]

const ABOUT = {
  title: 'About Us',
  subtitle: 'Building the future of web development with beautiful, reusable components.',
  mission:
    'Our mission is to democratize web development by providing high-quality, customizable components that help developers build stunning websites quickly and efficiently.',
  vision:
    'We envision a world where creating beautiful websites is accessible to everyone, regardless of their design or development experience.',
}

const PILLARS: { label: string; title: string; body: string; icon: LucideIcon; tone: 'neon' | 'tertiary' }[] = [
  { label: 'directive.01', title: 'Our Mission', body: ABOUT.mission, icon: Rocket, tone: 'neon' },
  { label: 'directive.02', title: 'Our Vision', body: ABOUT.vision, icon: Target, tone: 'tertiary' },
]

export default function AboutPage() {
  return (
    <PageSection
      className={`${MARKETING_CONTENT_SECTION_TOP_SPACING} ${MARKETING_CONTENT_SECTION_BOTTOM_SPACING}`}
      containerClassName={MARKETING_ALIGNED_CONTAINER_WIDTH}
    >
      <MarketingPageHeader label='About' title={ABOUT.title} description={ABOUT.subtitle} />

      <div className={cn('grid gap-8 md:grid-cols-2', MARKETING_ALIGNED_CONTENT_WIDTH)}>
        {PILLARS.map((pillar) => (
          <HudPanel key={pillar.title} label={pillar.label} className='p-8 md:p-10'>
            <IconFrame tone={pillar.tone} className='mb-6'>
              <pillar.icon />
            </IconFrame>
            <h2 className='mb-4 text-2xl font-bold md:text-3xl'>{pillar.title}</h2>
            <p className='text-muted-foreground text-base leading-relaxed md:text-lg'>{pillar.body}</p>
          </HudPanel>
        ))}
      </div>

      <div className={cn('mt-24', MARKETING_ALIGNED_CONTENT_WIDTH)}>
        <SectionHeading
          index='01'
          label='Core protocols'
          title='Our Core Values'
          description='The principles that guide everything we do and every decision we make.'
        />

        <ul className='mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4'>
          {VALUES.map((value) => (
            <li key={value.title}>
              <Card className='group h-full gap-4 px-6 transition-transform duration-300 hover:-translate-y-1'>
                <IconFrame>
                  <value.icon />
                </IconFrame>
                <h3 className='text-lg font-semibold'>{value.title}</h3>
                <p className='text-muted-foreground text-sm leading-6'>{value.description}</p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </PageSection>
  )
}
