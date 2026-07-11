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
  Linking,
  Alert,
  ActivityIndicator,
  NativeModules,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import {
  useGetBlockedApps,
  useUpdateBlockedApps,
  useAddBlockedApp,
  useDeleteBlockedApp,
  useGetServerTime,
  useGetSettings,
  useGetTimeSlots,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { syncToNative } from "@/utils/syncNative";

interface InstalledApp {
  packageName: string;
  appName: string;
}

export default function BlockedAppsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  const { data: serverTime } = useGetServerTime();
  const { data: settings } = useGetSettings();
  const isSunday = serverTime?.isSunday ?? false;
  const todayDow = serverTime?.dayOfWeek ?? new Date().getDay();
  const appsConfigured = settings?.appsConfigured ?? false;
  const canEdit = !appsConfigured || isSunday;

  const { data: apps, isLoading, refetch } = useGetBlockedApps();
  const { mutate: updateApps, isPending } = useUpdateBlockedApps();
  const { mutate: addApp } = useAddBlockedApp();
  const { mutate: deleteApp } = useDeleteBlockedApp();

  const { data: todaySlots } = useGetTimeSlots({ day: todayDow });

  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [vpnEnabled, setVpnEnabled] = useState(false);
  const [vpnRunning, setVpnRunning] = useState(false);
  const [vpnLoading, setVpnLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const refreshStatus = useCallback(() => {
    if (Platform.OS !== "android") return;
    const { DetoxSync } = NativeModules;
    if (!DetoxSync?.getBlockStatus) return;
    DetoxSync.getBlockStatus()
      .then((status: { accessibilityEnabled?: boolean; vpnEnabled?: boolean; vpnRunning?: boolean }) => {
        setAccessibilityEnabled(status?.accessibilityEnabled ?? false);
        setVpnEnabled(status?.vpnEnabled ?? false);
        setVpnRunning(status?.vpnRunning ?? false);
      })
      .catch(() => {
        setAccessibilityEnabled(false);
        setVpnEnabled(false);
        setVpnRunning(false);
      });
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const handleVpnToggle = async (enable: boolean) => {
    if (Platform.OS !== "android") {
      Alert.alert("Android 전용", "VPN 차단은 실제 Android 기기에서만 작동합니다.");
      return;
    }
    const { DetoxSync } = NativeModules;
    if (!DetoxSync) return;
    setVpnLoading(true);
    try {
      if (enable) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await DetoxSync.startVpn();
        setVpnEnabled(true);
        Alert.alert("VPN 차단 활성화", "잠금 시간대에 차단 앱의 인터넷 접근을 차단합니다.");
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await DetoxSync.stopVpn();
        setVpnEnabled(false);
        setVpnRunning(false);
      }
    } catch (e: unknown) {
      Alert.alert("오류", (e as { message?: string })?.message ?? "VPN 설정에 실패했습니다");
    } finally {
      setVpnLoading(false);
      refreshStatus();
    }
  };

  useEffect(() => {
    if (Platform.OS !== "android") return;
    if (!apps || !serverTime) return;

    const blockedPackages = apps
      .filter((a) => a.blocked)
      .map((a) => a.packageName ?? "")
      .filter(Boolean);

    const lockedIndices = (todaySlots ?? [])
      .filter((s) => s.isLocked)
      .map((s) => s.index);

    // KST = UTC+9 기준 (기기 로컬 시간 사용 금지)
    const kstMinutes = Math.floor((Date.now() / 60000 + 9 * 60) % (24 * 60));
    const currentSlot = Math.floor(kstMinutes / 10);
    const isLocked = lockedIndices.includes(currentSlot);

    syncToNative({
      lockedSlotIndices: lockedIndices,
      blockedApps: blockedPackages,
      isLocked,
      dayOfWeek: todayDow,
      lastUpdated: Date.now(),
    });
  }, [apps, todaySlots, serverTime, todayDow]);

  const topPad = isWeb ? 67 : insets.top + 16;

  const handleToggle = (id: number, packageName: string, current: boolean) => {
    if (!canEdit) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("편집 불가", "일요일에만 앱 차단 설정을 변경할 수 있습니다.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = (apps ?? []).map((a) =>
      a.packageName === packageName ? { ...a, blocked: !current } : a
    );
    updateApps(
      { data: { apps: updated.map((a) => ({ id: a.id, blocked: a.blocked })) } },
      {
        onSuccess: () => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        },
      }
    );
  };

  const handleDeleteApp = (id: number, name: string) => {
    if (!canEdit) {
      Alert.alert("편집 불가", "일요일에만 앱 차단 설정을 변경할 수 있습니다.");
      return;
    }
    Alert.alert("앱 삭제", `${name}을(를) 차단 목록에서 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => deleteApp({ id }, { onSuccess: () => refetch() }),
      },
    ]);
  };

  const handleOpenAddModal = async () => {
    if (!canEdit) {
      Alert.alert("편집 불가", "일요일에만 앱 차단 설정을 변경할 수 있습니다.");
      return;
    }
    if (Platform.OS !== "android") {
      Alert.alert("Android 전용", "기기 앱 스캔은 Android에서만 가능합니다.");
      return;
    }
    const { DetoxSync } = NativeModules;
    if (!DetoxSync?.getInstalledApps) {
      Alert.alert("오류", "앱 스캔 기능을 사용할 수 없습니다. APK를 재설치해 주세요.");
      return;
    }
    setLoadingApps(true);
    setSelectedPackages(new Set());
    setSearchQuery("");
    setShowAddModal(true);
    try {
      const result: InstalledApp[] = await DetoxSync.getInstalledApps();
      const existingPkgs = new Set((apps ?? []).map((a) => a.packageName ?? ""));
      const filtered = result
        .filter((a) => !existingPkgs.has(a.packageName))
        .sort((a, b) => a.appName.localeCompare(b.appName, "ko"));
      setInstalledApps(filtered);
    } catch {
      Alert.alert("오류", "설치된 앱 목록을 가져오지 못했습니다.");
      setShowAddModal(false);
    } finally {
      setLoadingApps(false);
    }
  };

  const toggleSelect = (pkg: string) => {
    setSelectedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return next;
    });
  };

  const handleConfirmAdd = () => {
    const toAdd = installedApps.filter((a) => selectedPackages.has(a.packageName));
    if (toAdd.length === 0) {
      setShowAddModal(false);
      return;
    }
    let done = 0;
    for (const app of toAdd) {
      addApp(
        { data: { packageName: app.packageName, name: app.appName, category: "앱" } },
        {
          onSettled: () => {
            done++;
            if (done === toAdd.length) {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
              setShowAddModal(false);
            }
          },
        }
      );
    }
  };

  const openAccessibility = () => {
    if (Platform.OS === "android") {
      Linking.sendIntent("android.settings.ACCESSIBILITY_SETTINGS").catch(() => {
        Linking.openSettings();
      });
    } else {
      Alert.alert(
        "Android 전용 기능",
        "접근성 서비스 기반 앱 차단은 Android 기기에서만 작동합니다.\n\nAPK 빌드 후 접근성 > 디지털 디톡스를 활성화하세요.",
        [{ text: "확인" }]
      );
    }
  };

  const filteredInstalled = installedApps.filter(
    (a) =>
      a.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.packageName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: isWeb ? 34 : insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>앱 차단</Text>
          <Text style={[styles.sub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            타임슬롯 잠금 시간에 자동 차단됩니다
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", marginBottom: 10 }]}>
            차단 방식
          </Text>
          {accessibilityEnabled ? (
            <LinearGradient colors={["#059669", "#047857"]} style={[styles.serviceCard, { marginBottom: 10 }]}>
              <MaterialCommunityIcons name="shield-check" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceTitle, { fontFamily: "Inter_700Bold" }]}>1층 · 접근성 서비스 활성</Text>
                <Text style={[styles.serviceSub, { fontFamily: "Inter_400Regular" }]}>앱 실행 감지 후 즉시 홈으로 복귀</Text>
              </View>
              <MaterialCommunityIcons name="check-circle" size={20} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          ) : (
            <Pressable onPress={openAccessibility} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, marginBottom: 10 }]}>
              <LinearGradient colors={["#DC2626", "#B91C1C"]} style={styles.serviceCard}>
                <MaterialCommunityIcons name="shield-off" size={22} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceTitle, { fontFamily: "Inter_700Bold" }]}>1층 · 접근성 서비스 비활성</Text>
                  <Text style={[styles.serviceSub, { fontFamily: "Inter_400Regular" }]}>
                    {Platform.OS === "android" ? "탭하여 접근성 설정 열기" : "Android APK 빌드 필요"}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </Pressable>
          )}

          <View style={[styles.vpnCard, { backgroundColor: colors.card }]}>
            <View style={[styles.vpnIconWrap, { backgroundColor: vpnEnabled ? "#6366F120" : colors.border + "60" }]}>
              <MaterialCommunityIcons name="vpn" size={22} color={vpnEnabled ? "#6366F1" : colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.vpnTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
                  2층 · VPN 네트워크 차단
                </Text>
                {vpnRunning && (
                  <View style={[styles.runningBadge, { backgroundColor: "#6366F120" }]}>
                    <Text style={[styles.runningText, { color: "#6366F1", fontFamily: "Inter_700Bold" }]}>실행 중</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.vpnSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {vpnEnabled ? "잠금 시간대에 차단 앱의 인터넷을 완전 차단" : "앱 우회를 막는 네트워크 레벨 이중 차단"}
              </Text>
            </View>
            {vpnLoading ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Switch
                value={vpnEnabled}
                onValueChange={handleVpnToggle}
                trackColor={{ false: colors.border, true: "#6366F160" }}
                thumbColor={vpnEnabled ? "#6366F1" : colors.textSecondary}
              />
            )}
          </View>
        </View>

        {!accessibilityEnabled && Platform.OS === "android" && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View style={[styles.guideCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.guideTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>활성화 방법</Text>
              {["APK를 빌드하여 기기에 설치", "설정 → 접근성 → 설치된 앱", "'디지털 디톡스' 선택 후 켜기", "앱으로 돌아와 설정 완료"].map((step, i) => (
                <View key={i} style={styles.guideStep}>
                  <View style={[styles.stepNum, { backgroundColor: Colors.primary + "20" }]}>
                    <Text style={[styles.stepNumText, { color: Colors.primary, fontFamily: "Inter_700Bold" }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 20 }}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              차단 앱 목록
            </Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              {!canEdit && (
                <View style={[styles.lockBadge, { backgroundColor: colors.border }]}>
                  <MaterialCommunityIcons name="lock" size={12} color={colors.textSecondary} />
                  <Text style={[styles.lockText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>일요일에 편집</Text>
                </View>
              )}
              {Platform.OS === "android" && canEdit && (
                <Pressable
                  onPress={handleOpenAddModal}
                  style={({ pressed }) => [styles.addBtn, { backgroundColor: Colors.primary, opacity: pressed ? 0.8 : 1 }]}
                >
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={[styles.addBtnText, { fontFamily: "Inter_600SemiBold" }]}>앱 추가</Text>
                </Pressable>
              )}
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : !apps || apps.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <MaterialCommunityIcons name="shield-outline" size={36} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                차단 앱이 없습니다
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {Platform.OS === "android"
                  ? "위의 '앱 추가' 버튼으로 기기에 설치된 앱을 추가하세요"
                  : "일요일에 차단할 앱을 추가하세요"}
              </Text>
              {Platform.OS === "android" && canEdit && (
                <Pressable
                  onPress={handleOpenAddModal}
                  style={({ pressed }) => [styles.emptyAddBtn, { backgroundColor: Colors.primary, opacity: pressed ? 0.8 : 1 }]}
                >
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={[styles.emptyAddBtnText, { fontFamily: "Inter_600SemiBold" }]}>설치된 앱 추가하기</Text>
                </Pressable>
              )}
            </View>
          ) : (
            apps.map((app) => (
              <View key={app.id} style={[styles.appRow, { backgroundColor: colors.card }]}>
                <View style={[styles.appIcon, { backgroundColor: Colors.primary + "20" }]}>
                  <MaterialCommunityIcons name="application" size={22} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.appName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>{app.name}</Text>
                  <Text style={[styles.appPkg, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{app.packageName}</Text>
                </View>
                {canEdit && (
                  <Pressable
                    onPress={() => handleDeleteApp(app.id, app.name)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 6 })}
                  >
                    <Feather name="trash-2" size={16} color={colors.textSecondary} />
                  </Pressable>
                )}
                <Switch
                  value={app.blocked ?? false}
                  onValueChange={() => handleToggle(app.id, app.packageName ?? "", app.blocked ?? false)}
                  trackColor={{ false: colors.border, true: Colors.primary + "60" }}
                  thumbColor={app.blocked ? Colors.primary : colors.textSecondary}
                  disabled={!canEdit || isPending}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>앱 추가</Text>
            <Pressable onPress={() => setShowAddModal(false)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Feather name="x" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text, fontFamily: "Inter_400Regular" }]}
              placeholder="앱 검색..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {loadingApps ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={[{ color: colors.textSecondary, marginTop: 12, fontFamily: "Inter_400Regular" }]}>
                설치된 앱 스캔 중...
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredInstalled}
              keyExtractor={(item) => item.packageName}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const selected = selectedPackages.has(item.packageName);
                return (
                  <Pressable
                    onPress={() => toggleSelect(item.packageName)}
                    style={({ pressed }) => [
                      styles.installedAppRow,
                      {
                        backgroundColor: selected ? Colors.primary + "15" : colors.card,
                        borderColor: selected ? Colors.primary : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.appIcon, { backgroundColor: Colors.primary + "20" }]}>
                      <MaterialCommunityIcons name="application" size={20} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.appName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>{item.appName}</Text>
                      <Text style={[styles.appPkg, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{item.packageName}</Text>
                    </View>
                    <View style={[styles.checkbox, { borderColor: selected ? Colors.primary : colors.border, backgroundColor: selected ? Colors.primary : "transparent" }]}>
                      {selected && <Feather name="check" size={14} color="#fff" />}
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingTop: 40 }}>
                  <Text style={[{ color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>검색 결과 없음</Text>
                </View>
              }
            />
          )}

          {selectedPackages.size > 0 && (
            <View style={[styles.modalFooter, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
              <Pressable
                onPress={handleConfirmAdd}
                style={({ pressed }) => [styles.confirmBtn, { backgroundColor: Colors.primary, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={[styles.confirmBtnText, { fontFamily: "Inter_700Bold" }]}>
                  {selectedPackages.size}개 앱 추가하기
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30 },
  sub: { fontSize: 14, marginTop: 4 },
  serviceCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 18 },
  serviceTitle: { color: "#fff", fontSize: 16 },
  serviceSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },
  guideCard: { borderRadius: 16, padding: 16, gap: 12 },
  guideTitle: { fontSize: 15 },
  guideStep: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 13 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  lockBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  lockText: { fontSize: 11 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  addBtnText: { color: "#fff", fontSize: 13 },
  emptyCard: { borderRadius: 16, padding: 36, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 16 },
  emptyDesc: { fontSize: 14, textAlign: "center" },
  emptyAddBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  emptyAddBtnText: { color: "#fff", fontSize: 14 },
  appRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 14, marginBottom: 8 },
  appIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  appName: { fontSize: 15 },
  appPkg: { fontSize: 12, marginTop: 2 },
  vpnCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16 },
  vpnIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  vpnTitle: { fontSize: 15 },
  vpnSub: { fontSize: 12, marginTop: 2 },
  runningBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  runningText: { fontSize: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { fontSize: 20 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  installedAppRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1.5 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  modalFooter: { padding: 16 },
  confirmBtn: { borderRadius: 14, padding: 16, alignItems: "center" },
  confirmBtnText: { color: "#fff", fontSize: 16 },
});
