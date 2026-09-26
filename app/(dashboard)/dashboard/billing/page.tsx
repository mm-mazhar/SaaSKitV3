// app/(dashboard)/dashboard/billing/page.tsx

import { stripe } from '@/app/lib/stripe'
import { getCachedUser } from '@/app/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireOrgRole } from '@/lib/auth/guards'
import { PLAN_IDS, PRICING_PLANS, PURCHASABLE_PLANS, resolveEffectivePlanId, SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD, type PlanId } from '@/lib/constants'
import { getRPCCaller } from '@/lib/orpc/rsc-client'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RenewSubscriptionButton } from '../../_components/RenewSubscriptionButton'
import { StripePortalButton } from '../../_components/StripePortalButton'
import { UpgradeSubscriptionButton } from '../../_components/UpgradeSubscriptionButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function BillingPage() {
  noStore()
  const { data: { user } } = await getCachedUser()
  if (!user) return redirect('/get-started')

  const cookieStore = await cookies()
  const currentOrgId = cookieStore.get('current-org-id')?.value

  // Debug: Log the org ID being checked
  console.log('[Billing] currentOrgId from cookie:', currentOrgId)
  console.log('[Billing] user.id:', user.id)

  if (!currentOrgId) {
      console.log('[Billing] No currentOrgId cookie - redirecting to dashboard')
      return redirect('/dashboard')
  }

  // Security Check: Only ADMIN/OWNER can access billing
  try {
      const role = await requireOrgRole(currentOrgId, user.id, 'ADMIN')
      console.log('[Billing] User role:', role)
  } catch (error) {
      console.log('[Billing] requireOrgRole failed:', error)
      return redirect('/dashboard')
  }

  const rpc = await getRPCCaller()
  
  let org
  try {
    org = await rpc.org.getById({ id: currentOrgId, includeSubscription: true })
  } catch {
    // Org not found or deleted - redirect to dashboard which will auto-switch to valid org
    return redirect('/dashboard')
  }

  if (!org) return redirect('/dashboard')

  const data = {
    status: org.subscription?.status ?? 'inactive',
    planId: org.subscription?.planId ?? null,
    stripeSubscriptionId: null as string | null,
    currentPeriodEnd: org.subscription?.currentPeriodEnd ?? null,
    org: org,
  }

  // Accounts for one-time (non-recurring) plan purchases like Starter, which
  // never create a Subscription row -- see lib/constants.ts's
  // resolveEffectivePlanId for why this can't be resolved from `data.planId`
  // alone.
  const resolvedCurrent = resolveEffectivePlanId(
    data.planId,
    (org as { oneTimePlanId?: string | null }).oneTimePlanId
  )

  const isSubActive = data.status === 'active'

  const basicPlan = PRICING_PLANS.find((p) => p.id === PLAN_IDS.PLAN_A)
  const proPlan = PRICING_PLANS.find((p) => p.id === PLAN_IDS.PLAN_B)
  const dealerCorePlan = PRICING_PLANS.find((p) => p.id === PLAN_IDS.PLAN_C)
  // PURCHASABLE_PLANS -- when PARTNER_PLAN_ENABLED is off this resolves to
  // undefined, which hides both the "Purchase Partner" card below and the
  // "Upgrade to Partner" prompt an Agency-plan org would otherwise see.
  const dealerPlusPlan = PURCHASABLE_PLANS.find((p) => p.id === PLAN_IDS.PLAN_D)

  const showRenewal = isSubActive && (data.org.credits < SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD)
  const upgradeTargetPlan = resolvedCurrent === PLAN_IDS.PLAN_B ? dealerCorePlan : resolvedCurrent === PLAN_IDS.PLAN_C ? dealerPlusPlan : null
  const showUpgrade = isSubActive && !!upgradeTargetPlan
  const hasBasicCredits = !isSubActive && data.org.credits > 0
  const showNonSubscriptionUpgradeCards = !isSubActive
  const showBillingDetails = isSubActive || hasBasicCredits

  const currentForState: PlanId | null = isSubActive
    ? resolvedCurrent
    : hasBasicCredits
      ? PLAN_IDS.PLAN_A
      : PLAN_IDS.free
  const isFreeTierBilling = currentForState === null || currentForState === PLAN_IDS.free

  let invoices: {
    id: string;
    amount_paid: number;
    currency: string | null;
    status: string | null;
    hosted_invoice_url: string | null;
    number: string | null;
    created: number | null;
  }[] = []
  if (data.org.stripeCustomerId) {
    const list = await stripe.invoices.list({ customer: data.org.stripeCustomerId, limit: 12 })
    invoices = list.data.map((inv) => ({
      id: inv.id,
      amount_paid: typeof inv.amount_paid === 'number' ? inv.amount_paid : 0,
      currency: inv.currency || 'usd',
      status: inv.status || null,
      hosted_invoice_url: inv.hosted_invoice_url || null,
      number: (inv.number as string | null) || null,
      created: typeof inv.created === 'number' ? inv.created : null,
    }))
  }

  return (
    <div className='min-h-[calc(100vh-8rem)] flex items-center justify-center py-2'>
      <div className='max-w-6xl mx-auto w-full space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-xl font-semibold'>Billing</h1>
          <Link href='/#pricing' className='text-sm text-primary hover:underline inline-flex items-center'>
            All plans &rarr;
          </Link>
        </div>

        <Card className='rounded-lg border border-primary/40 bg-primary/5 [--edge:color-mix(in_srgb,var(--primary)_40%,transparent)]'>
          <CardHeader className='p-2'>
            <CardTitle className='text-sm'>Available Credits</CardTitle>
            <CardDescription className='text-xs'>
              Credits are consumed as you use metered features.
            </CardDescription>
          </CardHeader>
          <CardContent className='px-2 pb-2'>
            <p className='text-2xl font-semibold'>{data.org.credits}</p>
          </CardContent>
        </Card>

        {isFreeTierBilling ? (
          <Card className='rounded-lg border bg-muted/30'>
            <CardHeader className='p-2'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-sm'>{hasBasicCredits ? 'Starter' : 'Free'}</CardTitle>
                <span className='text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30'>
                  Current state
                </span>
              </div>
              <CardDescription className='text-xs'>
                {hasBasicCredits
                  ? 'No active subscription. You can buy Starter credits again anytime or upgrade to a recurring plan.'
                  : 'No active subscription. Purchase Starter credits anytime or upgrade to a recurring plan.'}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {showNonSubscriptionUpgradeCards ? (() => {
          // Data-driven instead of four near-identical blocks: the visible
          // count now directly decides the grid's column count too, so
          // pulling a plan out (e.g. PARTNER_PLAN_ENABLED off, dropping
          // dealerPlusPlan to undefined) reflows the remaining cards evenly
          // instead of leaving an orphaned card in a fixed 2-column grid.
          const upgradeCards = [
            basicPlan && {
              plan: basicPlan,
              title: hasBasicCredits ? basicPlan.title : `Purchase ${basicPlan.title}`,
              badge: hasBasicCredits ? 'Current Plan' : null,
              button: (
                <UpgradeSubscriptionButton
                  planId={PLAN_IDS.PLAN_A}
                  hasActiveSubscription={isSubActive}
                  ctaLabel={hasBasicCredits ? 'Buy Again' : 'Purchase'}
                />
              ),
            },
            proPlan && {
              plan: proPlan,
              title: `Upgrade to ${proPlan.title}`,
              badge: null,
              button: <UpgradeSubscriptionButton planId={PLAN_IDS.PLAN_B} hasActiveSubscription={isSubActive} />,
            },
            dealerCorePlan && {
              plan: dealerCorePlan,
              title: `Upgrade to ${dealerCorePlan.title}`,
              badge: null,
              button: <UpgradeSubscriptionButton planId={PLAN_IDS.PLAN_C} hasActiveSubscription={isSubActive} />,
            },
            dealerPlusPlan && {
              plan: dealerPlusPlan,
              title: `Upgrade to ${dealerPlusPlan.title}`,
              badge: null,
              button: <UpgradeSubscriptionButton planId={PLAN_IDS.PLAN_D} hasActiveSubscription={isSubActive} />,
            },
          ].filter((c): c is NonNullable<typeof c> => Boolean(c))

          const gridColsClass =
            upgradeCards.length >= 4
              ? 'md:grid-cols-2 lg:grid-cols-4'
              : upgradeCards.length === 3
                ? 'md:grid-cols-3'
                : upgradeCards.length === 2
                  ? 'md:grid-cols-2'
                  : 'md:grid-cols-1'

          return (
            <div className={`grid grid-cols-1 gap-4 ${gridColsClass}`}>
              {upgradeCards.map(({ plan, title, badge, button }) => (
                <Card key={plan.id} className='rounded-lg border'>
                  <CardHeader className='p-2'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <CardTitle className='text-sm'>{title}</CardTitle>
                        <CardDescription className='text-xs'>{plan.description}</CardDescription>
                      </div>
                      <div className='flex items-center gap-2'>
                        {badge ? (
                          <span className='text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30'>
                            {badge}
                          </span>
                        ) : null}
                        {button}
                      </div>
                    </div>
                  </CardHeader>
                  <div className='border-t mx-2'></div>
                  <CardContent className='px-2 pb-2'>
                    <ul className='text-xs space-y-1'>
                      {plan.features.slice(0, 4).map((f, i) => (
                        <li key={i} className='flex items-center gap-2'>
                          <span>•</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        })() : null}

        {/* TOP ROW: Edit Subscription + Upgrade + Renew */}
        {isSubActive ? (
          <div className={`grid grid-cols-1 gap-4 ${showUpgrade && showRenewal ? 'md:grid-cols-3' : (showUpgrade || showRenewal ? 'md:grid-cols-2' : 'md:grid-cols-1')}`}>

             {/* Renew Subscription (Primary Action if Low Credits) */}
            {showRenewal ? (
              <Card className='rounded-lg border border-warning/50 bg-warning/10 flex flex-col [--edge:color-mix(in_srgb,var(--warning)_50%,transparent)]'>
                 <CardHeader className='p-2'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-sm text-warning'>Run out of credits?</CardTitle>
                      <CardDescription className='text-xs'>
                        Renew early to get fresh credits.
                        <br />
                        <span className='text-muted-foreground'>
                           Current Credits: <span className='font-mono font-bold text-foreground'>{data.org.credits}</span>
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='px-2 pb-2 mt-auto'>
                   <RenewSubscriptionButton />
                </CardContent>
              </Card>
            ) : null}

            {/* Edit Subscription */}
            <Card className='rounded-lg border bg-muted/30 flex flex-col'>
              <CardHeader className='p-2'>
                <CardTitle className="text-sm">Edit Subscription</CardTitle>
                <CardDescription className="text-xs">
                  Click below to
                  <span className='font-bold text-secondary-foreground'> change details,</span>
                  <span className='font-bold text-secondary-foreground'> view statement</span> or
                  <span className='font-bold text-secondary-foreground'> Cancel Subscription</span>.
                  <p>&nbsp;</p>
                  <p className='text-xs text-foreground'>
                    If you cancel your subscription then you still can retain your remaining credits.
                  </p>
                </CardDescription>
              </CardHeader>
              <CardContent className='px-2 pb-2 mt-auto'>
                <StripePortalButton />
              </CardContent>
            </Card>

            {/* Upgrade to Pro Plus (only when current is Pro) */}
            {showUpgrade ? (
              <Card className='rounded-lg border'>
                <CardHeader className='p-2'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-sm'>Upgrade to {upgradeTargetPlan?.title}</CardTitle>
                      <CardDescription className='text-xs'>{upgradeTargetPlan?.description}</CardDescription>
                    </div>
                    <UpgradeSubscriptionButton planId={upgradeTargetPlan?.id ?? PLAN_IDS.PLAN_D} hasActiveSubscription={isSubActive} />
                  </div>
                </CardHeader>
                <div className='border-t mx-2'></div>
                <CardContent className='px-2 pb-2'>
                  <ul className='text-xs space-y-1'>
                    {upgradeTargetPlan?.features.slice(0, 4).map((f, i) => (
                      <li key={i} className='flex items-center gap-2'>
                        <span>•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        {/* SECOND ROW: Billing Details + Invoice History (full width) */}
        {showBillingDetails ? (
          <Card className='rounded-lg border'>
            <CardHeader className='p-2'>
              <CardTitle className='text-sm'>Billing Details</CardTitle>
            </CardHeader>
            <CardContent className='px-2 pb-2 space-y-3'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Stripe Customer ID</span>
                  <p className='font-mono text-xs'>{data.org.stripeCustomerId || 'N/A'}</p>
                </div>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Subscription ID</span>
                  <p className='font-mono text-xs'>{data.org.subscription?.stripeSubscriptionId || 'N/A'}</p>
                </div>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Status</span>
                  <p className='text-xs capitalize'>{isSubActive ? data.status : 'Starter'}</p>
                </div>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Current Period End</span>
                  <p className='text-xs'>
                    {data.currentPeriodEnd ? new Date(data.currentPeriodEnd * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>
              <div className='border-t mx-2'></div>
              <div className='pt-2'>
                <h4 className='text-sm font-medium mb-2'>Invoice History</h4>
                {invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-xs'>Date</TableHead>
                        <TableHead className='text-xs'>Invoice</TableHead>
                        <TableHead className='text-xs'>Status</TableHead>
                        <TableHead className='text-xs'>Amount</TableHead>
                        <TableHead className='text-xs'>Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => {
                        const date = inv.created ? new Date(inv.created * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : ''
                        const amount = (inv.amount_paid || 0) / 100
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className='text-xs text-muted-foreground'>{date}</TableCell>
                            <TableCell className='font-mono text-xs'>{inv.number || inv.id}</TableCell>
                            <TableCell className='text-xs capitalize'>{inv.status || ''}</TableCell>
                            <TableCell className='text-xs'>
                              {amount.toLocaleString(undefined, { style: 'currency', currency: inv.currency || 'usd' })}
                            </TableCell>
                            <TableCell>
                              {inv.hosted_invoice_url ? (
                                <Link href={inv.hosted_invoice_url} target='_blank' className='text-xs text-primary underline'>
                                  View
                                </Link>
                              ) : (
                                <span className='text-xs text-muted-foreground'>N/A</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className='text-xs text-muted-foreground'>No billing records found.</div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {null}
      </div>
    </div>
  )
}
