CREATE TABLE "app_bill_kots" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_bill_kots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"bill_id" bigint NOT NULL,
	"seq" integer NOT NULL,
	"items" jsonb NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_bill_items" ADD COLUMN "sent_qty" numeric(10, 3) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_bill_kots" ADD CONSTRAINT "app_bill_kots_bill_id_app_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."app_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bill_kots" ADD CONSTRAINT "app_bill_kots_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_bill_kots_bill_seq_key" ON "app_bill_kots" USING btree ("bill_id","seq");--> statement-breakpoint
CREATE INDEX "app_bill_kots_bill_idx" ON "app_bill_kots" USING btree ("bill_id");