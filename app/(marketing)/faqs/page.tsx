// app/(marketing)/faqs/page.tsx

import { FaqList } from '@/app/(marketing)/_components/FaqList'
import { MarketingPageHeader } from '@/app/(marketing)/_components/marketing-page-header'
import { CyberButton } from '@/components/cyber/cyber-button'
import {
  MARKETING_ALIGNED_CONTAINER_WIDTH,
  MARKETING_ALIGNED_CONTENT_WIDTH,
  MARKETING_CONTENT_SECTION_BOTTOM_SPACING,
  MARKETING_CONTENT_SECTION_TOP_SPACING,
  PageSection,
} from '@/components/page-section'
import Link from 'next/link'

export default function FaqPage() {
  return (
    <PageSection
      className={`${MARKETING_CONTENT_SECTION_TOP_SPACING} ${MARKETING_CONTENT_SECTION_BOTTOM_SPACING}`}
      containerClassName={MARKETING_ALIGNED_CONTAINER_WIDTH}
    >
      <MarketingPageHeader
        label='FAQs'
        title='Frequently Asked Questions'
        description='Answers about workspaces, teams, billing, and how everything fits together.'
      />

      {/* The interactive list is the only client component on this page. */}
      <div className={MARKETING_ALIGNED_CONTENT_WIDTH}>
        <FaqList />
      </div>

      <div className='mx-auto mt-16 flex w-full max-w-3xl flex-col items-center gap-6 text-center'>
        <p className='text-muted-foreground'>Still have a question we didn’t cover?</p>
        <CyberButton asChild variant='outline'>
          <Link href='/contact'>Contact Us</Link>
        </CyberButton>
      </div>
    </PageSection>
  )
}
