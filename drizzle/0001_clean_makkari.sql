-- Pre-multi-tenant rows have no owner and can't be backfilled meaningfully
-- (they're disposable seed/test data) — clear them so owner_id can be NOT NULL.
DELETE FROM "tasks";
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "owner_id" text NOT NULL;
