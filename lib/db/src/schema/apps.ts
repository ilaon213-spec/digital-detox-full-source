import { pgTable, serial, text, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appsTable = pgTable("apps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  blocked: boolean("blocked").notNull().default(false),
  icon: text("icon"),
  packageName: text("package_name"),
  bundleId: text("bundle_id"),
  usageMinutes: integer("usage_minutes").notNull().default(0),
});

export const insertAppSchema = createInsertSchema(appsTable).omit({ id: true });
export type InsertApp = z.infer<typeof insertAppSchema>;
export type App = typeof appsTable.$inferSelect;
