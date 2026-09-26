// app/(dashboard)/dashboard/page.tsx

import { CreateWorkspaceDialog } from '@/app/(dashboard)/_components/create-workspace-dialog'
import { WorkspaceActions } from '@/app/(dashboard)/_components/workspace-actions'
import { getCachedUser } from '@/app/lib/supabase/server'
import { TerminalEmptyState } from '@/components/cyber/terminal-empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getRPCCaller } from '@/lib/orpc/rsc-client'
import { Building2, Folder } from 'lucide-react'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  noStore()
  const { data: { user } } = await getCachedUser()

  if (!user) {
    return redirect('/get-started')
  }

  const rpc = await getRPCCaller()

  const cookieStore = await cookies()
  const currentOrgId = cookieStore.get('current-org-id')?.value
  const organizations = await rpc.org.list() as { id: string; members: { role: string }[] }[]
  
  // Validate that the user is actually a member of the organization in the cookie
  const isMember = currentOrgId && organizations.some((org: { id: string }) => org.id === currentOrgId)
  const effectiveOrgId = isMember ? currentOrgId : (organizations[0]?.id ?? null)

  const effectiveOrg = effectiveOrgId ? organizations.find((o: { id: string }) => o.id === effectiveOrgId) : null
  const userRole = effectiveOrg?.members[0]?.role

  if (!effectiveOrgId) {
    return (
      <div className='p-4 pt-0'>
        <TerminalEmptyState
          icon={Building2}
          path='~/organizations'
          readout='0 organizations found'
          title='No organization found'
          description='You are not a member of any organization yet.'
        />
      </div>
    )
  }

  // Use WorkspaceService directly to fetch workspaces for the effective organization.
  // This avoids issues where the RPC context might be using a stale cookie (e.g. pointing to a deleted org).
  const { WorkspaceService } = await import('@/lib/services/workspace-service')
  const workspaces = await WorkspaceService.getOrganizationWorkspaces(user.id, effectiveOrgId) as { id: string; name: string; slug: string; updatedAt: Date }[]

  return (
    <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold tracking-tight'>Workspaces</h2>
        <div>
          <CreateWorkspaceDialog orgId={effectiveOrgId} />
        </div>
      </div>

      {workspaces.length === 0 ? (
        <TerminalEmptyState
          icon={Folder}
          path='~/workspaces'
          readout='0 workspaces found'
          title='No workspaces yet'
          description='Create your first workspace to start building.'
          action={<CreateWorkspaceDialog orgId={effectiveOrgId} />}
          className='animate-in fade-in-50'
        />
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {workspaces.map((workspace: { id: string; name: string; slug: string; updatedAt: Date }) => (
            <Card key={workspace.id} className='hover:bg-muted/50 transition-colors'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  {workspace.name}
                </CardTitle>
                <WorkspaceActions workspaceId={workspace.id} defaultName={workspace.name} userRole={userRole} />
              </CardHeader>
              <CardContent>
                <div className='font-mono text-xs text-muted-foreground'>
                  slug: {workspace.slug}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Updated {new Date(workspace.updatedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
