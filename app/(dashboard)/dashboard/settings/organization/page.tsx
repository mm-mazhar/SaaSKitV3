// app/(dashboard)/dashboard/settings/organization/page.tsx

import { MemberRoleSelect } from '@/app/(dashboard)/_components/member-role-select'
import { BillingAccessToggle } from '@/app/(dashboard)/_components/billing-access-toggle'
import { InviteMemberDialog } from '@/app/(dashboard)/_components/invite-member-dialog'
import { WorkspaceAccessDialog } from '@/app/(dashboard)/_components/workspace-access-dialog'
import { DeleteOrgButton } from '@/app/(dashboard)/_components/delete-org-button'
import { getCachedUser } from '@/app/lib/supabase/server'
import { TerminalEmptyState } from '@/components/cyber/terminal-empty-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { OrgNameForm } from '@/app/(dashboard)/_components/org-name-form'
import { PendingInvitesList } from '@/app/(dashboard)/_components/pending-invites-list'
import { RemoveMemberButton } from '@/app/(dashboard)/_components/remove-member-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InvitationService } from '@/lib/services/invitation-service'
import { getRPCCaller } from '@/lib/orpc/rsc-client'
import { Building2 } from 'lucide-react'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { requireOrgRole } from '@/lib/auth/guards'
import { PLAN_IDS, resolveEffectivePlanId } from '@/lib/constants'

export default async function OrganizationSettingsPage() {
  noStore()
  const { data: { user } } = await getCachedUser()

  if (!user) {
    return redirect('/get-started')
  }

  const rpc = await getRPCCaller()
  
  const cookieStore = await cookies()
  const currentOrgId = cookieStore.get('current-org-id')?.value
  const organizations = await rpc.org.list() as { id: string; name: string; slug: string; members: { role: string }[] }[]
  
  // Validate membership
  const isMember = currentOrgId && organizations.some((org: { id: string }) => org.id === currentOrgId)
  const effectiveOrgId = isMember ? currentOrgId : (organizations[0]?.id ?? null)

  if (!effectiveOrgId) {
    return (
      <div className='p-4'>
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

  // SECURITY GUARD: Only ADMIN or OWNER can access this page.
  try {
    await requireOrgRole(effectiveOrgId, user.id, 'ADMIN')
  } catch {
    return redirect('/dashboard')
  }

  const org = await rpc.org.getById({ id: effectiveOrgId, includeSubscription: true })
  
  if (!org) {
    return (
      <div className='flex h-[50vh] items-center justify-center'>
        <p className='text-muted-foreground'>Organization not found.</p>
      </div>
    )
  }

  const currentUserMembership = org.members.find((m: { userId: string }) => m.userId === user.id)
  // Free-plan organizations cannot invite team members -- mirrors the server-side
  // gate in InvitationService.createInvite so the UI doesn't just fail silently.
  const isFreePlan = resolveEffectivePlanId(
    (org as { subscription?: { planId?: string | null } }).subscription?.planId,
    (org as { oneTimePlanId?: string | null }).oneTimePlanId
  ) === PLAN_IDS.free

  const invites = await rpc.org.getInvites()
  // Workspaces the CURRENT viewer can access -- used as the invite dialog's default
  // selection (an inviter can never grant access to a workspace they can't see).
  const invitableWorkspaces = await rpc.workspace.list() as { id: string; name: string; slug: string }[]

  const ownedOrganizations = organizations.filter((o: { members: { role: string }[] }) => o.members[0]?.role === 'OWNER')
  const transferTargets = ownedOrganizations
    .filter((o) => o.id !== org.id)
    .map((o) => ({ id: o.id, name: o.name }))

  return (
    <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
      <div>
        <h3 className='text-lg font-medium'>Organization Settings</h3>
        <p className='text-sm text-muted-foreground'>
          Manage your organization settings and members.
        </p>
      </div>
      <Tabs defaultValue='members' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='general'>General</TabsTrigger>
          <TabsTrigger value='members'>Members</TabsTrigger>
        </TabsList>
        <TabsContent value='general' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Organization Name</CardTitle>
              <CardDescription>
                This is your organization&apos;s visible name.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrgNameForm orgId={org.id} defaultName={org.name} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>Delete the organization and all its workspaces.</CardDescription>
            </CardHeader>
            <CardContent>
              {org.isPrimary ? (
                <p className='text-sm text-muted-foreground'>
                  Primary organization cannot be deleted.
                </p>
              ) : (
                <>
                  {org.members.find((m: { userId: string; role: string }) => m.userId === user.id)?.role ===
                  'OWNER' ? (
                    <DeleteOrgButton
                      orgId={org.id}
                      orgName={org.name}
                      credits={org.credits}
                      transferTargets={transferTargets}
                    />
                  ) : (
                    <div className='flex flex-col gap-2'>
                      <Button variant='destructive' disabled className='w-fit'>
                        Delete Organization
                      </Button>
                      <p className='text-[0.8rem] text-muted-foreground'>
                        Only owners can delete the organization.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value='members' className='space-y-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <div className='space-y-1'>
                <CardTitle>Members</CardTitle>
                <CardDescription>
                  Manage who has access to this organization.
                </CardDescription>
              </div>
              <InviteMemberDialog
                orgId={org.id}
                workspaces={invitableWorkspaces}
                disabled={isFreePlan}
                isOwner={currentUserMembership?.role === 'OWNER'}
              />
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {org.members.map((member: { id: string; userId: string; role: string; canManageBilling?: boolean; user?: { name?: string; email?: string } }) => (
                  <div
                    key={member.id}
                    className='flex items-center justify-between space-x-4'
                  >
                    <div className='flex items-center space-x-4'>
                      <Avatar>
                        <AvatarImage src={`https://avatar.vercel.sh/${member.userId}`} />
                        <AvatarFallback>OM</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className='text-sm font-medium leading-none'>
                          {member.user?.name || member.user?.email || `User ID: ${member.userId.substring(0, 8)}...`}
                        </p>
                        {member.user?.name && (
                          <p className='text-xs text-muted-foreground'>
                            {member.user.email}
                          </p>
                        )}
                        <div className='mt-1 flex items-center gap-3'>
                          <MemberRoleSelect
                            memberId={member.userId}
                            initialRole={member.role}
                            currentUserId={user.id}
                            currentUserRole={currentUserMembership?.role ?? 'MEMBER'}
                            orgId={org.id}
                          />
                          {currentUserMembership?.role === 'OWNER' && member.role === 'ADMIN' && (
                            <BillingAccessToggle
                              targetUserId={member.userId}
                              initialCanManageBilling={member.canManageBilling ?? false}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center gap-1'>
                      {(() => {
                        const viewerRole = currentUserMembership?.role ?? 'MEMBER'
                        const isSelf = member.userId === user.id
                        const canManageAccess =
                          !isSelf &&
                          member.role !== 'OWNER' &&
                          (viewerRole === 'OWNER' || (viewerRole === 'ADMIN' && member.role === 'MEMBER'))
                        if (!canManageAccess) return null
                        return (
                          <WorkspaceAccessDialog
                            targetUserId={member.userId}
                            targetLabel={member.user?.name || member.user?.email || 'this member'}
                          />
                        )
                      })()}
                      <RemoveMemberButton
                        targetUserId={member.userId}
                        targetRole={member.role}
                        currentUserId={user.id}
                        currentUserRole={currentUserMembership?.role ?? 'MEMBER'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {invites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Invites</CardTitle>
                <CardDescription>
                  Invitations that have been sent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PendingInvitesList
                  invites={invites.map((i: { id: string; email: string; invitee: { name: string }; role: string; status: string; expiresAt: Date; token: string }) => ({
                    id: i.id,
                    email: i.email,
                    name: i.invitee.name,
                    role: i.role,
                    status: i.status,
                    expiresAt: new Date(i.expiresAt).toISOString(),
                    link: InvitationService.getInviteLink(i.token),
                  }))}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
