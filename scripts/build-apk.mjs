import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

async function build() {
  console.log("=== 1. Building Vite Production Bundle ===");
  execSync("npm run build", { stdio: "inherit" });

  console.log("=== 2. Setting Up Android Project (No TWA) ===");
  const projectDir = path.resolve("build-apk");
  const apkOutputDir = path.resolve("apk");

  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(apkOutputDir, { recursive: true });

  const jdkPath = "C:/Users/Admin/.bubblewrap/jdk/jdk-17.0.11+9";
  const sdkPath = "C:/Users/Admin/.bubblewrap/android_sdk";

  // ============================================================
  // Create a clean, simple Android project from scratch
  // No TWA, no bubblewrap, no Custom Tabs — just a WebView app
  // that loads from an embedded local asset server.
  // ============================================================

  // --- settings.gradle ---
  fs.writeFileSync(path.join(projectDir, "settings.gradle"), "include ':app'\n");

  // --- root build.gradle ---
  fs.writeFileSync(path.join(projectDir, "build.gradle"), `
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.9.1'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
`);

  // --- gradle.properties ---
  fs.writeFileSync(path.join(projectDir, "gradle.properties"), `
org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
`);

  // --- app/build.gradle ---
  const appDir = path.join(projectDir, "app");
  fs.mkdirSync(appDir, { recursive: true });
  fs.writeFileSync(path.join(appDir, "build.gradle"), `
plugins {
    id 'com.android.application'
}

android {
    compileSdkVersion 34
    namespace "com.eod.suittrainer"

    defaultConfig {
        applicationId "com.eod.suittrainer"
        minSdkVersion 26
        targetSdkVersion 32
        versionCode 10
        versionName "1.9.0"
    }

    androidResources {
        noCompress 'glb', 'wasm', 'bin'
    }

    buildTypes {
        release {
            minifyEnabled false
            shrinkResources false
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }

    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }
}

dependencies {
    implementation 'androidx.webkit:webkit:1.8.0'
}
`);

  // --- Gradle wrapper (copy from template if available) ---
  const templateDir = "C:/Users/Admin/AppData/Roaming/npm/node_modules/@meta-quest/bubblewrap-cli/node_modules/@meta-quest/bubblewrap-core/template_project";
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

  // Copy gradle wrapper
  copyRecursive(path.join(templateDir, "gradle"), path.join(projectDir, "gradle"));
  for (const f of ["gradlew", "gradlew.bat"]) {
    fs.copyFileSync(path.join(templateDir, f), path.join(projectDir, f));
  }

  // --- AndroidManifest.xml ---
  const manifestDir = path.join(appDir, "src/main");
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(path.join(manifestDir, "AndroidManifest.xml"), `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="com.oculus.permission.USE_SCENE" />
    <uses-permission android:name="com.oculus.permission.HAND_TRACKING" />

    <uses-feature
        android:name="android.hardware.vr.headtracking"
        android:required="false"
        android:version="1" />

    <uses-feature
        android:name="oculus.software.handtracking"
        android:required="false" />

    <application
        android:name=".EODApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="EOD Suit Trainer"
        android:usesCleartextTraffic="true"
        android:theme="@android:style/Theme.Black.NoTitleBar.Fullscreen">

        <meta-data
            android:name="com.oculus.ossplash.background"
            android:value="passthrough-contextual"/>

        <activity
            android:name=".MainActivity"
            android:label="EOD Trainer"
            android:screenOrientation="landscape"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
                <category android:name="com.oculus.intent.category.VR" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`);

  // --- Java source files ---
  const javaDir = path.join(manifestDir, "java/com/eod/suittrainer");
  fs.mkdirSync(javaDir, { recursive: true });

  // LocalAssetServer.java — embedded HTTP server for assets
  fs.writeFileSync(path.join(javaDir, "LocalAssetServer.java"), `package com.eod.suittrainer;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.content.res.AssetManager;
import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LocalAssetServer {
    private final Context context;
    private final int port;
    private ServerSocket serverSocket;
    private volatile boolean isRunning = false;
    private final ExecutorService executor = Executors.newFixedThreadPool(4);
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
                while (isRunning) {
                    try {
                        Socket client = serverSocket.accept();
                        executor.execute(() -> handleClient(client));
                    } catch (Exception e) {
                        if (!isRunning) break;
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
                readyLatch.countDown();
            }
        }, "AssetServer").start();
    }

    public void waitUntilReady() {
        try { readyLatch.await(); } catch (InterruptedException ignored) {}
    }

    private long getAssetSize(String assetPath) {
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
            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            OutputStream out = socket.getOutputStream();

            String requestLine = reader.readLine();
            if (requestLine == null) { socket.close(); return; }

            // Consume headers
            while (true) {
                String h = reader.readLine();
                if (h == null || h.isEmpty()) break;
            }

            String[] parts = requestLine.split(" ");
            if (parts.length < 2) { socket.close(); return; }

            String reqPath = parts[1];
            if (reqPath.contains("?")) reqPath = reqPath.substring(0, reqPath.indexOf("?"));
            if (reqPath.equals("/") || reqPath.isEmpty()) reqPath = "/index.html";
            if (reqPath.startsWith("/")) reqPath = reqPath.substring(1);

            String assetPath = "www/" + reqPath;
            AssetManager am = context.getAssets();

            InputStream assetIn;
            try {
                assetIn = am.open(assetPath);
            } catch (Exception e) {
                String resp = "HTTP/1.1 404 Not Found\\r\\nContent-Length: 0\\r\\nConnection: close\\r\\n\\r\\n";
                out.write(resp.getBytes());
                out.flush();
                socket.close();
                return;
            }

            String mime = getMimeType(reqPath);
            long size = getAssetSize(assetPath);

            StringBuilder sb = new StringBuilder();
            sb.append("HTTP/1.1 200 OK\\r\\n");
            sb.append("Content-Type: ").append(mime).append("\\r\\n");
            sb.append("Access-Control-Allow-Origin: *\\r\\n");
            sb.append("Cache-Control: no-cache\\r\\n");
            if (size >= 0) {
                sb.append("Content-Length: ").append(size).append("\\r\\n");
            }
            sb.append("Connection: close\\r\\n");
            sb.append("\\r\\n");
            out.write(sb.toString().getBytes());

            byte[] buf = new byte[65536];
            int n;
            while ((n = assetIn.read(buf)) != -1) {
                out.write(buf, 0, n);
            }
            out.flush();
            assetIn.close();
            socket.close();
        } catch (Exception e) {
            try { socket.close(); } catch (Exception ignored) {}
        }
    }

    private String getMimeType(String path) {
        if (path.endsWith(".html")) return "text/html; charset=utf-8";
        if (path.endsWith(".js") || path.endsWith(".mjs")) return "application/javascript; charset=utf-8";
        if (path.endsWith(".css")) return "text/css; charset=utf-8";
        if (path.endsWith(".json") || path.endsWith(".webmanifest")) return "application/json; charset=utf-8";
        if (path.endsWith(".glb")) return "model/gltf-binary";
        if (path.endsWith(".gltf")) return "model/gltf+json";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".wasm")) return "application/wasm";
        if (path.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    public void stop() {
        isRunning = false;
        try { if (serverSocket != null) serverSocket.close(); } catch (Exception ignored) {}
        executor.shutdownNow();
    }
}
`);

  // EODApplication.java — starts the server on app creation
  fs.writeFileSync(path.join(javaDir, "EODApplication.java"), `package com.eod.suittrainer;

import android.app.Application;

public class EODApplication extends Application {
    private static LocalAssetServer server;

    @Override
    public void onCreate() {
        super.onCreate();
        if (server == null) {
            server = new LocalAssetServer(this, 8888);
            server.start();
            server.waitUntilReady();
            android.util.Log.i("EODApp", "Local asset server started on port 8888");
        }
    }
}
`);

  // MainActivity.java — opens URL in Meta Quest Browser via explicit Package Intent
  fs.writeFileSync(path.join(javaDir, "MainActivity.java"), `package com.eod.suittrainer;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

public class MainActivity extends Activity {
    private static final String TAG = "EODMainActivity";
    private static final String URL = "http://localhost:8888/index.html";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.i(TAG, "Launching EOD Suit Trainer WebXR in Meta Quest Browser");

        // Small delay to ensure asset server is fully ready
        try { Thread.sleep(500); } catch (InterruptedException ignored) {}

        // Target Meta Quest Browser directly (native WebXR + passthrough support)
        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(URL));
        browserIntent.setPackage("com.oculus.browser");
        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            startActivity(browserIntent);
            Log.i(TAG, "Started com.oculus.browser successfully");
        } catch (Exception e) {
            Log.w(TAG, "Could not open with com.oculus.browser, trying generic Intent: " + e.getMessage());
            try {
                Intent fallbackIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(URL));
                fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(fallbackIntent);
            } catch (Exception ex) {
                Log.e(TAG, "Failed to launch browser: " + ex.getMessage());
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
    }
}
`);

  console.log("  ✅ Simple Android project created (no TWA dependencies)");

  // --- Bundle all web assets ---
  const assetsWwwDir = path.join(manifestDir, "assets/www");
  if (fs.existsSync(assetsWwwDir)) {
    fs.rmSync(assetsWwwDir, { recursive: true, force: true });
  }
  fs.mkdirSync(assetsWwwDir, { recursive: true });
  copyRecursive(path.resolve("dist"), assetsWwwDir);
  copyRecursive(path.resolve("public"), assetsWwwDir);
  console.log("  ✅ All GLTF models & WebXR assets bundled in APK");

  // --- Icons ---
  const srcIcon = path.resolve("public/icon-512.png");
  const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(sizes)) {
    const dir = path.join(manifestDir, `res/mipmap-${density}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(srcIcon, path.join(dir, "ic_launcher.png"));
  }
  console.log("  ✅ App icons set");

  // --- Build ---
  console.log("\n=== 3. Compiling Release APK ===");
  const env = {
    ...process.env,
    JAVA_HOME: jdkPath,
    ANDROID_HOME: sdkPath,
    ANDROID_SDK_ROOT: sdkPath,
    PATH: jdkPath + "/bin;" + sdkPath + "/platform-tools;" + process.env.PATH
  };

  const gradlew = path.join(projectDir, "gradlew.bat");
  execSync(`"${gradlew}" clean assembleRelease`, { cwd: projectDir, env, stdio: "inherit" });

  // --- Sign ---
  console.log("=== 4. Signing Release APK ===");
  const unsignedApk = path.join(projectDir, "app/build/outputs/apk/release/app-release-unsigned.apk");
  const finalApk = path.join(apkOutputDir, "eod-suit-trainer.apk");
  const buildTools = path.join(sdkPath, "build-tools/34.0.0");
  const zipalign = path.join(buildTools, "zipalign.exe");
  const apksigner = path.join(buildTools, "apksigner.bat");
  const alignedApk = path.join(projectDir, "app-release-aligned.apk");

  if (fs.existsSync(alignedApk)) fs.unlinkSync(alignedApk);
  if (fs.existsSync(finalApk)) fs.unlinkSync(finalApk);

  execSync(`"${zipalign}" -v -p 4 "${unsignedApk}" "${alignedApk}"`, { env, stdio: "inherit" });
  const ks = path.join(projectDir, "eod-release.keystore");
  execSync(`"${apksigner}" sign --ks "${ks}" --ks-key-alias eodkey --ks-pass pass:eodtrainer123 --key-pass pass:eodtrainer123 --out "${finalApk}" "${alignedApk}"`, { env, stdio: "inherit" });

  console.log("=== 5. Verifying ===");
  execSync(`"${apksigner}" verify --verbose "${finalApk}"`, { env, stdio: "inherit" });

  const stats = fs.statSync(finalApk);
  
  // Copy to Z:\ drive path if available
  const zOutputDir = "Z:/Media/Projects/Misc/XR/apk";
  try {
    fs.mkdirSync(zOutputDir, { recursive: true });
    const zDest = path.join(zOutputDir, "eod-suit-trainer-v1.9.0.apk");
    fs.copyFileSync(finalApk, zDest);
    console.log("  ✅ Copied to Z: drive:", zDest);
  } catch (zErr) {
    console.log("  ℹ️ Z: drive copy skipped (" + zErr.message + ")");
  }

  console.log("\n======================================================");
  console.log("🎉 META QUEST APK v1.9.0 — READY!");
  console.log("📁 Location:", finalApk);
  console.log("📦 Size:", (stats.size / (1024 * 1024)).toFixed(2), "MB");
  console.log("🎯 Native Target: com.oculus.browser (Meta Quest Browser)");
  console.log("======================================================");
}

build().catch(err => {
  console.error("Build failed:", err);
  process.exit(1);
});
