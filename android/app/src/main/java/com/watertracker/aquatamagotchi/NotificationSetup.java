package com.watertracker.aquatamagotchi;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ComponentName;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import org.json.JSONObject;

/**
 * Перевірка й налаштування всього, від чого залежить доставка нагадувань,
 * коли застосунок закритий, а телефон заблокований:
 *  - дозвіл на сповіщення;
 *  - точні будильники (Android 12+);
 *  - відсутність обмежень батареї;
 *  - «Автозапуск» на Xiaomi/Redmi/POCO — без нього MIUI/HyperOS скасовує
 *    будильники закритого застосунку, і сповіщення не приходять.
 */
final class NotificationSetup {
    private static final String PREFS = "notif_setup";

    private NotificationSetup() { }

    static boolean isXiaomi() {
        String m = (Build.MANUFACTURER + " " + Build.BRAND).toLowerCase();
        return m.contains("xiaomi") || m.contains("redmi") || m.contains("poco");
    }

    static boolean batteryUnrestricted(Context ctx) {
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
    }

    /** Стан для екрана налаштувань гри (JSON). */
    static String status(Context ctx) {
        try {
            JSONObject o = new JSONObject();
            o.put("notifications", Reminders.notificationsEnabled(ctx));
            o.put("exact", Reminders.canExact(ctx));
            o.put("battery", batteryUnrestricted(ctx));
            o.put("xiaomi", isXiaomi());
            o.put("autostartConfirmed", ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean("autostartOpened", false));
            return o.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    /** Відкриває потрібний екран налаштувань системи. */
    static void open(Activity a, String what) {
        String pkg = a.getPackageName();
        Intent i = null;
        switch (what) {
            case "notifications":
                if (Build.VERSION.SDK_INT >= 33
                        && a.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                        && !a.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("askedPost", false)) {
                    a.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean("askedPost", true).apply();
                    a.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
                    return;
                }
                if (Build.VERSION.SDK_INT >= 26) {
                    i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                        .putExtra(Settings.EXTRA_APP_PACKAGE, pkg);
                }
                break;
            case "exact":
                if (Build.VERSION.SDK_INT >= 31) {
                    i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + pkg));
                }
                break;
            case "battery":
                i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                break;
            case "autostart":
                a.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean("autostartOpened", true).apply();
                i = new Intent().setComponent(new ComponentName("com.miui.securitycenter",
                    "com.miui.permcenter.autostart.AutoStartManagementActivity"));
                break;
            default:
                break;
        }
        if (i != null && tryStart(a, i)) return;
        // Запасний варіант — сторінка застосунку в налаштуваннях (там є все: сповіщення, батарея, автозапуск)
        tryStart(a, new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg)));
    }

    private static boolean tryStart(Activity a, Intent i) {
        try {
            a.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Один раз на Xiaomi пояснюємо, що треба увімкнути автозапуск. */
    static void maybeShowXiaomiHint(final Activity a) {
        if (!isXiaomi()) return;
        final android.content.SharedPreferences p = a.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (p.getBoolean("xiaomiHintShown", false)) return;
        p.edit().putBoolean("xiaomiHintShown", true).apply();

        new AlertDialog.Builder(a)
            .setTitle("🔔 Щоб нагадування приходили")
            .setMessage("На телефонах Xiaomi система вимикає нагадування закритих застосунків.\n\n"
                + "1. Увімкніть «Автозапуск» для Крапельки.\n"
                + "2. У «Контроль активності» / «Економія заряду» оберіть «Без обмежень».\n"
                + "3. Не змахуйте застосунок зі списку недавніх або закріпіть його там (замочок).\n\n"
                + "Усе це також є в налаштуваннях гри → «Сповіщення».")
            .setPositiveButton("Увімкнути автозапуск", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface d, int w) { open(a, "autostart"); }
            })
            .setNegativeButton("Пізніше", null)
            .show();
    }
}
