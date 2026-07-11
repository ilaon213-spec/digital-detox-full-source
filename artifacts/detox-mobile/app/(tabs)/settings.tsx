import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Pressable,
  Switch,
  Platform,
  Alert,
  Linking,
  NativeModules,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useGetSettings, useUpdateSettings, useGetServerTime } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";

type BlockStatus = {
  accessibilityEnabled: boolean;
  isLocked: boolean;
  lockedSlots: number[];
  blockedApps: string[];
} | null;

type DeviceDaySlotsData = {
  legacy_dow: number;
  legacy_today: number[];
  [key: string]: number[] | number;
};
type DeviceDaySlots = DeviceDaySlotsData | null;

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const TOTAL_SLOTS = 144;

function slotToTime(idx: number) {
  const h = Math.floor(idx / 6).toString().padStart(2, "0");
  const m = ((idx % 6) * 10).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function toRanges(indices: number[]): string {
  if (!indices || indices.length === 0) return "없음";
  const sorted = [...indices].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0], prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) { prev = sorted[i]; }
    else { ranges.push(`${slotToTime(start)}~${slotToTime(prev + 1)}`); start = sorted[i]; prev = sorted[i]; }
  }
  ranges.push(`${slotToTime(start)}~${slotToTime(prev + 1)}`);
  return ranges.join(", ");
}

function DayBar({ indices, colors }: { indices: number[]; colors: any }) {
  const locked = new Set(indices);
  return (
    <View style={{ flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: colors.border, marginTop: 4 }}>
      {Array.from({ length: 24 }, (_, h) => {
        const anyLocked = [0,1,2,3,4,5].some(m => locked.has(h * 6 + m));
        return <View key={h} style={{ flex: 1, backgroundColor: anyLocked ? "#7C3AED" : "transparent" }} />;
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: settings, refetch } = useGetSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  const { data: serverTime } = useGetServerTime();
  const isSunday = serverTime?.isSunday ?? false;
  const daysUntilSunday = serverTime?.daysUntilSunday ?? (() => {
    const d = new Date().getDay();
    return d === 0 ? 0 : 7 - d;
  })();

  const [blockStatus, setBlockStatus] = useState<BlockStatus>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deviceDaySlots, setDeviceDaySlots] = useState<DeviceDaySlots>(null);
  const [daySlotsLoading, setDaySlotsLoading] = useState(false);

  const fetchDeviceDaySlots = useCallback(async () => {
    if (Platform.OS !== "android") return;
    const { DetoxSync } = NativeModules;
    if (!DetoxSync?.getDeviceDaySlots) return;
    try {
      setDaySlotsLoading(true);
      const result = await DetoxSync.getDeviceDaySlots();
      setDeviceDaySlots(result);
    } catch (e) {
      setDeviceDaySlots(null);
    } finally {
      setDaySlotsLoading(false);
    }
  }, []);

  const fetchBlockStatus = useCallback(async () => {
    if (Platform.OS !== "android") return;
    const { DetoxSync } = NativeModules;
    if (!DetoxSync?.getBlockStatus) return;
    try {
      setStatusLoading(true);
      const result = await DetoxSync.getBlockStatus();
      setBlockStatus(result);
    } catch (e) {
      setBlockStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockStatus();
    fetchDeviceDaySlots();
    const interval = setInterval(fetchBlockStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchBlockStatus, fetchDeviceDaySlots]);

  const topPad = isWeb ? 67 : insets.top + 16;

  const handleToggle = (key: string, val: boolean) => {
    Haptics.selectionAsync();
    updateSettings({ data: { [key]: val } }, { onSuccess: () => refetch() });
  };

  const notifItems = [
    {
      key: "notificationsEnabled",
      label: "전체 푸시 알림",
      icon: "bell-outline",
      val: settings?.notificationsEnabled ?? true,
    },
    {
      key: "lockReminderEnabled",
      label: "잠금 시작/종료 알림",
      icon: "lock-outline",
      val: settings?.lockReminderEnabled ?? true,
    },
    {
      key: "challengeAlertEnabled",
      label: "챌린지 진행 알림",
      icon: "trophy-outline",
      val: settings?.challengeAlertEnabled ?? true,
    },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: isWeb ? 34 : insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>설정</Text>
        <Text style={[styles.sub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          앱 환경 및 알림 관리
        </Text>
      </View>

      {/* Profile card */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <LinearGradient
          colors={["#6D28D9", "#4C1D95"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={28} color="#6D28D9" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { fontFamily: "Inter_700Bold" }]}>
              {settings?.nickname || "디톡스 유저"}
            </Text>
            <Text style={[styles.profileSub, { fontFamily: "Inter_400Regular" }]}>
              접근성:{" "}
              {statusLoading
                ? "확인 중..."
                : blockStatus?.accessibilityEnabled
                ? "활성화됨 ✓"
                : "비활성화 ⚠️"}
            </Text>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={[styles.activeBadgeText, { fontFamily: "Inter_700Bold" }]}>활성</Text>
          </View>
        </LinearGradient>
      </View>

      {/* 설정의 창 notice */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <View style={[styles.windowCard, { backgroundColor: isSunday ? "#D1FAE5" : colors.card, borderColor: isSunday ? "#10B981" : colors.border }]}>
          <MaterialCommunityIcons
            name={isSunday ? "calendar-check" : "calendar-clock"}
            size={20}
            color={isSunday ? "#10B981" : colors.textSecondary}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.windowTitle, { color: isSunday ? "#065F46" : colors.text, fontFamily: "Inter_600SemiBold" }]}>
              {isSunday ? "설정의 창 오픈!" : "설정의 창"}
            </Text>
            <Text style={[styles.windowSub, { color: isSunday ? "#047857" : colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {isSunday
                ? "오늘은 타임슬롯/앱 차단을 변경할 수 있습니다"
                : `일요일에만 변경 가능 · ${daysUntilSunday}일 후`}
            </Text>
          </View>
        </View>
      </View>

      {/* Block Status Card — Android only */}
      {Platform.OS === "android" && (
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>
              차단 상태
            </Text>
            <Pressable onPress={fetchBlockStatus} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="refresh" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={[styles.listCard, { backgroundColor: colors.card }]}>
            {/* Accessibility Service row */}
            <Pressable
              onPress={() => {
                if (!blockStatus?.accessibilityEnabled) {
                  Linking.sendIntent("android.settings.ACCESSIBILITY_SETTINGS").catch(() => Linking.openSettings());
                }
              }}
              style={[styles.listRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              <View style={[styles.listIcon, { backgroundColor: blockStatus?.accessibilityEnabled ? "#10B98115" : "#EF444415" }]}>
                <MaterialCommunityIcons
                  name={blockStatus?.accessibilityEnabled ? "shield-check" : "shield-off"}
                  size={18}
                  color={blockStatus?.accessibilityEnabled ? "#10B981" : "#EF4444"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.listLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                  접근성 서비스
                </Text>
                <Text style={[styles.listSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {blockStatus?.accessibilityEnabled ? "앱 차단의 핵심 권한" : "탭하여 접근성 설정 열기 →"}
                </Text>
              </View>
              <View style={[styles.permBadge, {
                backgroundColor: blockStatus?.accessibilityEnabled ? "#D1FAE5" : "#FEE2E2"
              }]}>
                <Text style={[styles.permText, {
                  color: blockStatus?.accessibilityEnabled ? "#065F46" : "#991B1B",
                  fontFamily: "Inter_600SemiBold"
                }]}>
                  {statusLoading ? "조회 중" : blockStatus?.accessibilityEnabled ? "활성화됨" : "비활성화"}
                </Text>
              </View>
            </Pressable>

            {/* Current lock state row */}
            <View style={[styles.listRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={[styles.listIcon, { backgroundColor: blockStatus?.isLocked ? "#EF444415" : Colors.primary + "15" }]}>
                <MaterialCommunityIcons
                  name={blockStatus?.isLocked ? "lock" : "lock-open-outline"}
                  size={18}
                  color={blockStatus?.isLocked ? "#EF4444" : Colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.listLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                  현재 잠금 상태
                </Text>
                <Text style={[styles.listSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  잠금 슬롯 {blockStatus?.lockedSlots?.length ?? 0}개 설정됨
                </Text>
              </View>
              <View style={[styles.permBadge, {
                backgroundColor: blockStatus?.isLocked ? "#FEE2E2" : "#F3F4F6"
              }]}>
                <Text style={[styles.permText, {
                  color: blockStatus?.isLocked ? "#991B1B" : colors.textSecondary,
                  fontFamily: "Inter_600SemiBold"
                }]}>
                  {blockStatus?.isLocked ? "잠금 중" : "해제됨"}
                </Text>
              </View>
            </View>

            {/* Blocked apps row */}
            <View style={styles.listRow}>
              <View style={[styles.listIcon, { backgroundColor: Colors.primary + "15" }]}>
                <MaterialCommunityIcons name="apps" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.listLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                  차단 앱 목록
                </Text>
                {blockStatus && blockStatus.blockedApps.length > 0 ? (
                  blockStatus.blockedApps.slice(0, 3).map((pkg) => (
                    <Text key={pkg} style={[styles.listSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                      · {pkg}
                    </Text>
                  ))
                ) : (
                  <Text style={[styles.listSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {blockStatus ? "없음" : "데이터 없음"}
                  </Text>
                )}
                {blockStatus && blockStatus.blockedApps.length > 3 && (
                  <Text style={[styles.listSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    외 {blockStatus.blockedApps.length - 3}개
                  </Text>
                )}
              </View>
              <View style={[styles.permBadge, { backgroundColor: Colors.primary + "15" }]}>
                <Text style={[styles.permText, { color: Colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                  {blockStatus?.blockedApps?.length ?? 0}개
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Notifications */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
          알림 설정
        </Text>
        <View style={[styles.listCard, { backgroundColor: colors.card }]}>
          {notifItems.map((item, i) => (
            <View
              key={item.key}
              style={[
                styles.listRow,
                i < notifItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.listIcon, { backgroundColor: Colors.primary + "15" }]}>
                <MaterialCommunityIcons name={item.icon as any} size={18} color={Colors.primary} />
              </View>
              <Text style={[styles.listLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                {item.label}
              </Text>
              <Switch
                value={item.val}
                onValueChange={(v) => handleToggle(item.key, v)}
                trackColor={{ false: colors.border, true: Colors.primary + "60" }}
                thumbColor={item.val ? Colors.primary : colors.textSecondary}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Permissions */}
      {Platform.OS === "android" && (
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            권한 관리
          </Text>
          <View style={[styles.listCard, { backgroundColor: colors.card }]}>
            <Pressable
              onPress={() => {
                if (!blockStatus?.accessibilityEnabled) {
                  Linking.sendIntent("android.settings.ACCESSIBILITY_SETTINGS").catch(() => Linking.openSettings());
                }
              }}
              style={styles.listRow}
            >
              <View style={[styles.listIcon, { backgroundColor: blockStatus?.accessibilityEnabled ? "#10B98115" : "#EF444415" }]}>
                <MaterialCommunityIcons
                  name={blockStatus?.accessibilityEnabled ? "shield-check" : "shield-off"}
                  size={18}
                  color={blockStatus?.accessibilityEnabled ? "#10B981" : "#EF4444"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.listLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                  접근성 서비스 권한
                </Text>
                <Text style={[styles.listSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {blockStatus?.accessibilityEnabled ? "앱 차단을 위해 필수적입니다" : "탭하여 접근성 설정 열기 →"}
                </Text>
              </View>
              <View style={[styles.permBadge, {
                backgroundColor: blockStatus?.accessibilityEnabled ? "#D1FAE5" : "#FEE2E2"
              }]}>
                <Text style={[styles.permText, {
                  color: blockStatus?.accessibilityEnabled ? "#065F46" : "#991B1B",
                  fontFamily: "Inter_600SemiBold"
                }]}>
                  {statusLoading ? "확인 중" : blockStatus?.accessibilityEnabled ? "허용됨" : "미허용"}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      )}

      {/* 기기 저장 슬롯 진단 — Android only */}
      {Platform.OS === "android" && (
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>
              기기 저장 슬롯
            </Text>
            <Pressable onPress={fetchDeviceDaySlots} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="refresh" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={[styles.listCard, { backgroundColor: colors.card, paddingVertical: 8 }]}>
            {daySlotsLoading ? (
              <View style={{ padding: 16, alignItems: "center" }}>
                <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13 }}>불러오는 중...</Text>
              </View>
            ) : !deviceDaySlots ? (
              <View style={{ padding: 16, alignItems: "center" }}>
                <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13 }}>데이터 없음 (새 APK 설치 필요)</Text>
              </View>
            ) : (
              <>
                {/* 시간 눈금 */}
                <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingBottom: 4, gap: 0 }}>
                  <View style={{ width: 24 }} />
                  {["00", "06", "12", "18", "24"].map((t, i) => (
                    <Text key={t} style={{ flex: i < 4 ? 1 : 0, color: colors.textSecondary, fontSize: 10, fontFamily: "Inter_400Regular", textAlign: i === 4 ? "right" : "left" }}>{t}</Text>
                  ))}
                </View>
                {DAY_LABELS.map((label, dow) => {
                  const indices: number[] = (deviceDaySlots as any)[`dow_${dow}`] ?? [];
                  const hours = (indices.length * 10 / 60).toFixed(1);
                  const hasData = indices.length > 0;
                  return (
                    <View key={dow} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ width: 20, color: hasData ? colors.text : colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{label}</Text>
                        <View style={{ flex: 1 }}>
                          <DayBar indices={indices} colors={colors} />
                        </View>
                        <Text style={{ width: 36, color: hasData ? "#7C3AED" : colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "right" }}>
                          {hasData ? `${hours}h` : "미설정"}
                        </Text>
                      </View>
                      {hasData && (
                        <Text style={{ marginLeft: 28, fontSize: 11, color: colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 }} numberOfLines={2}>
                          {toRanges(indices)}
                        </Text>
                      )}
                    </View>
                  );
                })}
                {/* 구버전 호환 데이터 */}
                {(deviceDaySlots as any).legacy_dow !== -1 && (
                  <View style={{ marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: "Inter_400Regular" }}>
                      구버전 locked_slots_today (dow={(deviceDaySlots as any).legacy_dow}): {((deviceDaySlots as any).legacy_today ?? []).length}개 슬롯
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      )}

      {/* App info */}
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
          앱 정보
        </Text>
        <View style={[styles.listCard, { backgroundColor: colors.card }]}>
          {[
            { label: "버전", value: "1.0.0" },
            { label: "빌드", value: Platform.OS === "android" ? "Android" : Platform.OS === "ios" ? "iOS" : "Web" },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              style={[
                styles.listRow,
                i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.listLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                {item.label}
              </Text>
              <Text style={[styles.listSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30 },
  sub: { fontSize: 14, marginTop: 4 },
  profileCard: { borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  profileName: { color: "#fff", fontSize: 18 },
  profileSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { color: "#fff", fontSize: 12 },
  windowCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  windowTitle: { fontSize: 14 },
  windowSub: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  listCard: { borderRadius: 16, overflow: "hidden" },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  listIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  listLabel: { flex: 1, fontSize: 15 },
  listSub: { fontSize: 13 },
  permBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  permText: { fontSize: 13 },
});
