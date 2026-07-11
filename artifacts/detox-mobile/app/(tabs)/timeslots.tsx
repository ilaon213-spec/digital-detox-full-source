import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useGetServerTime, useGetSettings, useGetBlockedApps } from "@workspace/api-client-react";
import DayTabBar from "@/components/timeslots/DayTabBar";
import DaySlotConfig from "@/components/timeslots/DaySlotConfig";

// 이 화면은 얇은 셸(shell)입니다: 요일에 무관한 메타 정보(서버 시간, 설정,
// 차단 앱 목록)와 상단 탭 바만 소유하고, 실제 타임슬롯 편집 화면은
// <DaySlotConfig key={selectedDay} .../> 로 위임합니다.
// key가 selectedDay로 지정되어 있으므로 요일을 바꾸면 React가 이전 요일의
// 컴포넌트 인스턴스를 완전히 언마운트하고 새 인스턴스를 마운트합니다 —
// 즉, 요일 간에 state가 절대 공유되지 않고, 새로 마운트된 컴포넌트는
// 오직 자신의 day에 해당하는 데이터만 새로 fetch합니다.
export default function TimeSlotsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: serverTime, isLoading: isTimeLoading, isError: isTimeError, refetch: refetchTime } = useGetServerTime();
  const { data: settings, isLoading: isSettingsLoading, isError: isSettingsError, refetch: refetchSettings } = useGetSettings();
  const { data: blockedAppsData } = useGetBlockedApps();

  const isSunday = serverTime?.isSunday ?? false;
  const todayDow = serverTime?.dayOfWeek ?? new Date().getDay();
  const isLoadingMeta = isTimeLoading || isSettingsLoading;
  const isApiError = !isLoadingMeta && (isTimeError || isSettingsError);
  const timeslotsConfigured = settings?.timeslotsConfigured ?? false;
  const canEdit = !isLoadingMeta && !isApiError && (!timeslotsConfigured || isSunday);
  const daysUntilSunday = serverTime?.daysUntilSunday ?? (() => {
    const d = new Date().getDay();
    return d === 0 ? 0 : 7 - d;
  })();

  const retryMeta = () => { refetchTime(); refetchSettings(); };

  // 화면이 처음 켜질 때는 기기 로컬 요일로 초기화 후, 서버 요일 응답이 오면
  // 한 번만 서버 기준 요일로 동기화 (didSyncDay 가드로 이후 자동 전환은 막음 —
  // 사용자가 다른 요일 탭을 직접 선택한 뒤에 되돌아가지 않도록).
  const didSyncDay = React.useRef(false);
  const [selectedDay, setSelectedDay] = React.useState<number>(new Date().getDay());

  React.useEffect(() => {
    if (!didSyncDay.current && serverTime?.dayOfWeek !== undefined) {
      setSelectedDay(serverTime.dayOfWeek);
      didSyncDay.current = true;
    }
  }, [serverTime]);

  const [scrollEnabled, setScrollEnabled] = React.useState(true);

  const topPad = isWeb ? 67 : insets.top + 16;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topPad,
        paddingBottom: isWeb ? 34 : insets.bottom + 100,
      }}
      showsVerticalScrollIndicator={false}
      scrollEnabled={scrollEnabled}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
          타임슬롯
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {canEdit
            ? "10분 단위로 잠금 구간을 설정하세요. 드래그해서 여러 칸을 한번에 선택할 수 있어요."
            : "10분 단위 잠금 구간"}
        </Text>
      </View>

      {/* Lock notice / editable banner */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        {isLoadingMeta ? (
          <View style={[styles.noticeBanner, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={[styles.noticeText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
              설정 불러오는 중...
            </Text>
          </View>
        ) : isApiError ? (
          <Pressable onPress={retryMeta} style={[styles.noticeBanner, { backgroundColor: "#FEF3C7" }]}>
            <MaterialCommunityIcons name="wifi-off" size={16} color="#D97706" />
            <Text style={[styles.noticeText, { color: "#D97706", fontFamily: "Inter_500Medium", flex: 1 }]}>
              서버 연결 실패 — 탭해서 재시도
            </Text>
            <MaterialCommunityIcons name="refresh" size={16} color="#D97706" />
          </Pressable>
        ) : !canEdit ? (
          <View style={[styles.noticeBanner, { backgroundColor: "#1E1B4B" }]}>
            <MaterialCommunityIcons name="lock" size={16} color="#A78BFA" />
            <Text style={[styles.noticeText, { fontFamily: "Inter_500Medium" }]}>
              일요일에만 편집 가능 · {daysUntilSunday}일 후
            </Text>
          </View>
        ) : (
          <LinearGradient
            colors={["#6D28D9", "#4C1D95"]}
            style={styles.sundayBanner}
          >
            <MaterialCommunityIcons name="pencil-circle" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={[styles.sundayBannerText, { fontFamily: "Inter_600SemiBold" }]}>
              {!timeslotsConfigured
                ? "첫 설정! 타임슬롯을 설정하고 저장하세요. 저장 후엔 일요일에만 변경할 수 있어요."
                : "오늘은 일요일! 아래 그리드를 탭하거나 드래그해서 잠금 구간을 설정하세요."}
            </Text>
          </LinearGradient>
        )}
      </View>

      {/* 상단 요일 탭 메뉴 */}
      <DayTabBar selectedDay={selectedDay} todayDow={todayDow} onSelect={setSelectedDay} colors={colors} />

      {/* 요일별 독립 화면 컴포넌트: key={selectedDay}로 완전히 새로 마운트됨 */}
      <DaySlotConfig
        key={selectedDay}
        day={selectedDay}
        todayDow={todayDow}
        canEdit={canEdit}
        daysUntilSunday={daysUntilSunday}
        blockedAppsData={blockedAppsData}
        colors={colors}
        onDragStateChange={setScrollEnabled}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30 },
  sub: { fontSize: 13, marginTop: 4 },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  noticeText: { color: "#A78BFA", fontSize: 14 },
  sundayBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  sundayBannerText: { color: "#fff", fontSize: 13, flex: 1, lineHeight: 18 },
});
