// lib/services/workspace-access-service.ts
//
// Controls WHICH workspaces an organization member can see/use.
// OWNER always has implicit access to every workspace and is never represented
// in the WorkspaceMember table. ADMIN and MEMBER are restricted to whatever has
// been explicitly granted to them.

import prisma from '@/app/lib/db'
import { OrganizationRole, ROLES } from '@/lib/constants'

export class WorkspaceAccessService {
  /**
   * Returns the set of workspace IDs the given membership can access.
   * Returns the literal string 'ALL' for OWNER, since owners are never
   * restricted and don't have WorkspaceMember rows to look up.
   */
  static async getAccessibleWorkspaceIds(
    organizationMemberId: string,
    role: OrganizationRole
  ): Promise<'ALL' | string[]> {
    if (role === ROLES.OWNER) return 'ALL'

    const rows = await prisma.workspaceMember.findMany({
      where: { organizationMemberId },
      select: { workspaceId: true },
    })
    return rows.map((r) => r.workspaceId)
  }

  /**
   * Who is allowed to manage whose workspace access:
   * - Nobody can restrict an OWNER.
   * - OWNER can manage ADMIN and MEMBER.
   * - ADMIN can only manage MEMBER (not other admins, not the owner).
   */
  static assertCanManage(callerRole: OrganizationRole, targetRole: OrganizationRole) {
    if (targetRole === ROLES.OWNER) {
      throw new Error('Forbidden: Owner access cannot be restricted.')
    }
    if (callerRole === ROLES.OWNER) return
    if (callerRole === ROLES.ADMIN && targetRole === ROLES.MEMBER) return
    throw new Error("Forbidden: You do not have permission to manage this member's workspace access.")
  }

  /**
   * Returns every workspace the caller is allowed to grant (their own accessible set --
   * an ADMIN can never grant access to a workspace they cannot see themselves), each
   * flagged with whether the target member currently has it.
   */
  static async getManageableAccess(organizationId: string, callerUserId: string, targetUserId: string) {
    const [caller, target] = await Promise.all([
      prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: callerUserId } },
      }),
      prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: targetUserId } },
      }),
    ])

    if (!caller) throw new Error('Unauthorized: You are not a member of this organization.')
    if (!target) throw new Error('Member not found')

    WorkspaceAccessService.assertCanManage(caller.role as OrganizationRole, target.role as OrganizationRole)

    const [allWorkspaces, callerAccess, targetAccess] = await Promise.all([
      prisma.workspace.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true },
      }),
      WorkspaceAccessService.getAccessibleWorkspaceIds(caller.id, caller.role as OrganizationRole),
      WorkspaceAccessService.getAccessibleWorkspaceIds(target.id, target.role as OrganizationRole),
    ])

    const grantableIds =
      callerAccess === 'ALL' ? new Set(allWorkspaces.map((w) => w.id)) : new Set(callerAccess)
    const targetGrantedIds = targetAccess === 'ALL' ? null : new Set(targetAccess)

    return {
      targetRole: target.role,
      workspaces: allWorkspaces
        .filter((w) => grantableIds.has(w.id))
        .map((w) => ({
          id: w.id,
          name: w.name,
          slug: w.slug,
          granted: targetGrantedIds === null ? true : targetGrantedIds.has(w.id),
        })),
    }
  }

  /**
   * Replaces the target member's workspace access with exactly the given set.
   * The caller may only grant/revoke within the workspaces they themselves can access --
   * anything the target has access to outside that set (e.g. granted by an OWNER) is
   * left untouched.
   */
  static async setMemberWorkspaceAccess(
    organizationId: string,
    callerUserId: string,
    targetUserId: string,
    workspaceIds: string[]
  ) {
    const [caller, target] = await Promise.all([
      prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: callerUserId } },
      }),
      prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: targetUserId } },
      }),
    ])

    if (!caller) throw new Error('Unauthorized: You are not a member of this organization.')
    if (!target) throw new Error('Member not found')

    WorkspaceAccessService.assertCanManage(caller.role as OrganizationRole, target.role as OrganizationRole)

    const callerAccess = await WorkspaceAccessService.getAccessibleWorkspaceIds(
      caller.id,
      caller.role as OrganizationRole
    )
    const allowedIds =
      callerAccess === 'ALL'
        ? (await prisma.workspace.findMany({ where: { organizationId }, select: { id: true } })).map(
            (w) => w.id
          )
        : callerAccess

    const allowedSet = new Set(allowedIds)
    const requested = [...new Set(workspaceIds)]
    const invalid = requested.filter((id) => !allowedSet.has(id))

    if (invalid.length > 0) {
      throw new Error('You can only grant access to workspaces you can access yourself.')
    }

    await prisma.$transaction(async (tx) => {
      // Only touch rows within workspaces the caller can see -- never wipe access
      // to a workspace the caller doesn't even know about.
      await tx.workspaceMember.deleteMany({
        where: {
          organizationMemberId: target.id,
          workspaceId: { in: allowedIds },
        },
      })

      if (requested.length > 0) {
        await tx.workspaceMember.createMany({
          data: requested.map((workspaceId) => ({
            workspaceId,
            organizationMemberId: target.id,
          })),
          skipDuplicates: true,
        })
      }
    })

    return WorkspaceAccessService.getAccessibleWorkspaceIds(target.id, target.role as OrganizationRole)
  }
}
