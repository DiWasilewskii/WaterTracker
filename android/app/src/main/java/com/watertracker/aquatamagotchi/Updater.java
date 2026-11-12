package com.watertracker.aquatamagotchi;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Перевірка оновлень через GitHub Releases.
 * Публікуєте реліз з тегом виду "v1.3" і прикріпленим .apk — застосунок
 * пропонує оновитися і відкриває APK у браузері, а встановлює його вже браузер.
 *
 * Свідомо НЕ використовуємо дозвіл REQUEST_INSTALL_PACKAGES: з ним перевірка
 * безпеки (Xiaomi, Play Protect) вважає застосунок ризикованим і блокує встановлення.
 */
final class Updater {
    private static final String LATEST_URL =
        "https://api.github.com/repos/DiWasilewskii/WaterTracker/releases/latest";
    private static final long AUTO_CHECK_EVERY_MS = 6 * 60 * 60 * 1000L;  // автоматично — раз на 6 год
    private static final String PREFS = "updater";

    private final Activity activity;

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
                    final String latest = rel.optString("tag_name", "").replaceFirst("^[vV]", "");
                    final String notes = rel.optString("body", "").trim();
                    final String pageUrl = rel.optString("html_url", "");
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
                                offer(latest, notes, apkUrl, pageUrl);
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

    private void offer(final String version, String notes, final String apkUrl, final String pageUrl) {
        String msg = "Доступна версія " + version + " (у вас " + currentVersion(activity) + ").";
        if (!notes.isEmpty()) {
            if (notes.length() > 600) notes = notes.substring(0, 600) + "…";
            msg += "\n\nЩо нового:\n" + notes;
        }
        msg += "\n\nНатисніть «Оновити» — APK завантажиться в браузері. "
            + "Потім відкрийте його і підтвердіть встановлення. Прогрес гри збережеться.";

        new AlertDialog.Builder(activity)
            .setTitle("💧 Нова версія!")
            .setMessage(msg)
            .setPositiveButton("Оновити", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface d, int w) {
                    if (!openInBrowser(apkUrl)) openInBrowser(pageUrl);
                }
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

    private boolean openInBrowser(String url) {
        if (url == null || url.isEmpty()) return false;
        try {
            activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            return true;
        } catch (Exception e) {
            return false;
        }
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
        con.setRequestProperty("User-Agent", "Krapelka-Android");
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
