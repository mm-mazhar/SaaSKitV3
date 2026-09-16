-- Owner-controlled permission for an ADMIN to buy/change subscriptions and
-- manage billing (billingAdminProcedure). Carried on OrganizationInvite so
-- an owner-granted invite propagates the permission to the accepted
-- membership -- see lib/services/invitation-service.ts's acceptInvite.
ALTER TABLE "OrganizationMember" ADD COLUMN "canManageBilling" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrganizationInvite" ADD COLUMN "canManageBilling" BOOLEAN NOT NULL DEFAULT false;
