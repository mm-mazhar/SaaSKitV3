// app/(marketing)/_components/landing/testimonials.tsx

import { SectionHeading } from '@/app/(marketing)/_components/landing/section-heading'
import { MARKETING_SURFACE_MAX_WIDTH, PageSection } from '@/components/page-section'
import { TESTIMONIAL_TICKER_ENABLED, TESTIMONIALS, type Testimonial } from '@/lib/constants'
import { cn } from '@/lib/utils'

function TestimonialCard({ testimonial, index, className }: { testimonial: Testimonial; index: number; className?: string }) {
  return (
    <figure
      className={cn('cyber-chamfer cyber-edge bg-card flex flex-col gap-4 rounded-xl border p-6', className)}
    >
      <p aria-hidden='true' className='font-label text-muted-foreground text-xs tracking-[0.2em] uppercase'>
        {`// transmission 0x${String(index + 1).padStart(2, '0')}`}
      </p>
      <blockquote className='text-muted-foreground flex-1 text-sm leading-6'>{testimonial.quote}</blockquote>
      <figcaption>
        <div className='font-label text-neon text-sm tracking-[0.12em] uppercase'>{testimonial.name}</div>
        <div className='text-muted-foreground text-xs'>{testimonial.title}</div>
      </figcaption>
    </figure>
  )
}

export function Testimonials() {
  return (
    <PageSection className='relative overflow-hidden py-24 md:py-32'>
      <SectionHeading
        index='03'
        label='Incoming transmissions'
        title='What builders say'
        description='Teams use this kit to skip the multi-tenant, billing, and access-control groundwork and get straight to building their actual product.'
      />

      {TESTIMONIAL_TICKER_ENABLED ? (
        <div className={cn('mx-auto mt-12 w-full', MARKETING_SURFACE_MAX_WIDTH)}>
          <div className='testimonial-ticker relative overflow-hidden'>
            {/* MOBILE: swipe carousel */}
            <div className='md:hidden'>
              <div className='flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 py-6 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden'>
                {TESTIMONIALS.map((testimonial, index) => (
                  <TestimonialCard
                    key={testimonial.name}
                    testimonial={testimonial}
                    index={index}
                    className='w-[280px] flex-none snap-start'
                  />
                ))}
              </div>
              <p className='text-muted-foreground pb-4 text-center text-xs'>Swipe to read more →</p>
            </div>

            {/* DESKTOP: auto marquee; the second copy makes the loop seamless */}
            <div className='hidden md:block'>
              <div className='flex gap-6 py-6 will-change-transform'>
                {[0, 1].map((copy) => (
                  <div key={copy} className='animate-marquee flex gap-6' aria-hidden={copy === 1 ? 'true' : undefined}>
                    {TESTIMONIALS.map((testimonial, index) => (
                      <TestimonialCard
                        key={testimonial.name}
                        testimonial={testimonial}
                        index={index}
                        className='w-[360px] flex-none'
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className='text-muted-foreground mt-3 hidden text-center text-xs md:block'>Tip: Hover to pause.</p>
        </div>
      ) : (
        <div className={cn('mx-auto mt-12 grid w-full gap-6 md:grid-cols-2 lg:grid-cols-3', MARKETING_SURFACE_MAX_WIDTH)}>
          {TESTIMONIALS.slice(0, 6).map((testimonial, index) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} index={index} />
          ))}
        </div>
      )}
    </PageSection>
  )
}
