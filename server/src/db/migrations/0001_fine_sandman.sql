CREATE TYPE "public"."activity_type" AS ENUM('login', 'logout', 'create', 'update', 'delete', 'purchase', 'sale', 'return', 'adjustment', 'backup', 'restore', 'export', 'import');--> statement-breakpoint
CREATE TYPE "public"."damage_reason" AS ENUM('broken', 'wet', 'expired', 'packaging_damage', 'contaminated', 'other');--> statement-breakpoint
CREATE TYPE "public"."disposal_reason" AS ENUM('expired', 'damaged', 'recalled', 'obsolete', 'contaminated', 'other');--> statement-breakpoint
CREATE TYPE "public"."expense_type" AS ENUM('rent', 'electricity', 'water', 'transport', 'internet', 'repairs', 'salary', 'maintenance', 'supplies', 'marketing', 'insurance', 'miscellaneous');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('low_stock', 'near_expiry', 'expired', 'new_purchase', 'large_sale', 'return', 'adjustment', 'backup_failure', 'login_alert', 'system');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'pending', 'approved', 'ordered', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."return_reason" AS ENUM('expired', 'damaged', 'wrong_item', 'excess', 'quality_issue', 'other');--> statement-breakpoint
CREATE TYPE "public"."unit_type" AS ENUM('tablet', 'capsule', 'bottle', 'tube', 'injection', 'vial', 'ampoule', 'packet', 'box', 'strip', 'carton', 'ml', 'litre', 'gram', 'kilogram');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"activity_type" "activity_type" NOT NULL,
	"module" varchar(100) NOT NULL,
	"action" varchar(100) NOT NULL,
	"description" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" varchar(255) NOT NULL,
	"file_size" integer,
	"file_path" text,
	"status" varchar(50) DEFAULT 'completed',
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"batch_number" varchar(100) NOT NULL,
	"quantity" integer NOT NULL,
	"buying_price" numeric(10, 2) NOT NULL,
	"selling_price" numeric(10, 2) NOT NULL,
	"expiry_date" timestamp,
	"received_date" timestamp DEFAULT now(),
	"supplier_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "customer_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bill_id" uuid,
	"medicine_id" uuid NOT NULL,
	"batch_number" varchar(100),
	"quantity" integer NOT NULL,
	"reason" "return_reason" NOT NULL,
	"reason_detail" text,
	"returned_by" varchar(255),
	"refund_amount" numeric(10, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "damaged_medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"batch_number" varchar(100),
	"quantity" integer NOT NULL,
	"reason" "damage_reason" NOT NULL,
	"reason_detail" text,
	"reported_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "disposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"batch_number" varchar(100),
	"quantity" integer NOT NULL,
	"reason" "disposal_reason" NOT NULL,
	"reason_detail" text,
	"disposal_method" varchar(255),
	"witness" varchar(255),
	"approved_by" uuid,
	"disposal_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "expense_type" NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"expense_date" timestamp NOT NULL,
	"receipt_url" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"reference_id" uuid,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"order_number" varchar(100) NOT NULL,
	"status" "purchase_order_status" DEFAULT 'draft',
	"total_amount" numeric(10, 2) NOT NULL,
	"notes" text,
	"ordered_at" timestamp,
	"received_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "purchase_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"movement_type" varchar(50) NOT NULL,
	"quantity" integer NOT NULL,
	"batch_number" varchar(100),
	"reference_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"batch_number" varchar(100),
	"quantity" integer NOT NULL,
	"reason" "return_reason" NOT NULL,
	"reason_detail" text,
	"approved" boolean DEFAULT false,
	"approved_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(30),
	"address" text,
	"tin" varchar(50),
	"lead_time_days" integer DEFAULT 7,
	"rating" numeric(3, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	"description" text,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN "brand_name" varchar(255);--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN "manufacturer" varchar(255);--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN "medicine_code" varchar(100);--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN "barcode" varchar(100);--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN "qr_code" text;--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN "unit_type" "unit_type" DEFAULT 'tablet' NOT NULL;--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN "category" varchar(100);--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN "is_controlled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN "requires_prescription" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN "reorder_level" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN "reorder_quantity" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_photo" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tin" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backups" ADD CONSTRAINT "backups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_returns" ADD CONSTRAINT "customer_returns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_returns" ADD CONSTRAINT "customer_returns_bill_id_customer_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."customer_bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_returns" ADD CONSTRAINT "customer_returns_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damaged_medicines" ADD CONSTRAINT "damaged_medicines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damaged_medicines" ADD CONSTRAINT "damaged_medicines_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damaged_medicines" ADD CONSTRAINT "damaged_medicines_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposals" ADD CONSTRAINT "disposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposals" ADD CONSTRAINT "disposals_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposals" ADD CONSTRAINT "disposals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_medicine_code_unique" UNIQUE("medicine_code");--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_barcode_unique" UNIQUE("barcode");