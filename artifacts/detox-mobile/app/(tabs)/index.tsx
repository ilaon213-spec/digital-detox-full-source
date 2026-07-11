import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import {
  useGetDashboard,
  useGetServerTime,
  useSendHeartbeat,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: dashboard, isLoading, refetch } = useGetDashboard();
  const { data: serverTime } = useGetServerTime();
  const { mutate: heartbeat } = useSendHeartbeat();

  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const handleHeartbeat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    heartbeat();
    refetch();
  };

  const topPad = isWeb ? 67 : insets.top + 16;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} size="large" />
      </View>
    );
  }

  const compRate = dashboard?.todayComplianceRate ?? 0;
  const isLocked = dashboard?.isLocked ?? false;
  const todayLockedHours = Math.round(((dashboard?.timeSlots?.filter(s => s.isLocked).length ?? 0) * 10) / 60 * 10) / 10;
  const tier = dashboard?.challenge?.tier;
  const tierColors: Record<string, [string, string]> = {
    beginner: ["#10B981", "#059669"],
    focused: ["#3B82F6", "#2563EB"],
    hardcore: ["#EF4444", "#DC2626"],
  };
  const tierGrad = tier ? tierColors[tier] ?? tierColors.beginner : ["#6D28D9", "#4C1D95"];

  const tierLabel: Record<string, string> = {
    beginner: "입문자",
    focused: "집중자",
    hardcore: "독종",
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: isWeb ? 34 : insets.bottom + 100, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {now.getHours() < 12 ? "좋은 아침이에요" : now.getHours() < 18 ? "좋은 오후에요" : "좋은 저녁이에요"}
          </Text>
          <Text style={[styles.date, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            {now.getMonth() + 1}월 {now.getDate()}일 ({DAY_KO[now.getDay()]}요일)
          </Text>
        </View>
        <View style={[styles.dayBadge, { backgroundColor: colors.tint + "20" }]}>
          <Text style={[styles.dayText, { color: colors.tint, fontFamily: "Inter_700Bold" }]}>
            D-{serverTime?.daysUntilSunday ?? "-"}
          </Text>
        </View>
      </View>

      {/* Status card */}
      <LinearGradient
        colors={(isLocked ? ["#DC2626", "#B91C1C"] : ["#6D28D9", "#4C1D95"]) as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statusCard}
      >
        <View style={styles.statusTop}>
          <View style={[styles.statusIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <MaterialCommunityIcons
              name={isLocked ? "lock" : "lock-open"}
              size={22}
              color="#fff"
            />
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isLocked ? "#FCA5A5" : "#A7F3D0" }]}>
            <Text style={[styles.statusBadgeText, { color: isLocked ? "#7F1D1D" : "#064E3B", fontFamily: "Inter_700Bold" }]}>
              {isLocked ? "잠금 중" : "자유 시간"}
            </Text>
          </View>
        </View>
        <Text style={[styles.statusTitle, { fontFamily: "Inter_700Bold" }]}>
          {isLocked ? "현재 앱 차단 활성" : "지금은 자유 시간"}
        </Text>
        <Text style={[styles.statusSub, { fontFamily: "Inter_400Regular" }]}>
          {isLocked
            ? "설정된 타임슬롯 잠금 중입니다"
            : "타임슬롯 잠금 시간이 아닙니다"}
        </Text>
      </LinearGradient>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.statIcon, { backgroundColor: "#8B5CF620" }]}>
            <Feather name="check-circle" size={18} color="#8B5CF6" />
          </View>
          <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            {Math.round(compRate)}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            오늘 준수율
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.statIcon, { backgroundColor: "#10B98120" }]}>
            <MaterialCommunityIcons name="fire" size={18} color="#10B981" />
          </View>
          <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            {dashboard?.currentStreak ?? 0}일
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            연속 달성
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.statIcon, { backgroundColor: "#F59E0B20" }]}>
            <Feather name="clock" size={18} color="#F59E0B" />
          </View>
          <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            {todayLockedHours}h
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            잠금 시간
          </Text>
        </View>
      </View>

      {/* Compliance bar */}
      <View style={[styles.compCard, { backgroundColor: colors.card }]}>
        <View style={styles.compHeader}>
          <Text style={[styles.compTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
            오늘 준수율
          </Text>
          <Text style={[styles.compPct, { color: colors.tint, fontFamily: "Inter_700Bold" }]}>
            {Math.round(compRate)}%
          </Text>
        </View>
        <View style={[styles.compBg, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.compFill,
              {
                width: `${Math.min(compRate, 100)}%`,
                backgroundColor: compRate >= 80 ? "#10B981" : compRate >= 50 ? "#F59E0B" : "#EF4444",
              },
            ]}
          />
        </View>
        <Text style={[styles.compSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {compRate >= 80 ? "훌륭해요! 오늘도 잘 하고 있습니다." : compRate >= 50 ? "절반 이상 달성했어요. 조금만 더!" : "아직 부족해요. 화이팅!"}
        </Text>
      </View>

      {/* Challenge card */}
      {dashboard?.challenge && (
        <LinearGradient
          colors={tierGrad as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.challengeCard}
        >
          <View style={styles.challengeTop}>
            <MaterialCommunityIcons name="trophy" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={[styles.challengeLabel, { fontFamily: "Inter_600SemiBold" }]}>
              {tierLabel[tier ?? ""] ?? tier} 챌린지
            </Text>
          </View>
          <Text style={[styles.challengeDeposit, { fontFamily: "Inter_700Bold" }]}>
            ₩{(dashboard.challenge.depositAmount ?? 0).toLocaleString()}
          </Text>
          <Text style={[styles.challengeSub, { fontFamily: "Inter_400Regular" }]}>
            예치금 · {dashboard.challenge.totalDays - (dashboard.challenge.successDays ?? 0) - (dashboard.challenge.failedDays ?? 0)}일 남음
          </Text>
        </LinearGradient>
      )}

      {/* Heartbeat */}
      <Pressable
        onPress={handleHeartbeat}
        style={({ pressed }) => [
          styles.heartbeatBtn,
          { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <MaterialCommunityIcons name="heart-pulse" size={20} color={colors.tint} />
        <Text style={[styles.heartbeatText, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
          생존 신호 보내기
        </Text>
        <Feather name="chevron-right" size={18} color={colors.textSecondary} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  greeting: { fontSize: 14, marginBottom: 2 },
  date: { fontSize: 22 },
  dayBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  dayText: { fontSize: 13 },
  statusCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  statusTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statusIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 12 },
  statusTitle: { color: "#fff", fontSize: 20, marginBottom: 4 },
  statusSub: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 11, textAlign: "center" },
  compCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  compHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  compTitle: { fontSize: 15 },
  compPct: { fontSize: 18 },
  compBg: { height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  compFill: { height: "100%", borderRadius: 4 },
  compSub: { fontSize: 13 },
  challengeCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  challengeTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  challengeLabel: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  challengeDeposit: { color: "#fff", fontSize: 28, marginBottom: 4 },
  challengeSub: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  heartbeatBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16 },
  heartbeatText: { flex: 1, fontSize: 16 },
});
