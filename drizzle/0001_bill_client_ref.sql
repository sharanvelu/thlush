ALTER TABLE "app_bills" ADD COLUMN "client_ref" text;--> statement-breakpoint
CREATE UNIQUE INDEX "app_bills_client_ref_key" ON "app_bills" USING btree ("client_ref");