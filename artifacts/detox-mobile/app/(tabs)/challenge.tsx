import React, { useRef, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import {
  useGetChallenge,
  useGetChallengeStats,
  useJoinChallenge,
  useGetServerTime,
  useSendHeartbeat,
  useGetRecentChallengeEvents,
  getGetRecentChallengeEventsQueryKey,
  JoinChallengeRequestTier,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";

const TIERS = [
  {
    id: "beginner",
    label: "입문자",
    deposit: 5000,
    feeRate: 30,
    icon: "leaf",
    desc: "디지털 디톡스를 처음 시작하는 분",
    gradient: ["#10B981", "#059669"] as [string, string],
    feeColor: "#F43F5E",
  },
  {
    id: "motivated",
    label: "실천자",
    deposit: 10000,
    feeRate: 25,
    icon: "run-fast",
    desc: "의지를 다지며 실천하는 분",
    gradient: ["#14B8A6", "#0F766E"] as [string, string],
    feeColor: "#F97316",
  },
  {
    id: "focused",
    label: "집중자",
    deposit: 50000,
    feeRate: 15,
    icon: "fire",
    desc: "강한 의지로 스크린 타임을 줄이려는 분",
    gradient: ["#3B82F6", "#2563EB"] as [string, string],
    feeColor: "#6366F1",
  },
  {
    id: "hardcore",
    label: "독종",
    deposit: 100000,
    feeRate: 5,
    icon: "skull",
    desc: "극한의 디지털 절제를 원하는 분",
    gradient: ["#EF4444", "#DC2626"] as [string, string],
    feeColor: "#22C55E",
  },
] as const;

function eventMessage(type: string, nickname: string, tierName: string): string {
  if (type === "joined") return `${nickname}님이 ${tierName} 챌린지에 참가했습니다`;
  if (type === "quit") return `${nickname}님이 챌린지를 포기했습니다`;
  return `${nickname}님이 ${tierName} 챌린지에서 탈락했습니다`;
}

export default function ChallengeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: challenge, isLoading, refetch } = useGetChallenge();
  const { data: serverTime } = useGetServerTime();
  const { data: challengeStats } = useGetChallengeStats();
  const { mutate: joinChallenge, isPending } = useJoinChallenge();
  const { mutate: heartbeat } = useSendHeartbeat();
  const isSunday = serverTime?.isSunday ?? false;

  const topPad = isWeb ? 67 : insets.top + 16;

  // ── 폴링: 5초마다 새 이벤트 확인 ──────────────────────────────────────────
  const lastSeenIdRef = useRef<number>(0);
  const sinceRef = useRef<string>(new Date(Date.now() - 5000).toISOString());

  const { data: recentEvents } = useGetRecentChallengeEvents(
    { since: sinceRef.current },
    {
      query: {
        queryKey: getGetRecentChallengeEventsQueryKey({ since: sinceRef.current }),
        refetchInterval: 5000,
      },
    }
  );

  useEffect(() => {
    if (!recentEvents || recentEvents.length === 0) return;
    const newEvents = recentEvents.filter((e) => e.id > lastSeenIdRef.current);
    if (newEvents.length === 0) return;

    lastSeenIdRef.current = Math.max(...newEvents.map((e) => e.id));
    sinceRef.current = new Date().toISOString();

    newEvents.reverse().forEach((evt, idx) => {
      setTimeout(() => {
        Alert.alert("챌린지 소식", eventMessage(evt.type, evt.nickname, evt.tierName), [{ text: "확인" }]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, idx * 600);
    });
  }, [recentEvents]);

  // ─────────────────────────────────────────────────────────────────────────────

  // 시간 설정 모달 상태
  const [pendingTier, setPendingTier] = useState<typeof TIERS[number] | null>(null);
  const [selectedHours, setSelectedHours] = useState(10);

  const openJoinModal = (tier: typeof TIERS[number]) => {
    if (!isSunday) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("편집 불가", "일요일에만 챌린지를 시작할 수 있습니다.");
      return;
    }
    setSelectedHours(tier.feeRate <= 5 ? 1 : tier.feeRate <= 15 ? 4 : tier.feeRate <= 25 ? 8 : 10);
    setPendingTier(tier);
  };

  const confirmJoin = () => {
    if (!pendingTier) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    joinChallenge(
      { data: { tier: pendingTier.id as JoinChallengeRequestTier, dailyLimitHours: selectedHours } },
      {
        onSuccess: () => {
          refetch();
          setPendingTier(null);
        },
      }
    );
  };

  // 레거시 handleJoin — 호환성 유지 (현재 미사용)
  const handleJoin = (tierId: string, deposit: number, label: string) => {
    const tier = TIERS.find((t) => t.id === tierId);
    if (tier) openJoinModal(tier);
  };

  const handleHeartbeat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    heartbeat();
    refetch();
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const activeTier = TIERS.find((t) => t.id === challenge?.tier);
  const daysCompleted = challenge?.successDays ?? 0;
  const daysRemaining = challenge
    ? challenge.totalDays - (challenge.successDays ?? 0) - (challenge.failedDays ?? 0)
    : 0;
  const complianceRate =
    challenge && challenge.totalDays > 0
      ? ((challenge.successDays ?? 0) / challenge.totalDays) * 100
      : 0;

  return (
    <>
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topPad,
        paddingBottom: isWeb ? 34 : insets.bottom + 100,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>챌린지</Text>
        <Text style={[styles.sub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          예치금을 걸고 디톡스를 실천하세요
        </Text>
      </View>

      {/* Active challenge */}
      {challenge && activeTier && challenge.isActive && (
        <>
          <LinearGradient
            colors={activeTier.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeCard}
          >
            <View style={styles.activeTop}>
              <View style={[styles.activeBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Text style={[styles.activeBadgeText, { fontFamily: "Inter_700Bold" }]}>진행 중</Text>
              </View>
              <MaterialCommunityIcons name="trophy" size={24} color="rgba(255,255,255,0.8)" />
            </View>
            <Text style={[styles.activeTier, { fontFamily: "Inter_700Bold" }]}>
              {activeTier.label} 챌린지
            </Text>
            <Text style={[styles.activeDeposit, { fontFamily: "Inter_700Bold" }]}>
              ₩{(challenge.depositAmount ?? 0).toLocaleString()}
            </Text>
            <View style={styles.activeStats}>
              <View style={styles.activeStat}>
                <Text style={[styles.activeStatVal, { fontFamily: "Inter_700Bold" }]}>{daysCompleted}일</Text>
                <Text style={[styles.activeStatLabel, { fontFamily: "Inter_400Regular" }]}>완료</Text>
              </View>
              <View style={[styles.activeStatDiv, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
              <View style={styles.activeStat}>
                <Text style={[styles.activeStatVal, { fontFamily: "Inter_700Bold" }]}>{daysRemaining}일</Text>
                <Text style={[styles.activeStatLabel, { fontFamily: "Inter_400Regular" }]}>남음</Text>
              </View>
              <View style={[styles.activeStatDiv, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
              <View style={styles.activeStat}>
                <Text style={[styles.activeStatVal, { fontFamily: "Inter_700Bold" }]}>
                  {Math.round(complianceRate)}%
                </Text>
                <Text style={[styles.activeStatLabel, { fontFamily: "Inter_400Regular" }]}>준수율</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Progress bar */}
          <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                챌린지 진행률
              </Text>
              <Text style={[styles.progressPct, { color: Colors.primary, fontFamily: "Inter_700Bold" }]}>
                {Math.round(complianceRate)}%
              </Text>
            </View>
            <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(complianceRate, 100)}%` as any,
                    backgroundColor: activeTier.gradient[0],
                  },
                ]}
              />
            </View>
          </View>

          {/* Heartbeat */}
          <Pressable
            onPress={handleHeartbeat}
            style={({ pressed }) => [
              styles.heartbeatBtn,
              { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="heart-pulse" size={20} color={activeTier.gradient[0]} />
            <Text style={[styles.heartbeatText, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
              생존 신호 보내기
            </Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.otherTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            다른 티어
          </Text>
        </>
      )}

      {/* Tier cards */}
      {TIERS.map((tier) => {
        const isActive = challenge?.tier === tier.id && challenge?.isActive;
        if (isActive) return null;
        return (
          <View key={tier.id} style={[styles.tierCard, { backgroundColor: colors.card }]}>
            <LinearGradient colors={tier.gradient} style={styles.tierIconBg}>
              <MaterialCommunityIcons name={tier.icon as any} size={22} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tierLabel, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
                {tier.label}
              </Text>
              <Text style={[styles.tierDesc, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {tier.desc}
              </Text>
              <Text style={[styles.tierDeposit, { color: tier.gradient[0], fontFamily: "Inter_700Bold" }]}>
                ₩{tier.deposit.toLocaleString()}
              </Text>
              <Text style={[styles.tierFee, { fontFamily: "Inter_400Regular" }]}>
                수수료 <Text style={{ color: tier.feeColor, fontFamily: "Inter_700Bold" }}>{tier.feeRate}%</Text>
                {" · "}상금 {100 - tier.feeRate}%
              </Text>
              <Text style={[styles.tierFee, { marginTop: 2, fontFamily: "Inter_400Regular" }]}>
                ⏱ 최대 <Text style={{ color: tier.gradient[0], fontFamily: "Inter_700Bold" }}>{tier.feeRate <= 5 ? 1 : tier.feeRate <= 15 ? 4 : tier.feeRate <= 25 ? 8 : 10}시간</Text>/일
              </Text>
            </View>
            <Pressable
              onPress={() => openJoinModal(tier)}
              disabled={isPending}
              style={({ pressed }) => [
                styles.joinBtn,
                { backgroundColor: tier.gradient[0], opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.joinBtnText, { fontFamily: "Inter_700Bold" }]}>참가</Text>
            </Pressable>
          </View>
        );
      })}

      {/* Stats section */}
      <View style={[styles.statsSection, { backgroundColor: colors.card }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Text style={[styles.statsSectionTitle, { color: colors.text, fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>
            챌린지 현황
          </Text>
          {challengeStats && (
            <Text style={[styles.statRowSub, { color: Colors.primary, fontFamily: "Inter_700Bold" }]}>
              총 {challengeStats.grandTotal}명 참여
            </Text>
          )}
        </View>
        {TIERS.map((tier) => {
          const stat = challengeStats?.tiers?.find((t) => t.tier === tier.id);
          return (
            <View key={tier.id} style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: tier.gradient[0] }]} />
              <Text style={[styles.statRowLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                {tier.label}
              </Text>
              <Text style={[styles.statRowSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {stat
                  ? `${stat.active}명 진행 중 · 총 ${stat.total}명`
                  : "참가자 없음"}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>

    {/* 하루 사용 시간 설정 모달 */}
    <Modal visible={!!pendingTier} transparent animationType="fade" onRequestClose={() => setPendingTier(null)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            ⏱ 하루 사용 시간 설정
          </Text>
          <Text style={[styles.modalSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            챌린지 기간 동안 하루 최대 몇 시간만 사용할지 설정하세요.
            {pendingTier && (
              `\n이 티어의 최대 허용 시간: ${pendingTier.feeRate <= 5 ? 1 : pendingTier.feeRate <= 15 ? 4 : pendingTier.feeRate <= 25 ? 8 : 10}시간`
            )}
          </Text>
          <View style={styles.modalHourRow}>
            <TouchableOpacity
              onPress={() => setSelectedHours(Math.max(1, selectedHours - 1))}
              style={[styles.stepBtn, { backgroundColor: colors.background }]}
            >
              <Text style={[styles.stepBtnText, { color: colors.text }]}>－</Text>
            </TouchableOpacity>
            <View style={styles.modalHourBox}>
              <Text style={[styles.modalHour, { color: Colors.primary, fontFamily: "Inter_700Bold" }]}>
                {selectedHours}
              </Text>
              <Text style={[styles.modalHourLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                시간
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedHours(Math.min(pendingTier ? (pendingTier.feeRate <= 5 ? 1 : pendingTier.feeRate <= 15 ? 4 : pendingTier.feeRate <= 25 ? 8 : 10) : 10, selectedHours + 1))}
              style={[styles.stepBtn, { backgroundColor: colors.background }]}
            >
              <Text style={[styles.stepBtnText, { color: colors.text }]}>＋</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.modalMinLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            = 하루 {selectedHours * 60}분
          </Text>
          <View style={styles.modalBtnRow}>
            <TouchableOpacity onPress={() => setPendingTier(null)} style={[styles.modalBtn, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalBtnText, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmJoin} disabled={isPending} style={[styles.modalBtn, { backgroundColor: pendingTier ? pendingTier.gradient[0] : Colors.primary }]}>
              <Text style={[styles.modalBtnText, { color: "#fff", fontFamily: "Inter_700Bold" }]}>
                {isPending ? "처리 중..." : "챌린지 참여"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 30 },
  sub: { fontSize: 14, marginTop: 4 },
  activeCard: { borderRadius: 22, padding: 22, marginBottom: 16 },
  activeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  activeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  activeBadgeText: { color: "#fff", fontSize: 12 },
  activeTier: { color: "rgba(255,255,255,0.8)", fontSize: 15, marginBottom: 4 },
  activeDeposit: { color: "#fff", fontSize: 32, marginBottom: 16 },
  activeStats: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  activeStat: { alignItems: "center" },
  activeStatVal: { color: "#fff", fontSize: 22 },
  activeStatLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  activeStatDiv: { width: 1, height: 32 },
  progressCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressLabel: { fontSize: 15 },
  progressPct: { fontSize: 16 },
  progressBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  heartbeatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  heartbeatText: { fontSize: 16 },
  divider: { height: 1, marginBottom: 16 },
  otherTitle: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },
  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  tierIconBg: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tierLabel: { fontSize: 16, marginBottom: 2 },
  tierDesc: { fontSize: 12, lineHeight: 17, marginBottom: 4 },
  tierDeposit: { fontSize: 16, marginBottom: 3 },
  tierFee: { fontSize: 11, color: "#94A3B8" },
  joinBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  joinBtnText: { color: "#fff", fontSize: 14 },
  statsSection: { borderRadius: 16, padding: 16, marginTop: 8 },
  statsSectionTitle: { fontSize: 15, marginBottom: 14 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statRowLabel: { flex: 1, fontSize: 14 },
  statRowSub: { fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: { fontSize: 18, marginBottom: 8 },
  modalSub: { fontSize: 13, lineHeight: 20, marginBottom: 24 },
  modalHourRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 8 },
  stepBtn: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontSize: 24, lineHeight: 28 },
  modalHourBox: { alignItems: "center" },
  modalHour: { fontSize: 52, lineHeight: 60 },
  modalHourLabel: { fontSize: 16, marginTop: -4 },
  modalMinLabel: { textAlign: "center", fontSize: 13, marginBottom: 24 },
  modalBtnRow: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: "center" },
  modalBtnText: { fontSize: 15 },
});
