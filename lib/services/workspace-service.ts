// lib/services/workspace-service.ts

import prisma from '@/app/lib/db'
import { LIMITS } from '@/lib/constants'

export class WorkspaceService {
  static async createWorkspace(userId: string, organizationId: string, name: string, slug: string) {
    // 1. Enforce Membership (Security)
    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } }
    })
    
    if (!membership) {
        throw new Error('Unauthorized: You are not a member of this organization.')
    }

    // 2. Check Limits
    const workspaceCount = await prisma.workspace.count({
      where: {
        organizationId,
        organization: {
          deletedAt: null,
        },
      },
    })

    if (workspaceCount >= LIMITS.MAX_WORKSPACES_PER_ORGANIZATION) {
      throw new Error(`Limit reached: Organization can only have up to ${LIMITS.MAX_WORKSPACES_PER_ORGANIZATION} workspaces.`)
    }

    // 3. Create Workspace
    return await prisma.workspace.create({
      data: {
        name,
        slug,
        organizationId,
      },
    })
  }

  static async getOrganizationWorkspaces(userId: string, organizationId: string) {
    return await prisma.workspace.findMany({
      where: {
        organizationId,
        // Enforce RLS: User must be member of the org
        organization: {
            deletedAt: null,
            members: {
                some: {
                    userId
                }
            }
        }
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  static async getWorkspaceBySlug(userId: string, organizationId: string, slug: string) {
    return await prisma.workspace.findFirst({
      where: {
        slug,
        organizationId,
        // Enforce RLS
        organization: {
            deletedAt: null,
            members: {
                some: { userId }
            }
        }
      },
    })
  }

  static async updateWorkspace(userId: string, workspaceId: string, data: { name?: string; slug?: string }) {
    // Check if workspace exists and user has access (RLS)
    // We update only if the workspace's org has this user as member
    // Note: Caller should verify granular permissions (Edit capability)
    const workspace = await prisma.workspace.findFirst({
        where: {
            id: workspaceId,
            organization: { 
                deletedAt: null,
                members: { some: { userId } } 
            }
        }
    })

    if (!workspace) throw new Error('Workspace not found or unauthorized')

    return await prisma.workspace.update({
      where: { id: workspaceId },
      data,
    })
  }

  static async deleteWorkspace(userId: string, workspaceId: string) {
     // Verify access first
     const workspace = await prisma.workspace.findFirst({
         where: {
             id: workspaceId,
             organization: { 
                 deletedAt: null,
                 members: { some: { userId } } 
             }
         }
     })

     if (!workspace) throw new Error('Workspace not found or unauthorized')

    return await prisma.workspace.delete({
      where: { id: workspaceId },
    })
  }
}
