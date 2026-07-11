import { pgTable, serial, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const timeSlotsTable = pgTable("time_slots", {
  id: serial("id").primaryKey(),
  index: integer("index").notNull(),
  dayOfWeek: integer("day_of_week").notNull().default(0), // 0=Sun, 1=Mon, ..., 6=Sat
  time: text("time").notNull(),
  isLocked: boolean("is_locked").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTimeSlotSchema = createInsertSchema(timeSlotsTable).omit({ id: true, updatedAt: true });
export type InsertTimeSlot = z.infer<typeof insertTimeSlotSchema>;
export type TimeSlot = typeof timeSlotsTable.$inferSelect;
