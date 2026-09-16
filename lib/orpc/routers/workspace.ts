// lib/orpc/routers/workspace.ts

import * as z from 'zod'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { orgProcedure, adminProcedure } from '../procedures'
import { ORPCError } from '../server'

/**
 * Workspace name validation schema
 * Name must be non-empty and 20 characters or fewer
 */
const nameSchema = z.string().min(1, 'Name is required').max(20, 'Name must be 20 characters or fewer')

/**
 * Generate a unique slug from workspace name, user ID, and timestamp
 * Format: {name-slug}-{user-prefix}-{timestamp}
 */
export function generateWorkspaceSlug(name: string, userId: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const userPrefix = userId.substring(0, 8)
  const timestamp = Date.now()
  return `${baseSlug}-${userPrefix}-${timestamp}`
}

export const workspaceRouter = {
  /**
   * Create a new workspace in the current organization
   * Validates name (max 20 chars), generates unique slug
   */
  // Workspace provisioning is an org-management action, not something every
  // member should be able to do -- members work within workspaces they've
  // been granted access to, they don't create or remove them. This was
  // previously on orgProcedure (any member), which was inconsistent with
  // `delete` and `updateName` below already requiring ADMIN/OWNER.
  create: adminProcedure
    .input(z.object({ name: nameSchema }))
    .route({
      method: 'POST',
      path: '/workspace/create',
      summary: 'Create workspace',
      description: 'Creates a new workspace in the current organization',
    })
    .handler(async ({ input, context }) => {
      const slug = generateWorkspaceSlug(input.name, context.user.id)
      
      try {
        return await WorkspaceService.createWorkspace(
          context.user.id,
          context.orgId,
          input.name,
          slug
        )
      } catch (error) {
        if (error instanceof Error && error.message.includes('Limit reached')) {
          throw new ORPCError('PRECONDITION_FAILED', { message: error.message })
        }
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          throw new ORPCError('FORBIDDEN', { message: error.message })
        }
        throw error
      }
    }),

  /**
   * List all workspaces in the current organization
   */
  list: orgProcedure
    .route({
      method: 'GET',
      path: '/workspace/list',
      summary: 'List workspaces',
      description: 'Returns all workspaces in the current organization',
    })
    .handler(async ({ context }) => {
      return await WorkspaceService.getOrganizationWorkspaces(context.user.id, context.orgId)
    }),

  /**
   * Get a workspace by slug
   */
  getBySlug: orgProcedure
    .input(z.object({ slug: z.string() }))
    .route({
      method: 'GET',
      path: '/workspace/by-slug',
      summary: 'Get workspace',
      description: 'Returns workspace details by slug',
    })
    .handler(async ({ input, context }) => {
      const workspace = await WorkspaceService.getWorkspaceBySlug(
        context.user.id,
        context.orgId,
        input.slug
      )
      
      if (!workspace) {
        throw new ORPCError('NOT_FOUND', { message: 'Workspace not found' })
      }
      
      return workspace
    }),

  /**
   * Update workspace name
   */
  updateName: adminProcedure
    .input(z.object({ 
      workspaceId: z.string(),
      name: nameSchema 
    }))
    .route({
      method: 'PATCH',
      path: '/workspace/update-name',
      summary: 'Update workspace name',
      description: 'Updates the workspace name (requires admin role)',
    })
    .handler(async ({ input, context }) => {
      try {
        return await WorkspaceService.updateWorkspace(
          context.user.id,
          input.workspaceId,
          { name: input.name }
        )
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ORPCError('NOT_FOUND', { message: error.message })
        }
        throw error
      }
    }),

  /**
   * Delete a workspace
   * Requires ADMIN or OWNER role
   */
  delete: adminProcedure
    .input(z.object({ workspaceId: z.string() }))
    .route({
      method: 'DELETE',
      path: '/workspace/delete',
      summary: 'Delete workspace',
      description: 'Deletes a workspace (requires admin role)',
    })
    .handler(async ({ input, context }) => {
      try {
        return await WorkspaceService.deleteWorkspace(context.user.id, input.workspaceId)
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ORPCError('NOT_FOUND', { message: error.message })
        }
        throw error
      }
    }),
}
