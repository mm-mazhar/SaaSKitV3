// lib/services/workspace-service.ts

import prisma from '@/app/lib/db'
import { getWorkspaceLimit, resolvePlanId, ROLES } from '@/lib/constants'

export class WorkspaceService {
  static async createWorkspace(userId: string, organizationId: string, name: string, slug: string) {
    // 1. Enforce Membership (Security)
    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } }
    })

    if (!membership) {
        throw new Error('Unauthorized: You are not a member of this organization.')
    }

    // 2. Check Limits (based on the organization's current pricing plan)
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: { select: { planId: true } } },
    })

    if (!org || org.deletedAt) {
      throw new Error('Organization not found')
    }

    const planId = resolvePlanId(org.subscription?.planId)
    const workspaceLimit = getWorkspaceLimit(planId)

    const workspaceCount = await prisma.workspace.count({
      where: {
        organizationId,
        organization: {
          deletedAt: null,
        },
      },
    })

    if (workspaceCount >= workspaceLimit) {
      throw new Error(`Limit reached: Your plan allows up to ${workspaceLimit} workspace${workspaceLimit === 1 ? '' : 's'}. Upgrade to create more.`)
    }

    // 3. Create Workspace
    return await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          slug,
          organizationId,
        },
      })

      // Whoever creates a workspace should be able to see it themselves.
      // OWNER already has implicit access to everything, so no row is needed for them.
      if (membership.role !== ROLES.OWNER) {
        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            organizationMemberId: membership.id,
          },
        })
      }

      return workspace
    })
  }

  /**
   * Workspaces the given org member has access to.
   * OWNER sees every workspace in the organization; ADMIN/MEMBER only see
   * workspaces they've been explicitly granted access to.
   */
  static async getOrganizationWorkspaces(userId: string, organizationId: string) {
    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    })

    if (!membership) {
      return []
    }

    return await prisma.workspace.findMany({
      where: {
        organizationId,
        organization: {
          deletedAt: null,
        },
        ...(membership.role === ROLES.OWNER
          ? {}
          : { members: { some: { organizationMemberId: membership.id } } }),
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  static async getWorkspaceBySlug(userId: string, organizationId: string, slug: string) {
    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    })

    if (!membership) {
      return null
    }

    return await prisma.workspace.findFirst({
      where: {
        slug,
        organizationId,
        organization: {
          deletedAt: null,
        },
        ...(membership.role === ROLES.OWNER
          ? {}
          : { members: { some: { organizationMemberId: membership.id } } }),
      },
    })
  }

  static async updateWorkspace(userId: string, workspaceId: string, data: { name?: string; slug?: string }) {
    const workspace = await WorkspaceService.assertAccess(userId, workspaceId)

    return await prisma.workspace.update({
      where: { id: workspace.id },
      data,
    })
  }

  static async deleteWorkspace(userId: string, workspaceId: string) {
    const workspace = await WorkspaceService.assertAccess(userId, workspaceId)

    return await prisma.workspace.delete({
      where: { id: workspace.id },
    })
  }

  /**
   * Verifies the user is a member of the workspace's organization AND (unless they're
   * the OWNER) has been explicitly granted access to this specific workspace.
   * Throws the same generic error either way so we never leak whether a workspace exists.
   */
  private static async assertAccess(userId: string, workspaceId: string) {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        organization: {
          deletedAt: null,
          members: { some: { userId } },
        },
      },
      include: {
        organization: {
          include: { members: { where: { userId } } },
        },
      },
    })

    if (!workspace) throw new Error('Workspace not found or unauthorized')

    const membership = workspace.organization.members[0]
    if (!membership) throw new Error('Workspace not found or unauthorized')

    if (membership.role !== ROLES.OWNER) {
      const access = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_organizationMemberId: {
            workspaceId,
            organizationMemberId: membership.id,
          },
        },
      })
      if (!access) throw new Error('Workspace not found or unauthorized')
    }

    return workspace
  }
}
