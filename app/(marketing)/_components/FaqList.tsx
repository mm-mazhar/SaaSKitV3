// app/(marketing)/_components/FaqList.tsx

'use client'

// import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'

// Move interfaces and data here
interface FaqItem {
  id: string
  question: string
  answer: string
  category: 'general' | 'billing' | 'teams' | 'security'
}

const faqItems: FaqItem[] = [
  {
    id: '1',
    question: 'What is this SaaS kit, exactly?',
    answer:
      'A production-ready Next.js starter for multi-tenant SaaS products: organizations, workspaces, role-based access control, Stripe billing, and a type-safe API layer, already wired together so you can focus on your actual product.',
    category: 'general',
  },
  {
    id: '2',
    question: 'Do I need to be an expert to get started?',
    answer:
      'No. If you are comfortable with Next.js, Prisma, and Tailwind, you can be productive within a day. The multi-tenancy and billing plumbing is done for you.',
    category: 'general',
  },
  {
    id: '3',
    question: 'What is a "workspace" versus an "organization"?',
    answer:
      'An organization is your account/tenant boundary — the thing a user signs up into. A workspace lives inside an organization and is where the actual work happens; an organization can have multiple workspaces, scoped by its pricing plan.',
    category: 'general',
  },
  {
    id: '4',
    question: 'How does role-based access control work?',
    answer:
      'Every organization member has a role — Owner, Admin, or Member. Owners and Admins can also grant or restrict access to specific workspaces per member, so a teammate only sees the workspaces they were given.',
    category: 'teams',
  },
  {
    id: '5',
    question: 'Can I control which workspaces a teammate can see?',
    answer:
      'Yes. When you invite someone, you choose which workspaces to grant them. Owners can adjust any member’s access later; admins can adjust access for members they manage.',
    category: 'teams',
  },
  {
    id: '6',
    question: 'How are workspace limits enforced across plans?',
    answer:
      'Each pricing plan defines a maximum number of workspaces per organization. The limit is enforced centrally, so upgrading a plan is the only thing you need to change to raise it.',
    category: 'billing',
  },
  {
    id: '7',
    question: 'Is billing handled for me?',
    answer:
      'Yes. Stripe Checkout, subscriptions, and webhooks are already integrated. Plans map to credits and workspace limits automatically, so you don’t have to hand-wire billing state.',
    category: 'billing',
  },
  {
    id: '8',
    question: 'What happens if I downgrade my plan?',
    answer:
      'Your workspace limit updates to match the new plan. Existing workspaces beyond the new limit remain accessible, but creating new ones is blocked until you’re back under the limit.',
    category: 'billing',
  },
  {
    id: '9',
    question: 'How is authentication handled?',
    answer:
      'Auth runs on Supabase, with server-side guards that enforce organization membership and role requirements on every protected API call — not just in the UI.',
    category: 'security',
  },
  {
    id: '10',
    question: 'Is the API type-safe end to end?',
    answer:
      'Yes. The API layer is built with oRPC, so request and response types are shared between the server and the client automatically — no manually kept-in-sync API contracts.',
    category: 'security',
  },
  {
    id: '11',
    question: 'Can I customize the pricing plans and limits?',
    answer:
      'Yes. Pricing plans, credit amounts, and workspace limits per plan all live in one constants file, so changing them doesn’t require touching business logic.',
    category: 'billing',
  },
  {
    id: '12',
    question: 'What database and ORM does this use?',
    answer:
      'PostgreSQL via Prisma, with hand-reviewed migrations rather than auto-generated ones for anything touching production data — including renames and access-control changes.',
    category: 'general',
  },
]

const categories = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'teams', label: 'Teams & Access' },
  { id: 'billing', label: 'Billing' },
  { id: 'security', label: 'Security' },
]

export function FaqList() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredFaqs =
    activeCategory === 'all'
      ? faqItems
      : faqItems.filter((item) => item.category === activeCategory)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    // Honour the OS reduced-motion setting for every animation below.
    <MotionConfig reducedMotion='user'>
      {/* Category filters: toggle buttons, so state is exposed via aria-pressed. */}
      <div className='mt-8 flex flex-wrap justify-center gap-2 px-4'>
        {categories.map((category) => {
          const isActive = activeCategory === category.id
          return (
            <button
              key={category.id}
              type='button'
              aria-pressed={isActive}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'cyber-chamfer-sm cyber-edge font-label h-11 rounded-md border px-4 text-xs tracking-[0.15em] uppercase transition-colors',
                isActive
                  ? 'border-neon bg-neon/10 text-neon [--edge:var(--neon,var(--primary))]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {category.label}
            </button>
          )
        })}
      </div>

      <div className='mt-8 grid grid-cols-1 items-start gap-4 sm:grid-cols-2'>
        <AnimatePresence initial={false}>
          {filteredFaqs.map((faq, index) => {
            const isOpen = expandedId === faq.id
            const panelId = `faq-panel-${faq.id}`
            const buttonId = `faq-button-${faq.id}`
            return (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  'cyber-chamfer cyber-edge bg-card overflow-hidden rounded-xl border transition-colors',
                  isOpen && 'border-neon/60 [--edge:color-mix(in_srgb,var(--neon,var(--primary))_60%,transparent)]'
                )}
              >
                {/* Accordion pattern: the heading wraps the button (a button may not contain a heading).
                    Font/case reset: questions read as body copy, not display headings. */}
                <h3 className='[font-family:inherit] tracking-normal normal-case'>
                  <button
                    id={buttonId}
                    type='button'
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleExpand(faq.id)}
                    className='flex min-h-[112px] w-full items-start gap-3 p-6 text-left'
                  >
                    <span aria-hidden='true' className='text-neon font-mono'>
                      {'>'}
                    </span>
                    <span className='text-foreground flex-1 text-base font-medium'>
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <MinusIcon aria-hidden='true' className='text-neon size-5 shrink-0 stroke-[1.5]' />
                    ) : (
                      <PlusIcon aria-hidden='true' className='text-neon size-5 shrink-0 stroke-[1.5]' />
                    )}
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role='region'
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className='overflow-hidden'
                    >
                      <div className='border-t px-6 pt-4 pb-6 font-mono text-sm leading-relaxed'>
                        <p className='text-muted-foreground'>
                          <span aria-hidden='true' className='text-neon mr-2'>
                            $
                          </span>
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
