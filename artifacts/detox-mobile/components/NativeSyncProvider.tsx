import React from "react";
import { Alert, Linking, NativeModules, Platform } from "react-native";
import { useGetDashboard, useGetBlockedApps, getGetTimeSlotsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { syncToNative, syncDaySlots } from "@/utils/syncNative";

function openAccessibilitySettings() {
  Linking.sendIntent("android.settings.ACCESSIBILITY_SETTINGS").catch(() => {
    Linking.openSettings();
  });
}

const SYNC_REFETCH_INTERVAL = 30_000;

type SlotRecord = { index: number; isLocked: boolean };

function getLockedIndices(records: SlotRecord[] | undefined): number[] {
  if (!records) return [];
  return records.filter((s) => s.isLocked).map((s) => s.index);
}

export function NativeSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const syncQueryOpts = (extra: Record<string, unknown>) => ({ query: extra as any });

  const { data: dashboard } = useGetDashboard(syncQueryOpts({
    refetchInterval: SYNC_REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
    retry: 5,
    retryDelay: (attempt: number) => Math.min(2000 * 2 ** attempt, 30_000),
  }));
  const { data: blockedApps } = useGetBlockedApps(syncQueryOpts({
    refetchInterval: SYNC_REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
    retry: 5,
  }));

  // On first mount: prompt user to enable accessibility service if absent.
  React.useEffect(() => {
    if (Platform.OS !== "android") return;
    const { DetoxSync } = NativeModules;
    if (!DetoxSync?.getBlockStatus) return;

    const timer = setTimeout(async () => {
      try {
        const status = await DetoxSync.getBlockStatus();
        if (!status.accessibilityEnabled) {
          Alert.alert(
            "접근성 서비스 활성화 필요",
            "앱 차단 기능이 작동하려면 접근성 서비스를 활성화해야 합니다.\n\n설정 → 접근성 → 디지털 디톡스 → 사용",
            [
              { text: "나중에", style: "cancel" },
              { text: "지금 설정하기", onPress: openAccessibilitySettings },
            ]
          );
        }
      } catch (_) {}
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Whenever dashboard or blockedApps refreshes, push a full native sync.
  // Two things happen here:
  //
  // 1.  syncToNative — writes the "current active" config (locked_slots_today,
  //     is_locked, blocked_apps) which the accessibility service uses to decide
  //     whether to block right now.
  //
  // 2.  For every day 0-6, read the cached slot data (if any) and write it to
  //     the per-day SharedPreferences key (locked_slots_dow_N).  The accessibility
  //     service reads these keys to re-check when the day rolls over, preventing
  //     stale data from a previous day being used for a new one.
  React.useEffect(() => {
    if (Platform.OS !== "android") return;
    if (!dashboard) return;

    const todayDow = dashboard.todayDow ?? new Date().getDay();

    const blockedPackages = (blockedApps ?? [])
      .filter((a: { blocked: boolean; packageName?: string | null }) => a.blocked)
      .map((a: { blocked: boolean; packageName?: string | null }) => a.packageName ?? "")
      .filter(Boolean);

    // Today's locked indices come from the authoritative dashboard.timeSlots
    // so the accessibility service isLocked decision is always current.
    const todayLockedIndices = (dashboard.timeSlots ?? [])
      .filter((s: { isLocked: boolean; index: number }) => s.isLocked)
      .map((s: { isLocked: boolean; index: number }) => s.index);

    // "Current active" config — used by the accessibility service for real-time blocking.
    syncToNative({
      lockedSlotIndices: todayLockedIndices,
      blockedApps: blockedPackages,
      isLocked: dashboard.isLocked ?? false,
      dayOfWeek: todayDow,
      lastUpdated: Date.now(),
    });

    // Per-day keys — used by the accessibility service when the day changes.
    // Always write today's data from the dashboard (most authoritative source).
    syncDaySlots(todayDow, todayLockedIndices);

    // For all OTHER days, write whatever slot data is already in the React Query
    // cache.  This ensures that slots saved earlier (e.g. Saturday saved while
    // today is Thursday) are reflected in native SharedPreferences even after
    // the app restarts or is put in the background.
    for (let dow = 0; dow <= 6; dow++) {
      if (dow === todayDow) continue; // already written above
      const cached = queryClient.getQueryData<SlotRecord[]>(
        getGetTimeSlotsQueryKey({ day: dow })
      );
      if (cached && cached.length > 0) {
        syncDaySlots(dow, getLockedIndices(cached));
      }
    }
  }, [dashboard, blockedApps, queryClient]);

  return <>{children}</>;
}
