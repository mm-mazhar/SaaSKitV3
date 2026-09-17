// tests/integration/setup.ts
// Load environment variables first
import './env-setup'
import { beforeAll, afterAll } from 'vitest'
import prisma from '@/app/lib/db'

// Export the existing prisma instance for tests
export const testDb = prisma

// Global setup and teardown
beforeAll(async () => {
  // Ensure database connection is established
  await testDb.$connect()
})

afterAll(async () => {
  // Clean up and disconnect
  await testDb.$disconnect()
})

// Test utilities
export class TestUtils {
  static async createTestUser(email?: string, name?: string) {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    return await testDb.user.create({
      data: {
        id: `test-user-${uniqueId}`,
        email: email || `test-${uniqueId}@example.com`,
        name: name || 'Test User',
      },
    })
  }

  static async cleanupUser(userId: string) {
    // Clean up in proper order to respect foreign key constraints.
    //
    // BUG THIS FIXES: the organization lookup below (by `members: { some:
    // { userId } }`) has to run BEFORE the OrganizationMember rows for this
    // user are deleted -- the old version deleted memberships first and then
    // used that same now-empty relation to find organizations to delete, so
    // it always found zero and every organization a test user ever owned
    // was silently left behind. That's a real, confirmed leak: the shared
    // dev database this suite runs against had accumulated 270+ orphaned
    // test organizations (and their now-unreachable subscriptions) against
    // only 2 real users, which bloats every query these tests run and is a
    // very plausible contributor to the hook timeouts / flakiness seen when
    // running the full suite under load.
    const userOrganizations = await testDb.organization.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      select: { id: true },
    })
    const organizationIds = userOrganizations.map((org) => org.id)

    // 1. Delete organization invites (both ones this user sent, and any
    // belonging to an organization we're about to delete below).
    await testDb.organizationInvite.deleteMany({
      where: {
        OR: [{ inviterId: userId }, { organizationId: { in: organizationIds } }],
      },
    })

    // 2. Delete workspaces from organizations owned by this user
    if (organizationIds.length > 0) {
      await testDb.workspace.deleteMany({
        where: { organizationId: { in: organizationIds } },
      })
    }

    // 3. Delete organization memberships
    await testDb.organizationMember.deleteMany({
      where: { userId },
    })

    // 4. Delete organizations (captured above, before their memberships
    // were deleted)
    if (organizationIds.length > 0) {
      await testDb.organization.deleteMany({
        where: { id: { in: organizationIds } },
      })
    }

    // 5. Finally delete the user
    await testDb.user.delete({
      where: { id: userId },
    })
  }

  static async cleanupOrganization(organizationId: string) {
    // Delete workspaces first
    await testDb.workspace.deleteMany({
      where: { organizationId },
    })

    // Delete invites
    await testDb.organizationInvite.deleteMany({
      where: { organizationId },
    })

    // Delete memberships
    await testDb.organizationMember.deleteMany({
      where: { organizationId },
    })

    // Delete organization
    await testDb.organization.delete({
      where: { id: organizationId },
    })
  }

  static generateUniqueSlug(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  }

  static generateUniqueEmail(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}@example.com`
  }
}

// Database state helpers
export class DatabaseHelpers {
  static async getOrganizationWithMembers(organizationId: string) {
    return await testDb.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        workspaces: true,
      },
    })
  }

  static async getUserWithOrganizations(userId: string) {
    return await testDb.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    })
  }

  static async getWorkspacesByOrganization(organizationId: string) {
    return await testDb.workspace.findMany({
      where: { organizationId },
      include: {
        organization: true,
      },
    })
  }

  static async countUserOrganizations(userId: string) {
    return await testDb.organizationMember.count({
      where: {
        userId,
        organization: {
          deletedAt: null,
        },
      },
    })
  }

  static async countOrganizationWorkspaces(organizationId: string) {
    return await testDb.workspace.count({
      where: { organizationId },
    })
  }
}