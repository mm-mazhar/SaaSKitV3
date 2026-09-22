// tests/integration/organization-deletion.test.ts
//
// Exercises the REAL organization.delete oRPC handler (via createRouterClient)
// against the test database, rather than a hand-mirrored copy of its logic.
//
// This gap is exactly what let a real bug ship undetected: the property-based
// tests in tests/orpc/routers/organization.test.ts ("Property 14: Credit
// Transfer on Deletion") mirror the INTENDED transfer behavior in a
// standalone `transferCredits` function that already zeroed the source org's
// credits -- but the production handler never actually did that, and since
// the property test only ever calls its own mirror, nothing caught the
// divergence. A deleted org kept showing its old credit balance forever,
// which -- if a soft-deleted org is ever restored for a user -- would hand
// back credits that were already transferred to (and possibly spent by)
// another organization, effectively duplicating them for free.

import { describe, it, expect, afterEach } from 'vitest'
import { createRouterClient } from '@orpc/server'
import { appRouter } from '@/lib/orpc/root'
import { OrganizationService } from '@/lib/services/organization-service'
import { ROLES } from '@/lib/constants'
import { TestUtils, testDb } from './setup'

describe('organization.delete: credit transfer', () => {
  let ownerUserId: string
  let targetOrgId: string
  let sourceOrgId: string

  afterEach(async () => {
    if (sourceOrgId) {
      await testDb.organizationMember.deleteMany({ where: { organizationId: sourceOrgId } })
      await testDb.organization.deleteMany({ where: { id: sourceOrgId } })
    }
    if (targetOrgId) {
      await testDb.organizationMember.deleteMany({ where: { organizationId: targetOrgId } })
      await testDb.organization.deleteMany({ where: { id: targetOrgId } })
    }
    if (ownerUserId) {
      await testDb.user.delete({ where: { id: ownerUserId } }).catch(() => {})
    }
  })

  async function callDelete(orgId: string, transferToOrgId?: string) {
    const caller = createRouterClient(appRouter, {
      context: {
        user: { id: ownerUserId } as never,
        db: testDb,
        orgId,
        role: ROLES.OWNER,
        canManageBilling: true,
      },
    }) as { org: { delete: (input: { transferToOrgId?: string }) => Promise<unknown> } }

    return caller.org.delete({ transferToOrgId })
  }

  it('zeroes the deleted org\'s credits after transferring them to the target org', async () => {
    const owner = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('owner'))
    ownerUserId = owner.id

    // First org for this owner becomes primary -- keep it as the transfer target.
    const target = await OrganizationService.createOrganization(
      owner.id,
      'Target Org',
      TestUtils.generateUniqueSlug('target-org')
    )
    targetOrgId = target.id

    // Second org for the same owner is non-primary, so it's eligible for deletion.
    const source = await OrganizationService.createOrganization(
      owner.id,
      'Source Org',
      TestUtils.generateUniqueSlug('source-org')
    )
    sourceOrgId = source.id

    // Give the source org a credit balance to transfer, as if it had been
    // topped up by a real one-time purchase. Also pin the target's starting
    // balance to a known value -- OrganizationService.createOrganization
    // grants a primary org CREDITS_FREE credits on creation, so asserting
    // against a bare 12 here was wrong the moment the target (created above
    // as the owner's first/primary org) picked up its own signup credits.
    await testDb.organization.update({ where: { id: sourceOrgId }, data: { credits: 12 } })
    await testDb.organization.update({ where: { id: targetOrgId }, data: { credits: 0 } })

    await callDelete(sourceOrgId, targetOrgId)

    const [updatedSource, updatedTarget] = await Promise.all([
      testDb.organization.findUnique({ where: { id: sourceOrgId } }),
      testDb.organization.findUnique({ where: { id: targetOrgId } }),
    ])

    expect(updatedSource?.deletedAt).not.toBeNull()
    // The critical assertion: the deleted org must not retain the credits it
    // just gave away, so restoring it later can never hand them back.
    expect(updatedSource?.credits).toBe(0)
    expect(updatedTarget?.credits).toBe(12)
  })

  it('leaves the source org\'s credits untouched when no transfer target is given', async () => {
    const owner = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('owner'))
    ownerUserId = owner.id

    const target = await OrganizationService.createOrganization(
      owner.id,
      'Target Org',
      TestUtils.generateUniqueSlug('target-org')
    )
    targetOrgId = target.id

    const source = await OrganizationService.createOrganization(
      owner.id,
      'Source Org',
      TestUtils.generateUniqueSlug('source-org')
    )
    sourceOrgId = source.id

    await testDb.organization.update({ where: { id: sourceOrgId }, data: { credits: 7 } })

    await callDelete(sourceOrgId)

    const updatedSource = await testDb.organization.findUnique({ where: { id: sourceOrgId } })
    expect(updatedSource?.deletedAt).not.toBeNull()
    expect(updatedSource?.credits).toBe(7)
  })
})
