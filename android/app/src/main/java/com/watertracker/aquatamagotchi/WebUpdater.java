package com.watertracker.aquatamagotchi;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Build;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Iterator;

/**
 * Непомітне оновлення веб-частини гри (HTML/CSS/JS/картинки) без нового APK.
 *
 * Як це працює:
 *  1. У фоні завантажується web-version.json з GitHub (номер версії + SHA-256 кожного файлу).
 *  2. Якщо версія новіша — файли завантажуються в папку staging і перевіряються за SHA-256.
 *     Незмінені файли не завантажуються, а копіюються з поточної версії.
 *  3. При наступному запуску (або поверненні в застосунок після паузи) staging стає поточною.
 *
 * Гра й далі відкривається з https://appassets.androidplatform.net, тож localStorage
 * (прогрес) не губиться. Без інтернету працює остання завантажена або вбудована версія.
 */
final class WebUpdater {
    private static final String BASE = "https://raw.githubusercontent.com/DiWasilewskii/WaterTracker/main/";
    private static final String VERSION_FILE = "web-version.json";
    private static final long CHECK_EVERY_MS = 30 * 60 * 1000L;
    private static final String PREFS = "web_updater";

    private final Context ctx;
    private final File root, current, staging;
    private final int bundledVersion;
    private volatile int activeVersion;      // 0 = вбудована в APK версія з assets
    private volatile boolean checking;

    WebUpdater(Context context) {
        ctx = context.getApplicationContext();
        root = new File(ctx.getFilesDir(), "web");
        current = new File(root, "current");
        staging = new File(root, "staging");
        bundledVersion = readVersion(openAsset(VERSION_FILE));
        activeVersion = prefs().getInt("active", 0);

        // Оновили APK з новішою вбудованою версією — завантажена більше не потрібна
        if (activeVersion != 0 && activeVersion <= bundledVersion) {
            deleteRecursive(current);
            setActive(0);
        }
    }

    // ---------- Віддача файлів WebView ----------

    /** Файл гри: спершу з завантаженого оновлення, інакше з APK. */
    InputStream open(String path) throws IOException {
        if (activeVersion != 0) {
            File f = new File(current, path);
            if (f.isFile()) return new FileInputStream(f);
        }
        InputStream in = openAsset(path);
        if (in == null) throw new IOException("not found: " + path);
        return in;
    }

    String versionLabel() {
        return String.valueOf(Math.max(activeVersion, bundledVersion));
    }

    // ---------- Застосування ----------

    boolean hasStagedUpdate() {
        return prefs().getInt("staged", 0) > activeVersionOrBundled();
    }

    /** Робить завантажене оновлення поточним. Викликати перед завантаженням сторінки. */
    synchronized boolean applyStaged() {
        if (checking) return false;  // саме йде завантаження — застосуємо наступного разу
        int staged = prefs().getInt("staged", 0);
        if (staged <= activeVersionOrBundled() || !new File(staging, VERSION_FILE).isFile()) return false;
        File old = new File(root, "old");
        deleteRecursive(old);
        if (current.exists() && !current.renameTo(old)) return false;
        if (!staging.renameTo(current)) {
            old.renameTo(current);
            return false;
        }
        deleteRecursive(old);
        setActive(staged);
        prefs().edit().remove("staged").apply();
        return true;
    }

    // ---------- Перевірка та завантаження ----------

    void checkInBackground(boolean force) {
        long now = System.currentTimeMillis();
        if (checking || (!force && now - prefs().getLong("lastCheck", 0) < CHECK_EVERY_MS)) return;
        checking = true;
        prefs().edit().putLong("lastCheck", now).apply();
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    download();
                } catch (Exception ignored) {
                    // Немає мережі або файли ще не однакові на сервері — спробуємо пізніше
                } finally {
                    checking = false;
                }
            }
        }).start();
    }

    private void download() throws Exception {
        byte[] manifestBytes = httpGet(BASE + VERSION_FILE + "?t=" + System.currentTimeMillis());
        JSONObject manifest = new JSONObject(new String(manifestBytes, "UTF-8"));
        int version = manifest.getInt("version");
        int minNative = manifest.optInt("minNativeCode", 0);
        if (version <= activeVersionOrBundled() || version <= prefs().getInt("staged", 0)) return;
        if (nativeVersionCode() < minNative) return;  // потрібен новий APK — це зробить Updater

        prefs().edit().remove("staged").commit();  // поки качаємо — старий staging недійсний
        deleteRecursive(staging);
        JSONObject files = manifest.getJSONObject("files");
        Iterator<String> it = files.keys();
        while (it.hasNext()) {
            String path = it.next();
            if (!isSafePath(path)) throw new IOException("bad path: " + path);
            String sha = files.getString(path).toLowerCase();
            File dest = new File(staging, path);
            dest.getParentFile().mkdirs();

            byte[] data = existingWithHash(path, sha);
            if (data == null) {
                data = httpGet(BASE + path + "?v=" + version);
                if (!sha.equals(sha256(data))) throw new IOException("hash mismatch: " + path);
            }
            writeFile(dest, data);
        }
        writeFile(new File(staging, VERSION_FILE), manifestBytes);
        prefs().edit().putInt("staged", version).apply();
    }

    /** Беремо файл локально, якщо в поточній версії він уже такий самий. */
    private byte[] existingWithHash(String path, String sha) {
        try {
            byte[] data = readAll(open(path));
            return sha.equals(sha256(data)) ? data : null;
        } catch (Exception e) {
            return null;
        }
    }

    // ---------- Допоміжне ----------

    private int activeVersionOrBundled() {
        return Math.max(activeVersion, bundledVersion);
    }

    private void setActive(int v) {
        activeVersion = v;
        prefs().edit().putInt("active", v).apply();
    }

    private SharedPreferences prefs() {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private long nativeVersionCode() {
        try {
            PackageInfo pi = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : versionCodeLegacy(pi);
        } catch (Exception e) {
            return 0;
        }
    }

    @SuppressWarnings("deprecation")
    private static long versionCodeLegacy(PackageInfo pi) {
        return pi.versionCode;
    }

    private InputStream openAsset(String path) {
        try {
            return ctx.getAssets().open("www/" + path);
        } catch (IOException e) {
            return null;
        }
    }

    private static int readVersion(InputStream in) {
        try {
            return new JSONObject(new String(readAll(in), "UTF-8")).getInt("version");
        } catch (Exception e) {
            return 0;
        }
    }

    private static boolean isSafePath(String p) {
        return !p.isEmpty() && !p.startsWith("/") && !p.contains("..") && !p.contains("\\")
            && p.matches("[A-Za-z0-9_./-]+");
    }

    private static byte[] httpGet(String url) throws IOException {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setConnectTimeout(15000);
        con.setReadTimeout(20000);
        con.setRequestProperty("User-Agent", "AquaTamagotchi-Android");
        con.setUseCaches(false);
        try {
            if (con.getResponseCode() != 200) throw new IOException("HTTP " + con.getResponseCode());
            return readAll(con.getInputStream());
        } finally {
            con.disconnect();
        }
    }

    private static byte[] readAll(InputStream in) throws IOException {
        if (in == null) throw new IOException("no stream");
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        } finally {
            in.close();
        }
    }

    private static void writeFile(File f, byte[] data) throws IOException {
        OutputStream out = new FileOutputStream(f);
        try {
            out.write(data);
        } finally {
            out.close();
        }
    }

    private static String sha256(byte[] data) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(data);
        StringBuilder sb = new StringBuilder();
        for (byte b : d) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private static void deleteRecursive(File f) {
        if (f == null || !f.exists()) return;
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteRecursive(k);
        f.delete();
    }
}
