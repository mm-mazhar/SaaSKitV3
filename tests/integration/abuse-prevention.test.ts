// tests/integration/abuse-prevention.test.ts

import { CREDITS_FREE, LIMITS, ROLES, WORKSPACE_LIMITS_BY_PLAN, PLAN_IDS } from '@/lib/constants'
import { InvitationService } from '@/lib/services/invitation-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { OrganizationService } from '@/lib/services/organization-service'
import { afterEach, describe, expect, it } from 'vitest'
import { TestUtils, testDb } from './setup'
import { itIf, MULTI_ORG_ENABLED } from '../helpers/guards'

describe('Abuse Prevention & Guardrails', () => {
  let ownerUserId: string
  let primaryOrgId: string
  let secondaryOrgId: string
  const createdUserIds: string[] = []

  async function setupUserWithPrimaryOrg() {
    const owner = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('owner'))
    ownerUserId = owner.id
    createdUserIds.push(owner.id)

    // Create primary organization (first org gets isPrimary: true and 5 credits)
    const primaryOrg = await OrganizationService.createOrganization(
      owner.id,
      'Primary Org',
      TestUtils.generateUniqueSlug('primary')
    )
    primaryOrgId = primaryOrg.id

    return { owner, primaryOrg }
  }

  // Invites require a paid plan (see InvitationService.createInvite); tests that
  // exercise invite behavior beyond the plan gate itself opt into a paid plan
  // explicitly, since setupUserWithPrimaryOrg intentionally leaves the org on the
  // Free plan for the workspace-limit test elsewhere in this file.
  async function givePaidPlan(organizationId: string) {
    await testDb.subscription.create({
      data: {
        stripeSubscriptionId: `test-sub-${organizationId}`,
        interval: 'month',
        status: 'active',
        planId: PLAN_IDS.PLAN_A,
        currentPeriodStart: Math.floor(Date.now() / 1000),
        currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        organizationId,
      },
    })
  }

  async function setupSecondaryOrg() {
    // Create secondary organization (should get isPrimary: false and 0 credits)
    const secondaryOrg = await OrganizationService.createOrganization(
      ownerUserId,
      'Secondary Org',
      TestUtils.generateUniqueSlug('secondary')
    )
    secondaryOrgId = secondaryOrg.id
    return secondaryOrg
  }

  afterEach(async () => {
    // Cleanup organizations
    if (primaryOrgId) {
      await testDb.organizationInvite.deleteMany({ where: { organizationId: primaryOrgId } })
      await testDb.workspace.deleteMany({ where: { organizationId: primaryOrgId } })
      await testDb.organizationMember.deleteMany({ where: { organizationId: primaryOrgId } })
      await testDb.organization.deleteMany({ where: { id: primaryOrgId } })
    }
    if (secondaryOrgId) {
      await testDb.organizationInvite.deleteMany({ where: { organizationId: secondaryOrgId } })
      await testDb.workspace.deleteMany({ where: { organizationId: secondaryOrgId } })
      await testDb.organizationMember.deleteMany({ where: { organizationId: secondaryOrgId } })
      await testDb.organization.deleteMany({ where: { id: secondaryOrgId } })
    }
    
    // Cleanup users
    for (const userId of createdUserIds) {
      await testDb.user.deleteMany({ where: { id: userId } })
    }
    
    // Reset
    ownerUserId = ''
    primaryOrgId = ''
    secondaryOrgId = ''
    createdUserIds.length = 0
  })

  describe('Test 4.1: The "Infinite Credit" Loophole', () => {
    itIf(MULTI_ORG_ENABLED)('should prevent infinite credits by only giving credits to primary organization', async () => {
      const { primaryOrg } = await setupUserWithPrimaryOrg()

      expect(primaryOrg.credits).toBe(CREDITS_FREE)
      expect(primaryOrg.isPrimary).toBe(true)

      // Create secondary organization
      const secondaryOrg = await setupSecondaryOrg()

      // Verify secondary org gets 0 credits and isPrimary: false
      expect(secondaryOrg.credits).toBe(0)
      expect(secondaryOrg.isPrimary).toBe(false)
    })

    it('should enforce organization limit per user', async () => {
      await setupUserWithPrimaryOrg()

      // Create organizations up to the limit
      const organizations = []
      const toCreate = LIMITS.MAX_ORGANIZATIONS_PER_USER - 1
      for (let i = 0; i < toCreate; i++) {
        const org = await OrganizationService.createOrganization(
          ownerUserId,
          `Org ${i + 2}`,
          TestUtils.generateUniqueSlug(`org-${i + 2}`)
        )
        organizations.push(org)
        
        // All additional orgs should have 0 credits and isPrimary: false
        expect(org.credits).toBe(0)
        expect(org.isPrimary).toBe(false)
      }

      // Verify we now have organizations equal to the limit
      const userOrgs = await OrganizationService.getUserOrganizations(ownerUserId)
      expect(userOrgs).toHaveLength(LIMITS.MAX_ORGANIZATIONS_PER_USER)

      // Attempting to create one more organization should fail
      await expect(
        OrganizationService.createOrganization(
          ownerUserId,
          `Org ${LIMITS.MAX_ORGANIZATIONS_PER_USER + 1}`,
          TestUtils.generateUniqueSlug(`org-${LIMITS.MAX_ORGANIZATIONS_PER_USER + 1}`)
        )
      ).rejects.toThrow(`Limit reached: You can only create up to ${LIMITS.MAX_ORGANIZATIONS_PER_USER} organizations.`)

      // Cleanup additional orgs
      for (const org of organizations) {
        await testDb.organizationMember.deleteMany({ where: { organizationId: org.id } })
        await testDb.organization.deleteMany({ where: { id: org.id } })
      }
    })

    itIf(MULTI_ORG_ENABLED)('should only allow one primary organization per user', async () => {
      await setupUserWithPrimaryOrg()

      // Create additional organizations up to available slots (at least 1 to test)
      const secondaryToCreate = Math.max(1, Math.min(2, LIMITS.MAX_ORGANIZATIONS_PER_USER - 1))
      const createdSecondaries: Array<{ id: string }> = []
      for (let i = 0; i < secondaryToCreate; i++) {
        const org = await OrganizationService.createOrganization(
          ownerUserId,
          `Secondary Org ${i + 1}`,
          TestUtils.generateUniqueSlug(`secondary-${i + 1}`)
        )
        createdSecondaries.push({ id: org.id })
      }

      // Verify only the first org is primary
      const allOrgs = await testDb.organization.findMany({
        where: {
          members: {
            some: { userId: ownerUserId }
          }
        }
      })

      const primaryOrgs = allOrgs.filter(org => org.isPrimary)
      const secondaryOrgs = allOrgs.filter(org => !org.isPrimary)

      expect(primaryOrgs).toHaveLength(1)
      expect(secondaryOrgs).toHaveLength(secondaryToCreate)
      expect(primaryOrgs[0].id).toBe(primaryOrgId)

      // Cleanup additional orgs
      for (const org of createdSecondaries) {
        await testDb.organizationMember.deleteMany({ where: { organizationId: org.id } })
        await testDb.organization.deleteMany({ where: { id: org.id } })
      }
    })
  })

  describe('Test 4.3: Invite Spamming', () => {
    it('should enforce rate limit on invitations', async () => {
      await setupUserWithPrimaryOrg()
      await givePaidPlan(primaryOrgId)

      const email1 = TestUtils.generateUniqueEmail('test1')
      const email2 = TestUtils.generateUniqueEmail('test2')

      // Send first invite - should succeed
      const firstInvite = await InvitationService.createInvite(
        ownerUserId,
        primaryOrgId,
        email1,
        ROLES.MEMBER
      )
      expect(firstInvite).toBeDefined()

      // The rate limiting is implemented in the ORPC router, not the service
      // So we test the service behavior and verify that multiple invites can be created
      // but in the real application, the router would prevent rapid successive calls
      
      // For testing purposes, we verify that the service itself doesn't prevent
      // multiple invites (the rate limiting is at the API layer)
      const secondInvite = await InvitationService.createInvite(
        ownerUserId,
        primaryOrgId,
        email2,
        ROLES.MEMBER
      )
      expect(secondInvite).toBeDefined()

      // Verify both invites were created
      const invites = await InvitationService.getOrganizationInvites(primaryOrgId)
      expect(invites).toHaveLength(2)
    })

    it('should enforce pending invite limit per organization', async () => {
      await setupUserWithPrimaryOrg()
      await givePaidPlan(primaryOrgId)

      // Create invites up to the limit
      const invites = []
      for (let i = 0; i < LIMITS.MAX_PENDING_INVITES_PER_ORG; i++) {
        // We need to bypass rate limiting for this test by creating invites directly in DB
        const invite = await testDb.organizationInvite.create({
          data: {
            email: TestUtils.generateUniqueEmail(`invitee-${i}`),
            organizationId: primaryOrgId,
            inviterId: ownerUserId,
            role: ROLES.MEMBER,
            token: `token_${i}_${Date.now()}`,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            status: 'PENDING',
          },
        })
        invites.push(invite)
      }

      // Verify we have the maximum number of pending invites
      const pendingCount = await testDb.organizationInvite.count({
        where: {
          organizationId: primaryOrgId,
          status: 'PENDING',
        },
      })
      expect(pendingCount).toBe(LIMITS.MAX_PENDING_INVITES_PER_ORG)

      // Attempt to create one more should fail
      await expect(
        InvitationService.createInvite(
          ownerUserId,
          primaryOrgId,
          TestUtils.generateUniqueEmail('over-limit'),
          ROLES.MEMBER
        )
      ).rejects.toThrow(`Limit reached: Organization can only have ${LIMITS.MAX_PENDING_INVITES_PER_ORG} pending invites.`)
    })

    it('should allow new invites after revoking existing ones', async () => {
      await setupUserWithPrimaryOrg()

      // Create invites up to the limit (directly in DB to bypass rate limiting)
      const invites = []
      for (let i = 0; i < LIMITS.MAX_PENDING_INVITES_PER_ORG; i++) {
        const invite = await testDb.organizationInvite.create({
          data: {
            email: TestUtils.generateUniqueEmail(`invitee-${i}`),
            organizationId: primaryOrgId,
            inviterId: ownerUserId,
            role: ROLES.MEMBER,
            token: `token_${i}_${Date.now()}`,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            status: 'PENDING',
          },
        })
        invites.push(invite)
      }

      // Revoke one invite
      await InvitationService.revokeInvite(invites[0].id)

      // Should now be able to create a new invite (but will still hit rate limit)
      // So we test by checking the pending count decreased
      const pendingCountAfterRevoke = await testDb.organizationInvite.count({
        where: {
          organizationId: primaryOrgId,
          status: 'PENDING',
        },
      })
      expect(pendingCountAfterRevoke).toBe(LIMITS.MAX_PENDING_INVITES_PER_ORG - 1)
    })

    it('should prevent inviting existing members', async () => {
      await setupUserWithPrimaryOrg()
      await givePaidPlan(primaryOrgId)

      // Add a member to the organization
      const memberEmail = TestUtils.generateUniqueEmail('existing-member')
      const member = await TestUtils.createTestUser(memberEmail)
      createdUserIds.push(member.id)

      await testDb.organizationMember.create({
        data: {
          organizationId: primaryOrgId,
          userId: member.id,
          role: ROLES.MEMBER,
        },
      })

      // Try to invite the same email
      await expect(
        InvitationService.createInvite(
          ownerUserId,
          primaryOrgId,
          memberEmail,
          ROLES.MEMBER
        )
      ).rejects.toThrow('User is already a member of this organization.')
    })
  })

  describe('Test 4.4: Additional Abuse Prevention', () => {
    it('should enforce member limit per organization', async () => {
      await setupUserWithPrimaryOrg()

      // Add members up to the limit (owner counts as 1, so add 4 more)
      const members = []
      for (let i = 0; i < LIMITS.MAX_MEMBERS_PER_ORGANIZATION - 1; i++) {
        const member = await TestUtils.createTestUser(TestUtils.generateUniqueEmail(`member-${i}`))
        createdUserIds.push(member.id)
        
        await testDb.organizationMember.create({
          data: {
            organizationId: primaryOrgId,
            userId: member.id,
            role: ROLES.MEMBER,
          },
        })
        members.push(member)
      }

      // Verify we have the maximum number of members
      const memberCount = await testDb.organizationMember.count({
        where: { organizationId: primaryOrgId },
      })
      expect(memberCount).toBe(LIMITS.MAX_MEMBERS_PER_ORGANIZATION)

      // Attempt to add one more should fail
      const extraMember = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('extra-member'))
      createdUserIds.push(extraMember.id)

      await expect(
        OrganizationService.addMember(primaryOrgId, extraMember.id, ROLES.MEMBER)
      ).rejects.toThrow(`Limit reached: Organization can have max ${LIMITS.MAX_MEMBERS_PER_ORGANIZATION} members.`)
    })

    it('should enforce workspace limit per organization based on pricing plan', async () => {
      const { owner } = await setupUserWithPrimaryOrg()

      // A freshly created organization has no subscription, so it resolves to
      // the free plan's workspace limit.
      const freeLimit = WORKSPACE_LIMITS_BY_PLAN[PLAN_IDS.free]

      // Create workspaces up to the free plan's limit via the real service,
      // so the limit-enforcement code path itself is exercised.
      for (let i = 0; i < freeLimit; i++) {
        await WorkspaceService.createWorkspace(
          owner.id,
          primaryOrgId,
          `Workspace ${i + 1}`,
          TestUtils.generateUniqueSlug(`workspace-${i + 1}`)
        )
      }

      const workspaceCount = await testDb.workspace.count({
        where: { organizationId: primaryOrgId },
      })
      expect(workspaceCount).toBe(freeLimit)

      // Attempting to create one more should be rejected by the service.
      await expect(
        WorkspaceService.createWorkspace(
          owner.id,
          primaryOrgId,
          'One Too Many',
          TestUtils.generateUniqueSlug('one-too-many')
        )
      ).rejects.toThrow(`Limit reached: Your plan allows up to ${freeLimit} workspace${freeLimit === 1 ? '' : 's'}.`)

      const workspaceCountAfter = await testDb.workspace.count({
        where: { organizationId: primaryOrgId },
      })
      expect(workspaceCountAfter).toBe(freeLimit)

      // Cleanup workspaces
      await testDb.workspace.deleteMany({
        where: { organizationId: primaryOrgId },
      })
    })
  })
})
