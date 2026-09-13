// app/(dashboard)/_components/workspace-switcher.tsx

'use client'

import { ChevronsUpDown, Folder, Loader2, Plus } from 'lucide-react'
import * as React from 'react'

import { CreateWorkspaceDialog } from '@/app/(dashboard)/_components/create-workspace-dialog'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/app/(dashboard)/_components/sidebar'
import { switchWorkspace } from '@/app/actions/cookie-actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  orgId,
}: {
  workspaces: {
    id: string
    name: string
    slug: string
  }[]
  activeWorkspaceId?: string
  orgId: string
}) {
  const { isMobile } = useSidebar()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const activeWorkspace = workspaces.find((p) => p.id === activeWorkspaceId)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <div className='bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
                <Folder className='size-4' />
              </div>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>
                  {activeWorkspace ? activeWorkspace.name : 'Select Workspace'}
                </span>
                <span className='truncate text-xs'>
                  {activeWorkspace ? 'Active Workspace' : 'No workspace selected'}
                </span>
              </div>
              <ChevronsUpDown className='ml-auto' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-muted-foreground text-xs'>
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => {
                  if (workspace.id === activeWorkspaceId) return
                  startTransition(async () => {
                    await switchWorkspace(workspace.id)
                  })
                }}
                className='gap-2 p-2'
                disabled={isPending}
              >
                <div className='flex size-6 items-center justify-center rounded-md border'>
                  <Folder className='size-3.5 shrink-0' />
                </div>
                {workspace.name}
                {isPending && workspace.id !== activeWorkspaceId && (
                  <Loader2 className='ml-auto size-4 animate-spin' />
                )}
                {workspace.id === activeWorkspaceId && (
                  <div className='ml-auto size-2 rounded-full bg-primary' />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className='gap-2 p-2' onClick={() => setOpen(true)}>
              <div className='flex size-6 items-center justify-center rounded-md border bg-transparent'>
                <Plus className='size-4' />
              </div>
              <div className='font-medium'>Create Workspace</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateWorkspaceDialog orgId={orgId} open={open} onOpenChange={setOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
