import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  PanResponder,
  Alert,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useGetTimeSlots, useUpdateTimeSlots, getGetTimeSlotsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { syncToNative, syncDaySlots } from "@/utils/syncNative";
import { DAY_FULL, TOTAL_SLOTS, SLOTS_PER_HOUR, ROW_HEIGHT, HOUR_LABEL_WIDTH } from "@/constants/timeSlots";

interface BlockedAppEntry {
  blocked?: boolean;
  packageName?: string | null;
}

interface DaySlotConfigProps {
  day: number;
  todayDow: number;
  canEdit: boolean;
  daysUntilSunday: number;
  blockedAppsData?: BlockedAppEntry[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colors: any;
  onDragStateChange: (enabled: boolean) => void;
}

type SlotRecord = { index: number; isLocked: boolean };

function slotsToBoolean(records: SlotRecord[]): boolean[] {
  const arr = Array(TOTAL_SLOTS).fill(false) as boolean[];
  for (const s of records) {
    if (s.index >= 0 && s.index < TOTAL_SLOTS) arr[s.index] = s.isLocked;
  }
  return arr;
}

// This component is rendered with key={day} in timeslots.tsx.
// Every day change fully unmounts the previous instance and mounts a fresh one,
// so all refs and state are day-isolated by construction.
export default function DaySlotConfig({
  day,
  todayDow,
  canEdit,
  daysUntilSunday,
  blockedAppsData,
  colors,
  onDragStateChange,
}: DaySlotConfigProps) {
  const queryClient = useQueryClient();

  // Seed from cache so the grid renders immediately before the network response
  // arrives. The cache key is day-specific, so this never leaks across days.
  const [lockedSlots, setLockedSlots] = React.useState<boolean[]>(() => {
    const cached = queryClient.getQueryData<SlotRecord[]>(
      getGetTimeSlotsQueryKey({ day })
    );
    return cached && cached.length > 0 ? slotsToBoolean(cached) : Array(TOTAL_SLOTS).fill(false);
  });

  // True while the user has made drag-edits that haven't been saved yet.
  // Prevents the server-data effect from wiping unsaved paint strokes.
  const hasUnsavedChanges = React.useRef(false);

  const { data: slots, isLoading, isError: isSlotsError, refetch: refetchSlots } = useGetTimeSlots(
    { day },
    { query: { staleTime: 60_000, refetchOnWindowFocus: false } as any }
  );
  const { mutate: updateSlots, isPending } = useUpdateTimeSlots();

  const lockedSlotsRef = React.useRef(lockedSlots);
  const canEditRef = React.useRef(canEdit);
  const isDraggingRef = React.useRef(false);
  const dragValueRef = React.useRef(false);
  const gridContainerRef = React.useRef<View>(null);
  const gridPageXRef = React.useRef(0);
  const gridPageYRef = React.useRef(0);
  const gridWidthRef = React.useRef(0);

  React.useEffect(() => {
    lockedSlotsRef.current = lockedSlots;
  }, [lockedSlots]);
  React.useEffect(() => {
    canEditRef.current = canEdit;
  }, [canEdit]);

  // Apply server data once it arrives — but don't overwrite unsaved drag edits.
  React.useEffect(() => {
    if (hasUnsavedChanges.current) return;
    if (slots && slots.length > 0) {
      const arr = slotsToBoolean(slots as SlotRecord[]);
      setLockedSlots(arr);
    }
  }, [slots]);

  const totalLockedH = React.useMemo(
    () => (lockedSlots.filter(Boolean).length * 10) / 60,
    [lockedSlots]
  );

  function getIndexFromTouch(pageX: number, pageY: number): number | null {
    const relX = pageX - gridPageXRef.current - HOUR_LABEL_WIDTH;
    const relY = pageY - gridPageYRef.current;
    const colWidth = (gridWidthRef.current - HOUR_LABEL_WIDTH) / SLOTS_PER_HOUR;
    if (colWidth <= 0) return null;
    const col = Math.floor(relX / colWidth);
    const row = Math.floor(relY / ROW_HEIGHT);
    if (col < 0 || col >= SLOTS_PER_HOUR || row < 0 || row >= 24) return null;
    return row * SLOTS_PER_HOUR + col;
  }

  function setSlotAtIndex(index: number, value: boolean) {
    hasUnsavedChanges.current = true;
    setLockedSlots((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    lockedSlotsRef.current[index] = value;
  }

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => canEditRef.current,
      onMoveShouldSetPanResponderCapture: () => canEditRef.current,
      onStartShouldSetPanResponder: () => canEditRef.current,
      onMoveShouldSetPanResponder: () => canEditRef.current,
      onPanResponderGrant: (e) => {
        if (!canEditRef.current) return;
        const { pageX, pageY } = e.nativeEvent;
        gridContainerRef.current?.measure((_x, _y, width, _height, px, py) => {
          gridPageXRef.current = px;
          gridPageYRef.current = py;
          gridWidthRef.current = width;
        });
        const idx = getIndexFromTouch(pageX, pageY);
        if (idx !== null) {
          isDraggingRef.current = true;
          onDragStateChange(false);
          dragValueRef.current = !lockedSlotsRef.current[idx];
          setSlotAtIndex(idx, dragValueRef.current);
          Haptics.selectionAsync();
        }
      },
      onPanResponderMove: (e) => {
        if (!isDraggingRef.current || !canEditRef.current) return;
        const { pageX, pageY } = e.nativeEvent;
        const idx = getIndexFromTouch(pageX, pageY);
        if (idx !== null && lockedSlotsRef.current[idx] !== dragValueRef.current) {
          setSlotAtIndex(idx, dragValueRef.current);
          Haptics.selectionAsync();
        }
      },
      onPanResponderRelease: () => {
        isDraggingRef.current = false;
        onDragStateChange(true);
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        onDragStateChange(true);
      },
    })
  ).current;

  const measureGrid = () => {
    gridContainerRef.current?.measure((_x, _y, width, _height, pageX, pageY) => {
      gridPageXRef.current = pageX;
      gridPageYRef.current = pageY;
      gridWidthRef.current = width;
    });
  };

  const applyPreset = (type: "work" | "sleep" | "all" | "clear") => {
    if (!canEdit) return;
    hasUnsavedChanges.current = true;
    const arr = Array(TOTAL_SLOTS).fill(false) as boolean[];
    if (type === "work") for (let i = 54; i < 108; i++) arr[i] = true;
    else if (type === "sleep") for (let i = 0; i < 48; i++) arr[i] = true;
    else if (type === "all") arr.fill(true);
    setLockedSlots(arr);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSave = () => {
    const payload = lockedSlots.map((isLocked, index) => ({ index, isLocked }));
    const lockedIndicesSnapshot = lockedSlots
      .map((locked, idx) => (locked ? idx : -1))
      .filter((idx) => idx >= 0);
    const blockedPackagesSnapshot = (blockedAppsData ?? [])
      .filter((a) => a.blocked)
      .map((a) => a.packageName ?? "")
      .filter(Boolean);

    updateSlots(
      { data: { day, slots: payload } },
      {
        onSuccess: (responseData: SlotRecord[] | unknown) => {
          hasUnsavedChanges.current = false;

          // Normalise server response into SlotRecord[] and update cache.
          // We do NOT invalidateQueries for this day — setQueryData is the
          // source of truth and avoids a redundant network fetch that could
          // race with the state we just painted locally.
          const normalized: SlotRecord[] = Array.isArray(responseData)
            ? (responseData as SlotRecord[])
            : payload;

          queryClient.setQueryData(getGetTimeSlotsQueryKey({ day }), normalized);
          setLockedSlots(slotsToBoolean(normalized));

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("저장 완료", `${DAY_FULL[day]} 타임슬롯이 저장됐습니다.`);

          // Invalidate settings/dashboard so their stale data refreshes,
          // but do NOT invalidate this day's timeslots — already up-to-date.
          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });

          if (Platform.OS === "android") {
            // Always persist this day's slots to the per-day SharedPreferences key.
            // The accessibility service reads locked_slots_dow_N for each day,
            // so every saved day must be written — not just today.
            syncDaySlots(day, lockedIndicesSnapshot);

            // Also update the "current active" config (locked_slots_today,
            // is_locked, blocked_apps) so the accessibility service can check
            // isLocked right now — but only when the saved day is today.
            if (day === todayDow) {
              const kstMinutes = Math.floor((Date.now() / 60000 + 9 * 60) % (24 * 60));
              const currentSlot = Math.floor(kstMinutes / 10);
              syncToNative({
                lockedSlotIndices: lockedIndicesSnapshot,
                blockedApps: blockedPackagesSnapshot,
                isLocked: lockedIndicesSnapshot.includes(currentSlot),
                dayOfWeek: todayDow,
                lastUpdated: Date.now(),
              });
            }
          }
        },
        onError: (err: unknown) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          const status = (err as { status?: number })?.status;
          if (status === 403) {
            Alert.alert(
              "편집 잠금",
              `타임슬롯은 일요일에만 변경할 수 있어요.\n${daysUntilSunday}일 후 일요일에 다시 설정하세요.`
            );
          } else {
            Alert.alert("저장 실패", "서버 오류가 발생했습니다. 잠시 후 다시 시도하세요.");
          }
        },
      }
    );
  };

  const colMinuteLabels = [":00", ":10", ":20", ":30", ":40", ":50"];

  return (
    <>
      {canEdit && (
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 8, marginBottom: 16 }}
        >
          {[
            { label: "업무 (09~18)", type: "work" as const },
            { label: "수면 (00~08)", type: "sleep" as const },
            { label: "전체 잠금", type: "all" as const },
            { label: "초기화", type: "clear" as const },
          ].map(({ label, type }) => (
            <Pressable
              key={type}
              onPress={() => applyPreset(type)}
              style={({ pressed }) => [
                styles.presetBtn,
                { backgroundColor: pressed ? "#E0E7FF" : colors.card },
              ]}
            >
              <Text style={[styles.presetText, { color: Colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* 24h preview bar */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={[styles.barCard, { backgroundColor: colors.card }]}>
          <View style={styles.barHeader}>
            <Text style={[styles.barTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
              {DAY_FULL[day]} 미리보기
            </Text>
            <Text style={[styles.barStat, { color: Colors.primary, fontFamily: "Inter_700Bold" }]}>
              {totalLockedH.toFixed(1)}h 잠금
            </Text>
          </View>
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
          ) : isSlotsError ? (
            <Pressable onPress={() => refetchSlots()} style={{ alignItems: "center", paddingVertical: 12, gap: 4 }}>
              <MaterialCommunityIcons name="wifi-off" size={20} color="#D97706" />
              <Text style={{ color: "#D97706", fontFamily: "Inter_500Medium", fontSize: 13 }}>슬롯 로드 실패 — 탭해서 재시도</Text>
            </Pressable>
          ) : (
            <>
              <View style={[styles.previewBar, { backgroundColor: colors.border }]}>
                {lockedSlots.map((locked, i) => (
                  <View
                    key={i}
                    style={{ flex: 1, backgroundColor: locked ? Colors.primary : "transparent" }}
                  />
                ))}
              </View>
              <View style={styles.timeTicks}>
                {[0, 6, 12, 18, 24].map((h) => (
                  <Text key={h} style={[styles.tick, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {h.toString().padStart(2, "0")}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>
      </View>

      {/* 10-min clickable grid */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <View style={[styles.gridCard, { backgroundColor: colors.card }]}>
          {isSlotsError && (
            <Pressable onPress={() => refetchSlots()} style={[styles.noticeBanner, { backgroundColor: "#FEF3C7", marginBottom: 10 }]}>
              <MaterialCommunityIcons name="wifi-off" size={16} color="#D97706" />
              <Text style={[styles.noticeText, { color: "#D97706", fontFamily: "Inter_500Medium", flex: 1 }]}>
                슬롯 데이터를 불러오지 못했습니다 — 탭해서 재시도
              </Text>
              <MaterialCommunityIcons name="refresh" size={16} color="#D97706" />
            </Pressable>
          )}
          <View style={styles.gridLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>잠금</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>자유</Text>
            </View>
            {!canEdit && (
              <Text style={[styles.gridHint, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                (일요일에만 편집 가능)
              </Text>
            )}
          </View>

          <View style={styles.colHeaderRow}>
            <View style={{ width: HOUR_LABEL_WIDTH }} />
            {colMinuteLabels.map((l) => (
              <Text
                key={l}
                style={[styles.colHeader, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}
              >
                {l}
              </Text>
            ))}
          </View>

          <View ref={gridContainerRef} onLayout={measureGrid} {...panResponder.panHandlers}>
            {Array.from({ length: 24 }, (_, hour) => (
              <View key={hour} style={styles.gridRow}>
                <Text
                  style={[
                    styles.hourLabel,
                    { color: colors.textSecondary, fontFamily: "Inter_400Regular" },
                  ]}
                >
                  {hour.toString().padStart(2, "0")}시
                </Text>
                {Array.from({ length: SLOTS_PER_HOUR }, (_, col) => {
                  const index = hour * SLOTS_PER_HOUR + col;
                  const locked = lockedSlots[index];
                  return (
                    <View
                      key={col}
                      style={[
                        styles.cell,
                        {
                          backgroundColor: locked ? Colors.primary : colors.border,
                          borderColor: locked ? Colors.primaryLight : "transparent",
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>

      {canEdit && (
        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
          <Pressable
            onPress={handleSave}
            disabled={isPending}
            style={({ pressed }) => [
              styles.saveBtn,
              { opacity: isPending || pressed ? 0.7 : 1 },
            ]}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              style={styles.saveBtnGradient}
            >
              <Text style={[styles.saveBtnText, { fontFamily: "Inter_700Bold" }]}>
                {isPending ? "저장 중..." : `${DAY_FULL[day]} 저장하기`}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  noticeText: { color: "#A78BFA", fontSize: 14 },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  presetText: { fontSize: 13 },
  barCard: { borderRadius: 16, padding: 14 },
  barHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  barTitle: { fontSize: 14 },
  barStat: { fontSize: 15 },
  previewBar: { height: 28, borderRadius: 6, overflow: "hidden", flexDirection: "row", marginBottom: 5 },
  timeTicks: { flexDirection: "row", justifyContent: "space-between" },
  tick: { fontSize: 10 },
  gridCard: { borderRadius: 16, padding: 14 },
  gridLegend: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 12 },
  gridHint: { fontSize: 11, marginLeft: "auto" },
  colHeaderRow: { flexDirection: "row", marginBottom: 4 },
  colHeader: { flex: 1, textAlign: "center", fontSize: 9 },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    height: ROW_HEIGHT,
    gap: 2,
  },
  hourLabel: {
    width: HOUR_LABEL_WIDTH,
    fontSize: 10,
    textAlign: "right",
    paddingRight: 6,
  },
  cell: {
    flex: 1,
    height: 28,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  saveBtn: { borderRadius: 16, overflow: "hidden" },
  saveBtnGradient: { padding: 18, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 17 },
});
