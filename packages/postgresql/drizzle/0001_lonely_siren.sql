ALTER TABLE "nonces" ADD COLUMN "used_at" timestamp with time zone;--> statement-breakpoint
UPDATE "nonces" SET "used_at" = NOW() WHERE "used_at" IS NULL;
