import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { App, Challenge, ChallengeEvent, ChallengeStats, Dashboard, ErrorResponse, FocusSession, GetRecentChallengeEventsParams, GetTimeSlotsParams, HealthStatus, HeartbeatResponse, JoinChallengeRequest, QuitChallenge200, ServerTime, Settings, StartFocusTimerRequest, TimeSlot, UpdateBlockedAppsRequest, UpdateSettingsRequest, UpdateTimeSlotsRequest, UpdateUsageStatsRequest, UsageStats } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * Returns server time to prevent client-side manipulation
 * @summary Get server time
 */
export declare const getGetServerTimeUrl: () => string;
export declare const getServerTime: (options?: RequestInit) => Promise<ServerTime>;
export declare const getGetServerTimeQueryKey: () => readonly ["/api/server-time"];
export declare const getGetServerTimeQueryOptions: <TData = Awaited<ReturnType<typeof getServerTime>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getServerTime>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getServerTime>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetServerTimeQueryResult = NonNullable<Awaited<ReturnType<typeof getServerTime>>>;
export type GetServerTimeQueryError = ErrorType<unknown>;
/**
 * @summary Get server time
 */
export declare function useGetServerTime<TData = Awaited<ReturnType<typeof getServerTime>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getServerTime>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get time slots for a specific day of week
 */
export declare const getGetTimeSlotsUrl: (params?: GetTimeSlotsParams) => string;
export declare const getTimeSlots: (params?: GetTimeSlotsParams, options?: RequestInit) => Promise<TimeSlot[]>;
export declare const getGetTimeSlotsQueryKey: (params?: GetTimeSlotsParams) => readonly ["/api/timeslots", ...GetTimeSlotsParams[]];
export declare const getGetTimeSlotsQueryOptions: <TData = Awaited<ReturnType<typeof getTimeSlots>>, TError = ErrorType<unknown>>(params?: GetTimeSlotsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTimeSlots>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTimeSlots>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTimeSlotsQueryResult = NonNullable<Awaited<ReturnType<typeof getTimeSlots>>>;
export type GetTimeSlotsQueryError = ErrorType<unknown>;
/**
 * @summary Get time slots for a specific day of week
 */
export declare function useGetTimeSlots<TData = Awaited<ReturnType<typeof getTimeSlots>>, TError = ErrorType<unknown>>(params?: GetTimeSlotsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTimeSlots>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update time slots (Sunday only)
 */
export declare const getUpdateTimeSlotsUrl: () => string;
export declare const updateTimeSlots: (updateTimeSlotsRequest: UpdateTimeSlotsRequest, options?: RequestInit) => Promise<TimeSlot[]>;
export declare const getUpdateTimeSlotsMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTimeSlots>>, TError, {
        data: BodyType<UpdateTimeSlotsRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTimeSlots>>, TError, {
    data: BodyType<UpdateTimeSlotsRequest>;
}, TContext>;
export type UpdateTimeSlotsMutationResult = NonNullable<Awaited<ReturnType<typeof updateTimeSlots>>>;
export type UpdateTimeSlotsMutationBody = BodyType<UpdateTimeSlotsRequest>;
export type UpdateTimeSlotsMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Update time slots (Sunday only)
 */
export declare const useUpdateTimeSlots: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTimeSlots>>, TError, {
        data: BodyType<UpdateTimeSlotsRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTimeSlots>>, TError, {
    data: BodyType<UpdateTimeSlotsRequest>;
}, TContext>;
/**
 * @summary Get blocked apps list
 */
export declare const getGetBlockedAppsUrl: () => string;
export declare const getBlockedApps: (options?: RequestInit) => Promise<App[]>;
export declare const getGetBlockedAppsQueryKey: () => readonly ["/api/blocked-apps"];
export declare const getGetBlockedAppsQueryOptions: <TData = Awaited<ReturnType<typeof getBlockedApps>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBlockedApps>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBlockedApps>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBlockedAppsQueryResult = NonNullable<Awaited<ReturnType<typeof getBlockedApps>>>;
export type GetBlockedAppsQueryError = ErrorType<unknown>;
/**
 * @summary Get blocked apps list
 */
export declare function useGetBlockedApps<TData = Awaited<ReturnType<typeof getBlockedApps>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBlockedApps>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update blocked apps (Sunday only)
 */
export declare const getUpdateBlockedAppsUrl: () => string;
export declare const updateBlockedApps: (updateBlockedAppsRequest: UpdateBlockedAppsRequest, options?: RequestInit) => Promise<App[]>;
export declare const getUpdateBlockedAppsMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBlockedApps>>, TError, {
        data: BodyType<UpdateBlockedAppsRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateBlockedApps>>, TError, {
    data: BodyType<UpdateBlockedAppsRequest>;
}, TContext>;
export type UpdateBlockedAppsMutationResult = NonNullable<Awaited<ReturnType<typeof updateBlockedApps>>>;
export type UpdateBlockedAppsMutationBody = BodyType<UpdateBlockedAppsRequest>;
export type UpdateBlockedAppsMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Add a new app to blocked list
 */
export declare const addBlockedApp: (body: {
    packageName: string;
    name: string;
    category?: string;
}, options?: RequestInit) => Promise<App>;
export declare const useAddBlockedApp: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addBlockedApp>>, TError, {
        data: {
            packageName: string;
            name: string;
            category?: string;
        };
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addBlockedApp>>, TError, {
    data: {
        packageName: string;
        name: string;
        category?: string;
    };
}, TContext>;
/**
 * @summary Delete an app from blocked list
 */
export declare const deleteBlockedApp: (id: number, options?: RequestInit) => Promise<{
    success: boolean;
}>;
export declare const useDeleteBlockedApp: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBlockedApp>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteBlockedApp>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Update blocked apps (Sunday only)
 */
export declare const useUpdateBlockedApps: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBlockedApps>>, TError, {
        data: BodyType<UpdateBlockedAppsRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateBlockedApps>>, TError, {
    data: BodyType<UpdateBlockedAppsRequest>;
}, TContext>;
/**
 * @summary Get current challenge info
 */
export declare const getGetChallengeUrl: () => string;
export declare const getChallenge: (options?: RequestInit) => Promise<Challenge>;
export declare const getGetChallengeQueryKey: () => readonly ["/api/challenge"];
export declare const getGetChallengeQueryOptions: <TData = Awaited<ReturnType<typeof getChallenge>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getChallenge>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getChallenge>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetChallengeQueryResult = NonNullable<Awaited<ReturnType<typeof getChallenge>>>;
export type GetChallengeQueryError = ErrorType<unknown>;
/**
 * @summary Get current challenge info
 */
export declare function useGetChallenge<TData = Awaited<ReturnType<typeof getChallenge>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getChallenge>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Join a challenge (Sunday only)
 */
export declare const getJoinChallengeUrl: () => string;
export declare const joinChallenge: (joinChallengeRequest: JoinChallengeRequest, options?: RequestInit) => Promise<Challenge>;
export declare const getJoinChallengeMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof joinChallenge>>, TError, {
        data: BodyType<JoinChallengeRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof joinChallenge>>, TError, {
    data: BodyType<JoinChallengeRequest>;
}, TContext>;
export type JoinChallengeMutationResult = NonNullable<Awaited<ReturnType<typeof joinChallenge>>>;
export type JoinChallengeMutationBody = BodyType<JoinChallengeRequest>;
export type JoinChallengeMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Join a challenge (Sunday only)
 */
export declare const useJoinChallenge: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof joinChallenge>>, TError, {
        data: BodyType<JoinChallengeRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof joinChallenge>>, TError, {
    data: BodyType<JoinChallengeRequest>;
}, TContext>;
/**
 * @summary Get aggregate challenge statistics per tier
 */
export declare const getGetChallengeStatsUrl: () => string;
export declare const getChallengeStats: (options?: RequestInit) => Promise<ChallengeStats>;
export declare const getGetChallengeStatsQueryKey: () => readonly ["/api/challenge/stats"];
export declare const getGetChallengeStatsQueryOptions: <TData = Awaited<ReturnType<typeof getChallengeStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getChallengeStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getChallengeStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetChallengeStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getChallengeStats>>>;
export type GetChallengeStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get aggregate challenge statistics per tier
 */
export declare function useGetChallengeStats<TData = Awaited<ReturnType<typeof getChallengeStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getChallengeStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Send heartbeat to confirm app is still installed
 */
export declare const getSendHeartbeatUrl: () => string;
export declare const sendHeartbeat: (options?: RequestInit) => Promise<HeartbeatResponse>;
export declare const getSendHeartbeatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendHeartbeat>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendHeartbeat>>, TError, void, TContext>;
export type SendHeartbeatMutationResult = NonNullable<Awaited<ReturnType<typeof sendHeartbeat>>>;
export type SendHeartbeatMutationError = ErrorType<unknown>;
/**
 * @summary Send heartbeat to confirm app is still installed
 */
export declare const useSendHeartbeat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendHeartbeat>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendHeartbeat>>, TError, void, TContext>;
/**
 * @summary Quit the active challenge
 */
export declare const getQuitChallengeUrl: () => string;
export declare const quitChallenge: (options?: RequestInit) => Promise<QuitChallenge200>;
export declare const getQuitChallengeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof quitChallenge>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof quitChallenge>>, TError, void, TContext>;
export type QuitChallengeMutationResult = NonNullable<Awaited<ReturnType<typeof quitChallenge>>>;
export type QuitChallengeMutationError = ErrorType<unknown>;
/**
 * @summary Quit the active challenge
 */
export declare const useQuitChallenge: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof quitChallenge>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof quitChallenge>>, TError, void, TContext>;
/**
 * @summary Get recent challenge events for polling
 */
export declare const getGetRecentChallengeEventsUrl: (params?: GetRecentChallengeEventsParams) => string;
export declare const getRecentChallengeEvents: (params?: GetRecentChallengeEventsParams, options?: RequestInit) => Promise<ChallengeEvent[]>;
export declare const getGetRecentChallengeEventsQueryKey: (params?: GetRecentChallengeEventsParams) => readonly ["/api/challenge/events/recent", ...GetRecentChallengeEventsParams[]];
export declare const getGetRecentChallengeEventsQueryOptions: <TData = Awaited<ReturnType<typeof getRecentChallengeEvents>>, TError = ErrorType<unknown>>(params?: GetRecentChallengeEventsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentChallengeEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRecentChallengeEvents>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRecentChallengeEventsQueryResult = NonNullable<Awaited<ReturnType<typeof getRecentChallengeEvents>>>;
export type GetRecentChallengeEventsQueryError = ErrorType<unknown>;
/**
 * @summary Get recent challenge events for polling
 */
export declare function useGetRecentChallengeEvents<TData = Awaited<ReturnType<typeof getRecentChallengeEvents>>, TError = ErrorType<unknown>>(params?: GetRecentChallengeEventsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentChallengeEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get dashboard data
 */
export declare const getGetDashboardUrl: () => string;
export declare const getDashboard: (options?: RequestInit) => Promise<Dashboard>;
export declare const getGetDashboardQueryKey: () => readonly ["/api/dashboard"];
export declare const getGetDashboardQueryOptions: <TData = Awaited<ReturnType<typeof getDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboard>>>;
export type GetDashboardQueryError = ErrorType<unknown>;
/**
 * @summary Get dashboard data
 */
export declare function useGetDashboard<TData = Awaited<ReturnType<typeof getDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get user settings
 */
export declare const getGetSettingsUrl: () => string;
export declare const getSettings: (options?: RequestInit) => Promise<Settings>;
export declare const getGetSettingsQueryKey: () => readonly ["/api/settings"];
export declare const getGetSettingsQueryOptions: <TData = Awaited<ReturnType<typeof getSettings>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSettings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSettings>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSettingsQueryResult = NonNullable<Awaited<ReturnType<typeof getSettings>>>;
export type GetSettingsQueryError = ErrorType<unknown>;
/**
 * @summary Get user settings
 */
export declare function useGetSettings<TData = Awaited<ReturnType<typeof getSettings>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSettings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update user settings
 */
export declare const getUpdateSettingsUrl: () => string;
export declare const updateSettings: (updateSettingsRequest: UpdateSettingsRequest, options?: RequestInit) => Promise<Settings>;
export declare const getUpdateSettingsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSettings>>, TError, {
        data: BodyType<UpdateSettingsRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSettings>>, TError, {
    data: BodyType<UpdateSettingsRequest>;
}, TContext>;
export type UpdateSettingsMutationResult = NonNullable<Awaited<ReturnType<typeof updateSettings>>>;
export type UpdateSettingsMutationBody = BodyType<UpdateSettingsRequest>;
export type UpdateSettingsMutationError = ErrorType<unknown>;
/**
 * @summary Update user settings
 */
export declare const useUpdateSettings: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSettings>>, TError, {
        data: BodyType<UpdateSettingsRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSettings>>, TError, {
    data: BodyType<UpdateSettingsRequest>;
}, TContext>;
/**
 * @summary Start a focus timer session
 */
export declare const getStartFocusTimerUrl: () => string;
export declare const startFocusTimer: (startFocusTimerRequest: StartFocusTimerRequest, options?: RequestInit) => Promise<FocusSession>;
export declare const getStartFocusTimerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startFocusTimer>>, TError, {
        data: BodyType<StartFocusTimerRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof startFocusTimer>>, TError, {
    data: BodyType<StartFocusTimerRequest>;
}, TContext>;
export type StartFocusTimerMutationResult = NonNullable<Awaited<ReturnType<typeof startFocusTimer>>>;
export type StartFocusTimerMutationBody = BodyType<StartFocusTimerRequest>;
export type StartFocusTimerMutationError = ErrorType<unknown>;
/**
 * @summary Start a focus timer session
 */
export declare const useStartFocusTimer: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startFocusTimer>>, TError, {
        data: BodyType<StartFocusTimerRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof startFocusTimer>>, TError, {
    data: BodyType<StartFocusTimerRequest>;
}, TContext>;
/**
 * @summary Get focus sessions history
 */
export declare const getGetFocusSessionsUrl: () => string;
export declare const getFocusSessions: (options?: RequestInit) => Promise<FocusSession[]>;
export declare const getGetFocusSessionsQueryKey: () => readonly ["/api/focus-timer"];
export declare const getGetFocusSessionsQueryOptions: <TData = Awaited<ReturnType<typeof getFocusSessions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFocusSessions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFocusSessions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFocusSessionsQueryResult = NonNullable<Awaited<ReturnType<typeof getFocusSessions>>>;
export type GetFocusSessionsQueryError = ErrorType<unknown>;
/**
 * @summary Get focus sessions history
 */
export declare function useGetFocusSessions<TData = Awaited<ReturnType<typeof getFocusSessions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFocusSessions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Complete a focus timer session
 */
export declare const getCompleteFocusTimerUrl: (sessionId: number) => string;
export declare const completeFocusTimer: (sessionId: number, options?: RequestInit) => Promise<FocusSession>;
export declare const getCompleteFocusTimerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeFocusTimer>>, TError, {
        sessionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof completeFocusTimer>>, TError, {
    sessionId: number;
}, TContext>;
export type CompleteFocusTimerMutationResult = NonNullable<Awaited<ReturnType<typeof completeFocusTimer>>>;
export type CompleteFocusTimerMutationError = ErrorType<unknown>;
/**
 * @summary Complete a focus timer session
 */
export declare const useCompleteFocusTimer: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeFocusTimer>>, TError, {
        sessionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof completeFocusTimer>>, TError, {
    sessionId: number;
}, TContext>;
/**
 * @summary Get screen time usage stats
 */
export declare const getGetUsageStatsUrl: () => string;
export declare const getUsageStats: (options?: RequestInit) => Promise<UsageStats>;
export declare const getGetUsageStatsQueryKey: () => readonly ["/api/usage-stats"];
export declare const getGetUsageStatsQueryOptions: <TData = Awaited<ReturnType<typeof getUsageStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUsageStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUsageStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUsageStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getUsageStats>>>;
export type GetUsageStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get screen time usage stats
 */
export declare function useGetUsageStats<TData = Awaited<ReturnType<typeof getUsageStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUsageStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update screen time usage stats (manual input)
 */
export declare const getUpdateUsageStatsUrl: () => string;
export declare const updateUsageStats: (updateUsageStatsRequest: UpdateUsageStatsRequest, options?: RequestInit) => Promise<UsageStats>;
export declare const getUpdateUsageStatsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUsageStats>>, TError, {
        data: BodyType<UpdateUsageStatsRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateUsageStats>>, TError, {
    data: BodyType<UpdateUsageStatsRequest>;
}, TContext>;
export type UpdateUsageStatsMutationResult = NonNullable<Awaited<ReturnType<typeof updateUsageStats>>>;
export type UpdateUsageStatsMutationBody = BodyType<UpdateUsageStatsRequest>;
export type UpdateUsageStatsMutationError = ErrorType<unknown>;
/**
 * @summary Update screen time usage stats (manual input)
 */
export declare const useUpdateUsageStats: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUsageStats>>, TError, {
        data: BodyType<UpdateUsageStatsRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateUsageStats>>, TError, {
    data: BodyType<UpdateUsageStatsRequest>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map