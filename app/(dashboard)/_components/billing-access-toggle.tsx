// app/(dashboard)/_components/billing-access-toggle.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'

/**
 * OWNER-only toggle for an ADMIN's billing access (see billingAdminProcedure).
 * Only ever rendered for ADMIN targets -- OWNER always has full billing
 * access and MEMBER can't reach a billing procedure regardless of this flag,
 * so showing it for either would be confusing rather than merely redundant.
 */
export function BillingAccessToggle({
  targetUserId,
  initialCanManageBilling,
}: {
  targetUserId: string
  initialCanManageBilling: boolean
}) {
  const [canManageBilling, setCanManageBilling] = useState(initialCanManageBilling)
  const { show } = useToast()
  const router = useRouter()

  const { mutate, isPending } = useORPCMutation(() =>
    orpc.org.setMemberBillingAccess.mutationOptions({
      onSuccess: () => {
        show({
          title: canManageBilling ? 'Billing access granted' : 'Billing access revoked',
          description: canManageBilling
            ? 'This admin can now manage subscriptions and billing.'
            : 'This admin can no longer manage subscriptions and billing.',
          variant: 'success',
        })
        router.refresh()
      },
      onError: (err: Error) => {
        setCanManageBilling((prev) => !prev) // Revert on error
        show({ title: 'Error', description: err.message, variant: 'error' })
      },
    })
  )

  function handleChange(checked: boolean) {
    setCanManageBilling(checked) // Optimistic update
    mutate({ targetUserId, canManageBilling: checked })
  }

  return (
    <label className='flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none'>
      <input
        type='checkbox'
        className='h-3.5 w-3.5 rounded border-input accent-primary'
        checked={canManageBilling}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.checked)}
      />
      Billing access
    </label>
  )
}
