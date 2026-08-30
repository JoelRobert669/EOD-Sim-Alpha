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

  console.log("=== 3. Copying Android Base & Bundling 3D GLTF Assets into APK ===");
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

  // Remove unrendered shortcut xml templates
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

  // Bundle entire dist folder (HTML, JS, GLB models, Draco, textures) into Android assets
  const assetsWwwDir = path.join(projectDir, "app/src/main/assets/www");
  fs.mkdirSync(assetsWwwDir, { recursive: true });
  copyRecursive(path.resolve("dist"), assetsWwwDir);
  copyRecursive(path.resolve("public"), assetsWwwDir);

  console.log("✅ 3D GLTF models and WebXR engine bundled inside APK assets at:", assetsWwwDir);

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

  // Enable cleartext traffic for local server in AndroidManifest.xml
  let manifestXml = fs.readFileSync(path.join(projectDir, "app/src/main/AndroidManifest.xml"), "utf-8");
  manifestXml = manifestXml.replace("<application", "<application android:usesCleartextTraffic=\"true\"");
  fs.writeFileSync(path.join(projectDir, "app/src/main/AndroidManifest.xml"), manifestXml);

  // Write embedded Java LocalAssetServer
  const javaDestDir = path.join(projectDir, "app/src/main/java/com/eod/suittrainer");
  fs.mkdirSync(javaDestDir, { recursive: true });

  const localServerCode = `package com.eod.suittrainer;

import android.content.Context;
import android.content.res.AssetManager;
import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LocalAssetServer {
    private final Context context;
    private final int port;
    private ServerSocket serverSocket;
    private boolean isRunning = false;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public LocalAssetServer(Context context, int port) {
        this.context = context.getApplicationContext();
        this.port = port;
    }

    public synchronized void start() {
        if (isRunning) return;
        isRunning = true;
        executor.execute(() -> {
            try {
                serverSocket = new ServerSocket(port);
                while (isRunning && !serverSocket.isClosed()) {
                    Socket client = serverSocket.accept();
                    executor.execute(() -> handleClient(client));
                }
            } catch (Exception e) {
                // Server stopped
            }
        });
    }

    private void handleClient(Socket socket) {
        try (InputStream in = socket.getInputStream();
             OutputStream out = socket.getOutputStream();
             BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {
            
            String line = reader.readLine();
            if (line == null) return;
            String[] parts = line.split(" ");
            if (parts.length < 2) return;
            
            String path = parts[1];
            if (path.contains("?")) path = path.substring(0, path.indexOf("?"));
            if (path.equals("/") || path.isEmpty()) path = "/index.html";
            if (path.startsWith("/")) path = path.substring(1);
            
            AssetManager am = context.getAssets();
            String assetPath = "www/" + path;
            
            InputStream assetIn = null;
            long length = 0;
            try {
                assetIn = am.open(assetPath);
                length = assetIn.available();
            } catch (Exception e404) {
                String notFound = "HTTP/1.1 404 Not Found\\r\\nContent-Length: 0\\r\\n\\r\\n";
                out.write(notFound.getBytes());
                return;
            }
            
            String mime = "application/octet-stream";
            if (path.endsWith(".html")) mime = "text/html; charset=utf-8";
            else if (path.endsWith(".js") || path.endsWith(".mjs")) mime = "application/javascript; charset=utf-8";
            else if (path.endsWith(".css")) mime = "text/css; charset=utf-8";
            else if (path.endsWith(".glb")) mime = "model/gltf-binary";
            else if (path.endsWith(".gltf")) mime = "model/gltf+json";
            else if (path.endsWith(".bin")) mime = "application/octet-stream";
            else if (path.endsWith(".json") || path.endsWith(".webmanifest")) mime = "application/json; charset=utf-8";
            else if (path.endsWith(".png")) mime = "image/png";
            else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) mime = "image/jpeg";
            else if (path.endsWith(".wasm")) mime = "application/wasm";
            else if (path.endsWith(".svg")) mime = "image/svg+xml";

            String header = "HTTP/1.1 200 OK\\r\\n" +
                    "Content-Type: " + mime + "\\r\\n" +
                    "Access-Control-Allow-Origin: *\\r\\n" +
                    "Content-Length: " + length + "\\r\\n" +
                    "Connection: close\\r\\n\\r\\n";
            out.write(header.getBytes());

            byte[] buffer = new byte[65536];
            int read;
            while ((read = assetIn.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            out.flush();
            assetIn.close();
        } catch (Exception e) {
            // Handled
        } finally {
            try { socket.close(); } catch (Exception ignored) {}
        }
    }

    public synchronized void stop() {
        isRunning = false;
        if (serverSocket != null) {
            try { serverSocket.close(); } catch (Exception ignored) {}
        }
    }
}
`;
  fs.writeFileSync(path.join(javaDestDir, "LocalAssetServer.java"), localServerCode);

  const appJavaCode = `package com.eod.suittrainer;

public class Application extends android.app.Application {
    private static LocalAssetServer server;

    @Override
    public void onCreate() {
        super.onCreate();
        if (server == null) {
            server = new LocalAssetServer(this, 8888);
            server.start();
        }
    }
}
`;
  fs.writeFileSync(path.join(javaDestDir, "Application.java"), appJavaCode);

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

  // Clean old java root files
  for (const jf of ["LauncherActivity.java", "Application.java", "DelegationService.java"]) {
    const oldPath = path.join(projectDir, "app/src/main/java", jf);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  // Update compileSdkVersion in app/build.gradle to 34
  let appGradle = fs.readFileSync(path.join(projectDir, "app/build.gradle"), "utf-8");
  appGradle = appGradle.replace(/compileSdkVersion \d+/g, "compileSdkVersion 34");
  fs.writeFileSync(path.join(projectDir, "app/build.gradle"), appGradle);

  console.log("=== 4. Compiling Self-Contained Offline Release APK with Gradle ===");
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

  console.log("=== 5. Zipaligning and Signing Release APK ===");
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

  console.log("=== 6. Verifying APK Signature ===");
  execSync(`"${apksigner}" verify --verbose "${finalApk}"`, { env, stdio: "inherit" });

  const stats = fs.statSync(finalApk);
  console.log("\n======================================================");
  console.log("🎉 100% SELF-CONTAINED OFFLINE META QUEST APK READY!");
  console.log("📁 Location:", finalApk);
  console.log("📦 Total Packaged File Size:", (stats.size / (1024 * 1024)).toFixed(2), "MB (Includes all GLTF 3D models & assets)");
  console.log("======================================================");
}

build().catch(err => {
  console.error("Build failed:", err);
  process.exit(1);
});
