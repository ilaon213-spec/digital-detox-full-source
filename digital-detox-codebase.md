# 디지털 디톡스 앱 — 전체 코드베이스 & 기능 정리

> 최종 갱신: 2026-07-05 (요일 탭 데이터 격리 리팩토링, Android 네이티브 차단 서비스 반영)

## 프로젝트 개요

React Native(Expo) Android 앱 + Express API 서버 + React Vite 웹 관리화면으로 구성된 디지털 디톡스 앱.
10분 단위 타임슬롯으로 특정 시간대에 앱을 차단하고, **일요일에만** 타임슬롯/차단앱 설정을 변경할 수 있다.
Android에서는 접근성 서비스(Accessibility Service) + VPN 싱크홀을 이용해 실제로 앱 실행/네트워크를 차단한다.

- **프로덕션 API**: `https://digital-detox-flow.replit.app`
- **Android 패키지명**: `com.replit.detox`
- **모노레포**: pnpm workspaces

```text
artifacts/
├── api-server/         # Express 5 + Drizzle ORM (PostgreSQL)
├── digital-detox/      # React + Vite 웹 관리화면
├── detox-mobile/       # Expo React Native (Android APK) — 실제 차단 담당
└── mockup-sandbox/     # 컴포넌트 프리뷰용 (제품 기능 아님, 디자인 도구)

lib/
├── db/                 # 공유 DB 스키마 + 커넥션 (@workspace/db)
├── api-spec/           # OpenAPI 스펙 + Orval codegen 설정
├── api-client-react/   # OpenAPI에서 생성된 React Query 훅 (@workspace/api-client-react)
└── api-zod/            # OpenAPI에서 생성된 Zod 스키마 (@workspace/api-zod)
```

---

## 1. DB 스키마 (`lib/db/src/schema/`)

### timeslots.ts — `time_slots`
```ts
export const timeSlotsTable = pgTable("time_slots", {
  id: serial("id").primaryKey(),
  index: integer("index").notNull(),                       // 0~143 (10분 단위, 하루 144개)
  dayOfWeek: integer("day_of_week").notNull().default(0),  // 0=일, 1=월 ... 6=토
  time: text("time").notNull(),                             // "HH:MM"
  isLocked: boolean("is_locked").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```
요일(7) × 슬롯(144) = 최대 1,008행. 최초 조회 시 누락된 요일의 슬롯을 자동 생성한다.

### settings.ts — `settings`
```ts
export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").default("디톡서"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  lockReminderEnabled: boolean("lock_reminder_enabled").notNull().default(true),
  challengeAlertEnabled: boolean("challenge_alert_enabled").notNull().default(true),
  pushPermissionGranted: boolean("push_permission_granted").notNull().default(false),
  deviceType: text("device_type").default("web"),
  timeslotsConfigured: boolean("timeslots_configured").notNull().default(false), // 최초 저장 후 true
  appsConfigured: boolean("apps_configured").notNull().default(false),
});
```
싱글턴 테이블 (항상 1행만 존재).

### challenges.ts — `challenges`, `challenge_events`
```ts
export const challengesTable = pgTable("challenges", {
  id: serial("id").primaryKey(),
  tier: text("tier").notNull(),                 // beginner | motivated | focused | hardcore
  tierName: text("tier_name").notNull(),
  depositAmount: integer("deposit_amount").notNull(),
  totalDays: integer("total_days").notNull().default(30),
  successDays: integer("success_days").notNull().default(0),
  failedDays: integer("failed_days").notNull().default(0),
  totalParticipants: integer("total_participants").notNull().default(0),
  currentSurvivors: integer("current_survivors").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  lastHeartbeat: timestamp("last_heartbeat").defaultNow(),
  lastEvaluatedDate: text("last_evaluated_date"),   // "YYYY-MM-DD" (하루 1회 판정 보장)
  eliminatedReason: text("eliminated_reason"),      // "failed_days" | "app_deleted" | "quit" | null
  dailyLimitHours: integer("daily_limit_hours").notNull().default(10),
});

export const challengeEventsTable = pgTable("challenge_events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),   // "joined" | "quit" | "eliminated"
  nickname: text("nickname").notNull(),
  tier: text("tier").notNull(),
  tierName: text("tier_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### apps.ts — `apps`
```ts
export const appsTable = pgTable("apps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  blocked: boolean("blocked").notNull().default(false),
  packageName: text("package_name"),
  usageMinutes: integer("usage_minutes").notNull().default(0),
});
```

### focus_sessions.ts — `focus_sessions`
```ts
export const focusSessionsTable = pgTable("focus_sessions", {
  id: serial("id").primaryKey(),
  durationMinutes: integer("duration_minutes").notNull(),
  completedMinutes: integer("completed_minutes").notNull().default(0),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  isCompleted: boolean("is_completed").notNull().default(false),
});
```
포모도로 스타일 집중 타이머 기록.

### usage_stats.ts — `usage_stats`
```ts
export const usageStatsTable = pgTable("usage_stats", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),                 // "YYYY-MM-DD"
  totalMinutes: integer("total_minutes").notNull().default(0),
  byApp: jsonb("by_app").$type<Array<{ appName: string; minutes: number }>>().default([]),
  recordedAt: timestamp("recorded_at").defaultNow(),
});
```
날짜별 스크린타임 통계(앱별 사용시간 포함), 날짜 기준으로 upsert.

---

## 2. API 서버 (`artifacts/api-server/src/`)

Express 5 + CORS + JSON 미들웨어, 모든 라우트는 `/api` prefix.

### utils/kst.ts — KST(UTC+9) 처리
서버가 UTC 환경에서 실행되므로 `Date.now() + 9*60*60*1000`으로 KST 변환. `getDayOfWeekKST()`, `isSundayKST()` 제공.

### routes/timeslots.ts
- `GET /api/timeslots?day=0~6` — 해당 요일의 144개 슬롯 반환. 누락 시 기본값(평일: 수면+업무 잠금, 주말: 수면만 잠금) 자동 생성.
- `PUT /api/timeslots` — `{ day, slots: [{index, isLocked}] }`.
  - `settings.timeslotsConfigured === true && !isSunday` → **403** `settings_locked`
  - 최초(미설정) 상태에서 일요일에 저장하면 `timeslotsConfigured = true`로 전환, 이후부터 일요일 잠금 적용

### routes/settings.ts
- `GET/PUT /api/settings` — 싱글턴 설정 조회/갱신 (없으면 기본값으로 자동 생성)

### routes/blocked-apps.ts
- `GET /api/blocked-apps` — 목록 조회
- `POST /api/blocked-apps` — 앱 추가 (패키지명 중복 시 `blocked=true`로 갱신)
- `PUT /api/blocked-apps` — 차단 상태 일괄 변경, `appsConfigured` 이후엔 일요일만 가능 (timeslots와 동일한 잠금 패턴)
- `DELETE /api/blocked-apps/:id`

### routes/dashboard.ts
- `GET /api/dashboard` — 홈 화면 통합 데이터
  ```ts
  {
    isLocked: boolean, todayDow: number,
    currentStreak: number, todayComplianceRate: number, totalDays: number,
    challenge: { id, tier, tierName, depositAmount, currentDay, totalDays,
                 successDays, failedDays, totalParticipants, currentSurvivors,
                 totalPool, potentialReward, isActive, startDate } | null,
    timeSlots: [{ index, time, isLocked }],   // 오늘 144개
    todayFocusMinutes: number, weeklyFocusMinutes: number[],
  }
  ```
  - 오늘 슬롯 누락 시 자동 생성, `compliance = round(lockedCount/144 * 100)`
  - 매 호출 시 앱 삭제 감지(`checkAppDeletionAndEliminateIfNeeded`) 실행

### routes/challenge.ts — 챌린지 핵심 로직
```ts
const TIER_CONFIG = {
  beginner:  { name: "입문자", amount: 5000,   feeRate: 0.30, maxDailyHours: 10 },
  motivated: { name: "실천자", amount: 10000,  feeRate: 0.25, maxDailyHours: 8  },
  focused:   { name: "집중자", amount: 50000,  feeRate: 0.15, maxDailyHours: 4  },
  hardcore:  { name: "독종",   amount: 100000, feeRate: 0.05, maxDailyHours: 1  },
};
```
- `GET /challenge` — 현재 챌린지 상태
- `POST /challenge` — 참가 (`{ tier, dailyLimitHours? }`), 일요일에만 허용
- `POST /challenge/quit` — 포기 → `isActive=false, eliminatedReason="quit"`
- `POST /challenge/heartbeat` — `{ compliant? }`, 하루 1회만 판정 (`lastEvaluatedDate` 체크)
  - `compliant: false` → `failedDays++`
  - `failedDays >= 3(MAX_FAILURES)` → 탈락 (`isActive=false, eliminatedReason="failed_days"`)
- **앱 삭제(우회) 감지**: 마지막 heartbeat가 4시간 이상 지났고, 그 사이 현재 시각이 잠금 슬롯에 걸쳐 있고, 날짜가 바뀌었다면 "앱을 지우고 도망갔다"고 판단 → 실패 1일 처리, 필요 시 탈락(`eliminatedReason="app_deleted"`)
- `GET /challenge/events` — SSE 실시간 스트림 (웹)
- `GET /challenge/events/recent` — 폴링 방식 (모바일, 5초 간격)
- `GET /challenge/stats` — 티어별 전체 통계
- 보상 계산: `reward = survivors * deposit * (1 - feeRate) / survivors`

### routes/focus-timer.ts
- `GET /focus-timer` — 세션 목록
- `POST /focus-timer` — `{ durationMinutes }` 시작
- `POST /focus-timer/:sessionId/complete` — 완료 처리(`isCompleted=true`, `completedMinutes=durationMinutes`)

### routes/usage-stats.ts
- `GET /usage-stats` — 오늘자 통계 조회
- `POST /usage-stats` — `{ totalMinutes, byApp: [{packageName, appName, usageMinutes}] }` 오늘 날짜로 upsert

### routes/server-time.ts
- `GET /server-time` → `{ timestamp, isSunday, dayOfWeek, daysUntilSunday }` — 클라이언트가 서버 기준 시간을 신뢰하도록(로컬 시간 조작 방지) 사용

### routes/health.ts
- `GET /health` — 헬스체크

---

## 3. 모바일 앱 (`artifacts/detox-mobile/`)

Expo Router 기반, 탭 구조: `app/(tabs)/{index,timeslots,blocked-apps,challenge,settings}.tsx`

### 3-1. 타임슬롯 화면 — 요일 탭 데이터 격리 구조 (최근 리팩토링)

기존엔 화면 하나가 `selectedDay` state로 모든 요일을 관리했으나, **요일 전환 시 데이터가 섞이거나 초기화되는 버그**를 구조적으로 차단하기 위해 컴포넌트를 분리했다.

```
app/(tabs)/timeslots.tsx
 ├─ DayTabBar (components/timeslots/DayTabBar.tsx)
 │    선택된 요일 표시만 담당. 탭 클릭 시 부모의 selectedDay를 갱신.
 └─ <DaySlotConfig key={selectedDay} day={selectedDay} .../>  (components/timeslots/DaySlotConfig.tsx)
      요일이 바뀌면 key가 바뀌어 컴포넌트가 완전히 언마운트→새로 마운트됨.
      → 이전 요일의 로컬 state(lockedSlots, hasUnsavedChanges 등)가 절대 다음 요일로 새지 않음.
      → 요일별로 독립적인 useGetTimeSlots({ day }) 호출 & 렌더링.
```

**DaySlotConfig.tsx 핵심 로직**
- `TOTAL_SLOTS = 144` (`constants/timeSlots.ts`: `DAY_LABELS`, `DAY_FULL`, `SLOTS_PER_HOUR=6` 등 공통 상수)
- `useGetTimeSlots({ day }, { staleTime: 5*60*1000, refetchOnWindowFocus: false })`
- `hasUnsavedChanges` ref — 드래그로 슬롯 변경 시 `true`, 저장 성공 시 `false`. 서버 refetch가 들어와도 `hasUnsavedChanges.current === true`면 로컬 상태를 덮어쓰지 않음 (드래그 중 화면 깜빡임/유실 방지)
- `PanResponder` 기반 드래그로 여러 슬롯 동시 잠금/해제
- 저장 시 `PUT /api/timeslots`, 성공하면 응답 데이터로 `queryClient.setQueryData` 직접 갱신 + 알림
- 편집 가능 여부: `canEdit = !timeslotsConfigured || isSunday` — 최초 설정 전엔 언제든, 이후엔 일요일만

**DayTabBar.tsx**
- 일~토 7개 탭, 오늘 요일에 점(dot) 표시, 주말은 빨간색 라벨
- 탭 선택 시 `Haptics.selectionAsync()` 햅틱 피드백

### 3-2. NativeSyncProvider — 서버 ↔ Android 네이티브 동기화
```ts
const SYNC_REFETCH_INTERVAL = 30_000; // 30초
```
- `useGetDashboard`, `useGetBlockedApps`를 30초 간격 폴링 (백그라운드에서는 폴링 중단, 실패 시 최대 30초까지 지수 백오프 재시도)
- 데이터 변경 시 `syncToNative()` 호출 → 오늘 잠긴 슬롯 인덱스, 차단 앱 패키지명, 잠금 여부를 Android `SharedPreferences`에 기록
- `syncDaySlots(todayDow, lockedSlotIndices)` — 요일별 키(`locked_slots_dow_N`)에도 저장해 접근성 서비스가 요일 불일치 없이 정확히 차단 판단 가능하게 함
- 앱 최초 실행 2.5초 후 접근성 서비스 비활성 상태면 활성화 안내 다이얼로그 표시 → "지금 설정하기" 클릭 시 `Linking.sendIntent("android.settings.ACCESSIBILITY_SETTINGS")`

### 3-3. LockScreenOverlay — 잠금 화면
- `useGetDashboard()`의 `isLocked`가 true면 전체화면 `Modal` 표시 (다른 화면 조작 불가)
- 10초마다 시계 갱신 + 서버 refetch, 앱이 백그라운드→포그라운드 전환 시에도 즉시 refetch
- 잠금 해제 예정 시각을 KST 기준으로 직접 계산해 표시 (`내일 해제 예정` 포함)
- 하단에 긴급전화 버튼(`tel:`)만 노출 — 잠금 중 유일한 탈출구

### 3-4. 그 외 탭 화면
- `index.tsx` (홈) — 잠금 상태, 오늘 준수율, 연속 달성일, 챌린지 요약, 일요일까지 D-N
- `blocked-apps.tsx` — 접근성 서비스 상태, VPN 토글, 기기 설치 앱 스캔, 앱 추가/삭제/차단 (일요일 잠금)
- `challenge.tsx` — 4개 티어 참가, 실시간 이벤트 폴링(5초)
- `settings.tsx` — 접근성 서비스 상태, 잠금/차단 현황, 알림 설정

---

## 4. Android 네이티브 (`artifacts/detox-mobile/native-src/android/`, `plugins/`)

Expo config plugin으로 `expo prebuild` 시 네이티브 프로젝트에 파일을 주입하는 구조 (네이티브 코드가 저장소에 있고, 빌드 시점에 `android/`로 복사됨).

### native-src/android/kotlin/

| 파일 | 역할 |
|---|---|
| `DetoxAccessibilityService.kt` | 접근성 서비스. `TYPE_WINDOW_STATE_CHANGED` 이벤트로 포그라운드 앱 감지 → 차단 목록에 있고 + 현재가 잠금 슬롯이면 자체 잠금화면 액티비티(또는 홈 화면)로 전환시켜 차단. 패키지 설치관리자(Play 스토어 등) 실행 시도 감지 → "챌린지 중 삭제 시 예치금 손실" 경고 알림 발송(삭제 방지 넛지) |
| `DetoxSyncModule.kt` | RN ↔ 네이티브 브리지(`DetoxSync`). 메서드: `syncConfig`, `syncDaySlots`, `startVpn`, `stopVpn`, `getVpnStatus`, `getInstalledApps`, `getDeviceDaySlots`, `getBlockStatus`. `detox_prefs`(SharedPreferences)에 `locked_slots_dow_N`, `locked_slots_today`, `blocked_apps`, `is_locked`, `vpn_enabled` 저장 |
| `DetoxVpnService.kt` | VPN 싱크홀 방식 네트워크 차단. 차단 대상 앱만 `addAllowedApplication(pkg)`으로 VPN 인터페이스에 태워 인터넷을 끊음 (다른 앱은 영향 없음) |
| `DetoxPackage.kt` | `DetoxSyncModule`을 RN 패키지로 등록 |
| `DetoxBootReceiver.kt` | 기기 재부팅 시 서비스 복구 트리거 |
| `xml/accessibility_service_config.xml` | 접근성 서비스 권한/이벤트 범위 정의 |

### plugins/withAccessibilityService.js (Expo config plugin)
- `AndroidManifest.xml`에 주입:
  - `FOREGROUND_SERVICE_SPECIAL_USE` 권한 (Android 14+ VPN 포그라운드 서비스용)
  - `.DetoxAccessibilityService` (`BIND_ACCESSIBILITY_SERVICE` 권한 + XML config 연결)
  - `.DetoxVpnService` (`BIND_VPN_SERVICE`, `foregroundServiceType="specialUse"`)
  - `.DetoxBootReceiver` (`BOOT_COMPLETED`, `QUICKBOOT_POWERON` 인텐트 필터)
- `native-src/android/kotlin/*`, `xml/*` 파일을 생성된 `android/` 디렉토리로 복사
- `MainApplication.kt`를 패치해 패키지 목록에 `DetoxPackage()` 추가

### app.json / eas.json
- 패키지명: `com.replit.detox` (iOS/Android 동일)
- 권한: `RECEIVE_BOOT_COMPLETED`, `FOREGROUND_SERVICE`
- EAS 빌드 프로필:
  - `development` — `developmentClient` 사용
  - `preview` — `internal` 배포, `EXPO_PUBLIC_DOMAIN=digital-detox-flow.replit.app`, `:app:assembleRelease`
  - `production` — 버전 자동 증가, 동일 도메인 사용

---

## 5. 웹 관리화면 (`artifacts/digital-detox/src/`)

React + Vite, 라우팅은 `wouter`, 데이터 페칭은 `@workspace/api-client-react` (React Query).

### App.tsx — 라우트
```
/           → Dashboard
/timeslots  → TimeSlots
/apps       → BlockedApps
/challenge  → Challenge
/settings   → Settings
그 외        → NotFound
```

### Layout.tsx — 내비게이션
- 데스크톱: 좌측 고정 사이드바 (태블릿은 아이콘만, 데스크톱(LG)은 아이콘+라벨)
- 모바일: 하단 글래스 효과 내비게이션 바
- 메뉴: 홈 / 타임슬롯 / 앱 차단 / 챌린지 / 설정, `framer-motion`으로 전환 애니메이션

### pages/Dashboard.tsx
- 현재 잠금 상태 카드, 오늘 144슬롯 타임라인(가로 바) + 현재 시각 인디케이터, 연속 달성일/준수율/총 달성일 통계, 챌린지 진행률 카드

### pages/TimeSlots.tsx
- 마우스 클릭/드래그로 슬롯 선택, 요일 탭 전환
- 프리셋 버튼: 업무(09~18), 수면(00~08), 전체 잠금, 초기화
- Sunday lock 동일 적용 (모바일과 달리 `hasUnsavedChanges` 플래그는 없음 — 저장 후 단순 refetch)

### pages/BlockedApps.tsx
- 카테고리별(소셜/엔터테인먼트/게임 등) 앱 그리드, 토글로 차단 설정
- 일요일이 아니면 읽기 전용 배너 표시, 저장 버튼은 일요일에만 노출
- `useGetServerTime`으로 `isSunday` 판단 (클라이언트 로컬 시간 신뢰 안 함)

### pages/Challenge.tsx
- 티어 4종 카드(입문자/실천자/집중자/독종), 참가 시 티어별 상한 내에서 일일 사용시간 슬라이더로 설정
- 참가 중엔 생존 현황, 상금 풀, 진행률 바, 탈락 규칙 안내
- SSE(`/api/challenge/events`)로 다른 참가자 이벤트 실시간 수신

### pages/Settings.tsx
- 프로필(닉네임), 권한 상태(접근성 서비스), 알림 설정(전체/잠금 알림/챌린지 알림) 토글

---

## 6. 핵심 설계 결정

### 6-1. 10분 단위 슬롯 (144개/일)
- 24시간 × 6슬롯 = 144개 고정, `index = 시×6 + 분÷10`
- 요일별로 144행이 항상 존재하도록 자동 생성 (누락 시 첫 조회에서 채움)

### 6-2. Sunday Lock (일요일 잠금)
- `timeslotsConfigured / appsConfigured`가 `false`인 동안(최초 설정 전)엔 언제든 편집 가능
- 최초로 일요일에 저장하는 순간 플래그가 `true`로 바뀌고, 그 뒤부터는 일요일이 아니면 `PUT` 요청이 403으로 거부됨
- 목적: 충동적으로 차단 설정을 느슨하게 바꾸는 것을 방지 (자기 통제 장치)

### 6-3. KST 기준 시간 처리
- 서버는 UTC 환경에서 실행되므로 항상 `+9시간` 보정 (`utils/kst.ts`)
- 클라이언트도 로컬 시간을 신뢰하지 않고 `GET /api/server-time`으로 서버 기준 시각/요일을 확인 (기기 시간 조작으로 잠금 우회 방지)

### 6-4. 요일 탭 데이터 격리 (`key={selectedDay}` 리마운트 패턴)
```
문제: 과거엔 화면 하나가 모든 요일의 state를 공유 → 탭 전환 시 이전 요일 데이터가
      잔류하거나, 저장 직후 다른 요일로 이동하면 표시가 꼬이는 문제가 있었음
해결: DayTabBar(탭 UI) + DaySlotConfig(요일별 데이터/로직)를 분리하고
      <DaySlotConfig key={selectedDay} day={selectedDay} />로 마운트
      → 요일이 바뀌면 컴포넌트가 완전히 새로 생성되어 이전 state가 절대 섞이지 않음
검증: DB 실측 요일별 잠금 슬롯 수(일12/월108/화114/수102/목1/금126/토14)를 기준으로
      요일 탭을 반복 전환하는 e2e 테스트 통과 — 재방문한 요일의 데이터가 정확히 재로드됨
```

### 6-5. 드래그 중 서버 refetch 차단 (모바일)
```
문제: 드래그로 슬롯 변경 중 React Query 자동 refetch가 로컬 상태를 덮어써
      의도치 않은 값이 저장되는 문제
해결: 1. refetchOnWindowFocus: false
      2. hasUnsavedChanges ref = true(드래그 시작) / false(저장 성공, 요일 전환)
      3. useEffect([slots])에서 hasUnsavedChanges.current === true면 setLockedSlots 건너뜀
```

### 6-6. 챌린지 생존 판정 & 우회 방지
```
- 매일 heartbeat POST → compliant 여부 서버 판정, 같은 날 중복 판정 방지(lastEvaluatedDate)
- compliant: false 누적 3회(MAX_FAILURES) → 탈락(failed_days)
- 앱 삭제로 우회 시도 감지: heartbeat 4시간 이상 끊기고 그 사이가 잠금 시간대였다면
  하루 실패로 간주 → 반복 시 탈락(app_deleted)
- Android 측에서도 패키지 설치관리자(삭제 관련 화면) 실행을 감지해 경고 알림 발송
```

### 6-7. 실제 차단 매커니즘 (Android)
```
1. 앱 레벨(화면): LockScreenOverlay — isLocked===true면 전체화면 모달로 앱 자체를 잠금
2. OS 레벨(다른 앱 실행 차단): DetoxAccessibilityService
   - 포그라운드 앱 변경 감지 → 차단 목록 + 잠금 시간대면 강제 전환
3. 네트워크 레벨(선택): DetoxVpnService — 차단 대상 앱만 VPN 싱크홀로 네트워크 차단
4. 데이터 소스: NativeSyncProvider가 30초마다 서버 폴링 → SharedPreferences 동기화
   (오프라인 상태에서도 마지막 동기화된 설정으로 계속 차단 가능)
```

---

## 7. API 엔드포인트 전체 목록

```
GET  /api/timeslots?day=0~6      요일별 144개 슬롯 조회
PUT  /api/timeslots               { day, slots:[{index,isLocked}] } — 일요일만(최초 예외)

GET  /api/settings                설정 조회
PUT  /api/settings                설정 변경

GET  /api/blocked-apps            차단 앱 목록
POST /api/blocked-apps            앱 추가
PUT  /api/blocked-apps            차단 상태 변경 — 일요일만(최초 예외)
DELETE /api/blocked-apps/:id      앱 삭제

GET  /api/dashboard                홈 화면 통합 데이터

GET  /api/challenge                현재 챌린지 상태
POST /api/challenge                참가 — 일요일만
POST /api/challenge/quit           포기
POST /api/challenge/heartbeat      생존 신호(일 1회 판정)
GET  /api/challenge/events         SSE 실시간 이벤트(웹)
GET  /api/challenge/events/recent  폴링 이벤트(모바일)
GET  /api/challenge/stats          티어별 전체 통계

GET  /api/focus-timer              세션 목록
POST /api/focus-timer              세션 시작
POST /api/focus-timer/:id/complete 세션 완료

GET  /api/usage-stats              오늘 스크린타임 조회
POST /api/usage-stats              오늘 스크린타임 갱신(upsert)

GET  /api/server-time              서버 기준 시각/요일/일요일까지 D-day
GET  /api/health                   헬스체크
```

---

## 8. 빌드/배포 정보

- **웹(digital-detox) / API 서버**: Replit 상시 배포, 프로덕션 URL `https://digital-detox-flow.replit.app`
- **모바일(detox-mobile)**: EAS Build로 Android APK 생성
  - `EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 eas build --platform android --profile preview --no-wait`
  - `android/` 디렉토리는 `.easignore`에 포함 — 매 빌드마다 `expo prebuild`가 plugin을 통해 새로 생성
  - 최신 preview 빌드 APK: `https://expo.dev/artifacts/eas/B5oGWZiAJ0Hke5AAfNzJZpi4h4AEQXxw0FhN9LhKK8Y.apk`
  - 설치 후 반드시 **설정 → 접근성 → 디지털 디톡스 → 사용** 활성화해야 실제 앱 차단이 동작함
