import { pgTable, serial, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: serial().primaryKey(),
    name: text().notNull(),
    phone: text().notNull(),
    service: text().notNull(),
    location: text().notNull().default(""),
    details: text().notNull().default(""),
    status: text().notNull().default("new"),
    notes: text().notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("service_requests_created_at_idx").on(t.createdAt)],
);

export const siteSettings = pgTable("site_settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pageViews = pgTable(
  "page_views",
  {
    id: serial().primaryKey(),
    path: text().notNull().default("/"),
    referrer: text().notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("page_views_created_at_idx").on(t.createdAt)],
);
