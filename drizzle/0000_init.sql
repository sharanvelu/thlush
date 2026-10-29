CREATE TYPE "public"."app_bill_status" AS ENUM('completed', 'held', 'void', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."app_discount_type" AS ENUM('percent', 'flat');--> statement-breakpoint
CREATE TYPE "public"."app_entity_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."app_order_type" AS ENUM('dine_in', 'takeaway', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."app_payment_method" AS ENUM('cash', 'card', 'upi', 'other');--> statement-breakpoint
CREATE TYPE "public"."app_stock_reason" AS ENUM('purchase', 'wastage', 'damage', 'correction', 'return', 'sale', 'void', 'refund');--> statement-breakpoint
CREATE TYPE "public"."app_user_role" AS ENUM('super_admin', 'manager', 'billing');--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"role" "app_user_role" DEFAULT 'billing' NOT NULL,
	"theme_preference" text DEFAULT 'system' NOT NULL,
	"oidc_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_categories" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"status" "app_entity_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"color" text,
	"icon" text,
	"created_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_menu_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_menu_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"category_id" bigint NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"sgst" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cgst" numeric(5, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "app_entity_status" DEFAULT 'active' NOT NULL,
	"sku" text,
	"image_url" text,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"is_veg" boolean,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"addons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"track_stock" boolean DEFAULT false NOT NULL,
	"stock_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"reorder_level" numeric(12, 3) DEFAULT '0' NOT NULL,
	"cost_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "app_menu_items_sku_key" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "app_customers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_customers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"notes" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_bills" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_bills_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"bill_no" text NOT NULL,
	"customer_id" bigint,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "app_bill_status" DEFAULT 'completed' NOT NULL,
	"order_type" "app_order_type",
	"table_no" text,
	"notes" text,
	"discount_type" "app_discount_type",
	"discount_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"change_due" numeric(12, 2) DEFAULT '0' NOT NULL,
	"held_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"voided_by" uuid,
	"created_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_bill_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_bill_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"bill_id" bigint NOT NULL,
	"menu_item_id" bigint,
	"name" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"sgst" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cgst" numeric(5, 2) DEFAULT '0' NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"options" jsonb
);
--> statement-breakpoint
CREATE TABLE "app_payments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"bill_id" bigint NOT NULL,
	"method" "app_payment_method" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_stock_movements" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_stock_movements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"menu_item_id" bigint NOT NULL,
	"delta" numeric(12, 3) NOT NULL,
	"reason" "app_stock_reason" NOT NULL,
	"bill_id" bigint,
	"user_id" uuid,
	"note" text,
	"balance_after" numeric(12, 3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_suppliers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_suppliers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"status" "app_entity_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_purchase_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_purchase_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"purchase_id" bigint NOT NULL,
	"menu_item_id" bigint NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"cost_price" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_purchases" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_purchases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"supplier_id" bigint,
	"invoice_no" text,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_audit_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "app_categories" ADD CONSTRAINT "app_categories_created_user_id_app_users_id_fk" FOREIGN KEY ("created_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_menu_items" ADD CONSTRAINT "app_menu_items_category_id_app_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."app_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_menu_items" ADD CONSTRAINT "app_menu_items_created_user_id_app_users_id_fk" FOREIGN KEY ("created_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bills" ADD CONSTRAINT "app_bills_customer_id_app_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."app_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bills" ADD CONSTRAINT "app_bills_voided_by_app_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bills" ADD CONSTRAINT "app_bills_created_user_id_app_users_id_fk" FOREIGN KEY ("created_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bill_items" ADD CONSTRAINT "app_bill_items_bill_id_app_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."app_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bill_items" ADD CONSTRAINT "app_bill_items_menu_item_id_app_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."app_menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_payments" ADD CONSTRAINT "app_payments_bill_id_app_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."app_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_stock_movements" ADD CONSTRAINT "app_stock_movements_menu_item_id_app_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."app_menu_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_stock_movements" ADD CONSTRAINT "app_stock_movements_bill_id_app_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."app_bills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_stock_movements" ADD CONSTRAINT "app_stock_movements_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_purchase_items" ADD CONSTRAINT "app_purchase_items_purchase_id_app_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."app_purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_purchase_items" ADD CONSTRAINT "app_purchase_items_menu_item_id_app_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."app_menu_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_purchases" ADD CONSTRAINT "app_purchases_supplier_id_app_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."app_suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_purchases" ADD CONSTRAINT "app_purchases_created_user_id_app_users_id_fk" FOREIGN KEY ("created_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_audit_logs" ADD CONSTRAINT "app_audit_logs_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_app_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "app_categories_name_key" ON "app_categories" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "app_categories_sort_idx" ON "app_categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "app_menu_items_category_idx" ON "app_menu_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "app_menu_items_status_idx" ON "app_menu_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "app_menu_items_name_idx" ON "app_menu_items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "app_customers_name_idx" ON "app_customers" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "app_customers_phone_idx" ON "app_customers" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "app_bills_bill_no_key" ON "app_bills" USING btree ("bill_no");--> statement-breakpoint
CREATE INDEX "app_bills_created_at_idx" ON "app_bills" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "app_bills_customer_idx" ON "app_bills" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "app_bills_created_user_idx" ON "app_bills" USING btree ("created_user_id");--> statement-breakpoint
CREATE INDEX "app_bills_status_idx" ON "app_bills" USING btree ("status");--> statement-breakpoint
CREATE INDEX "app_bill_items_bill_idx" ON "app_bill_items" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "app_bill_items_name_idx" ON "app_bill_items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "app_bill_items_menu_item_idx" ON "app_bill_items" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "app_payments_bill_idx" ON "app_payments" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "app_stock_movements_item_idx" ON "app_stock_movements" USING btree ("menu_item_id","created_at");--> statement-breakpoint
CREATE INDEX "app_stock_movements_bill_idx" ON "app_stock_movements" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "app_purchase_items_purchase_idx" ON "app_purchase_items" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "app_purchase_items_menu_item_idx" ON "app_purchase_items" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "app_purchases_supplier_idx" ON "app_purchases" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "app_purchases_purchased_at_idx" ON "app_purchases" USING btree ("purchased_at");--> statement-breakpoint
CREATE INDEX "app_audit_logs_user_idx" ON "app_audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "app_audit_logs_entity_idx" ON "app_audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "app_audit_logs_created_at_idx" ON "app_audit_logs" USING btree ("created_at");