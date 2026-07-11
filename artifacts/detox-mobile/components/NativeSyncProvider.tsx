import React from "react";
import { Alert, Linking, NativeModules, Platform } from "react-native";
import { useGetDashboard, useGetBlockedApps } from "@workspace/api-client-react";
import { syncToNative, syncDaySlots } from "@/utils/syncNative";

function openAccessibilitySettings() {
  Linking.sendIntent("android.settings.ACCESSIBILITY_SETTINGS").catch(() => {
    Linking.openSettings();
  });
}

// 30초마다 서버에서 대시보드를 재요청 — 서버가 잠들었다 깨어나도 자동 복구
const SYNC_REFETCH_INTERVAL = 30_000;

export function NativeSyncProvider({ children }: { children: React.ReactNode }) {
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

  // 앱 최초 실행 시 접근성 서비스 활성 여부 확인 → 비활성이면 안내 다이얼로그
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
              {
                text: "지금 설정하기",
                onPress: openAccessibilitySettings,
              },
            ]
          );
        }
      } catch (_) {}
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // dashboard 또는 blockedApps 변경 시 Android SharedPreferences 동기화
  React.useEffect(() => {
    if (Platform.OS !== "android") return;
    if (!dashboard) return;

    const lockedSlotIndices = (dashboard.timeSlots ?? [])
      .filter((s) => s.isLocked)
      .map((s) => s.index);

    const blockedPackages = (blockedApps ?? [])
      .filter((a) => a.blocked)
      .map((a) => a.packageName ?? "")
      .filter(Boolean);

    const todayDow = dashboard.todayDow ?? new Date().getDay();

    syncToNative({
      lockedSlotIndices,
      blockedApps: blockedPackages,
      isLocked: dashboard.isLocked ?? false,
      dayOfWeek: todayDow,
      lastUpdated: Date.now(),
    });

    // 요일별 키(locked_slots_dow_N)에도 저장 → 접근성 서비스가 요일 불일치 없이 차단 가능
    syncDaySlots(todayDow, lockedSlotIndices);
  }, [dashboard, blockedApps]);

  return <>{children}</>;
}
