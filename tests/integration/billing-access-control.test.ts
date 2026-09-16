// tests/integration/billing-access-control.test.ts
//
// Owner-controlled billing access: an OWNER decides which ADMINs may buy or
// change subscriptions and open the Stripe billing portal (billingRouter,
// guarded by billingAdminProcedure). Before this, ANY admin could do those
// things -- adminProcedure made no distinction. These tests exercise the
// real handlers (via createRouterClient) and services against the test
// database, not a hand-mirrored copy, the same lesson learned from the
// credit-transfer bug in organization-deletion.test.ts.

import { describe, it, expect, afterEach } from 'vitest'
import { createRouterClient } from '@orpc/server'
import { appRouter } from '@/lib/orpc/root'
import { OrganizationService } from '@/lib/services/organization-service'
import { InvitationService } from '@/lib/services/invitation-service'
import { ROLES, PLAN_IDS } from '@/lib/constants'
import { TestUtils, testDb } from './setup'

describe('Owner-controlled billing access', () => {
  let ownerUserId: string
  let organizationId: string
  const createdUserIds: string[] = []

  async function setupOrgWithOwnerAndAdmin() {
    const owner = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('owner'))
    ownerUserId = owner.id
    createdUserIds.push(owner.id)

    const org = await OrganizationService.createOrganization(
      owner.id,
      'Billing Access Org',
      TestUtils.generateUniqueSlug('billing-access-org')
    )
    organizationId = org.id

    const admin = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('admin'))
    createdUserIds.push(admin.id)
    await testDb.organizationMember.create({
      data: { organizationId: org.id, userId: admin.id, role: ROLES.ADMIN },
    })

    // Invite tests below go through InvitationService.createInvite, which
    // gates on the org having a paid plan (Free-plan orgs can't invite at
    // all -- see tests/integration/invitations.test.ts). Give the org a
    // paid plan up front so those tests exercise billing-access propagation,
    // not the unrelated plan gate.
    await testDb.subscription.create({
      data: {
        stripeSubscriptionId: `test-sub-${org.id}`,
        interval: 'month',
        status: 'active',
        planId: PLAN_IDS.PLAN_A,
        currentPeriodStart: Math.floor(Date.now() / 1000),
        currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        organizationId: org.id,
      },
    })

    return { owner, admin, org }
  }

  function callAs(userId: string, role: string) {
    return createRouterClient(appRouter, {
      context: {
        user: { id: userId } as never,
        db: testDb,
        orgId: organizationId,
        role,
      },
    }) as {
      org: {
        setMemberBillingAccess: (input: { targetUserId: string; canManageBilling: boolean }) => Promise<unknown>
        updateMemberRole: (input: { targetUserId: string; newRole: string }) => Promise<unknown>
      }
    }
  }

  afterEach(async () => {
    if (organizationId) {
      await testDb.organizationInvite.deleteMany({ where: { organizationId } })
      await testDb.organizationMember.deleteMany({ where: { organizationId } })
      await testDb.organization.deleteMany({ where: { id: organizationId } })
    }
    for (const userId of createdUserIds) {
      await testDb.user.deleteMany({ where: { id: userId } })
    }
    organizationId = ''
    ownerUserId = ''
    createdUserIds.length = 0
  })

  describe('setMemberBillingAccess', () => {
    it('lets the OWNER grant billing access to an ADMIN', async () => {
      const { owner, admin } = await setupOrgWithOwnerAndAdmin()

      await callAs(owner.id, ROLES.OWNER).org.setMemberBillingAccess({
        targetUserId: admin.id,
        canManageBilling: true,
      })

      const membership = await testDb.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: admin.id } },
      })
      expect(membership?.canManageBilling).toBe(true)
    })

    it('lets the OWNER revoke billing access previously granted', async () => {
      const { owner, admin } = await setupOrgWithOwnerAndAdmin()
      await testDb.organizationMember.update({
        where: { organizationId_userId: { organizationId, userId: admin.id } },
        data: { canManageBilling: true },
      })

      await callAs(owner.id, ROLES.OWNER).org.setMemberBillingAccess({
        targetUserId: admin.id,
        canManageBilling: false,
      })

      const membership = await testDb.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: admin.id } },
      })
      expect(membership?.canManageBilling).toBe(false)
    })

    it('rejects a non-owner (ADMIN) trying to grant billing access', async () => {
      const { admin } = await setupOrgWithOwnerAndAdmin()
      const secondAdmin = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('admin2'))
      createdUserIds.push(secondAdmin.id)
      await testDb.organizationMember.create({
        data: { organizationId, userId: secondAdmin.id, role: ROLES.ADMIN },
      })

      await expect(
        callAs(admin.id, ROLES.ADMIN).org.setMemberBillingAccess({
          targetUserId: secondAdmin.id,
          canManageBilling: true,
        })
      ).rejects.toThrow()

      const membership = await testDb.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: secondAdmin.id } },
      })
      expect(membership?.canManageBilling).toBe(false)
    })

    it('rejects granting billing access to a MEMBER (only ADMIN targets make sense)', async () => {
      const { owner } = await setupOrgWithOwnerAndAdmin()
      const member = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('member'))
      createdUserIds.push(member.id)
      await testDb.organizationMember.create({
        data: { organizationId, userId: member.id, role: ROLES.MEMBER },
      })

      await expect(
        callAs(owner.id, ROLES.OWNER).org.setMemberBillingAccess({
          targetUserId: member.id,
          canManageBilling: true,
        })
      ).rejects.toThrow()
    })
  })

  describe('demotion clears billing access', () => {
    it('clears canManageBilling when an admin with billing access is demoted to MEMBER', async () => {
      const { admin } = await setupOrgWithOwnerAndAdmin()
      await testDb.organizationMember.update({
        where: { organizationId_userId: { organizationId, userId: admin.id } },
        data: { canManageBilling: true },
      })

      await OrganizationService.updateMemberRole(organizationId, admin.id, ROLES.MEMBER)

      const membership = await testDb.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: admin.id } },
      })
      expect(membership?.role).toBe(ROLES.MEMBER)
      expect(membership?.canManageBilling).toBe(false)
    })
  })

  describe('invite -> accept propagation', () => {
    it('carries an owner-granted canManageBilling through to the accepted membership', async () => {
      const { owner } = await setupOrgWithOwnerAndAdmin()
      const invitee = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('invitee'))
      createdUserIds.push(invitee.id)

      const invite = await InvitationService.createInvite(
        owner.id,
        organizationId,
        invitee.email,
        ROLES.ADMIN,
        undefined,
        true // owner grants billing access at invite time
      )
      expect(invite.canManageBilling).toBe(true)

      const membership = await InvitationService.acceptInvite(invite.token, invitee.id)
      expect((membership as { role: string; canManageBilling: boolean }).role).toBe(ROLES.ADMIN)
      expect((membership as { role: string; canManageBilling: boolean }).canManageBilling).toBe(true)
    })

    it('never persists canManageBilling for a MEMBER invite, even if somehow passed true', async () => {
      const { owner } = await setupOrgWithOwnerAndAdmin()
      const invitee = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('invitee'))
      createdUserIds.push(invitee.id)

      const invite = await InvitationService.createInvite(
        owner.id,
        organizationId,
        invitee.email,
        ROLES.MEMBER,
        undefined,
        true
      )

      expect(invite.canManageBilling).toBe(false)
    })
  })
})
