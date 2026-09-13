// app/(dashboard)/dashboard/data/page.tsx

import { getRPCCaller } from '@/lib/orpc/rsc-client'
import type { WorkspaceListOutput } from '@/lib/orpc/types'
import { getActiveWorkspaceId } from '@/lib/workspace-helper'

export default async function DataPage() {
  const rpc = await getRPCCaller()
  const workspaces: WorkspaceListOutput = await rpc.workspace.list()
  const activeWorkspaceId = await getActiveWorkspaceId(workspaces)
  const activeWorkspace = workspaces.find((p) => p.id === activeWorkspaceId)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-2xl font-bold">
        Data for Workspace: {activeWorkspace ? activeWorkspace.name : 'No workspace selected'}
      </h1>
      <div className="bg-muted/50 min-h-[40vh] rounded-xl" />
    </div>
  )
}
