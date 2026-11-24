ALTER TYPE "public"."app_user_role" ADD VALUE 'counter';--> statement-breakpoint
CREATE TABLE "app_staff_members" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_staff_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"title" text,
	"is_cashier" boolean DEFAULT true NOT NULL,
	"status" "app_entity_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_bills" ADD COLUMN "cashier_id" bigint;--> statement-breakpoint
ALTER TABLE "app_bills" ADD COLUMN "cashier_name" text;--> statement-breakpoint
CREATE UNIQUE INDEX "app_staff_members_name_key" ON "app_staff_members" USING btree (lower("name"));--> statement-breakpoint
ALTER TABLE "app_bills" ADD CONSTRAINT "app_bills_cashier_id_app_staff_members_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."app_staff_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_bills_cashier_idx" ON "app_bills" USING btree ("cashier_id");