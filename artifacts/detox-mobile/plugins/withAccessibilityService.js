const {
  withAndroidManifest,
  withDangerousMod,
  withStringsXml,
  withGradleProperties,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

// ── Kotlin/XML source of truth ──────────────────────────────────────────────
// IMPORTANT: These files used to be duplicated as inline JS string constants
// in this plugin, separate from the actual .kt files under android/. Because
// EAS builds always run `expo prebuild` (android/ is excluded via .easignore
// so the prebuild step regenerates it from scratch), any edit made directly
// to android/app/src/main/java/com/replit/detox/*.kt was silently discarded
// on every EAS build — only edits made to the inlined strings here ever took
// effect. That drift between two "sources of truth" was the root cause of
// fixes appearing to randomly break other fixes across builds.
//
// To eliminate this permanently, this plugin now reads the *actual* source
// files below at prebuild time. There is only ONE place to edit Kotlin/XML
// native code from now on: native-src/android/.
const NATIVE_SRC_DIR = path.join(__dirname, "..", "native-src", "android");

function readNativeSrc(relPath) {
  const fullPath = path.join(NATIVE_SRC_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `[withAccessibilityService] Missing native source file: ${fullPath}. ` +
      `Edit Kotlin/XML sources in native-src/android/ only.`
    );
  }
  return fs.readFileSync(fullPath, "utf8");
}

// ── Manifest modifications ──────────────────────────────────────────────────

function addAccessibilityServiceToManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // ── 1. FOREGROUND_SERVICE_SPECIAL_USE 권한 추가 (Android 14+ VPN 포그라운드 서비스 필수)
    if (!manifest.manifest["uses-permission"]) manifest.manifest["uses-permission"] = [];
    const permExists = (name) =>
      manifest.manifest["uses-permission"].some((p) => p.$?.["android:name"] === name);
    if (!permExists("android.permission.FOREGROUND_SERVICE_SPECIAL_USE")) {
      manifest.manifest["uses-permission"].push({
        $: { "android:name": "android.permission.FOREGROUND_SERVICE_SPECIAL_USE" },
      });
    }

    const application = manifest.manifest.application[0];

    // ── 2. 서비스 등록
    if (!application.service) application.service = [];
    const svcExists = (name) =>
      application.service.some((s) => s.$?.["android:name"] === name);

    if (!svcExists(".DetoxAccessibilityService")) {
      application.service.push({
        $: {
          "android:name": ".DetoxAccessibilityService",
          "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
          "android:exported": "true",
        },
        "intent-filter": [
          { action: [{ $: { "android:name": "android.accessibilityservice.AccessibilityService" } }] },
        ],
        "meta-data": [
          { $: { "android:name": "android.accessibilityservice", "android:resource": "@xml/accessibility_service_config" } },
        ],
      });
    }

    if (!svcExists(".DetoxVpnService")) {
      application.service.push({
        $: {
          "android:name": ".DetoxVpnService",
          "android:permission": "android.permission.BIND_VPN_SERVICE",
          "android:foregroundServiceType": "specialUse",
          "android:exported": "false",
        },
        "intent-filter": [
          { action: [{ $: { "android:name": "android.net.VpnService" } }] },
        ],
        // Android 14+: specialUse 타입은 서브타입 설명 필수
        "property": [
          {
            $: {
              "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
              "android:value": "VPN 앱 차단 — 잠금 시간대에만 인터넷 접근을 차단합니다",
            },
          },
        ],
      });
    }

    // ── 3. 부팅 수신기 (android:exported="true" 필수 — Android 12+에서 시스템 브로드캐스트 수신)
    if (!application.receiver) application.receiver = [];
    const rcvExists = application.receiver.some(
      (r) => r.$?.["android:name"] === ".DetoxBootReceiver"
    );
    if (!rcvExists) {
      application.receiver.push({
        $: {
          "android:name": ".DetoxBootReceiver",
          "android:enabled": "true",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.intent.action.BOOT_COMPLETED" } },
              { $: { "android:name": "android.intent.action.QUICKBOOT_POWERON" } },
            ],
          },
        ],
      });
    }

    return config;
  });
}

function addAccessibilityDescription(config) {
  return withStringsXml(config, (config) => {
    const strings = config.modResults;
    if (!strings.resources.string) strings.resources.string = [];
    const exists = strings.resources.string.some(
      (s) => s.$?.name === "accessibility_service_description"
    );
    if (!exists) {
      strings.resources.string.push({
        $: { name: "accessibility_service_description" },
        _: "디지털 디톡스 앱 차단 서비스. 설정한 시간대에 지정된 앱의 실행을 차단합니다.",
      });
    }
    return config;
  });
}

function setGradleProperties(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;
    const set = (key, value) => {
      const idx = props.findIndex((p) => p.type === "property" && p.key === key);
      if (idx >= 0) props[idx].value = value;
      else props.push({ type: "property", key, value });
    };
    set("reactNativeArchitectures", "arm64-v8a");
    set("org.gradle.jvmargs", "-Xmx4096m -XX:MaxMetaspaceSize=512m");
    return config;
  });
}

// ── Write Kotlin files & patch MainApplication ──────────────────────────────

function copyNativeFiles(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const platformRoot = config.modRequest.platformProjectRoot;

      // 1. Accessibility XML config (read from native-src/android/xml/ — single source of truth)
      const xmlDest = path.join(platformRoot, "app", "src", "main", "res", "xml", "accessibility_service_config.xml");
      fs.mkdirSync(path.dirname(xmlDest), { recursive: true });
      fs.writeFileSync(xmlDest, readNativeSrc(path.join("xml", "accessibility_service_config.xml")), "utf8");
      console.log("[withAccessibilityService] Wrote XML config from native-src/");

      // 2. Write all Kotlin source files, read fresh from native-src/android/kotlin/ every prebuild
      // (this is the ONLY place Kotlin source is read from — no more inlined duplicates)
      const ktDestDir = path.join(platformRoot, "app", "src", "main", "java", "com", "replit", "detox");
      fs.mkdirSync(ktDestDir, { recursive: true });

      const ktFileNames = [
        "DetoxAccessibilityService.kt",
        "DetoxSyncModule.kt",
        "DetoxVpnService.kt",
        "DetoxPackage.kt",
        "DetoxBootReceiver.kt",
      ];

      for (const fileName of ktFileNames) {
        const src = readNativeSrc(path.join("kotlin", fileName));
        const dest = path.join(ktDestDir, fileName);
        fs.writeFileSync(dest, src, "utf8");
        console.log("[withAccessibilityService] Wrote", fileName, "from native-src/");
      }

      // 3. Patch MainApplication.kt to register DetoxPackage
      const mainAppPath = path.join(ktDestDir, "MainApplication.kt");
      if (fs.existsSync(mainAppPath)) {
        let src = fs.readFileSync(mainAppPath, "utf8");
        if (!src.includes("DetoxPackage")) {
          src = src.replace(
            /PackageList\(this\)\.packages\.apply\s*\{/,
            "PackageList(this).packages.apply {\n              add(DetoxPackage())"
          );
          fs.writeFileSync(mainAppPath, src, "utf8");
          console.log("[withAccessibilityService] Patched MainApplication.kt with DetoxPackage");
        } else {
          console.log("[withAccessibilityService] DetoxPackage already in MainApplication.kt");
        }
      } else {
        console.warn("[withAccessibilityService] MainApplication.kt not found — DetoxPackage not registered");
      }

      return config;
    },
  ]);
}

function withAccessibilityService(config) {
  config = addAccessibilityServiceToManifest(config);
  config = addAccessibilityDescription(config);
  config = setGradleProperties(config);
  config = copyNativeFiles(config);
  return config;
}

module.exports = withAccessibilityService;
