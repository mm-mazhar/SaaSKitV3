-- Rename the "Project" table to "Workspace" (naming change only, no business-logic change)
ALTER TABLE "Project" RENAME TO "Workspace";

-- Rename primary key constraint
ALTER TABLE "Workspace" RENAME CONSTRAINT "Project_pkey" TO "Workspace_pkey";

-- Rename foreign key constraint
ALTER TABLE "Workspace" RENAME CONSTRAINT "Project_organizationId_fkey" TO "Workspace_organizationId_fkey";

-- Rename indexes
ALTER INDEX "Project_organizationId_idx" RENAME TO "Workspace_organizationId_idx";
ALTER INDEX "Project_organizationId_slug_key" RENAME TO "Workspace_organizationId_slug_key";
