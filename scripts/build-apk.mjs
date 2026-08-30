import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const core = require("C:/Users/Admin/AppData/Roaming/npm/node_modules/@meta-quest/bubblewrap-cli/node_modules/@meta-quest/bubblewrap-core");
const { FeatureManager } = require("C:/Users/Admin/AppData/Roaming/npm/node_modules/@meta-quest/bubblewrap-cli/node_modules/@meta-quest/bubblewrap-core/dist/lib/features/FeatureManager");
const lodash = require("C:/Users/Admin/AppData/Roaming/npm/node_modules/@meta-quest/bubblewrap-cli/node_modules/lodash");

async function build() {
  console.log("=== 1. Initializing Meta Quest TWA Project ===");
  const projectDir = path.resolve("build-apk");
  const apkOutputDir = path.resolve("apk");
  const templateDir = "C:/Users/Admin/AppData/Roaming/npm/node_modules/@meta-quest/bubblewrap-cli/node_modules/@meta-quest/bubblewrap-core/template_project";

  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(apkOutputDir, { recursive: true });

  const twaManifest = new core.TwaManifest({
    packageId: "com.eod.suittrainer",
    host: "192.168.1.200:5173",
    name: "EOD Suit Trainer",
    launcherName: "EOD Trainer",
    displayStatus: "standalone",
    themeColor: "#0B0F19",
    navigationColor: "#0B0F19",
    backgroundColor: "#0B0F19",
    enableNotifications: false,
    splashScreenFadeOutDuration: 300,
    generatorApp: "bubblewrap",
    fallbackType: "customtabs",
    enableSiteSettingsShortcut: false,
    startUrl: "/",
    iconUrl: "https://192.168.1.200:5173/icon-512.png",
    maskableIconUrl: "https://192.168.1.200:5173/maskable-icon-512.png",
    appVersionName: "1.0.0",
    appVersionCode: 1,
    signingKey: {
      path: path.join(projectDir, "eod-release.keystore"),
      alias: "eodkey"
    },
    orientation: "landscape",
    isMetaQuest: true,
    horizonOSAppMode: "immersive",
    enableXRScene: true,
    minSdkVersion: 26
  });

  console.log("=== 2. Copying Static and Template Android Files ===");
  function copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const child of fs.readdirSync(src)) {
        copyRecursive(path.join(src, child), path.join(dest, child));
      }
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }

  // Copy template base
  copyRecursive(templateDir, projectDir);

  // Remove unrendered shortcut xml templates since shortcuts are empty
  const removeXmls = [
    "app/src/main/res/drawable-anydpi/shortcut_legacy_background.xml",
    "app/src/main/res/drawable-anydpi/shortcut_monochrome.xml",
    "app/src/main/res/drawable-anydpi-v26/shortcut_maskable.xml",
    "app/src/main/res/drawable-anydpi-v26/shortcut_monochrome.xml",
    "app/src/main/res/xml/shortcuts.xml"
  ];
  for (const r of removeXmls) {
    const p = path.join(projectDir, r);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  // Setup local icons
  const srcIcon = path.resolve("public/icon-512.png");
  const iconTargets = [
    "app/src/main/res/mipmap-mdpi/ic_launcher.png",
    "app/src/main/res/mipmap-hdpi/ic_launcher.png",
    "app/src/main/res/mipmap-xhdpi/ic_launcher.png",
    "app/src/main/res/mipmap-xxhdpi/ic_launcher.png",
    "app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
    "app/src/main/res/mipmap-mdpi/ic_maskable.png",
    "app/src/main/res/mipmap-hdpi/ic_maskable.png",
    "app/src/main/res/mipmap-xhdpi/ic_maskable.png",
    "app/src/main/res/mipmap-xxhdpi/ic_maskable.png",
    "app/src/main/res/mipmap-xxxhdpi/ic_maskable.png",
    "app/src/main/res/drawable-mdpi/splash.png",
    "app/src/main/res/drawable-hdpi/splash.png",
    "app/src/main/res/drawable-xhdpi/splash.png",
    "app/src/main/res/drawable-xxhdpi/splash.png",
    "app/src/main/res/drawable-xxxhdpi/splash.png",
    "store_icon.png"
  ];
  for (const rel of iconTargets) {
    const target = path.join(projectDir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(srcIcon, target);
  }

  // Template render arguments
  const log = new core.ConsoleLog("TwaGenerator");
  const featureManager = new FeatureManager(twaManifest, log);
  const args = {
    ...twaManifest,
    ...featureManager,
    shareTargetIntentFilter: undefined,
    generateShortcuts: () => "[]",
    escapeJsonString: core.util.escapeJsonString,
    escapeGradleString: core.util.escapeGradleString,
    toAndroidScreenOrientation: core.util.toAndroidScreenOrientation
  };

  // Render templates
  const templateFiles = [
    "app/build.gradle",
    "app/src/main/AndroidManifest.xml",
    "app/src/main/res/values/strings.xml"
  ];
  for (const rel of templateFiles) {
    const src = path.join(templateDir, rel);
    const dest = path.join(projectDir, rel);
    const tmplContent = fs.readFileSync(src, "utf-8");
    const compiled = lodash.template(tmplContent)(args);
    fs.writeFileSync(dest, compiled);
  }

  // Render Java files
  const javaFiles = ["LauncherActivity.java", "Application.java", "DelegationService.java"];
  const javaDestDir = path.join(projectDir, "app/src/main/java/com/eod/suittrainer");
  fs.mkdirSync(javaDestDir, { recursive: true });
  for (const jf of javaFiles) {
    const src = path.join(templateDir, "app/src/main/java", jf);
    const dest = path.join(javaDestDir, jf);
    const tmplContent = fs.readFileSync(src, "utf-8");
    const compiled = lodash.template(tmplContent)(args);
    fs.writeFileSync(dest, compiled);
  }

  // Clean old java root files if any
  for (const jf of javaFiles) {
    const oldPath = path.join(projectDir, "app/src/main/java", jf);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  // Update compileSdkVersion in app/build.gradle to 34
  let appGradle = fs.readFileSync(path.join(projectDir, "app/build.gradle"), "utf-8");
  appGradle = appGradle.replace(/compileSdkVersion \d+/g, "compileSdkVersion 34");
  fs.writeFileSync(path.join(projectDir, "app/build.gradle"), appGradle);

  console.log("=== 3. Compiling Android Release APK with Gradle ===");
  const jdkPath = "C:/Users/Admin/.bubblewrap/jdk/jdk-17.0.11+9";
  const sdkPath = "C:/Users/Admin/.bubblewrap/android_sdk";
  const env = {
    ...process.env,
    JAVA_HOME: jdkPath,
    ANDROID_HOME: sdkPath,
    ANDROID_SDK_ROOT: sdkPath,
    PATH: jdkPath + "/bin;" + sdkPath + "/platform-tools;" + process.env.PATH
  };

  const gradlew = path.join(projectDir, "gradlew.bat");
  execSync(`"${gradlew}" assembleRelease`, { cwd: projectDir, env: env, stdio: "inherit" });

  console.log("=== 4. Zipaligning and Signing Release APK ===");
  const unsignedApk = path.join(projectDir, "app/build/outputs/apk/release/app-release-unsigned.apk");
  const finalApk = path.join(apkOutputDir, "eod-suit-trainer.apk");
  const buildTools = path.join(sdkPath, "build-tools/34.0.0");
  const zipalign = path.join(buildTools, "zipalign.exe");
  const apksigner = path.join(buildTools, "apksigner.bat");
  const alignedApk = path.join(projectDir, "app-release-aligned.apk");
  if (fs.existsSync(alignedApk)) fs.unlinkSync(alignedApk);

  execSync(`"${zipalign}" -v -p 4 "${unsignedApk}" "${alignedApk}"`, { env, stdio: "inherit" });
  const keystorePath = path.join(projectDir, "eod-release.keystore");
  execSync(`"${apksigner}" sign --ks "${keystorePath}" --ks-key-alias eodkey --ks-pass pass:eodtrainer123 --key-pass pass:eodtrainer123 --out "${finalApk}" "${alignedApk}"`, { env, stdio: "inherit" });

  console.log("=== 5. Verifying APK Signature ===");
  execSync(`"${apksigner}" verify --verbose "${finalApk}"`, { env, stdio: "inherit" });

  const stats = fs.statSync(finalApk);
  console.log("\n======================================================");
  console.log("🎉 META QUEST APK GENERATED SUCCESSFULLY!");
  console.log("📁 Location:", finalApk);
  console.log("📦 File Size:", (stats.size / (1024 * 1024)).toFixed(2), "MB");
  console.log("======================================================");
}

build().catch(err => {
  console.error("Build failed:", err);
  process.exit(1);
});
