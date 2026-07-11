import * as React from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetServerTime, useGetTimeSlots, useUpdateTimeSlots, useGetSettings } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const TOTAL_SLOTS = 144; // 24h × 6 (10-minute intervals)
const SLOTS_PER_HOUR = 6;

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_FULL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

export default function TimeSlots() {
  const { data: serverTime } = useGetServerTime();
  const { data: settings } = useGetSettings();
  const { toast } = useToast();

  const isSunday = serverTime?.isSunday ?? false;
  const todayDow = serverTime?.dayOfWeek ?? new Date().getDay();
  // 로딩 중엔 false(미설정)로 가정 → 편집 허용 상태 유지
  const timeslotsConfigured = settings?.timeslotsConfigured ?? false;
  // 편집 가능: 최초 미설정 시 any day, 설정 후엔 일요일만
  const canEdit = !timeslotsConfigured || isSunday;

  const [selectedDay, setSelectedDay] = React.useState<number>(todayDow);
  const [lockedSlots, setLockedSlots] = React.useState<boolean[]>(Array(TOTAL_SLOTS).fill(false));

  const isDraggingRef = React.useRef(false);
  const dragValueRef = React.useRef(false);

  const { data: slots, refetch } = useGetTimeSlots({ day: selectedDay });
  const { mutate: updateSlots, isPending } = useUpdateTimeSlots();

  // 요일 전환 즉시 초기화 — 이전 요일 데이터가 새 요일에 표시되지 않도록
  React.useEffect(() => {
    setLockedSlots(Array(TOTAL_SLOTS).fill(false));
  }, [selectedDay]);

  // 선택된 요일의 API 데이터가 로드되면 반영
  React.useEffect(() => {
    if (slots && slots.length > 0) {
      const locked = Array(TOTAL_SLOTS).fill(false);
      slots.forEach((s) => {
        if (s.index < TOTAL_SLOTS) locked[s.index] = s.isLocked;
      });
      setLockedSlots(locked);
    }
  }, [slots]);

  React.useEffect(() => {
    const up = () => { isDraggingRef.current = false; };
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, []);

  const handleDayChange = (day: number) => {
    setSelectedDay(day);
  };

  const totalLockedHours = React.useMemo(() => {
    const count = lockedSlots.filter(Boolean).length;
    return (count * 10) / 60;
  }, [lockedSlots]);

  const setSlot = (index: number, value: boolean) => {
    setLockedSlots((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSlotMouseDown = (index: number) => {
    if (!canEdit) return;
    const newVal = !lockedSlots[index];
    isDraggingRef.current = true;
    dragValueRef.current = newVal;
    setSlot(index, newVal);
  };

  const handleSlotMouseEnter = (index: number) => {
    if (!isDraggingRef.current || !canEdit) return;
    setSlot(index, dragValueRef.current);
  };

  const applyPreset = (type: "work" | "sleep" | "all" | "clear") => {
    if (!canEdit) return;
    const locked = Array(TOTAL_SLOTS).fill(false);
    if (type === "work") for (let i = 54; i < 108; i++) locked[i] = true;       // 09:00–18:00
    else if (type === "sleep") for (let i = 0; i < 48; i++) locked[i] = true;   // 00:00–08:00
    else if (type === "all") locked.fill(true);
    setLockedSlots(locked);
  };

  const handleSave = () => {
    const payload = lockedSlots.map((isLocked, index) => ({ index, isLocked }));
    updateSlots(
      { data: { day: selectedDay, slots: payload } },
      {
        onSuccess: () => {
          toast({ title: "저장 완료", description: `${DAY_FULL[selectedDay]} 타임슬롯이 저장되었습니다.` });
          refetch();
        },
        onError: () => {
          toast({ title: "저장 실패", description: "저장하지 못했습니다.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="px-4 pt-8 pb-24 md:px-8 flex flex-col gap-5">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">타임슬롯</h1>
          <p className="text-slate-500 text-sm">
            10분 단위로 잠금 구간을 설정하세요. 클릭하거나 드래그해서 여러 칸을 한번에 선택할 수 있어요.
          </p>
        </div>

        {/* Status banner */}
        {!canEdit ? (
          <Card className="p-5 bg-slate-800 text-white border-0 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold">설정이 잠겨있습니다</p>
                <p className="text-slate-300 text-sm">일요일에만 변경할 수 있습니다</p>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm font-medium">다음 설정일까지</span>
              <span className="text-xl font-bold">{serverTime?.daysUntilSunday ?? "-"}일</span>
            </div>
          </Card>
        ) : (
          <Card className="p-5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-indigo-300/30 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <p className="font-bold">
                  {!timeslotsConfigured ? "첫 설정!" : "설정 가능한 날!"}
                </p>
                <p className="text-indigo-100 text-sm">
                  {!timeslotsConfigured
                    ? "타임슬롯을 설정하고 저장하세요. 저장 후엔 일요일에만 변경할 수 있어요."
                    : "클릭하거나 드래그해서 잠금 구간을 설정하세요."}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Day selector */}
        <div className="flex gap-2">
          {DAY_LABELS.map((label, day) => {
            const isToday = day === todayDow;
            const isSelected = day === selectedDay;
            const isWeekend = day === 0 || day === 6;
            return (
              <button
                key={day}
                onClick={() => handleDayChange(day)}
                className={cn(
                  "flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all relative",
                  isSelected
                    ? "bg-primary text-white shadow-md scale-105"
                    : "bg-white/80 text-slate-500 hover:bg-slate-100 border border-slate-200",
                  isWeekend && !isSelected && "text-rose-400"
                )}
              >
                {isToday && (
                  <span
                    className={cn(
                      "absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 rounded-full",
                      isSelected ? "bg-white/30 text-white" : "bg-primary text-white"
                    )}
                  >
                    오늘
                  </span>
                )}
                {label}
              </button>
            );
          })}
        </div>

        {/* Preset buttons */}
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "업무 (09~18)", type: "work" as const },
            { label: "수면 (00~08)", type: "sleep" as const },
            { label: "전체 잠금", type: "all" as const },
            { label: "초기화", type: "clear" as const },
          ].map(({ label, type }) => (
            <Button
              key={type}
              variant="secondary"
              size="sm"
              onClick={() => applyPreset(type)}
              disabled={!canEdit}
              className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs"
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Clickable grid */}
        <Card className="p-4 bg-white/90 shadow-sm select-none">
          {/* Legend + stats */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">
                잠금{" "}
                <span className="text-primary font-bold">{totalLockedHours.toFixed(1)}시간</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm bg-primary" />
                <span className="text-[11px] text-slate-400">잠금</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm bg-slate-100 border border-slate-200" />
                <span className="text-[11px] text-slate-400">자유</span>
              </div>
            </div>
          </div>

          {/* Column header */}
          <div className="flex mb-1 ml-11">
            {[":00", ":10", ":20", ":30", ":40", ":50"].map((t) => (
              <div key={t} className="flex-1 text-center text-[10px] text-slate-400 font-medium">
                {t}
              </div>
            ))}
          </div>

          {/* Rows: one per hour */}
          <div className="space-y-0.5">
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="flex items-center">
                <div className="w-10 text-right text-[11px] font-bold text-slate-400 shrink-0 pr-2 leading-none">
                  {hour.toString().padStart(2, "0")}시
                </div>
                <div className="flex flex-1 gap-0.5">
                  {Array.from({ length: SLOTS_PER_HOUR }, (_, col) => {
                    const index = hour * SLOTS_PER_HOUR + col;
                    const locked = lockedSlots[index];
                    return (
                      <div
                        key={col}
                        className={cn(
                          "flex-1 h-7 rounded-[4px] transition-colors duration-75",
                          locked
                            ? "bg-primary shadow-sm"
                            : "bg-slate-100 border border-slate-200",
                          canEdit
                            ? locked
                              ? "hover:bg-primary/80 cursor-pointer"
                              : "hover:bg-slate-200 cursor-pointer"
                            : "cursor-default"
                        )}
                        onMouseDown={() => handleSlotMouseDown(index)}
                        onMouseEnter={() => handleSlotMouseEnter(index)}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          handleSlotMouseDown(index);
                        }}
                        onTouchMove={(e) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const el = document.elementFromPoint(touch.clientX, touch.clientY);
                          const idxAttr = el?.getAttribute("data-idx");
                          if (idxAttr !== null && idxAttr !== undefined) {
                            handleSlotMouseEnter(Number(idxAttr));
                          }
                        }}
                        data-idx={index}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Save button */}
        {canEdit && (
          <Button
            size="lg"
            className="w-full text-base font-bold shadow-xl shadow-primary/20 rounded-2xl"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "저장 중..." : `${DAY_FULL[selectedDay]} 저장하기`}
          </Button>
        )}
      </div>
    </Layout>
  );
}
