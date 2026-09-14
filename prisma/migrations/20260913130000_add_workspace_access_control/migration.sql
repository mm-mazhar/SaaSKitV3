-- Per-workspace access control: which organization members can see/use which workspaces.
-- OWNER is intentionally never represented in this table -- owners always have
-- implicit access to every workspace in their organization (enforced in app code).
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "organizationMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_organizationMemberId_key" ON "WorkspaceMember"("workspaceId", "organizationMemberId");
CREATE INDEX "WorkspaceMember_organizationMemberId_idx" ON "WorkspaceMember"("organizationMemberId");
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");

ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_organizationMemberId_fkey" FOREIGN KEY ("organizationMemberId") REFERENCES "OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carries an inviter's chosen workspace access through to invite acceptance.
ALTER TABLE "OrganizationInvite" ADD COLUMN "workspaceIds" TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: grandfather every existing non-owner member into every workspace their
-- organization already has, so nobody's access changes the moment this ships.
-- (Owners are excluded on purpose -- they get implicit full access in app code.)
INSERT INTO "WorkspaceMember" ("id", "workspaceId", "organizationMemberId", "createdAt")
SELECT
  substr(md5(random()::text || clock_timestamp()::text || w.id || om.id), 1, 25),
  w.id,
  om.id,
  CURRENT_TIMESTAMP
FROM "OrganizationMember" om
JOIN "Workspace" w ON w."organizationId" = om."organizationId"
WHERE om.role <> 'OWNER'
ON CONFLICT ("workspaceId", "organizationMemberId") DO NOTHING;
