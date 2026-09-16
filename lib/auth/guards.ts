// lib/auth/guards.ts


import prisma from '@/app/lib/db'
import { OrganizationRole, ROLES } from '@/lib/constants'

/**
 * Looks up a user's membership in an organization, excluding memberships in
 * soft-deleted organizations. A soft delete (Organization.deletedAt) does not
 * remove the OrganizationMember rows themselves, so without this guard a
 * stale org id -- e.g. a current-org-id cookie left over from before the
 * user deleted their active organization -- would still "validate" as
 * current. Every subsequent write scoped to that org id then fails deep
 * inside whichever service happens to check org.deletedAt (e.g.
 * "Organization not found" when creating a workspace) instead of a clean,
 * immediate "not a member".
 *
 * Shared by getCurrentOrgContext below and lib/orpc/context.ts's oRPC
 * context resolution, so both entry points agree on what counts as an
 * active membership.
 */
export async function getActiveMembership(organizationId: string, userId: string) {
  return prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId,
      organization: {
        deletedAt: null,
      },
    },
    select: {
      role: true,
      canManageBilling: true,
    },
  })
}

export async function getCurrentOrgContext(organizationId: string, userId: string) {
  const membership = await getActiveMembership(organizationId, userId)

  if (!membership) {
    return null
  }

  return membership.role as OrganizationRole
}

/**
 * Finds another active organization membership for a user, preferring their
 * primary organization and otherwise their oldest membership. Used wherever
 * a "current org" reference (a cookie, or the org just deleted) turns out to
 * be invalid or missing, so the user lands on a real organization they
 * belong to instead of being left with no org context at all.
 */
export async function getFallbackMembership(userId: string) {
  return prisma.organizationMember.findFirst({
    where: {
      userId,
      organization: {
        deletedAt: null,
      },
    },
    orderBy: [{ organization: { isPrimary: 'desc' } }, { createdAt: 'asc' }],
    select: {
      organizationId: true,
      role: true,
      canManageBilling: true,
    },
  })
}


const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  [ROLES.OWNER]: 3,
  [ROLES.ADMIN]: 2,
  [ROLES.MEMBER]: 1,
}

export async function requireOrgRole(orgId: string, userId: string, minimumRole: OrganizationRole) {
  const role = await getCurrentOrgContext(orgId, userId)

  if (!role) {
    throw new Error('Unauthorized: Not a member of this organization')
  }

  const userLevel = ROLE_HIERARCHY[role]
  const requiredLevel = ROLE_HIERARCHY[minimumRole]

  if (userLevel < requiredLevel) {
    throw new Error(`Unauthorized: Requires ${minimumRole} role`)
  }

  return role
}
