import * as React from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, ShieldCheck, User, Trophy, Lock } from "lucide-react";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { data: settings, refetch } = useGetSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  const { toast } = useToast();

  const handleSettingChange = (key: string, val: boolean) => {
    updateSettings({ data: { [key]: val } }, {
      onSuccess: () => {
        refetch();
        toast({ title: "설정 저장됨" });
      }
    });
  };

  return (
    <Layout>
      <div className="px-6 pt-10 pb-6 md:px-10 md:pt-12 md:pb-10 flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">설정</h1>
          <p className="text-slate-500 font-medium">앱 환경 및 알림 관리</p>
        </div>

        {/* Profile */}
        <Card className="p-4 flex items-center gap-4 bg-white/80">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-purple-500 rounded-full flex items-center justify-center shadow-inner shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800">{settings?.nickname || "디톡스 유저"}</h3>
            <p className="text-sm text-slate-500 font-medium">앱 권한 상태: <span className="text-emerald-500">정상</span></p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 border-0 hidden md:flex">활성</Badge>
        </Card>

        {/* 2-col layout on md+ */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* Notifications */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-2">알림 설정</h3>
            <Card className="overflow-hidden bg-white/80 p-0">
              {[
                { icon: Bell, label: "전체 푸시 알림", key: "notificationsEnabled", checked: settings?.notificationsEnabled ?? true },
                { icon: Lock, label: "잠금 시작/종료 알림", key: "lockReminderEnabled", checked: settings?.lockReminderEnabled ?? true },
                { icon: Trophy, label: "챌린지 진행 알림", key: "challengeAlertEnabled", checked: settings?.challengeAlertEnabled ?? true },
              ].map((item, i, arr) => (
                <div
                  key={item.key}
                  className={cn(
                    "flex items-center justify-between p-4",
                    i !== arr.length - 1 && "border-b border-slate-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-slate-400" />
                    <span className="font-bold text-slate-700">{item.label}</span>
                  </div>
                  <Switch
                    checked={item.checked}
                    onCheckedChange={(v) => handleSettingChange(item.key, v)}
                  />
                </div>
              ))}
            </Card>
          </div>

          {/* Permissions */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-2">권한 관리</h3>
            <Card className="p-4 bg-white/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="font-bold text-slate-700">접근성 서비스 권한</p>
                  <p className="text-xs text-slate-400 font-medium">앱 차단을 위해 필수적입니다</p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-0">허용됨</Badge>
            </Card>
          </div>
        </div>

      </div>
    </Layout>
  );
}
