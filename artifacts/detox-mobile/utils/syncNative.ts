import { NativeModules, Platform } from "react-native";

export interface DetoxNativeConfig {
  lockedSlotIndices: number[];
  blockedApps: string[];
  isLocked: boolean;
  dayOfWeek: number;
  lastUpdated: number;
}

export function syncToNative(config: DetoxNativeConfig): void {
  if (Platform.OS !== "android") return;

  const { DetoxSync } = NativeModules;
  if (!DetoxSync) {
    console.warn("[syncNative] DetoxSync native module not available");
    return;
  }

  try {
    DetoxSync.syncConfig(
      config.lockedSlotIndices,
      config.blockedApps,
      config.isLocked,
      config.dayOfWeek
    );
  } catch (e) {
    console.warn("[syncNative] Failed to sync config to SharedPreferences:", e);
  }
}

// 특정 요일의 잠금 슬롯을 SharedPreferences에 저장 (요일별 키 사용)
// 접근성 서비스가 요일 불일치 없이 오늘 슬롯을 정확히 찾을 수 있도록 함
export function syncDaySlots(dayOfWeek: number, lockedSlotIndices: number[]): void {
  if (Platform.OS !== "android") return;

  const { DetoxSync } = NativeModules;
  if (!DetoxSync?.syncDaySlots) {
    return;
  }

  try {
    DetoxSync.syncDaySlots(dayOfWeek, lockedSlotIndices);
  } catch (e) {
    console.warn("[syncNative] Failed to sync day slots:", e);
  }
}
