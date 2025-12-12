CREATE TYPE "public"."channel_role" AS ENUM('admin', 'moderator', 'member');--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_members" DROP CONSTRAINT "channel_members_channel_id_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "channel_members" DROP CONSTRAINT "channel_members_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_channel_id_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "channel_members" ADD COLUMN "role" "channel_role" DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "thread_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "channel_id";--> statement-breakpoint

-- Trigger function: Agregar automáticamente el creador del canal como admin
CREATE OR REPLACE FUNCTION add_channel_owner_as_admin()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO channel_members (channel_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.owner_id, 'admin', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- Trigger: Se ejecuta después de insertar un nuevo canal
CREATE TRIGGER trigger_add_channel_owner_as_admin
AFTER INSERT ON channels
FOR EACH ROW
EXECUTE FUNCTION add_channel_owner_as_admin();