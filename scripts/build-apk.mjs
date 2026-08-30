import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const core = require("C:/Users/Admin/AppData/Roaming/npm/node_modules/@meta-quest/bubblewrap-cli/node_modules/@meta-quest/bubblewrap-core");
const { FeatureManager } = require("C:/Users/Admin/AppData/Roaming/npm/node_modules/@meta-quest/bubblewrap-cli/node_modules/@meta-quest/bubblewrap-core/dist/lib/features/FeatureManager");
const lodash = require("C:/Users/Admin/AppData/Roaming/npm/node_modules/@meta-quest/bubblewrap-cli/node_modules/lodash");

async function build() {
  console.log("=== 1. Building Vite Production Bundle ===");
  execSync("npm run build", { stdio: "inherit" });

  console.log("=== 2. Initializing Meta Quest Android Project ===");
  const projectDir = path.resolve("build-apk");
  const apkOutputDir = path.resolve("apk");
  const templateDir = "C:/Users/Admin/AppData/Roaming/npm/node_modules/@meta-quest/bubblewrap-cli/node_modules/@meta-quest/bubblewrap-core/template_project";

  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(apkOutputDir, { recursive: true });

  const twaManifest = new core.TwaManifest({
    packageId: "com.eod.suittrainer",
    host: "localhost:8888",
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
    iconUrl: "http://localhost:8888/icon-512.png",
    maskableIconUrl: "http://localhost:8888/maskable-icon-512.png",
    appVersionName: "1.1.0",
    appVersionCode: 2,
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

  console.log("=== 3. Copying Android Base & Bundling Assets ===");
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

  // Remove unrendered shortcut xml templates that have lodash template tags
  const removeXmls = [
    "app/src/main/res/drawable-anydpi/shortcut_legacy_background.xml",
    "app/src/main/res/drawable-anydpi/shortcut_monochrome.xml",
    "app/src/main/res/drawable-anydpi-v26/shortcut_maskable.xml",
    "app/src/main/res/drawable-anydpi-v26/shortcut_monochrome.xml",
  ];
  for (const r of removeXmls) {
    const p = path.join(projectDir, r);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  // Bundle Vite dist + public assets into Android assets/www
  const assetsWwwDir = path.join(projectDir, "app/src/main/assets/www");
  // Clean old assets
  if (fs.existsSync(assetsWwwDir)) {
    fs.rmSync(assetsWwwDir, { recursive: true, force: true });
  }
  fs.mkdirSync(assetsWwwDir, { recursive: true });
  copyRecursive(path.resolve("dist"), assetsWwwDir);
  copyRecursive(path.resolve("public"), assetsWwwDir);

  console.log("  ✅ All 3D GLTF models and WebXR engine bundled at:", assetsWwwDir);

  // Setup app launcher icons
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

  // ============================================================
  // FIX 1: Patch app/build.gradle — force launchUrl to http://
  //         and set correct versionName
  // ============================================================
  let appGradle = fs.readFileSync(path.join(projectDir, "app/build.gradle"), "utf-8");
  // Change launch URL from https:// to http://
  appGradle = appGradle.replace(
    /def launchUrl = "https:\/\/" \+ twaManifest\.hostName \+ twaManifest\.launchUrl/,
    'def launchUrl = "http://" + twaManifest.hostName + twaManifest.launchUrl'
  );
  // Fix compileSdkVersion to 34
  appGradle = appGradle.replace(/compileSdkVersion \d+/g, "compileSdkVersion 34");
  // Fix empty versionName
  appGradle = appGradle.replace(/versionName ""/, 'versionName "1.1.0"');
  fs.writeFileSync(path.join(projectDir, "app/build.gradle"), appGradle);
  console.log("  ✅ FIX 1: Patched build.gradle — launchUrl uses http://, versionName=1.1.0");

  // ============================================================
  // FIX 2: Patch AndroidManifest.xml — remove @xml/shortcuts ref,
  //         enable cleartext, remove package= attribute
  // ============================================================
  let manifestXml = fs.readFileSync(path.join(projectDir, "app/src/main/AndroidManifest.xml"), "utf-8");
  // Enable cleartext traffic for local HTTP server
  manifestXml = manifestXml.replace("<application", '<application android:usesCleartextTraffic="true"');
  // Remove the shortcuts meta-data that references the deleted @xml/shortcuts
  manifestXml = manifestXml.replace(
    /<meta-data android:name="android.app.shortcuts" android:resource="@xml\/shortcuts" \/>/,
    '<!-- shortcuts removed -->'
  );
  // Remove deprecated package attribute
  manifestXml = manifestXml.replace(
    /package="com\.eod\.suittrainer"/,
    ''
  );
  fs.writeFileSync(path.join(projectDir, "app/src/main/AndroidManifest.xml"), manifestXml);
  console.log("  ✅ FIX 2: Patched AndroidManifest — cleartext enabled, shortcuts ref removed");

  // ============================================================
  // FIX 3: Patch strings.xml — asset_statements use http://
  // ============================================================
  let stringsXml = fs.readFileSync(path.join(projectDir, "app/src/main/res/values/strings.xml"), "utf-8");
  stringsXml = stringsXml.replace(
    /https:\/\/localhost:8888/g,
    'http://localhost:8888'
  );
  fs.writeFileSync(path.join(projectDir, "app/src/main/res/values/strings.xml"), stringsXml);
  console.log("  ✅ FIX 3: Patched strings.xml — asset_statements use http://");

  // ============================================================
  // FIX 4: Write robust Java classes with fixed LocalAssetServer
  //         (uses chunked transfer for large files like GLB)
  // ============================================================
  const javaDestDir = path.join(projectDir, "app/src/main/java/com/eod/suittrainer");
  fs.mkdirSync(javaDestDir, { recursive: true });

  // LocalAssetServer — uses chunked Transfer-Encoding to avoid InputStream.available() bug
  const localServerCode = `package com.eod.suittrainer;

import android.content.Context;
import android.content.res.AssetManager;
import android.content.res.AssetFileDescriptor;
import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.CountDownLatch;

public class LocalAssetServer {
    private final Context context;
    private final int port;
    private ServerSocket serverSocket;
    private volatile boolean isRunning = false;
    private final ExecutorService executor = Executors.newFixedThreadPool(8);
    private final CountDownLatch readyLatch = new CountDownLatch(1);

    public LocalAssetServer(Context context, int port) {
        this.context = context.getApplicationContext();
        this.port = port;
    }

    public void start() {
        if (isRunning) return;
        isRunning = true;
        new Thread(() -> {
            try {
                serverSocket = new ServerSocket(port);
                readyLatch.countDown();
                while (isRunning && !serverSocket.isClosed()) {
                    try {
                        Socket client = serverSocket.accept();
                        executor.execute(() -> handleClient(client));
                    } catch (Exception e) {
                        if (!isRunning) break;
                    }
                }
            } catch (Exception e) {
                readyLatch.countDown();
            }
        }, "LocalAssetServer").start();
    }

    public void waitUntilReady() {
        try { readyLatch.await(); } catch (InterruptedException ignored) {}
    }

    private long getAssetFileSize(String assetPath) {
        try {
            AssetFileDescriptor fd = context.getAssets().openFd(assetPath);
            long len = fd.getLength();
            fd.close();
            return len;
        } catch (Exception e) {
            return -1;
        }
    }

    private void handleClient(Socket socket) {
        try {
            socket.setSoTimeout(30000);
            InputStream in = socket.getInputStream();
            OutputStream out = socket.getOutputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(in));

            String line = reader.readLine();
            if (line == null) { socket.close(); return; }

            String[] parts = line.split(" ");
            if (parts.length < 2) { socket.close(); return; }

            // Consume all headers
            while (true) {
                String hdr = reader.readLine();
                if (hdr == null || hdr.isEmpty()) break;
            }

            String reqPath = parts[1];
            if (reqPath.contains("?")) reqPath = reqPath.substring(0, reqPath.indexOf("?"));
            if (reqPath.equals("/") || reqPath.isEmpty()) reqPath = "/index.html";
            if (reqPath.startsWith("/")) reqPath = reqPath.substring(1);

            AssetManager am = context.getAssets();
            String assetPath = "www/" + reqPath;

            InputStream assetIn;
            try {
                assetIn = am.open(assetPath);
            } catch (Exception e404) {
                String notFound = "HTTP/1.1 404 Not Found\\r\\nContent-Length: 0\\r\\nConnection: close\\r\\n\\r\\n";
                out.write(notFound.getBytes());
                out.flush();
                socket.close();
                return;
            }

            String mime = "application/octet-stream";
            if (reqPath.endsWith(".html")) mime = "text/html; charset=utf-8";
            else if (reqPath.endsWith(".js") || reqPath.endsWith(".mjs")) mime = "application/javascript; charset=utf-8";
            else if (reqPath.endsWith(".css")) mime = "text/css; charset=utf-8";
            else if (reqPath.endsWith(".glb")) mime = "model/gltf-binary";
            else if (reqPath.endsWith(".gltf")) mime = "model/gltf+json";
            else if (reqPath.endsWith(".bin")) mime = "application/octet-stream";
            else if (reqPath.endsWith(".json") || reqPath.endsWith(".webmanifest")) mime = "application/json; charset=utf-8";
            else if (reqPath.endsWith(".png")) mime = "image/png";
            else if (reqPath.endsWith(".jpg") || reqPath.endsWith(".jpeg")) mime = "image/jpeg";
            else if (reqPath.endsWith(".wasm")) mime = "application/wasm";
            else if (reqPath.endsWith(".svg")) mime = "image/svg+xml";

            // Use AssetFileDescriptor for accurate size (works for large compressed assets)
            long fileSize = getAssetFileSize(assetPath);

            StringBuilder header = new StringBuilder();
            header.append("HTTP/1.1 200 OK\\r\\n");
            header.append("Content-Type: ").append(mime).append("\\r\\n");
            header.append("Access-Control-Allow-Origin: *\\r\\n");
            header.append("Cache-Control: no-cache\\r\\n");
            if (fileSize > 0) {
                header.append("Content-Length: ").append(fileSize).append("\\r\\n");
            } else {
                header.append("Transfer-Encoding: chunked\\r\\n");
            }
            header.append("Connection: close\\r\\n");
            header.append("\\r\\n");
            out.write(header.toString().getBytes());

            byte[] buffer = new byte[65536];
            int read;

            if (fileSize > 0) {
                // Known size — stream directly
                while ((read = assetIn.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                }
            } else {
                // Unknown size — chunked transfer encoding
                while ((read = assetIn.read(buffer)) != -1) {
                    out.write(Integer.toHexString(read).getBytes());
                    out.write("\\r\\n".getBytes());
                    out.write(buffer, 0, read);
                    out.write("\\r\\n".getBytes());
                }
                out.write("0\\r\\n\\r\\n".getBytes());
            }

            out.flush();
            assetIn.close();
            socket.close();
        } catch (Exception e) {
            try { socket.close(); } catch (Exception ignored) {}
        }
    }

    public void stop() {
        isRunning = false;
        if (serverSocket != null) {
            try { serverSocket.close(); } catch (Exception ignored) {}
        }
        executor.shutdownNow();
    }
}
`;
  fs.writeFileSync(path.join(javaDestDir, "LocalAssetServer.java"), localServerCode);

  // Application class — starts server and waits for readiness
  const appJavaCode = `package com.eod.suittrainer;

public class Application extends android.app.Application {
    private static LocalAssetServer server;

    @Override
    public void onCreate() {
        super.onCreate();
        if (server == null) {
            server = new LocalAssetServer(this, 8888);
            server.start();
            server.waitUntilReady();
        }
    }
}
`;
  fs.writeFileSync(path.join(javaDestDir, "Application.java"), appJavaCode);

  // LauncherActivity — opens http://localhost:8888/index.html
  const launcherJavaCode = `package com.eod.suittrainer;

import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

public class LauncherActivity extends com.meta.androidbrowserhelper.trusted.LauncherActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    @Override
    protected Uri getLaunchingUrl() {
        return Uri.parse("http://localhost:8888/index.html");
    }
}
`;
  fs.writeFileSync(path.join(javaDestDir, "LauncherActivity.java"), launcherJavaCode);

  const delegationCode = `package com.eod.suittrainer;

public class DelegationService extends com.meta.androidbrowserhelper.trusted.DelegationService {
}
`;
  fs.writeFileSync(path.join(javaDestDir, "DelegationService.java"), delegationCode);
  console.log("  ✅ FIX 4: Robust LocalAssetServer with AssetFileDescriptor + chunked fallback");

  // Clean old template java files at root level
  for (const jf of ["LauncherActivity.java", "Application.java", "DelegationService.java"]) {
    const oldPath = path.join(projectDir, "app/src/main/java", jf);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  // Create empty shortcuts.xml so the Gradle generateShorcutsFile task doesn't fail
  const shortcutsDir = path.join(projectDir, "app/src/main/res/xml");
  fs.mkdirSync(shortcutsDir, { recursive: true });
  fs.writeFileSync(
    path.join(shortcutsDir, "shortcuts.xml"),
    '<?xml version="1.0" encoding="utf-8"?>\n<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">\n</shortcuts>\n'
  );
  console.log("  ✅ FIX 5: Created empty shortcuts.xml to prevent resource-not-found crash");

  console.log("\n=== 4. Compiling Self-Contained Offline Release APK ===");
  const jdkPath = "C:/Users/Admin/.bubblewrap/jdk/jdk-17.0.11+9";
  const sdkPath = "C:/Users/Admin/.bubblewrap/android_sdk";
  const env = {
    ...process.env,
    JAVA_HOME: jdkPath,
    ANDROID_HOME: sdkPath,
    ANDROID_SDK_ROOT: sdkPath,
    PATH: jdkPath + "/bin;" + sdkPath + "/platform-tools;" + process.env.PATH
  };

  // Clean build to avoid stale caches
  const gradlew = path.join(projectDir, "gradlew.bat");
  execSync(`"${gradlew}" clean`, { cwd: projectDir, env: env, stdio: "inherit" });
  execSync(`"${gradlew}" assembleRelease`, { cwd: projectDir, env: env, stdio: "inherit" });

  console.log("=== 5. Zipaligning and Signing Release APK ===");
  const unsignedApk = path.join(projectDir, "app/build/outputs/apk/release/app-release-unsigned.apk");
  const finalApk = path.join(apkOutputDir, "eod-suit-trainer.apk");
  const buildTools = path.join(sdkPath, "build-tools/34.0.0");
  const zipalign = path.join(buildTools, "zipalign.exe");
  const apksigner = path.join(buildTools, "apksigner.bat");
  const alignedApk = path.join(projectDir, "app-release-aligned.apk");
  if (fs.existsSync(alignedApk)) fs.unlinkSync(alignedApk);
  if (fs.existsSync(finalApk)) fs.unlinkSync(finalApk);

  execSync(`"${zipalign}" -v -p 4 "${unsignedApk}" "${alignedApk}"`, { env, stdio: "inherit" });
  const keystorePath = path.join(projectDir, "eod-release.keystore");
  execSync(`"${apksigner}" sign --ks "${keystorePath}" --ks-key-alias eodkey --ks-pass pass:eodtrainer123 --key-pass pass:eodtrainer123 --out "${finalApk}" "${alignedApk}"`, { env, stdio: "inherit" });

  console.log("=== 6. Verifying APK Signature ===");
  execSync(`"${apksigner}" verify --verbose "${finalApk}"`, { env, stdio: "inherit" });

  const stats = fs.statSync(finalApk);
  console.log("\n======================================================");
  console.log("🎉 META QUEST APK v1.1.0 — ALL CRASH FIXES APPLIED");
  console.log("📁 Location:", finalApk);
  console.log("📦 Size:", (stats.size / (1024 * 1024)).toFixed(2), "MB");
  console.log("======================================================");
}

build().catch(err => {
  console.error("Build failed:", err);
  process.exit(1);
});
