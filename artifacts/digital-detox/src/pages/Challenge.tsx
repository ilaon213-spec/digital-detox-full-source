import * as React from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, ArrowRight, ShieldCheck, Users, Coins, Clock } from "lucide-react";
import { useGetChallenge, useJoinChallenge, useGetServerTime } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

type ChallengeEvent = {
  id: number;
  type: "joined" | "quit" | "eliminated";
  nickname: string;
  tier: string;
  tierName: string;
  createdAt: string;
};

function eventMessage(evt: ChallengeEvent): string {
  const tier = evt.tierName || evt.tier;
  if (evt.type === "joined") return `${evt.nickname}님이 ${tier} 챌린지에 참가했습니다`;
  if (evt.type === "quit") return `${evt.nickname}님이 챌린지를 포기했습니다`;
  return `${evt.nickname}님이 ${tier} 챌린지에서 탈락했습니다`;
}

const TIER_MAX: Record<string, number> = {
  beginner: 10,
  motivated: 8,
  focused: 4,
  hardcore: 1,
};

export default function Challenge() {
  const { data: challenge, refetch } = useGetChallenge();
  const { data: serverTime } = useGetServerTime();
  const { mutate: joinChallenge, isPending } = useJoinChallenge();
  const { toast } = useToast();

  const isSunday = serverTime?.isSunday ?? false;
  const isActive = challenge?.isActive;

  // 시간 설정 모달 상태
  const [pendingTier, setPendingTier] = React.useState<"beginner" | "motivated" | "focused" | "hardcore" | null>(null);
  const [selectedHours, setSelectedHours] = React.useState(10);

  // SSE — 실시간 참가자 알림
  React.useEffect(() => {
    const source = new EventSource("/api/challenge/events");

    source.onmessage = (e) => {
      try {
        const evt: ChallengeEvent = JSON.parse(e.data);
        toast({ title: eventMessage(evt), duration: 4000 });
      } catch {
        // ping 프레임 무시
      }
    };

    return () => { source.close(); };
  }, []);

  // 티어 카드 클릭 → 모달 오픈
  const openJoinModal = (tier: "beginner" | "motivated" | "focused" | "hardcore") => {
    if (!isSunday) {
      toast({ title: "참여 불가", description: "챌린지 참여는 일요일에만 가능합니다.", variant: "destructive" });
      return;
    }
    const max = TIER_MAX[tier] ?? 10;
    setSelectedHours(max);
    setPendingTier(tier);
  };

  // 모달 확인 → 실제 참여
  const handleJoin = () => {
    if (!pendingTier) return;
    joinChallenge(
      { data: { tier: pendingTier, dailyLimitHours: selectedHours } },
      {
        onSuccess: () => {
          toast({ title: "참여 완료!", description: `하루 ${selectedHours}시간 제한으로 30일 챌린지가 시작되었습니다.` });
          refetch();
          setPendingTier(null);
        },
        onError: () => {
          toast({ title: "오류 발생", description: "참여에 실패했습니다.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="relative">
        {/* Hero gradient */}
        <div className="absolute top-0 left-0 w-full h-72 md:h-56 bg-gradient-to-b from-indigo-900 via-purple-900 to-transparent -z-10 overflow-hidden">
          <img
            src={`${import.meta.env.BASE_URL}images/challenge-hero.png`}
            alt="Hero background"
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background"></div>
        </div>

        <div className="px-6 pt-16 pb-6 md:px-10 md:pt-14 md:pb-10 flex flex-col gap-6">

          {/* Hero header */}
          <div className="text-center md:text-left md:flex md:items-center md:gap-6 mb-2">
            <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-xl rounded-full mb-4 md:mb-0 ring-1 ring-white/20 shadow-2xl shrink-0">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2 tracking-tight drop-shadow-sm">30일 챌린지</h1>
              <p className="text-slate-600 font-medium max-w-xs mx-auto md:mx-0 leading-relaxed">
                보증금을 걸고 30일 동안 디지털 디톡스를 완수하여 상금을 획득하세요.
              </p>
            </div>
          </div>

          {isActive ? (
            <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Active card */}
              <Card className="p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-xl shadow-orange-500/20">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <Badge className="bg-white/20 hover:bg-white/20 text-white border-0 mb-2 shadow-none">
                      {challenge.tierName}
                    </Badge>
                    <h2 className="text-3xl font-bold">₩{challenge.depositAmount?.toLocaleString()}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-white/80 text-sm font-medium mb-1">상금 풀 예측</p>
                    <p className="text-2xl font-bold text-yellow-300">+₩{challenge.potentialReward?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm font-bold">
                    <span>Day {challenge.currentDay}</span>
                    <span>{challenge.totalDays} Days</span>
                  </div>
                  <Progress
                    value={((challenge.currentDay || 0) / (challenge.totalDays || 30)) * 100}
                    className="bg-white/20 h-3"
                    indicatorClassName="bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-white/70" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-white/70">생존자</p>
                      <p className="font-bold text-lg">{challenge.currentSurvivors} <span className="text-sm font-normal opacity-70">/ {challenge.totalParticipants}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Coins className="w-8 h-8 text-white/70" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-white/70">누적 상금</p>
                      <p className="font-bold text-lg">{(challenge.totalPool || 0) / 10000}만</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Warning card */}
              <Card className="p-5 border-rose-200 bg-rose-50/50 self-start">
                <h3 className="font-bold text-rose-800 flex items-center mb-3">
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  탈락 주의사항
                </h3>
                <ul className="text-sm text-rose-700/80 space-y-2 ml-7 list-disc font-medium">
                  <li>잠금 시간에 차단된 앱 1분 이상 실행</li>
                  <li>디지털 디톡스 앱 삭제</li>
                  <li>기기 시간 조작 감지</li>
                </ul>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {!isSunday && (
                <div className="text-center p-3 bg-slate-200/50 rounded-xl text-slate-500 font-bold text-sm">
                  챌린지 참가는 일요일에만 열립니다.
                </div>
              )}

              {/* Tier cards: 2-col mobile, 4-col lg */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {/* Beginner */}
                <Card className="p-5 relative overflow-hidden group hover:border-primary/50 transition-colors flex flex-col">
                  <Badge variant="secondary" className="w-fit mb-3 bg-slate-100 text-slate-600 text-[11px]">입문자</Badge>
                  <h3 className="text-xl font-bold mb-1">₩5,000</h3>
                  <p className="text-slate-500 text-xs mb-3 font-medium flex-1 leading-relaxed">가볍게 시작하는 라이트 유저용</p>
                  <p className="text-[11px] text-slate-400 mb-4 font-medium">수수료 <span className="text-rose-500 font-bold">30%</span> · 상금 분배 70%</p>
                  <p className="text-[11px] text-slate-400 mb-3 font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> 최대 <b>10시간</b>/일</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border-slate-200 text-slate-600 hover:text-primary hover:border-primary/50"
                    onClick={() => openJoinModal("beginner")}
                    disabled={!isSunday || isPending}
                  >
                    참여하기 <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Card>

                {/* Motivated — ₩10,000 */}
                <Card className="p-5 relative overflow-hidden group hover:border-teal-400/50 transition-colors flex flex-col">
                  <Badge variant="secondary" className="w-fit mb-3 bg-teal-50 text-teal-700 text-[11px]">실천자</Badge>
                  <h3 className="text-xl font-bold mb-1 text-teal-600">₩10,000</h3>
                  <p className="text-slate-500 text-xs mb-3 font-medium flex-1 leading-relaxed">의지를 다지며 실천하는 유저용</p>
                  <p className="text-[11px] text-slate-400 mb-4 font-medium">수수료 <span className="text-orange-500 font-bold">25%</span> · 상금 분배 75%</p>
                  <p className="text-[11px] text-slate-400 mb-3 font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> 최대 <b>8시간</b>/일</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border-teal-200 text-teal-600 hover:text-teal-700 hover:border-teal-400"
                    onClick={() => openJoinModal("motivated")}
                    disabled={!isSunday || isPending}
                  >
                    참여하기 <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Card>

                {/* Focused - recommended */}
                <Card className="p-5 relative overflow-hidden border-primary/40 bg-gradient-to-b from-white to-primary/5 shadow-lg shadow-primary/10 flex flex-col">
                  <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-bold px-2 py-1 rounded-bl-xl">추천</div>
                  <Badge className="w-fit mb-3 bg-primary/20 text-primary hover:bg-primary/20 shadow-none border-0 text-[11px]">집중자</Badge>
                  <h3 className="text-xl font-bold mb-1 text-primary">₩50,000</h3>
                  <p className="text-slate-600 text-xs mb-3 font-medium flex-1 leading-relaxed">가장 많은 사람들이 참여하는 표준 티어</p>
                  <p className="text-[11px] text-slate-400 mb-4 font-medium">수수료 <span className="text-primary font-bold">15%</span> · 상금 분배 85%</p>
                  <p className="text-[11px] text-slate-400 mb-3 font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> 최대 <b>4시간</b>/일</p>
                  <Button
                    size="sm"
                    className="w-full rounded-xl shadow-lg shadow-primary/20"
                    onClick={() => openJoinModal("focused")}
                    disabled={!isSunday || isPending}
                  >
                    참여하기 <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Card>

                {/* Hardcore */}
                <Card className="p-5 relative overflow-hidden bg-slate-900 text-white border-0 shadow-xl flex flex-col">
                  <Badge className="w-fit mb-3 bg-white/10 text-white hover:bg-white/10 shadow-none border-0 text-[11px]">독종</Badge>
                  <h3 className="text-xl font-bold mb-1">₩100,000</h3>
                  <p className="text-slate-400 text-xs mb-3 font-medium flex-1 leading-relaxed">고시생, 전문직 준비생을 위한 극한의 환경</p>
                  <p className="text-[11px] text-slate-500 mb-4 font-medium">수수료 <span className="text-green-400 font-bold">5%</span> · 상금 분배 95%</p>
                  <p className="text-[11px] text-slate-500 mb-3 font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> 최대 <b className="text-green-400">1시간</b>/일</p>
                  <Button
                    size="sm"
                    className="w-full rounded-xl bg-white text-slate-900 hover:bg-slate-100"
                    onClick={() => openJoinModal("hardcore")}
                    disabled={!isSunday || isPending}
                  >
                    참여하기 <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하루 사용 시간 설정 모달 */}
      <Dialog open={!!pendingTier} onOpenChange={(open) => { if (!open) setPendingTier(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              하루 사용 시간 설정
            </DialogTitle>
            <DialogDescription>
              챌린지 기간 동안 하루에 스마트폰을 최대 몇 시간 사용할지 설정하세요.
              {pendingTier && (
                <span className="block mt-1 text-xs text-amber-600 font-medium">
                  {/* 티어별 상한 안내 */}
                  이 티어의 최대 허용 시간은{" "}
                  <b>{TIER_MAX[pendingTier]}시간</b>입니다.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            <div className="text-center">
              <span className="text-5xl font-black text-primary">{selectedHours}</span>
              <span className="text-xl font-semibold text-slate-500 ml-1">시간</span>
              <p className="text-xs text-slate-400 mt-1">= 하루 {selectedHours * 60}분</p>
            </div>
            <Slider
              min={1}
              max={pendingTier ? TIER_MAX[pendingTier] : 10}
              step={1}
              value={[selectedHours]}
              onValueChange={([v]) => setSelectedHours(v)}
              className="w-full"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>최소 1시간</span>
              <span>최대 {pendingTier ? TIER_MAX[pendingTier] : 10}시간</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingTier(null)} className="flex-1">
              취소
            </Button>
            <Button onClick={handleJoin} disabled={isPending} className="flex-1">
              {isPending ? "처리 중..." : "챌린지 참여"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
