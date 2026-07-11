import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usageStatsTable = pgTable("usage_stats", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  totalMinutes: integer("total_minutes").notNull().default(0),
  byApp: jsonb("by_app").$type<Array<{ appName: string; minutes: number }>>().default([]),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const insertUsageStatSchema = createInsertSchema(usageStatsTable).omit({ id: true });
export type InsertUsageStat = z.infer<typeof insertUsageStatSchema>;
export type UsageStat = typeof usageStatsTable.$inferSelect;
