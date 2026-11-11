package com.watertracker.aquatamagotchi;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;

/**
 * Обгортка над веб-версією: файли гри беруться з оновлення, завантаженого
 * WebUpdater, або з assets/www і віддаються з https-адреси (а не file://),
 * щоб localStorage і запити до API погоди працювали так само, як у браузері.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";

    private WebView webView;
    private Updater updater;
    private WebUpdater webUpdater;
    private long pausedAt = 0;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF1C2E3D);
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setTextZoom(100);

        // Міст для гри: передає час наступного пиття в нативні нагадування
        webView.addJavascriptInterface(new ReminderBridge(), "AndroidBridge");

        // Веб-частина гри оновлюється сама: застосовуємо завантажене раніше оновлення
        webUpdater = new WebUpdater(this);
        webUpdater.applyStaged();
        webUpdater.checkInBackground(true);

        updater = new Updater(this);
        updater.check(false);  // автоматична перевірка оновлень (не частіше ніж раз на 6 год)

        Reminders.ensureChannel(this);
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        }
        NotificationSetup.maybeShowXiaomiHint(this);

        // Потрібен для alert()/prompt() у грі
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!HOST.equals(uri.getHost())) return null; // API погоди — звичайна мережа
                String path = uri.getPath();
                if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
                try {
                    InputStream in = webUpdater.open(path.substring(1));
                    return new WebResourceResponse(mimeType(path), "UTF-8", in);
                } catch (IOException e) {
                    WebResourceResponse r = new WebResourceResponse("text/plain", "UTF-8", null);
                    r.setStatusCodeAndReasonPhrase(404, "Not Found");
                    return r;
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost())) return false;
                // Зовнішні посилання — у системному браузері
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                return true;
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    /** Методи, доступні з JavaScript як window.AndroidBridge.* */
    private class ReminderBridge {
        @JavascriptInterface
        public void sync(double nextDrinkAt, int intervalSec, boolean isDead, boolean goalMet) {
            Reminders.sync(getApplicationContext(), (long) nextDrinkAt, intervalSec, isDead, goalMet);
        }

        @JavascriptInterface
        public void syncPlan(String json) {
            Reminders.syncPlan(getApplicationContext(), json);
        }

        @JavascriptInterface
        public String getNotificationStatus() {
            return NotificationSetup.status(MainActivity.this);
        }

        @JavascriptInterface
        public void openNotificationSetting(final String what) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() { NotificationSetup.open(MainActivity.this, what); }
            });
        }

        @JavascriptInterface
        public void testNotification() {
            Reminders.scheduleTest(getApplicationContext());
        }

        @JavascriptInterface
        public String getVersion() {
            return Updater.currentVersion(MainActivity.this) + " · веб " + webUpdater.versionLabel();
        }

        @JavascriptInterface
        public void checkForUpdates() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    updater.check(true);
                    webUpdater.checkInBackground(true);
                }
            });
        }
    }

    private static String mimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".webp")) return "image/webp";
        return "application/octet-stream";
    }

    // "Назад": спочатку закриваємо відкрите модальне вікно, інакше виходимо
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        webView.evaluateJavascript(
            "(function(){var m=document.querySelector('.modal:not(.hidden)');" +
            "if(m){m.classList.add('hidden');return true;}return false;})()",
            new ValueCallback<String>() {
                @Override
                public void onReceiveValue(String value) {
                    if (!"true".equals(value)) finish();
                }
            });
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        Reminders.appVisible = true;
        Reminders.clearNotifications(this);
        webView.onResume();
        webView.resumeTimers();

        // Повернулися після паузи — непомітно підхоплюємо завантажене оновлення гри
        if (pausedAt > 0 && System.currentTimeMillis() - pausedAt > 5 * 60 * 1000L
                && webUpdater.applyStaged()) {
            webView.reload();
        }
        pausedAt = 0;
        webUpdater.checkInBackground(false);
    }

    @Override
    protected void onPause() {
        Reminders.appVisible = false;
        pausedAt = System.currentTimeMillis();
        webView.onPause();
        webView.pauseTimers();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
