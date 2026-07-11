import { z } from "zod/v4";
export declare const usageStatsTable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "usage_stats";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "usage_stats";
            dataType: "number";
            columnType: "PgSerial";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        date: import("drizzle-orm/pg-core").PgColumn<{
            name: "date";
            tableName: "usage_stats";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        totalMinutes: import("drizzle-orm/pg-core").PgColumn<{
            name: "total_minutes";
            tableName: "usage_stats";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        byApp: import("drizzle-orm/pg-core").PgColumn<{
            name: "by_app";
            tableName: "usage_stats";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                appName: string;
                minutes: number;
            }[];
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: {
                appName: string;
                minutes: number;
            }[];
        }>;
        recordedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "recorded_at";
            tableName: "usage_stats";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const insertUsageStatSchema: z.ZodObject<{
    date: z.ZodString;
    totalMinutes: z.ZodOptional<z.ZodInt>;
    byApp: z.ZodOptional<z.ZodNullable<z.ZodType<{
        appName: string;
        minutes: number;
    }[], {
        appName: string;
        minutes: number;
    }[], z.core.$ZodTypeInternals<{
        appName: string;
        minutes: number;
    }[], {
        appName: string;
        minutes: number;
    }[]>>>>;
    recordedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
}, {
    out: {};
    in: {};
}>;
export type InsertUsageStat = z.infer<typeof insertUsageStatSchema>;
export type UsageStat = typeof usageStatsTable.$inferSelect;
//# sourceMappingURL=usage_stats.d.ts.map