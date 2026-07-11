import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const challengesTable = pgTable("challenges", {
  id: serial("id").primaryKey(),
  tier: text("tier").notNull(), // beginner, focused, hardcore
  tierName: text("tier_name").notNull(),
  depositAmount: integer("deposit_amount").notNull(),
  currentDay: integer("current_day").notNull().default(0),
  totalDays: integer("total_days").notNull().default(30),
  successDays: integer("success_days").notNull().default(0),
  failedDays: integer("failed_days").notNull().default(0),
  totalParticipants: integer("total_participants").notNull().default(0),
  currentSurvivors: integer("current_survivors").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  lastHeartbeat: timestamp("last_heartbeat").defaultNow(),
  lastEvaluatedDate: text("last_evaluated_date"), // "YYYY-MM-DD" — 마지막으로 성공/실패 판정한 날
  eliminatedReason: text("eliminated_reason"), // "failed_days" | "app_deleted" | null
  dailyLimitHours: integer("daily_limit_hours").notNull().default(10), // 하루 최대 사용 가능 시간
});

export const insertChallengeSchema = createInsertSchema(challengesTable).omit({ id: true });
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challengesTable.$inferSelect;

export const challengeEventsTable = pgTable("challenge_events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "joined" | "quit" | "eliminated"
  nickname: text("nickname").notNull(),
  tier: text("tier").notNull(),
  tierName: text("tier_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
