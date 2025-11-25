-- Drop constraints
ALTER TABLE "account" DROP CONSTRAINT "account_user_id_user_id_fk";
ALTER TABLE "session" DROP CONSTRAINT "session_user_id_user_id_fk";
ALTER TABLE "channel_members" DROP CONSTRAINT "channel_members_user_id_user_id_fk";
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_user_id_fk";
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_user_id_user_id_fk";

-- Alter columns
ALTER TABLE "account" ALTER COLUMN "user_id" SET DATA TYPE text;
ALTER TABLE "channel_members" ALTER COLUMN "user_id" SET DATA TYPE text;
ALTER TABLE "messages" ALTER COLUMN "sender_id" SET DATA TYPE text;
ALTER TABLE "profiles" ALTER COLUMN "user_id" SET DATA TYPE text;
ALTER TABLE "session" ALTER COLUMN "user_id" SET DATA TYPE text;
ALTER TABLE "user" ALTER COLUMN "id" SET DATA TYPE text;
ALTER TABLE "user" ALTER COLUMN "id" DROP DEFAULT;

-- Re-add constraints
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;