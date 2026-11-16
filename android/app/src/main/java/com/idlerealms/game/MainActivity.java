package com.idlerealms.game;

import android.app.Activity;
import android.content.Intent;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.KeyGenerator;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import androidx.webkit.WebViewAssetLoader;

/** Hosts the HTML game in a full-screen WebView, served from the APK's assets. */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/www/index.html";
    // Update check: the only network request the app makes, to this repository's GitHub releases.
    private static final String RELEASES_API = "https://api.github.com/repos/justpoqui/afk/releases?per_page=30";
    private static final String DOWNLOAD_PREFIX = "https://github.com/justpoqui/afk/releases/download/";
    private static final Pattern VERSION_TAG = Pattern.compile("^v(\\d+)\\.(\\d+)\\.(\\d+)$");
    private volatile String updateUrl;
    private boolean autoChecked;
    private WebView web;
    private OnBackInvokedCallback backCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        // Web debugging only in debug builds; release builds can't be inspected or scripted from a PC.
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#14111F"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true); // localStorage holds the save game
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setGeolocationEnabled(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= 26) s.setSafeBrowsingEnabled(true);

        web.setWebViewClient(new WebViewClient() {
            // Only the game's own packaged files can load: anything else (any website) is refused.
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost()) && "https".equals(u.getScheme())) {
                    WebResourceResponse r = loader.shouldInterceptRequest(u);
                    if (r != null) return r;
                }
                return new WebResourceResponse("text/plain", "utf-8", 403, "Forbidden", null, new ByteArrayInputStream(new byte[0]));
            }

            // The page can never navigate away from the game.
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                return !(HOST.equals(u.getHost()) && "https".equals(u.getScheme()));
            }
        });
        web.setWebChromeClient(new WebChromeClient()); // enables confirm()/alert() dialogs
        web.addJavascriptInterface(new SaveSigner(), "IRNative"); // safe: only our own packaged page can load
        web.addJavascriptInterface(new AppBridge(), "IRApp");

        // Keep the game clear of the status bar and gesture/navigation bar (edge-to-edge on Android 15+).
        // A WebView ignores its own padding, so the padding goes on a container around it.
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#14111F"));
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        root.setOnApplyWindowInsetsListener((View v, WindowInsets insets) -> {
            int top, bottom, left, right;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                top = i.top; bottom = i.bottom; left = i.left; right = i.right;
            } else {
                top = insets.getSystemWindowInsetTop(); bottom = insets.getSystemWindowInsetBottom();
                left = insets.getSystemWindowInsetLeft(); right = insets.getSystemWindowInsetRight();
            }
            v.setPadding(left, top, right, bottom);
            return insets;
        });

        setContentView(root);
        root.requestApplyInsets();
        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(START_URL);

        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = this::handleBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
    }

    /**
     * Signs save data with an HMAC-SHA256 key that lives in the Android Keystore. The key is created on
     * first use, never leaves the secure hardware and can't be read by anyone, so an edited save can't be
     * re-signed. freshKey() tells the game the key is new (reinstall / restored backup on a new phone).
     */
    static final class SaveSigner {
        private static final String ALIAS = "idle-realms-save-key";
        private Mac mac;
        private boolean fresh;

        private synchronized Mac mac() throws Exception {
            if (mac != null) return mac;
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
            ks.load(null);
            if (!ks.containsAlias(ALIAS)) {
                KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_HMAC_SHA256, "AndroidKeyStore");
                kg.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_SIGN).build());
                kg.generateKey();
                fresh = true;
            }
            Mac m = Mac.getInstance("HmacSHA256");
            m.init((SecretKey) ks.getKey(ALIAS, null));
            mac = m;
            return mac;
        }

        @JavascriptInterface
        public synchronized String sign(String data) {
            try {
                return Base64.encodeToString(mac().doFinal(data.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public synchronized boolean freshKey() {
            try { mac(); } catch (Exception e) { return false; }
            return fresh;
        }
    }

    /** Version info and the in-game update notice, exposed to the game page. */
    final class AppBridge {
        @JavascriptInterface
        public String version() { return appVersion(); }

        // manual: from the "Check for updates" button; otherwise once per launch.
        @JavascriptInterface
        public void checkUpdates(boolean manual) {
            if (!manual) { if (autoChecked) return; autoChecked = true; }
            checkForUpdate(manual);
        }

        // Opens only the APK link found by the check (always this repository's releases), never a URL from the page.
        @JavascriptInterface
        public void openUpdate() {
            final String url = updateUrl;
            if (url == null || !url.startsWith(DOWNLOAD_PREFIX)) return;
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) { }
            });
        }
    }

    private String appVersion() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "0.0.0"; }
    }

    private static int[] parseVersion(String v) {
        Matcher m = VERSION_TAG.matcher(v.startsWith("v") ? v : "v" + v);
        if (!m.matches()) return null;
        return new int[] { Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)) };
    }

    private static boolean newer(int[] a, int[] b) {
        for (int i = 0; i < 3; i++) if (a[i] != b[i]) return a[i] > b[i];
        return false;
    }

    /** Asks GitHub for this repository's releases and tells the game if a newer version (vX.Y.Z) has an APK. */
    private void checkForUpdate(final boolean manual) {
        new Thread(() -> {
            JSONObject info = new JSONObject();
            try {
                String current = appVersion();
                info.put("current", current);
                HttpURLConnection c = (HttpURLConnection) new URL(RELEASES_API).openConnection();
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                c.setRequestProperty("Accept", "application/vnd.github+json");
                c.setRequestProperty("User-Agent", "IdleRealms-Android");
                if (c.getResponseCode() != 200) throw new Exception("http " + c.getResponseCode());
                JSONArray releases = new JSONArray(readLimited(c.getInputStream(), 2_000_000));
                int[] best = parseVersion(current);
                String bestTag = null, bestUrl = null, bestNotes = "";
                for (int i = 0; i < releases.length(); i++) {
                    JSONObject r = releases.getJSONObject(i);
                    if (r.optBoolean("draft")) continue;
                    String tag = r.optString("tag_name");
                    int[] v = parseVersion(tag);
                    if (v == null || best == null || !newer(v, best)) continue;
                    JSONArray assets = r.optJSONArray("assets");
                    for (int j = 0; assets != null && j < assets.length(); j++) {
                        JSONObject a = assets.getJSONObject(j);
                        String url = a.optString("browser_download_url");
                        if ("IdleRealms.apk".equals(a.optString("name")) && url.startsWith(DOWNLOAD_PREFIX)) {
                            best = v; bestTag = tag; bestUrl = url;
                            String notes = r.optString("body");
                            bestNotes = notes.length() > 600 ? notes.substring(0, 600) : notes;
                        }
                    }
                }
                updateUrl = bestUrl;
                info.put("available", bestUrl != null);
                if (bestUrl != null) { info.put("version", bestTag.substring(1)); info.put("notes", bestNotes); }
            } catch (Exception e) {
                try { info.put("error", true); } catch (Exception ignored) { }
            }
            final String js = "window.onUpdateCheck && window.onUpdateCheck(" + info.toString() + ", " + manual + ")";
            runOnUiThread(() -> web.evaluateJavascript(js, null));
        }).start();
    }

    private static String readLimited(InputStream in, int max) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) {
            out.write(buf, 0, n);
            if (out.size() > max) throw new Exception("response too large");
        }
        return out.toString("UTF-8");
    }

    /** Lets the game close modals / menus first; exits only when the game says it has nothing to close. */
    private void handleBack() {
        web.evaluateJavascript("(window.handleBack && window.handleBack()) ? 'yes' : 'no'", result -> {
            if (!"\"yes\"".equals(result)) finish();
        });
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() { handleBack(); }

    @Override
    protected void onPause() {
        super.onPause();
        web.evaluateJavascript("window.save && save()", null);
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        }
        web.destroy();
        super.onDestroy();
    }
}
