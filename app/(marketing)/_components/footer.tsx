// app/(marketing)/_components/footer.tsx

import SiteLogo from '@/app/(marketing)/_components/Sitelogo'
import { CircuitGrid } from '@/components/cyber/circuit-grid'
import { CyberButton } from '@/components/cyber/cyber-button'
import { CyberLabel } from '@/components/cyber/cyber-label'
import { MARKETING_SURFACE_MAX_WIDTH } from '@/components/page-section'
import { APP_DESCRIPTION_LONG, NEXT_PUBLIC_SITE_NAME, SOCIAL_LINKS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { type IconType } from 'react-icons'
import { FaLinkedinIn } from 'react-icons/fa6'
import { SiFacebook, SiInstagram, SiTiktok, SiX, SiYoutube } from 'react-icons/si'

const LINK_GROUPS = [
  {
    title: 'Product',
    links: [
      { title: 'Features', href: '/#features' },
      { title: 'How it works', href: '/#how-it-works' },
      { title: 'Pricing', href: '/#pricing' },
      { title: 'FAQs', href: '/faqs' },
    ],
  },
  {
    title: 'Company',
    links: [
      { title: 'About', href: '/about' },
      { title: 'Contact', href: '/contact' },
      { title: 'Privacy', href: '/privacy-policy' },
      { title: 'Terms', href: '/terms' },
    ],
  },
]

const SOCIALS: { label: string; href: string; icon: IconType }[] = [
  { label: 'X', href: SOCIAL_LINKS.twitter, icon: SiX },
  { label: 'LinkedIn', href: SOCIAL_LINKS.linkedin, icon: FaLinkedinIn },
  { label: 'Facebook', href: SOCIAL_LINKS.facebook, icon: SiFacebook },
  { label: 'YouTube', href: SOCIAL_LINKS.youtube, icon: SiYoutube },
  { label: 'Instagram', href: SOCIAL_LINKS.instagram, icon: SiInstagram },
  { label: 'TikTok', href: SOCIAL_LINKS.tiktok, icon: SiTiktok },
]

const COLUMN_TITLE_CLASS = 'font-label text-muted-foreground mb-4 text-xs tracking-[0.2em] uppercase'
const LINK_CLASS = 'text-muted-foreground hover:text-neon text-sm transition-colors duration-150'

type FooterSectionProps = {
  isAuthenticated?: boolean
}

export default function FooterSection({ isAuthenticated = false }: FooterSectionProps) {
  return (
    <footer className='w-full pt-8 pb-8'>
      <div className={cn('mx-auto px-4 sm:px-6 lg:px-8', MARKETING_SURFACE_MAX_WIDTH)}>
        <div className='cyber-chamfer cyber-edge bg-card relative isolate mb-16 overflow-hidden rounded-xl border px-6 py-12 md:px-12 md:py-16'>
          <CircuitGrid pattern='circuit' mesh />
          <div className='flex flex-col items-center gap-6 text-center'>
            <CyberLabel>Built for teams that ship</CyberLabel>
            <h2 className='max-w-3xl text-2xl font-bold text-balance md:text-4xl'>Stop rebuilding the same SaaS plumbing</h2>
            <p className='text-muted-foreground max-w-2xl text-sm leading-6 md:text-base'>
              Organizations, workspaces, roles, and billing are already wired together. Start your account and see it for
              yourself.
            </p>
            <div className='flex flex-col gap-4 sm:flex-row'>
              <CyberButton asChild variant='glitch' size='lg'>
                <Link href={isAuthenticated ? '/dashboard' : '/get-started'}>
                  {isAuthenticated ? 'Dashboard' : 'Get Started'}
                </Link>
              </CyberButton>
              <CyberButton asChild variant='outline' size='lg'>
                <Link href='/faqs'>Review FAQs</Link>
              </CyberButton>
            </div>
          </div>
        </div>

        <div className='grid gap-10 border-t pt-12 md:grid-cols-2 lg:grid-cols-4'>
          <div className='flex flex-col items-start gap-4'>
            <SiteLogo />
            <p className='text-muted-foreground text-sm leading-6'>{APP_DESCRIPTION_LONG}</p>
          </div>

          {LINK_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className={COLUMN_TITLE_CLASS}>{group.title}</h2>
              <ul className='flex flex-col gap-3'>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={LINK_CLASS}>
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className={COLUMN_TITLE_CLASS}>Signal</h2>
            <ul className='grid w-fit grid-cols-6 gap-2 lg:grid-cols-3'>
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <Link
                    href={social.href}
                    aria-label={social.label}
                    className='cyber-chamfer-sm text-muted-foreground hover:text-neon hover:border-neon flex size-11 items-center justify-center rounded-md border transition-colors'
                  >
                    <social.icon aria-hidden='true' size={18} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className='font-label text-muted-foreground mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs tracking-[0.15em] uppercase sm:flex-row'>
          <span>
            © {new Date().getFullYear()} {NEXT_PUBLIC_SITE_NAME}. All rights reserved.
          </span>
          <span className='flex items-center gap-2'>
            <span aria-hidden='true' className='bg-neon shadow-neon-sm size-2 rounded-full' />
            Next.js · Supabase · Stripe
          </span>
        </div>
      </div>
    </footer>
  )
}
