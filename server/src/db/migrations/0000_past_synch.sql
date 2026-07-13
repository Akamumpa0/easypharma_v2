CREATE TYPE "public"."subscription_type" AS ENUM('free_subscription', 'paid_subscription');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'pharmacist');--> statement-breakpoint
CREATE TABLE "api_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"api_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"subscription" "subscription_type" DEFAULT 'free_subscription' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "api_users_email_unique" UNIQUE("email"),
	CONSTRAINT "api_users_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "customer_bill_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"medicine_name" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"customer_name" varchar(255),
	"total_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"total_sales" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_profit" numeric(10, 2) DEFAULT '0' NOT NULL,
	"bill_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"general_name" varchar(255) NOT NULL,
	"scientific_name" varchar(255),
	"description" text,
	"unit_name" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_bill_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"medicine_name" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"buying_price" numeric(10, 2) NOT NULL,
	"total_cost" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"selling_price" numeric(10, 2) NOT NULL,
	"buying_price" numeric(10, 2),
	"expiry_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" "user_role" DEFAULT 'pharmacist' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"pharmacy_name" varchar(255),
	"address" text,
	"phone" varchar(30),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "customer_bill_records" ADD CONSTRAINT "customer_bill_records_bill_id_customer_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."customer_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_bill_records" ADD CONSTRAINT "customer_bill_records_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_bills" ADD CONSTRAINT "customer_bills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_bill_records" ADD CONSTRAINT "stock_bill_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_bill_records" ADD CONSTRAINT "stock_bill_records_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_medicines" ADD CONSTRAINT "stock_medicines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_medicines" ADD CONSTRAINT "stock_medicines_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;