CREATE TABLE IF NOT EXISTS "geo_regions" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"flag" text,
	"cf_country_codes" text DEFAULT '' NOT NULL,
	"location_keywords" text DEFAULT '' NOT NULL,
	"source_keys" text DEFAULT '' NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "geo_regions_slug_unique" UNIQUE("slug")
);
