import React from "react";
import {
  AppState,
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Platform,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useGetDashboard } from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";

function getCurrentTime() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function getDate() {
  const now = new Date();
  const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const months = now.getMonth() + 1;
  const date = now.getDate();
  const day = days[now.getDay()];
  return `${months}월 ${date}일 ${day}`;
}

function getNextUnlockTime(timeSlots: Array<{ index: number; isLocked: boolean }> | undefined): string {
  if (!timeSlots) return "--:--";
  // KST = UTC+9 기준으로 현재 슬롯 계산 (기기 로컬 시간 사용 금지)
  const kstMinutes = Math.floor((Date.now() / 60000 + 9 * 60) % (24 * 60));
  const currentIndex = Math.floor(kstMinutes / 10);
  for (let i = currentIndex + 1; i < 144; i++) {
    const slot = timeSlots.find((s) => s.index === i);
    if (!slot?.isLocked) {
      const totalMins = i * 10;
      const h = Math.floor(totalMins / 60).toString().padStart(2, "0");
      const m = (totalMins % 60).toString().padStart(2, "0");
      return `${h}:${m}`;
    }
  }
  return "내일";
}

function EmergencyCallButton() {
  const [pressed, setPressed] = React.useState(false);

  const handleEmergencyCall = () => {
    Linking.openURL("tel:");
  };

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={handleEmergencyCall}
      style={[styles.emergencyBtn, pressed && styles.emergencyBtnPressed]}
    >
      <View style={styles.emergencyInner}>
        <View style={styles.emergencyIcon}>
          <Feather name="phone" size={22} color="#fff" />
        </View>
        <View style={styles.emergencyText}>
          <Text style={styles.emergencyTitle}>긴급전화</Text>
          <Text style={styles.emergencySubtitle}>전화 앱 열기</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
      </View>
    </Pressable>
  );
}

export function LockScreenOverlay() {
  const { data: dashboard, refetch } = useGetDashboard();

  const [time, setTime] = React.useState(getCurrentTime());
  const [date, setDate] = React.useState(getDate());

  React.useEffect(() => {
    const uiTimer = setInterval(() => {
      setTime(getCurrentTime());
      setDate(getDate());
    }, 10000);
    const fetchTimer = setInterval(() => { refetch(); }, 10000);

    // 앱이 백그라운드 → 포그라운드로 전환될 때 즉시 isLocked 재확인
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refetch();
      }
    });

    return () => {
      clearInterval(uiTimer);
      clearInterval(fetchTimer);
      sub.remove();
    };
  }, [refetch]);

  const isLocked = dashboard?.isLocked ?? false;

  if (!isLocked) return null;

  const nextUnlock = getNextUnlockTime(dashboard?.timeSlots);

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container}>

        {/* Top — time + date */}
        <View style={styles.topSection}>
          <View style={styles.lockBadge}>
            <MaterialCommunityIcons name="lock" size={14} color="#A78BFA" />
            <Text style={styles.lockBadgeText}>다운타임 진행 중</Text>
          </View>
          <Text style={styles.clock}>{time}</Text>
          <Text style={styles.dateText}>{date}</Text>
        </View>

        {/* Middle — lock info card */}
        <View style={styles.middleSection}>
          <LinearGradient
            colors={["rgba(109,40,217,0.55)", "rgba(76,29,149,0.42)"]}
            style={styles.infoCard}
          >
            <MaterialCommunityIcons name="shield-lock" size={36} color="#7C3AED" />
            <Text style={styles.infoTitle}>화면이 차단되었습니다</Text>
            <Text style={styles.infoDesc}>
              설정된 잠금 구간입니다.{"\n"}
              집중력을 유지하세요.
            </Text>
            <View style={styles.unlockRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#A78BFA" />
              <Text style={styles.unlockTime}>
                {nextUnlock === "내일" ? "내일 해제 예정" : `${nextUnlock} 이후 잠금 해제`}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Bottom — emergency call only */}
        <View style={styles.bottomSection}>
          <Text style={styles.emergencyHint}>긴급 상황 시에만 사용하세요</Text>
          <EmergencyCallButton />
          <Text style={styles.footer}>
            디지털 디톡스 · 다른 기능은 잠금 해제 후 이용 가능합니다
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080810",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 24 : 60,
    paddingBottom: 40,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "center",
    marginTop: 20,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(109,40,217,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.3)",
  },
  lockBadgeText: {
    color: "#A78BFA",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  clock: {
    fontSize: 80,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -2,
    lineHeight: 88,
  },
  dateText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  middleSection: {
    flex: 1,
    justifyContent: "center",
  },
  infoCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.45)",
  },
  infoTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginTop: 6,
  },
  infoDesc: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#DDD6FE",
    textAlign: "center",
    lineHeight: 24,
  },
  unlockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    backgroundColor: "rgba(109,40,217,0.35)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  unlockTime: {
    color: "#EDE9FE",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  bottomSection: {
    gap: 14,
    alignItems: "center",
  },
  emergencyHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    fontFamily: "Inter_400Regular",
  },
  emergencyBtn: {
    width: "100%",
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    overflow: "hidden",
  },
  emergencyBtnPressed: {
    backgroundColor: "rgba(239,68,68,0.3)",
  },
  emergencyInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  emergencyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyText: {
    flex: 1,
  },
  emergencyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  emergencySubtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  footer: {
    fontSize: 11,
    color: "rgba(255,255,255,0.2)",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
