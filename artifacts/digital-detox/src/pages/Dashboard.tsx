import * as React from "react";
import { Layout } from "@/components/Layout";
import { Lock, Unlock, Calendar, Flame, Award, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useGetDashboard } from "@workspace/api-client-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();

  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const timeProgressPercent = ((currentHour * 60 + currentMinute) / (24 * 60)) * 100;

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 md:p-10 flex flex-col gap-6 animate-pulse">
          <div className="h-10 w-48 bg-slate-200 rounded-lg"></div>
          <div className="h-40 w-full bg-slate-200 rounded-3xl"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-3xl"></div>)}
          </div>
        </div>
      </Layout>
    );
  }

  const isLocked = dashboard?.isLocked ?? false;
  const currentStreak = dashboard?.currentStreak ?? 0;
  const todayProgress = dashboard?.todayComplianceRate ?? 100;
  const totalDays = dashboard?.totalDays ?? 1;
  const challenge = dashboard?.challenge;
  const timeSlots = dashboard?.timeSlots ?? Array.from({ length: 288 }).map((_, i) => ({ index: i, time: '', isLocked: false }));

  return (
    <Layout>
      <div className="px-6 pt-10 pb-6 md:px-10 md:pt-12 md:pb-10 flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-2">
            디지털 디톡스
          </h1>
          <p className="text-slate-500 font-medium">당신의 온전한 시간을 되찾으세요.</p>
        </div>

        {/* Main grid: 2-col on md+ */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6">

            {/* Current Status Card */}
            <Card className={cn(
              "p-6 border-0 text-white relative overflow-hidden transition-all duration-500",
              isLocked
                ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/25"
                : "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/25"
            )}>
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-white/80 font-medium mb-1">Android 기기 상태</p>
                  <h2 className="text-4xl font-bold tracking-tight mb-2">
                    {isLocked ? "앱 차단 중" : "자유 시간"}
                  </h2>
                  <p className="text-white/90 text-sm">
                    {isLocked ? "태블릿·폰에서 설정된 앱이 차단 중입니다." : "모바일에서 앱 차단이 해제된 시간입니다."}
                  </p>
                </div>
                <div className="bg-white/20 backdrop-blur-md p-5 rounded-3xl shadow-inner">
                  {isLocked
                    ? <Lock className="w-10 h-10 text-white" strokeWidth={2.5} />
                    : <Unlock className="w-10 h-10 text-white" strokeWidth={2.5} />
                  }
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-slate-800">오늘의 타임라인</h3>
                <Link href="/timeslots" className="text-primary text-sm font-medium flex items-center hover:underline">
                  수정 <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
              <div className="space-y-3">
                <div className="relative h-12 bg-emerald-100/50 rounded-xl overflow-hidden flex shadow-inner border border-emerald-200/50">
                  {timeSlots.map((slot, i) => (
                    <div
                      key={i}
                      className={cn("h-full flex-1", slot.isLocked ? "bg-rose-400/90" : "bg-transparent")}
                    />
                  ))}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.8)] z-10 transition-all duration-1000"
                    style={{ left: `${timeProgressPercent}%` }}
                  >
                    <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-indigo-600 rounded-full border-2 border-white shadow-sm"></div>
                    <div className="absolute -bottom-1 -left-1.5 w-3.5 h-3.5 bg-indigo-600 rounded-full border-2 border-white shadow-sm"></div>
                  </div>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-400 px-1">
                  <span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>24시</span>
                </div>
              </div>
            </Card>

            {/* Warning */}
            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 flex gap-3 shadow-sm">
              <div className="bg-rose-100 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                <span className="text-rose-600 text-sm">⚠️</span>
              </div>
              <p className="text-sm font-medium text-rose-800 leading-snug">
                <strong>앱 삭제 시</strong> 참가 중인 챌린지 보증금이 즉시 몰수되며 복구할 수 없습니다.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-6">

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mb-3 text-orange-500">
                  <Flame className="w-6 h-6" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{currentStreak}</p>
                <p className="text-xs font-medium text-slate-500 mt-1">일 연속</p>
              </Card>
              <Card className="p-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-3 text-emerald-500">
                  <Award className="w-6 h-6" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{todayProgress}%</p>
                <p className="text-xs font-medium text-slate-500 mt-1">오늘 준수율</p>
              </Card>
              <Card className="p-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-3 text-indigo-500">
                  <Calendar className="w-6 h-6" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{totalDays}</p>
                <p className="text-xs font-medium text-slate-500 mt-1">총 달성일</p>
              </Card>
            </div>

            {/* Challenge Info */}
            <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-200/60">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-amber-900 mb-1">
                    {challenge?.tierName || "진행 중인 챌린지 없음"}
                  </h3>
                  <p className="text-sm font-medium text-amber-700/80">30일 디지털 디톡스 챌린지</p>
                </div>
                <Badge variant="outline" className={cn(
                  "border-amber-300 font-bold",
                  challenge?.isActive ? "bg-amber-500 text-white border-transparent shadow-sm" : "text-amber-600 bg-amber-100"
                )}>
                  {challenge?.isActive ? "진행중" : "대기중"}
                </Badge>
              </div>
              <div className="space-y-3 bg-white/60 p-4 rounded-2xl border border-amber-100 backdrop-blur-sm">
                <div className="flex justify-between text-sm font-bold text-amber-900">
                  <span>진행률</span>
                  <span>{challenge?.currentDay || 0} / {challenge?.totalDays || 30}일</span>
                </div>
                <Progress value={((challenge?.currentDay || 0) / (challenge?.totalDays || 30)) * 100} indicatorClassName="bg-amber-500" />
                <div className="pt-4 mt-2 border-t border-amber-200/50 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-amber-700/60 uppercase tracking-wider block mb-1">내 보증금</span>
                    <p className="text-lg font-bold text-amber-900">₩{(challenge?.depositAmount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-amber-700/60 uppercase tracking-wider block mb-1">생존자</span>
                    <p className="text-lg font-bold text-emerald-600">
                      {challenge?.currentSurvivors || 0}
                      <span className="text-sm text-slate-400 font-medium"> / {challenge?.totalParticipants || 0}명</span>
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
