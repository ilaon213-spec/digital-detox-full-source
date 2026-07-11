import * as React from "react";
import { Link, useLocation } from "wouter";
import { Home, Clock, Shield, Trophy, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { path: "/", icon: Home, label: "홈" },
  { path: "/timeslots", icon: Clock, label: "타임슬롯" },
  { path: "/apps", icon: Shield, label: "앱 차단" },
  { path: "/challenge", icon: Trophy, label: "챌린지" },
  { path: "/settings", icon: SettingsIcon, label: "설정" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen bg-slate-100">

      {/* ── Left Sidebar (tablet: icon-only, desktop: icon + label) ── */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 z-30 w-16 lg:w-56 bg-white border-r border-slate-200 shadow-sm">
        {/* Branding */}
        <div className="flex items-center h-16 px-3 lg:px-5 border-b border-slate-100 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="hidden lg:block ml-3 text-sm font-bold text-slate-800 leading-tight">
            디지털<br />디톡스
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-1 p-2 pt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                )}
              >
                <Icon
                  className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn(
                  "hidden lg:block text-sm font-semibold whitespace-nowrap",
                  isActive ? "text-primary" : "text-slate-600"
                )}>
                  {item.label}
                </span>

                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer hint */}
        <div className="p-3 lg:p-5 border-t border-slate-100 hidden lg:block">
          <p className="text-[11px] text-slate-400 font-medium leading-snug">
            일요일에만 설정을<br />변경할 수 있습니다.
          </p>
        </div>
      </aside>

      {/* ── Content Area ── */}
      <div className="flex-1 flex flex-col md:ml-16 lg:ml-56">

        {/* ── Mobile: phone shell + bottom nav ── */}
        <div className="md:hidden flex justify-center min-h-screen bg-slate-100 sm:p-4 overflow-hidden">
          <div className="w-full max-w-md bg-slate-50/50 sm:rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col sm:border border-slate-200">
            <main className="flex-1 overflow-y-auto no-scrollbar pb-24 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="min-h-full"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Bottom nav - mobile only */}
            <nav className="absolute bottom-0 left-0 right-0 glass pb-safe sm:rounded-b-[2.5rem]">
              <div className="flex justify-around items-center h-20 px-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 group"
                    >
                      <div className={cn(
                        "relative z-10 flex flex-col items-center justify-center transition-all duration-300",
                        isActive ? "text-primary scale-110" : "text-slate-400 hover:text-slate-600"
                      )}>
                        <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
                        <span className={cn("text-[10px] font-medium", isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                          {item.label}
                        </span>
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="bottom-nav-indicator"
                          className="absolute inset-0 z-0 flex items-center justify-center"
                        >
                          <div className="w-12 h-12 rounded-full bg-primary/10 blur-md" />
                        </motion.div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>

        {/* ── Tablet / Desktop: full-width content ── */}
        <main className="hidden md:block min-h-screen bg-slate-50/80 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="max-w-5xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
