// app/(dashboard)/_components/invite-member-dialog.tsx

'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/(dashboard)/_components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/(dashboard)/_components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'

type InviteWorkspaceOption = { id: string; name: string; slug: string }

export function InviteMemberDialog({
  orgId,
  workspaces = [],
}: {
  orgId: string
  workspaces?: InviteWorkspaceOption[]
}) {
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<'ADMIN' | 'MEMBER'>('MEMBER')
  // Default: every workspace the inviter can see is checked. They can uncheck
  // any they want to keep the new member out of.
  const [workspaceIds, setWorkspaceIds] = React.useState<string[]>(() => workspaces.map((w) => w.id))
  const router = useRouter()
  const { show } = useToast()

  // Keep the checkbox list in sync if the available workspaces change (e.g. after router.refresh()).
  React.useEffect(() => {
    setWorkspaceIds(workspaces.map((w) => w.id))
  }, [workspaces])

  const { mutate, isPending, error } = useORPCMutation(() =>
    orpc.org.inviteMember.mutationOptions({
      onSuccess: () => {
        console.log('✅ Invite mutation successful')
        show({ title: 'Invite sent', description: `Invitation sent to ${email}`, variant: 'success' })
        setOpen(false)
        setEmail('')
        setRole('MEMBER')
        setWorkspaceIds(workspaces.map((w) => w.id))
        router.refresh()
      },
      onError: (err: { code: string; message: string }) => {
        // Log different error types appropriately
        if (err.code === 'PRECONDITION_FAILED') {
          console.log('⏱️ Invite rate limited:', err.message)
        } else if (err.code === 'BAD_REQUEST' && err.message.includes('Disposable emails')) {
          console.log('🚫 Disposable email blocked:', err.message)
        } else {
          console.error('❌ Invite mutation error:', err)
        }
        
        // Only show toast for unexpected errors (not rate limiting or disposable email validation)
        if (err.code !== 'PRECONDITION_FAILED' && !(err.code === 'BAD_REQUEST' && err.message.includes('Disposable emails'))) {
          show({ title: 'Error', description: err.message, variant: 'error' })
        }
        // Rate limiting and disposable email errors will only show inline in the dialog
      },
    })
  )

  function toggleWorkspace(id: string, checked: boolean) {
    setWorkspaceIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((w) => w !== id)))
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    console.log('🚀 Submitting invite form with:', { email, role, workspaceIds })
    mutate({ email, role, workspaceIds })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0' suppressHydrationWarning>
          <Plus className='mr-2 h-4 w-4' />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Invite a new member to your organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='email' className='text-right'>
                Email
              </Label>
              <Input
                id='email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='colleague@example.com'
                className='col-span-3 focus-visible:ring-0 focus-visible:ring-offset-0'
                required
              />
            </div>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='role' className='text-right'>
                Role
              </Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'ADMIN' | 'MEMBER')}>
                <SelectTrigger className='col-span-3 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'>
                  <SelectValue placeholder='Select a role' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ADMIN'>Admin</SelectItem>
                  <SelectItem value='MEMBER'>Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {workspaces.length > 0 && (
              <div className='grid grid-cols-4 items-start gap-4'>
                <Label className='text-right pt-1'>Workspaces</Label>
                <div className='col-span-3 space-y-2'>
                  <p className='text-xs text-muted-foreground'>
                    Choose which workspaces this member can access. All are selected by default.
                  </p>
                  <div className='max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-input p-2'>
                    {workspaces.map((workspace) => (
                      <label
                        key={workspace.id}
                        className='flex items-center gap-2 text-sm cursor-pointer select-none'
                      >
                        <input
                          type='checkbox'
                          className='h-3.5 w-3.5 rounded border-input accent-primary'
                          checked={workspaceIds.includes(workspace.id)}
                          onChange={(e) => toggleWorkspace(workspace.id, e.target.checked)}
                        />
                        {workspace.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {Boolean(error) && (
              <p className='text-red-500 text-sm'>
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type='submit' disabled={isPending}>
              {isPending ? 'Inviting...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
