// app/(marketing)/contact/page.tsx

import { CopyField } from '@/app/(marketing)/_components/copy-field'
import { MarketingPageHeader } from '@/app/(marketing)/_components/marketing-page-header'
import { IconFrame } from '@/components/cyber/icon-frame'
import {
  MARKETING_ALIGNED_CONTAINER_WIDTH,
  MARKETING_ALIGNED_CONTENT_WIDTH,
  MARKETING_CONTENT_SECTION_BOTTOM_SPACING,
  MARKETING_CONTENT_SECTION_TOP_SPACING,
  PageSection,
} from '@/components/page-section'
import { Card } from '@/components/ui/card'
import { APP_EMAIL, APP_OFFICE_ADDRESS, APP_PHONE_1, APP_PHONE_2, NEXT_PUBLIC_SITE_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Mail, MapPin, Phone, type LucideIcon } from 'lucide-react'
import * as React from 'react'

function ChannelCard({
  icon: Icon,
  title,
  note,
  children,
}: {
  icon: LucideIcon
  title: string
  note: string
  children: React.ReactNode
}) {
  return (
    <Card className='group gap-5 px-6'>
      <div className='flex items-center gap-4'>
        <IconFrame>
          <Icon />
        </IconFrame>
        <h2 className='text-lg font-semibold'>{title}</h2>
      </div>
      <div className='flex flex-col gap-3'>{children}</div>
      <p className='text-muted-foreground text-xs'>{note}</p>
    </Card>
  )
}

export default function ContactPage() {
  return (
    <PageSection
      className={`${MARKETING_CONTENT_SECTION_TOP_SPACING} ${MARKETING_CONTENT_SECTION_BOTTOM_SPACING}`}
      containerClassName={MARKETING_ALIGNED_CONTAINER_WIDTH}
    >
      <MarketingPageHeader
        label='Contact'
        title='Contact Us'
        description={`Contact the support team at ${NEXT_PUBLIC_SITE_NAME}.`}
      />

      <div className={cn('grid grid-cols-1 gap-6 md:grid-cols-3', MARKETING_ALIGNED_CONTENT_WIDTH)}>
        <ChannelCard icon={Mail} title='Email' note='We respond to all emails within 24 hours.'>
          <CopyField value={APP_EMAIL} copyLabel='Copy email address' />
        </ChannelCard>

        <ChannelCard icon={MapPin} title='Office' note='Drop by our office for a chat.'>
          <address className='cyber-chamfer-sm cyber-edge bg-background rounded-md border px-3 py-2 font-mono text-sm whitespace-pre-line not-italic'>
            {APP_OFFICE_ADDRESS}
          </address>
        </ChannelCard>

        <ChannelCard icon={Phone} title='Phone' note='We’re available Mon–Fri, 9am–5pm.'>
          <CopyField value={APP_PHONE_1} copyLabel='Copy phone number' />
          <CopyField value={APP_PHONE_2} copyLabel='Copy alternate phone number' />
        </ChannelCard>
      </div>
    </PageSection>
  )
}
