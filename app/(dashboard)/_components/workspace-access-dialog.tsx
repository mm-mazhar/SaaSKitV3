// app/(dashboard)/_components/workspace-access-dialog.tsx

'use client'

import { FolderCog } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/(dashboard)/_components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ToastProvider'
import { client, orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'

type ManageableWorkspace = { id: string; name: string; slug: string; granted: boolean }

/**
 * Lets an OWNER (for ADMIN or MEMBER) or an ADMIN (for MEMBER only) control which
 * workspaces a member can see and work in. Only ever offers workspaces the CURRENT
 * viewer can themselves access -- the server enforces this too.
 */
export function WorkspaceAccessDialog({
  targetUserId,
  targetLabel,
}: {
  targetUserId: string
  targetLabel: string
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [workspaces, setWorkspaces] = React.useState<ManageableWorkspace[]>([])
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const router = useRouter()
  const { show } = useToast()

  const { mutate, isPending } = useORPCMutation(() =>
    orpc.org.setMemberWorkspaceAccess.mutationOptions({
      onSuccess: () => {
        show({ title: 'Saved', description: 'Workspace access updated', variant: 'success' })
        setOpen(false)
        router.refresh()
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, variant: 'error' })
      },
    })
  )

  async function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) return

    setLoading(true)
    setLoadError(null)
    try {
      const result = await client.org.getMemberWorkspaceAccess({ targetUserId })
      setWorkspaces(result.workspaces)
      setSelectedIds(result.workspaces.filter((w: ManageableWorkspace) => w.granted).map((w: ManageableWorkspace) => w.id))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load workspace access')
    } finally {
      setLoading(false)
    }
  }

  function toggleWorkspace(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((w) => w !== id)))
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutate({ targetUserId, workspaceIds: selectedIds })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className='h-7 px-2 text-xs text-muted-foreground hover:text-foreground'
        onClick={() => handleOpenChange(true)}
      >
        <FolderCog className='mr-1 h-3.5 w-3.5' />
        Workspaces
      </Button>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Workspace Access</DialogTitle>
          <DialogDescription>
            Choose which workspaces {targetLabel} can see and work in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className='py-2'>
            {loading && <p className='text-sm text-muted-foreground'>Loading…</p>}
            {loadError && <p className='text-sm text-destructive'>{loadError}</p>}
            {!loading && !loadError && workspaces.length === 0 && (
              <p className='text-sm text-muted-foreground'>
                There are no workspaces you can grant access to.
              </p>
            )}
            {!loading && !loadError && workspaces.length > 0 && (
              <div className='max-h-56 space-y-1.5 overflow-y-auto rounded-md border border-input p-2'>
                {workspaces.map((workspace) => (
                  <label
                    key={workspace.id}
                    className='flex items-center gap-2 text-sm cursor-pointer select-none'
                  >
                    <input
                      type='checkbox'
                      className='h-3.5 w-3.5 rounded border-input accent-primary'
                      checked={selectedIds.includes(workspace.id)}
                      onChange={(e) => toggleWorkspace(workspace.id, e.target.checked)}
                    />
                    {workspace.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type='submit' size='sm' disabled={isPending || loading || Boolean(loadError)}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
