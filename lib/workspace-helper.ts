// lib/workspace-helper.ts

import { cookies } from 'next/headers'
import type { WorkspaceListOutput } from '@/lib/orpc/types'

/**
 * Get the active workspace ID based on cookie or default to the first workspace
 * @param workspaces List of available workspaces
 * @returns The active workspace ID or undefined if no workspaces exist
 */
export async function getActiveWorkspaceId(workspaces: WorkspaceListOutput): Promise<string | undefined> {
  if (!workspaces || workspaces.length === 0) {
    return undefined
  }

  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('current-workspace-id')?.value

  // If cookie exists and matches a workspace, return it
  if (activeWorkspaceId && workspaces.some((p) => p.id === activeWorkspaceId)) {
    return activeWorkspaceId
  }

  // Default to the first workspace
  return workspaces[0].id
}
