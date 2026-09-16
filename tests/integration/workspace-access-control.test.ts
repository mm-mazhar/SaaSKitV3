// tests/integration/workspace-access-control.test.ts
//
// Per-workspace RBAC: an owner/admin restricting which workspaces a member can
// see and use. These tests exercise the actual security boundary -- who can
// grant access to what -- not just the CRUD around it.

import { describe, it, expect, afterEach } from 'vitest'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { WorkspaceAccessService } from '@/lib/services/workspace-access-service'
import { ROLES } from '@/lib/constants'
import { TestUtils, testDb } from './setup'

describe('Workspace Access Control', () => {
  let ownerUserId: string
  let organizationId: string
  const createdUserIds: string[] = []
  const createdWorkspaceIds: string[] = []

  async function setupOrgWithAllRoles() {
    const owner = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('owner'))
    ownerUserId = owner.id
    createdUserIds.push(owner.id)

    const org = await OrganizationService.createOrganization(
      owner.id,
      'Access Control Org',
      TestUtils.generateUniqueSlug('access-org')
    )
    organizationId = org.id

    const admin = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('admin'))
    createdUserIds.push(admin.id)
    await testDb.organizationMember.create({
      data: { organizationId: org.id, userId: admin.id, role: ROLES.ADMIN },
    })

    const admin2 = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('admin2'))
    createdUserIds.push(admin2.id)
    await testDb.organizationMember.create({
      data: { organizationId: org.id, userId: admin2.id, role: ROLES.ADMIN },
    })

    const member = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('member'))
    createdUserIds.push(member.id)
    await testDb.organizationMember.create({
      data: { organizationId: org.id, userId: member.id, role: ROLES.MEMBER },
    })

    return { owner, admin, admin2, member, org }
  }

  async function createWorkspace(name: string) {
    // Bypass plan limits here -- these tests are about access grants, not quotas.
    const workspace = await testDb.workspace.create({
      data: {
        name,
        slug: TestUtils.generateUniqueSlug(name.toLowerCase().replace(/\s+/g, '-')),
        organizationId,
      },
    })
    createdWorkspaceIds.push(workspace.id)
    return workspace
  }

  function membershipOf(userId: string) {
    return testDb.organizationMember.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId, userId } },
    })
  }

  afterEach(async () => {
    if (organizationId) {
      await testDb.organizationInvite.deleteMany({ where: { organizationId } })
      await testDb.workspace.deleteMany({ where: { organizationId } })
      await testDb.organizationMember.deleteMany({ where: { organizationId } })
      await testDb.organization.deleteMany({ where: { id: organizationId } })
    }
    for (const userId of createdUserIds) {
      await testDb.user.deleteMany({ where: { id: userId } })
    }
    organizationId = ''
    ownerUserId = ''
    createdUserIds.length = 0
    createdWorkspaceIds.length = 0
  })

  describe('OWNER access', () => {
    it('OWNER always resolves to unrestricted ("ALL") access, even with zero WorkspaceMember rows', async () => {
      const { owner } = await setupOrgWithAllRoles()
      await createWorkspace('Workspace A')

      const ownerMembership = await membershipOf(owner.id)
      const access = await WorkspaceAccessService.getAccessibleWorkspaceIds(
        ownerMembership.id,
        ROLES.OWNER
      )
      expect(access).toBe('ALL')
    })

    it('OWNER sees every workspace via WorkspaceService.getOrganizationWorkspaces regardless of grants', async () => {
      const { owner } = await setupOrgWithAllRoles()
      await createWorkspace('Workspace A')
      await createWorkspace('Workspace B')

      const workspaces = await WorkspaceService.getOrganizationWorkspaces(owner.id, organizationId)
      expect(workspaces).toHaveLength(2)
    })

    it('nobody -- not even another OWNER-level call -- can restrict the OWNER', async () => {
      await setupOrgWithAllRoles()
      expect(() => WorkspaceAccessService.assertCanManage(ROLES.OWNER, ROLES.OWNER)).toThrow(
        'Forbidden: Owner access cannot be restricted.'
      )
    })
  })

  describe('Default (unrestricted) access for MEMBER/ADMIN with no explicit grants', () => {
    it('a member with zero WorkspaceMember rows sees no workspaces', async () => {
      const { member } = await setupOrgWithAllRoles()
      await createWorkspace('Workspace A')

      const workspaces = await WorkspaceService.getOrganizationWorkspaces(member.id, organizationId)
      expect(workspaces).toHaveLength(0)
    })
  })

  describe('OWNER granting/restricting ADMIN and MEMBER access', () => {
    it('OWNER can grant a member access to a specific subset of workspaces', async () => {
      const { owner, member } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')
      await createWorkspace('Workspace B')

      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, member.id, [
        wsA.id,
      ])

      const workspaces = await WorkspaceService.getOrganizationWorkspaces(member.id, organizationId)
      expect(workspaces.map((w) => w.id)).toEqual([wsA.id])
    })

    it('OWNER can grant an admin access to a specific subset of workspaces', async () => {
      const { owner, admin } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')
      await createWorkspace('Workspace B')

      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, admin.id, [
        wsA.id,
      ])

      const workspaces = await WorkspaceService.getOrganizationWorkspaces(admin.id, organizationId)
      expect(workspaces.map((w) => w.id)).toEqual([wsA.id])
    })

    it('setMemberWorkspaceAccess replaces the full set (revokes what is left out)', async () => {
      const { owner, member } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')
      const wsB = await createWorkspace('Workspace B')

      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, member.id, [
        wsA.id,
        wsB.id,
      ])
      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, member.id, [
        wsB.id,
      ])

      const workspaces = await WorkspaceService.getOrganizationWorkspaces(member.id, organizationId)
      expect(workspaces.map((w) => w.id)).toEqual([wsB.id])
    })

    it('setMemberWorkspaceAccess with an empty array revokes all access', async () => {
      const { owner, member } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')

      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, member.id, [
        wsA.id,
      ])
      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, member.id, [])

      const workspaces = await WorkspaceService.getOrganizationWorkspaces(member.id, organizationId)
      expect(workspaces).toHaveLength(0)
    })
  })

  describe('ADMIN managing MEMBER access -- can only grant what the admin can see', () => {
    it('an admin with full (owner-granted) access can grant a member any workspace', async () => {
      const { owner, admin, member } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')
      const wsB = await createWorkspace('Workspace B')

      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, admin.id, [
        wsA.id,
        wsB.id,
      ])

      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, admin.id, member.id, [
        wsB.id,
      ])

      const workspaces = await WorkspaceService.getOrganizationWorkspaces(member.id, organizationId)
      expect(workspaces.map((w) => w.id)).toEqual([wsB.id])
    })

    it('an admin cannot grant a member access to a workspace the admin cannot see themselves', async () => {
      const { owner, admin, member } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')
      const wsB = await createWorkspace('Workspace B')

      // Admin is only granted wsA -- wsB is invisible to them.
      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, admin.id, [
        wsA.id,
      ])

      await expect(
        WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, admin.id, member.id, [wsB.id])
      ).rejects.toThrow('You can only grant access to workspaces you can access yourself.')

      // Nothing should have been granted.
      const workspaces = await WorkspaceService.getOrganizationWorkspaces(member.id, organizationId)
      expect(workspaces).toHaveLength(0)
    })

    it("restricting a member never touches access an OWNER granted outside the admin's own visible set", async () => {
      const { owner, admin, member } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')
      const wsB = await createWorkspace('Workspace B')

      // Admin can only see wsA.
      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, admin.id, [
        wsA.id,
      ])
      // Owner separately granted the member access to wsB directly.
      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, member.id, [
        wsB.id,
      ])

      // Admin now grants the member wsA too -- this must not wipe the member's wsB access,
      // since wsB is outside what the admin can see/manage.
      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, admin.id, member.id, [
        wsA.id,
      ])

      const workspaces = await WorkspaceService.getOrganizationWorkspaces(member.id, organizationId)
      expect(new Set(workspaces.map((w) => w.id))).toEqual(new Set([wsA.id, wsB.id]))
    })
  })

  describe('ADMIN cannot manage OWNER or other ADMINs', () => {
    it('an admin cannot manage another admin\'s workspace access', async () => {
      const { admin, admin2 } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')

      await expect(
        WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, admin.id, admin2.id, [wsA.id])
      ).rejects.toThrow("Forbidden: You do not have permission to manage this member's workspace access.")
    })

    it('an admin cannot manage the owner\'s workspace access', async () => {
      const { admin, owner } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')

      await expect(
        WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, admin.id, owner.id, [wsA.id])
      ).rejects.toThrow('Forbidden: Owner access cannot be restricted.')
    })

    it('the owner cannot have their own access restricted by anyone, including themselves', async () => {
      const { owner } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')

      await expect(
        WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, owner.id, [wsA.id])
      ).rejects.toThrow('Forbidden: Owner access cannot be restricted.')
    })
  })

  describe('Non-members cannot manage or be given workspace access', () => {
    it('rejects a caller who is not a member of the organization', async () => {
      const { member } = await setupOrgWithAllRoles()
      const outsider = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('outsider'))
      createdUserIds.push(outsider.id)
      const wsA = await createWorkspace('Workspace A')

      await expect(
        WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, outsider.id, member.id, [
          wsA.id,
        ])
      ).rejects.toThrow('Unauthorized: You are not a member of this organization.')
    })

    it('rejects a target who is not a member of the organization', async () => {
      const { owner } = await setupOrgWithAllRoles()
      const outsider = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('outsider'))
      createdUserIds.push(outsider.id)
      const wsA = await createWorkspace('Workspace A')

      await expect(
        WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, outsider.id, [
          wsA.id,
        ])
      ).rejects.toThrow('Member not found')
    })
  })

  describe('getManageableAccess (drives the access-management UI)', () => {
    it('for an owner-as-caller, every workspace is grantable and flags are accurate', async () => {
      const { owner, member } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')
      const wsB = await createWorkspace('Workspace B')
      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, member.id, [
        wsA.id,
      ])

      const result = await WorkspaceAccessService.getManageableAccess(
        organizationId,
        owner.id,
        member.id
      )

      expect(result.targetRole).toBe(ROLES.MEMBER)
      expect(result.workspaces).toHaveLength(2)
      expect(result.workspaces.find((w) => w.id === wsA.id)?.granted).toBe(true)
      expect(result.workspaces.find((w) => w.id === wsB.id)?.granted).toBe(false)
    })

    it('for an admin-as-caller, only the workspaces the admin can see are listed as grantable', async () => {
      const { owner, admin, member } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')
      await createWorkspace('Workspace B') // admin cannot see this one

      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, admin.id, [
        wsA.id,
      ])

      const result = await WorkspaceAccessService.getManageableAccess(
        organizationId,
        admin.id,
        member.id
      )

      expect(result.workspaces).toHaveLength(1)
      expect(result.workspaces[0].id).toBe(wsA.id)
    })

    it('throws Forbidden when an admin tries to view another admin\'s manageable access', async () => {
      const { admin, admin2 } = await setupOrgWithAllRoles()
      await createWorkspace('Workspace A')

      await expect(
        WorkspaceAccessService.getManageableAccess(organizationId, admin.id, admin2.id)
      ).rejects.toThrow("Forbidden: You do not have permission to manage this member's workspace access.")
    })
  })

  describe('Workspace creation auto-grants the creator access', () => {
    // Workspace creation is admin-tier-and-up (see "workspace.create
    // authorization" below) -- an ADMIN, not a MEMBER, exercises the
    // auto-grant-access behavior this test is actually about.
    it('an admin who creates a workspace can immediately see it', async () => {
      const { admin } = await setupOrgWithAllRoles()

      const workspace = await WorkspaceService.createWorkspace(
        admin.id,
        organizationId,
        'Self-Created WS',
        TestUtils.generateUniqueSlug('self-created')
      )
      createdWorkspaceIds.push(workspace.id)

      const workspaces = await WorkspaceService.getOrganizationWorkspaces(admin.id, organizationId)
      expect(workspaces.map((w) => w.id)).toContain(workspace.id)
    })

    it('does not create a WorkspaceMember row for an OWNER (implicit access is enough)', async () => {
      const { owner } = await setupOrgWithAllRoles()
      const ownerMembership = await membershipOf(owner.id)

      const workspace = await WorkspaceService.createWorkspace(
        owner.id,
        organizationId,
        'Owner-Created WS',
        TestUtils.generateUniqueSlug('owner-created')
      )
      createdWorkspaceIds.push(workspace.id)

      const row = await testDb.workspaceMember.findUnique({
        where: {
          workspaceId_organizationMemberId: {
            workspaceId: workspace.id,
            organizationMemberId: ownerMembership.id,
          },
        },
      })
      expect(row).toBeNull()
    })
  })

  describe('Read/write access enforcement on individual workspaces', () => {
    it('a member without access cannot update a workspace they cannot see', async () => {
      const { member } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')

      await expect(
        WorkspaceService.updateWorkspace(member.id, wsA.id, { name: 'Hacked' })
      ).rejects.toThrow('Workspace not found or unauthorized')
    })

    it('a member with granted access can update that workspace', async () => {
      const { owner, member } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')
      await WorkspaceAccessService.setMemberWorkspaceAccess(organizationId, owner.id, member.id, [
        wsA.id,
      ])

      const updated = await WorkspaceService.updateWorkspace(member.id, wsA.id, {
        name: 'Renamed by Member',
      })
      expect(updated.name).toBe('Renamed by Member')
    })

    it('a member without access cannot delete a workspace they cannot see', async () => {
      const { member } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')

      await expect(WorkspaceService.deleteWorkspace(member.id, wsA.id)).rejects.toThrow(
        'Workspace not found or unauthorized'
      )
    })

    it('the owner can update/delete any workspace without an explicit grant', async () => {
      const { owner } = await setupOrgWithAllRoles()
      const wsA = await createWorkspace('Workspace A')

      const updated = await WorkspaceService.updateWorkspace(owner.id, wsA.id, {
        name: 'Renamed by Owner',
      })
      expect(updated.name).toBe('Renamed by Owner')

      await WorkspaceService.deleteWorkspace(owner.id, wsA.id)
      createdWorkspaceIds.splice(createdWorkspaceIds.indexOf(wsA.id), 1)

      const found = await testDb.workspace.findUnique({ where: { id: wsA.id } })
      expect(found).toBeNull()
    })
  })

  // A plain MEMBER could previously create workspaces (workspace.create was on
  // orgProcedure, any member) while being blocked from renaming/deleting them
  // (adminProcedure) -- an asymmetric gap: members were meant to work within
  // workspaces they're granted access to, not provision or remove them.
  describe('workspace.create authorization', () => {
    it('rejects a MEMBER trying to create a workspace', async () => {
      const { member } = await setupOrgWithAllRoles()

      await expect(
        WorkspaceService.createWorkspace(member.id, organizationId, 'New Workspace', 'new-workspace-x')
      ).rejects.toThrow(/Unauthorized/i)

      const workspaces = await testDb.workspace.findMany({ where: { organizationId } })
      expect(workspaces).toHaveLength(0)
    })

    it('allows an ADMIN to create a workspace', async () => {
      const { admin } = await setupOrgWithAllRoles()

      const workspace = await WorkspaceService.createWorkspace(
        admin.id,
        organizationId,
        'New Workspace',
        'new-workspace-y'
      )
      createdWorkspaceIds.push(workspace.id)

      expect(workspace.organizationId).toBe(organizationId)
    })

    it('allows the OWNER to create a workspace', async () => {
      const { owner } = await setupOrgWithAllRoles()

      const workspace = await WorkspaceService.createWorkspace(
        owner.id,
        organizationId,
        'New Workspace',
        'new-workspace-z'
      )
      createdWorkspaceIds.push(workspace.id)

      expect(workspace.organizationId).toBe(organizationId)
    })
  })
})
