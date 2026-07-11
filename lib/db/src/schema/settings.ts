import { pgTable, serial, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").default("디톡서"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  lockReminderEnabled: boolean("lock_reminder_enabled").notNull().default(true),
  challengeAlertEnabled: boolean("challenge_alert_enabled").notNull().default(true),
  pushPermissionGranted: boolean("push_permission_granted").notNull().default(false),
  deviceType: text("device_type").default("web"),
  timeslotsConfigured: boolean("timeslots_configured").notNull().default(false),
  appsConfigured: boolean("apps_configured").notNull().default(false),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
