package com.watertracker.aquatamagotchi;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Отримує спрацювання будильників, а також перезапуск телефону / оновлення застосунку. */
public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;
        switch (action) {
            case Intent.ACTION_BOOT_COMPLETED:
            case Intent.ACTION_MY_PACKAGE_REPLACED:
            case "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED":
                // Будильники скидаються після перезавантаження — відновлюємо їх
                Reminders.rescheduleAll(ctx);
                break;
            default:
                Reminders.onAlarm(ctx, action);
        }
    }
}
