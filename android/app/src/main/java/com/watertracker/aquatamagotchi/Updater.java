package com.watertracker.aquatamagotchi;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Перевірка оновлень через GitHub Releases.
 * Публікуєте реліз з тегом виду "v1.3" і прикріпленим .apk — застосунок
 * пропонує оновитися, сам завантажує APK і відкриває системне вікно встановлення.
 */
final class Updater {
    private static final String LATEST_URL =
        "https://api.github.com/repos/DiWasilewskii/WaterTracker/releases/latest";
    private static final long AUTO_CHECK_EVERY_MS = 6 * 60 * 60 * 1000L;  // автоматично — раз на 6 год
    private static final String PREFS = "updater";
    private static final String APK_MIME = "application/vnd.android.package-archive";

    private final Activity activity;
    private long downloadId = -1;
    private Uri pendingInstall;          // APK завантажено, чекаємо дозволу на встановлення
    private BroadcastReceiver receiver;

    Updater(Activity activity) {
        this.activity = activity;
    }

    static String currentVersion(Context ctx) {
        try {
            PackageInfo pi = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            return pi.versionName;
        } catch (Exception e) {
            return "0";
        }
    }

    /** @param manual true — натиснуто кнопку в налаштуваннях: без обмеження частоти і з відповіддю "оновлень немає". */
    void check(final boolean manual) {
        final SharedPreferences p = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis();
        if (!manual && now - p.getLong("lastCheck", 0) < AUTO_CHECK_EVERY_MS) return;
        p.edit().putLong("lastCheck", now).apply();
        if (manual) toast("Перевіряю оновлення...");

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject rel = new JSONObject(httpGet(LATEST_URL));
                    final String tag = rel.optString("tag_name", "");
                    final String latest = tag.replaceFirst("^[vV]", "");
                    final String notes = rel.optString("body", "").trim();
                    String apk = null;
                    JSONArray assets = rel.optJSONArray("assets");
                    for (int i = 0; assets != null && i < assets.length(); i++) {
                        JSONObject a = assets.getJSONObject(i);
                        if (a.optString("name").toLowerCase().endsWith(".apk")) {
                            apk = a.optString("browser_download_url");
                            break;
                        }
                    }
                    final String apkUrl = apk;
                    final String current = currentVersion(activity);
                    final boolean newer = apkUrl != null && compare(latest, current) > 0;
                    final boolean skipped = latest.equals(p.getString("skipped", ""));

                    activity.runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            if (activity.isFinishing()) return;
                            if (newer && (manual || !skipped)) {
                                offer(latest, notes, apkUrl);
                            } else if (manual) {
                                toast("У вас остання версія (" + current + ")");
                            }
                        }
                    });
                } catch (final Exception e) {
                    if (manual) {
                        activity.runOnUiThread(new Runnable() {
                            @Override
                            public void run() { toast("Не вдалося перевірити оновлення. Перевірте інтернет."); }
                        });
                    }
                }
            }
        }).start();
    }

    private void offer(final String version, String notes, final String apkUrl) {
        String msg = "Доступна версія " + version + " (у вас " + currentVersion(activity) + ").";
        if (!notes.isEmpty()) {
            if (notes.length() > 600) notes = notes.substring(0, 600) + "…";
            msg += "\n\nЩо нового:\n" + notes;
        }
        msg += "\n\nПрогрес гри збережеться.";

        new AlertDialog.Builder(activity)
            .setTitle("💧 Нова версія!")
            .setMessage(msg)
            .setPositiveButton("Оновити", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface d, int w) { download(version, apkUrl); }
            })
            .setNegativeButton("Пізніше", null)
            .setNeutralButton("Пропустити", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface d, int w) {
                    activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                        .edit().putString("skipped", version).apply();
                }
            })
            .show();
    }

    private void download(String version, String apkUrl) {
        try {
            DownloadManager dm = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
            String fileName = "AquaTamagotchi-" + version + ".apk";
            File old = new File(activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fileName);
            if (old.exists()) old.delete();

            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(apkUrl))
                .setTitle("Аква-Тамагочі " + version)
                .setDescription("Завантаження оновлення")
                .setMimeType(APK_MIME)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                .setDestinationInExternalFilesDir(activity, Environment.DIRECTORY_DOWNLOADS, fileName);

            registerReceiver();
            downloadId = dm.enqueue(req);
            toast("Завантажую оновлення...");
        } catch (Exception e) {
            // Запасний варіант — завантаження через браузер
            openInBrowser(apkUrl);
        }
    }

    private void registerReceiver() {
        if (receiver != null) return;
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id != downloadId) return;
                onDownloaded(id);
            }
        };
        IntentFilter f = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) {
            activity.registerReceiver(receiver, f, Context.RECEIVER_EXPORTED);
        } else {
            activity.registerReceiver(receiver, f);
        }
    }

    private void onDownloaded(long id) {
        DownloadManager dm = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
        Cursor c = dm.query(new DownloadManager.Query().setFilterById(id));
        boolean ok = false;
        if (c != null) {
            if (c.moveToFirst()) {
                int status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                ok = status == DownloadManager.STATUS_SUCCESSFUL;
            }
            c.close();
        }
        if (!ok) {
            toast("Не вдалося завантажити оновлення");
            return;
        }
        pendingInstall = dm.getUriForDownloadedFile(id);
        installIfAllowed();
    }

    /** Викликати з onResume — повернулися з налаштувань дозволу. */
    void onResume() {
        if (pendingInstall != null) installIfAllowed();
    }

    private void installIfAllowed() {
        if (pendingInstall == null) return;
        if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
            toast("Дозвольте встановлення оновлень для Аква-Тамагочі й поверніться назад");
            try {
                activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + activity.getPackageName())));
            } catch (Exception ignored) { }
            return;  // продовжимо в onResume
        }
        Uri uri = pendingInstall;
        pendingInstall = null;
        try {
            Intent i = new Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, APK_MIME)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(i);
        } catch (Exception e) {
            toast("Не вдалося відкрити встановлення");
        }
    }

    void destroy() {
        if (receiver != null) {
            try { activity.unregisterReceiver(receiver); } catch (Exception ignored) { }
            receiver = null;
        }
    }

    private void openInBrowser(String url) {
        try {
            activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) { }
    }

    private void toast(String s) {
        Toast.makeText(activity, s, Toast.LENGTH_LONG).show();
    }

    /** Порівняння версій виду 1.10.2 > 1.9 */
    static int compare(String a, String b) {
        String[] x = a.split("[^0-9]+"), y = b.split("[^0-9]+");
        for (int i = 0; i < Math.max(x.length, y.length); i++) {
            int xi = i < x.length && !x[i].isEmpty() ? Integer.parseInt(x[i]) : 0;
            int yi = i < y.length && !y[i].isEmpty() ? Integer.parseInt(y[i]) : 0;
            if (xi != yi) return xi < yi ? -1 : 1;
        }
        return 0;
    }

    private static String httpGet(String url) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setConnectTimeout(10000);
        con.setReadTimeout(10000);
        con.setRequestProperty("Accept", "application/vnd.github+json");
        con.setRequestProperty("User-Agent", "AquaTamagotchi-Android");
        try {
            if (con.getResponseCode() != 200) throw new Exception("HTTP " + con.getResponseCode());
            InputStream in = con.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } finally {
            con.disconnect();
        }
    }
}
