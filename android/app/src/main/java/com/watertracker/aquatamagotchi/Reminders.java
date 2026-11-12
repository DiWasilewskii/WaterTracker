package com.watertracker.aquatamagotchi;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * Планування нагадувань через AlarmManager — працюють, навіть коли застосунок закритий.
 * Стан (час наступного пиття, інтервал тощо) гра передає через JS-міст і він
 * зберігається в SharedPreferences, щоб пережити перезавантаження телефону.
 */
final class Reminders {
    static final String ACTION_DRINK = "com.watertracker.aquatamagotchi.DRINK_REMINDER";
    static final String ACTION_EVENING = "com.watertracker.aquatamagotchi.EVENING_REMINDER";
    static final String ACTION_TEST = "com.watertracker.aquatamagotchi.TEST_REMINDER";

    // v2: канал із показом на заблокованому екрані (налаштування старого каналу змінити не можна)
    private static final String CHANNEL_ID = "drink_reminders_v2";
    private static final String OLD_CHANNEL_ID = "drink_reminders";
    private static final String PREFS = "reminders";
    private static final int NOTIF_DRINK = 1;
    private static final int NOTIF_EVENING = 2;
    private static final int NOTIF_TEST = 3;

    private static final long MIN_REPEAT_MS = 15 * 60 * 1000L;  // повтори не частіше ніж раз на 15 хв
    private static final long TEST_DELAY_MS = 15 * 1000L;       // тестове сповіщення — через 15 с
    private static final int EVENING_HOUR = 21;                 // вечірнє попередження, якщо норму не виконано

    /** true, коли гра відкрита на екрані — тоді сповіщення не потрібні. */
    static volatile boolean appVisible = false;

    private Reminders() { }

    // ---------- Стан ----------

    /** Старий формат (гра до версії 7): найближчий час і фіксований інтервал повторів. */
    static void sync(Context ctx, long nextDrinkAt, int intervalSec, boolean isDead, boolean goalMet) {
        prefs(ctx).edit()
            .putBoolean("usePlan", false)
            .putLong("nextDrinkAt", nextDrinkAt)
            .putInt("intervalSec", intervalSec)
            .putBoolean("isDead", isDead)
            .putBoolean("goalMet", goalMet)
            .putLong("goalDay", today())
            .apply();
        rescheduleAll(ctx);
    }

    /**
     * План нагадувань від гри (за розкладом активностей і часом від останнього пиття):
     * { reminders: [{at, title, text}], fallbackSec, eveningAt, eveningText, isDead }.
     * Тексти вже персоналізовані (ім'я, активність), уночі нагадувань у плані немає.
     */
    static void syncPlan(Context ctx, String json) {
        try {
            JSONObject o = new JSONObject(json);
            prefs(ctx).edit()
                .putBoolean("usePlan", true)
                .putString("plan", o.optJSONArray("reminders") != null ? o.getJSONArray("reminders").toString() : "[]")
                .putInt("intervalSec", o.optInt("fallbackSec", 3600))
                .putLong("eveningAt", o.optLong("eveningAt", 0))
                .putString("eveningText", o.optString("eveningText", ""))
                .putBoolean("isDead", o.optBoolean("isDead", false))
                .apply();
        } catch (Exception ignored) {
            return;
        }
        rescheduleAll(ctx);
    }

    /** Перше нагадування плану, що настає після `after` (або null). */
    private static JSONObject nextPlanItem(SharedPreferences p, long after) {
        try {
            JSONArray arr = new JSONArray(p.getString("plan", "[]"));
            JSONObject best = null;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject it = arr.getJSONObject(i);
                long at = it.optLong("at", 0);
                if (at > after && (best == null || at < best.optLong("at"))) best = it;
            }
            return best;
        } catch (Exception e) {
            return null;
        }
    }

    /** Нагадування плану, яке мало спрацювати щойно (найпізніше не пізніше now + 1 хв). */
    private static JSONObject duePlanItem(SharedPreferences p, long now) {
        try {
            JSONArray arr = new JSONArray(p.getString("plan", "[]"));
            JSONObject best = null;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject it = arr.getJSONObject(i);
                long at = it.optLong("at", 0);
                if (at <= now + 60_000L && (best == null || at > best.optLong("at"))) best = it;
            }
            return best;
        } catch (Exception e) {
            return null;
        }
    }

    private static void rescheduleFromPlan(Context ctx, SharedPreferences p) {
        long now = System.currentTimeMillis();
        JSONObject next = nextPlanItem(p, now);
        // План закінчився (гру давно не відкривали) — повторюємо з базовим інтервалом
        schedule(ctx, ACTION_DRINK, next != null ? next.optLong("at") : now + repeatMs(p));

        long evening = p.getLong("eveningAt", 0);
        if (evening > now) schedule(ctx, ACTION_EVENING, evening);
        else cancel(ctx, ACTION_EVENING);
    }

    static void rescheduleAll(Context ctx) {
        SharedPreferences p = prefs(ctx);
        if (p.getBoolean("isDead", false)) {
            cancel(ctx, ACTION_DRINK);
            cancel(ctx, ACTION_EVENING);
            return;
        }
        if (p.getBoolean("usePlan", false)) {
            rescheduleFromPlan(ctx, p);
            return;
        }
        if (!p.contains("nextDrinkAt")) {
            cancel(ctx, ACTION_DRINK);
            cancel(ctx, ACTION_EVENING);
            return;
        }

        long next = p.getLong("nextDrinkAt", 0);
        long now = System.currentTimeMillis();
        if (next <= now) next = now + repeatMs(p);  // вже прострочено — нагадаємо згодом ще раз
        schedule(ctx, ACTION_DRINK, next);

        // Вечірнє попередження: лише сьогодні і лише якщо норму ще не виконано
        boolean goalMetToday = p.getBoolean("goalMet", false) && p.getLong("goalDay", 0) == today();
        long evening = eveningToday();
        if (!goalMetToday && evening > now) schedule(ctx, ACTION_EVENING, evening);
        else cancel(ctx, ACTION_EVENING);
    }

    /** Тестове сповіщення тим самим шляхом, що й справжні (через AlarmManager). */
    static void scheduleTest(Context ctx) {
        schedule(ctx, ACTION_TEST, System.currentTimeMillis() + TEST_DELAY_MS);
    }

    /** Викликається з ReminderReceiver, коли спрацював будильник. */
    static void onAlarm(Context ctx, String action) {
        SharedPreferences p = prefs(ctx);

        if (ACTION_TEST.equals(action)) {
            show(ctx, NOTIF_TEST, "🔔 Тестове сповіщення",
                "Сповіщення працюють! Крапелька нагадає, коли настане час пити.");
            return;
        }
        if (p.getBoolean("isDead", false)) return;

        if (p.getBoolean("usePlan", false)) {
            long now = System.currentTimeMillis();
            if (ACTION_DRINK.equals(action)) {
                if (!appVisible) {
                    JSONObject it = duePlanItem(p, now);
                    if (it != null) {
                        show(ctx, NOTIF_DRINK, it.optString("title"), it.optString("text"));
                    } else {
                        show(ctx, NOTIF_DRINK, "💧 Крапелька хоче пити!",
                            "Час випити води — не дай улюбленцю засохнути.");
                    }
                }
                rescheduleFromPlan(ctx, p);
            } else if (ACTION_EVENING.equals(action)) {
                String text = p.getString("eveningText", "");
                if (!appVisible) {
                    show(ctx, NOTIF_EVENING, "⚠️ Денна норма ще не виконана",
                        text.isEmpty() ? "Випий води, інакше улюбленець не доживе до ранку!" : text);
                }
            }
            return;
        }

        if (ACTION_DRINK.equals(action)) {
            if (!appVisible) {
                show(ctx, NOTIF_DRINK, "💧 Крапелька хоче пити!",
                    "Час випити води — не дай улюбленцю засохнути.");
            }
            // Поки користувач не відмітить пиття — повторюємо нагадування
            long next = System.currentTimeMillis() + repeatMs(p);
            p.edit().putLong("nextDrinkAt", next).apply();
            schedule(ctx, ACTION_DRINK, next);
        } else if (ACTION_EVENING.equals(action)) {
            boolean goalMetToday = p.getBoolean("goalMet", false) && p.getLong("goalDay", 0) == today();
            if (!goalMetToday && !appVisible) {
                show(ctx, NOTIF_EVENING, "⚠️ Денна норма ще не виконана",
                    "До кінця дня залишилось небагато. Випий води, інакше улюбленець не доживе до ранку!");
            }
        }
    }

    static void clearNotifications(Context ctx) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(NOTIF_DRINK);
            nm.cancel(NOTIF_EVENING);
        }
    }

    // ---------- Допоміжне ----------

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static long repeatMs(SharedPreferences p) {
        return Math.max(p.getInt("intervalSec", 3600) * 1000L, MIN_REPEAT_MS);
    }

    private static long today() {
        Calendar c = Calendar.getInstance();
        return c.get(Calendar.YEAR) * 1000L + c.get(Calendar.DAY_OF_YEAR);
    }

    private static long eveningToday() {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, EVENING_HOUR);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    private static PendingIntent alarmIntent(Context ctx, String action) {
        Intent i = new Intent(ctx, ReminderReceiver.class).setAction(action);
        int code = ACTION_DRINK.equals(action) ? 1 : ACTION_EVENING.equals(action) ? 2 : 3;
        return PendingIntent.getBroadcast(ctx, code, i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static boolean canExact(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        return am != null && (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms());
    }

    private static void schedule(Context ctx, String action, long at) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = alarmIntent(ctx, action);
        if (canExact(ctx)) {
            // Спрацьовує вчасно навіть у режимі сну (Doze) при заблокованому екрані
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } else {
            // Без дозволу на точні будильники система може зсунути час
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    private static void cancel(Context ctx, String action) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(alarmIntent(ctx, action));
    }

    static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (nm.getNotificationChannel(OLD_CHANNEL_ID) != null) nm.deleteNotificationChannel(OLD_CHANNEL_ID);
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Нагадування пити воду",
            NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Нагадування від Крапельки, коли настав час пити");
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        ch.enableVibration(true);
        ch.enableLights(true);
        ch.setLightColor(0xFF0088FF);
        ch.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
            new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
        nm.createNotificationChannel(ch);
    }

    /** Чи дозволені сповіщення застосунку і нашого каналу. */
    static boolean notificationsEnabled(Context ctx) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || !nm.areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = nm.getNotificationChannel(CHANNEL_ID);
            if (ch != null && ch.getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
        }
        return true;
    }

    static String channelId() {
        return CHANNEL_ID;
    }

    @SuppressWarnings("deprecation")
    private static void show(Context ctx, int id, String title, String text) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        ensureChannel(ctx);

        Intent open = new Intent(ctx, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content = PendingIntent.getActivity(ctx, 0, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(ctx, CHANNEL_ID)
            : new Notification.Builder(ctx)
                .setPriority(Notification.PRIORITY_HIGH)
                .setDefaults(Notification.DEFAULT_ALL);
        b.setSmallIcon(R.drawable.ic_stat_drop)
            .setColor(0xFF0088FF)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new Notification.BigTextStyle().bigText(text))
            .setContentIntent(content)
            .setAutoCancel(true)
            .setShowWhen(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)   // показувати на заблокованому екрані
            .setCategory(Notification.CATEGORY_REMINDER);
        try {
            nm.notify(id, b.build());
        } catch (SecurityException ignored) {
            // Користувач не дав дозвіл на сповіщення (Android 13+)
        }
    }
}
