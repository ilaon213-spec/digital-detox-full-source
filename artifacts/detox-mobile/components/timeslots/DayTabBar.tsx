import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { DAY_LABELS } from "@/constants/timeSlots";

interface DayTabBarProps {
  selectedDay: number;
  todayDow: number;
  onSelect: (day: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colors: any;
}

// 상단 탭 메뉴: 요일을 전환하면 부모가 selectedDay를 갱신하고,
// 그 값이 <DaySlotConfig key={selectedDay} /> 의 key로 쓰여 완전히 새로운
// 컴포넌트 인스턴스가 마운트된다 (요일 간 상태/데이터 섞임을 원천 차단).
export default function DayTabBar({ selectedDay, todayDow, onSelect, colors }: DayTabBarProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {DAY_LABELS.map((label, day) => {
        const isSelected = day === selectedDay;
        const isToday = day === todayDow;
        const isWeekend = day === 0 || day === 6;
        return (
          <Pressable
            key={day}
            onPress={() => {
              if (day === selectedDay) return;
              Haptics.selectionAsync();
              onSelect(day);
            }}
            style={styles.tab}
          >
            <View style={styles.labelRow}>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isSelected ? Colors.primary : isWeekend ? "#F87171" : colors.textSecondary,
                    fontFamily: isSelected ? "Inter_700Bold" : "Inter_500Medium",
                  },
                ]}
              >
                {label}
              </Text>
              {isToday && (
                <View
                  style={[
                    styles.todayDot,
                    { backgroundColor: isSelected ? Colors.primary : colors.textSecondary },
                  ]}
                />
              )}
            </View>
            {isSelected && <View style={[styles.indicator, { backgroundColor: Colors.primary }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    position: "relative",
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  tabLabel: { fontSize: 15 },
  todayDot: { width: 4, height: 4, borderRadius: 2 },
  indicator: { position: "absolute", bottom: 0, left: 10, right: 10, height: 3, borderRadius: 2 },
});
