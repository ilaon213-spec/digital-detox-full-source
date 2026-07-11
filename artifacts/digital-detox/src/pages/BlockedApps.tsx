import * as React from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useGetBlockedApps, useUpdateBlockedApps, useGetServerTime } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["소셜", "엔터테인먼트", "게임", "기타"];

export default function BlockedApps() {
  const { data: serverTime } = useGetServerTime();
  const { data: apps, refetch } = useGetBlockedApps();
  const { mutate: updateApps, isPending } = useUpdateBlockedApps();
  const { toast } = useToast();

  const isSunday = serverTime?.isSunday ?? false;
  const [localApps, setLocalApps] = React.useState<Record<number, boolean>>({});

  React.useEffect(() => {
    if (apps) {
      const state: Record<number, boolean> = {};
      apps.forEach(a => { state[a.id] = a.blocked; });
      setLocalApps(state);
    }
  }, [apps]);

  const toggleApp = (id: number) => {
    if (!isSunday) return;
    setLocalApps(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    const payload = Object.entries(localApps).map(([id, blocked]) => ({ id: Number(id), blocked }));
    updateApps({ data: { apps: payload } }, {
      onSuccess: () => { toast({ title: "저장 완료", description: "앱 차단 설정이 업데이트되었습니다." }); refetch(); },
      onError: () => { toast({ title: "저장 실패", description: "저장 권한이 없거나 오류가 발생했습니다.", variant: "destructive" }); }
    });
  };

  const appsByCategory = CATEGORIES.map(cat => ({
    category: cat,
    items: apps?.filter(a => a.category === cat) || []
  })).filter(g => g.items.length > 0);

  const blockedCount = Object.values(localApps).filter(Boolean).length;

  return (
    <Layout>
      <div className="px-6 pt-10 pb-6 md:px-10 md:pt-12 md:pb-10 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">Android 앱 차단 관리</h1>
            <p className="text-slate-500 font-medium">잠금 시간에 Android 기기에서 차단할 앱을 선택합니다. PC에는 영향 없음.</p>
          </div>
          {/* Blocked count badge */}
          <div className="hidden md:flex flex-col items-center bg-primary/10 rounded-2xl px-5 py-3 shrink-0">
            <span className="text-2xl font-bold text-primary">{blockedCount}</span>
            <span className="text-xs font-medium text-primary/80">차단 중</span>
          </div>
        </div>

        {!isSunday && (
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex gap-4 items-center">
            <ShieldAlert className="text-slate-400 w-8 h-8 shrink-0" />
            <p className="text-sm font-medium text-slate-600">설정이 잠겨있습니다. 일요일에만 차단 목록을 변경할 수 있습니다.</p>
          </div>
        )}

        {/* App categories grid: 1-col mobile, 2-col md+ */}
        <div className="grid gap-6 md:grid-cols-2">
          {appsByCategory.map((group) => (
            <div key={group.category} className="space-y-3">
              <div className="flex items-center justify-between ml-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{group.category}</h3>
                <span className="text-xs text-slate-400 font-medium">
                  {group.items.filter(a => localApps[a.id]).length}/{group.items.length} 차단
                </span>
              </div>
              <Card className="overflow-hidden bg-white/80 p-0">
                {group.items.map((app, index) => (
                  <div
                    key={app.id}
                    className={cn(
                      "flex items-center justify-between p-4 transition-colors",
                      index !== group.items.length - 1 && "border-b border-slate-100",
                      localApps[app.id] && "bg-rose-50/40",
                      isSunday && "cursor-pointer hover:bg-slate-50"
                    )}
                    onClick={() => toggleApp(app.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                        localApps[app.id] ? "bg-rose-100 text-rose-400" : "bg-slate-100 text-slate-400"
                      )}>
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-base md:text-lg">{app.name}</p>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">최근 사용: {app.usageMinutes}분</p>
                      </div>
                    </div>
                    <Switch
                      checked={localApps[app.id] ?? false}
                      onCheckedChange={() => toggleApp(app.id)}
                      disabled={!isSunday}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>

        {isSunday && (
          <Button
            size="lg"
            className="w-full md:max-w-sm md:self-end text-lg font-bold shadow-xl shadow-primary/20 rounded-2xl"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "저장 중..." : "설정 저장하기"}
          </Button>
        )}
      </div>
    </Layout>
  );
}
