// scripts/verify-multitenancy.ts

import 'dotenv/config'
import prisma from '../app/lib/db'
import { ROLES } from '../lib/constants'
import { InvitationService } from '../lib/services/invitation-service'
import { OrganizationService } from '../lib/services/organization-service'
import { WorkspaceService } from '../lib/services/workspace-service'

async function main() {
  console.log('🚀 Starting Verification...')

  // 1. Setup Test User
  const testEmail = `test-${Date.now()}@example.com`
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      id: `user-${Date.now()}`, // Simulate Supabase ID
      name: 'Test User',
    },
  })
  console.log(`✅ Created Test User: ${user.email}`)

  // 2. Create Organization
  const orgName = 'Test Corp'
  const orgSlug = `test-corp-${Date.now()}`
  const org = await OrganizationService.createOrganization(user.id, orgName, orgSlug)
  console.log(`✅ Created Organization: ${org.name} (${org.slug})`)

  // Verify Membership
  const members = await prisma.organizationMember.findMany({ where: { organizationId: org.id } })
  if (members.length !== 1 || members[0].role !== ROLES.OWNER) {
    throw new Error('❌ Membership verification failed')
  }
  console.log('✅ Owner Membership verified')

  // 3. Create Workspace
  const workspace = await WorkspaceService.createWorkspace(user.id, org.id, 'Alpha Workspace', `alpha-${Date.now()}`)
  console.log(`✅ Created Workspace: ${workspace.name}`)

  // 4. Invite Member
  const inviteEmail = `invitee-${Date.now()}@example.com`
  const invite = await InvitationService.createInvite(user.id, org.id, inviteEmail, ROLES.MEMBER)
  console.log(`✅ Created Invite for: ${invite.email}`)

  // 5. Accept Invite (Simulate new user)
  const inviteeUser = await prisma.user.create({
    data: {
      email: inviteEmail,
      id: `user-invitee-${Date.now()}`,
      name: 'Invitee User',
    },
  })
  
  await InvitationService.acceptInvite(invite.token, inviteeUser.id)
  console.log('✅ Invite Accepted')

  // Verify Invitee Membership
  const membersAfter = await prisma.organizationMember.findMany({ where: { organizationId: org.id } })
  if (membersAfter.length !== 2) {
    throw new Error('❌ Invitee membership verification failed')
  }
  console.log('✅ Invitee Membership verified')

  // 6. Test Limits (Optional - comment out to save time/resources if needed)
  // Try to create 6 orgs (limit is 5)
  /*
  try {
    for (let i = 0; i < 6; i++) {
      await OrganizationService.createOrganization(user.id, `Org ${i}`, `org-${i}-${Date.now()}`)
    }
    console.error('❌ Failed to enforce Org Limit')
  } catch (e) {
    console.log('✅ Org Limit enforced')
  }
  */

  console.log('🎉 Verification Complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
