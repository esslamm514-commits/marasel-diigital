CREATE TABLE "page_views" (
	"id" serial PRIMARY KEY,
	"path" text DEFAULT '/' NOT NULL,
	"referrer" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"service" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "page_views_created_at_idx" ON "page_views" ("created_at");--> statement-breakpoint
CREATE INDEX "service_requests_created_at_idx" ON "service_requests" ("created_at");