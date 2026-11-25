CREATE TABLE "app_bill_feedback" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_bill_feedback_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"bill_id" bigint NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"overall_rating" integer,
	"ambience_rating" integer,
	"service_rating" integer,
	"experience_rating" integer,
	"would_recommend" boolean,
	"comment" text,
	"contact_name" text,
	"contact_phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_bill_feedback_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_bill_feedback_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"feedback_id" bigint NOT NULL,
	"bill_item_id" bigint,
	"item_name" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text
);
--> statement-breakpoint
ALTER TABLE "app_bill_feedback" ADD CONSTRAINT "app_bill_feedback_bill_id_app_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."app_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bill_feedback_items" ADD CONSTRAINT "app_bill_feedback_items_feedback_id_app_bill_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."app_bill_feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bill_feedback_items" ADD CONSTRAINT "app_bill_feedback_items_bill_item_id_app_bill_items_id_fk" FOREIGN KEY ("bill_item_id") REFERENCES "public"."app_bill_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_bill_feedback_bill_key" ON "app_bill_feedback" USING btree ("bill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_bill_feedback_token_key" ON "app_bill_feedback" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "app_bill_feedback_submitted_idx" ON "app_bill_feedback" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "app_bill_feedback_items_feedback_idx" ON "app_bill_feedback_items" USING btree ("feedback_id");