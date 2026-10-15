package in.ctgroup.kpi;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {

    public static final String DEFAULT_PORTAL_URL = "https://ctgroup-kra-kpi.onrender.com";
    private static final String PREF_NAME = "ctgroup_prefs";
    private static final String PREF_KEY_URL = "server_url";
    private static final int FILE_CHOOSER_REQUEST_CODE = 2026;

    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout errorLayout;
    private TextView errorTitle;
    private TextView errorMessage;
    private Button retryButton;
    private Button changeUrlButton;
    private ValueCallback<Uri[]> uploadMessageCallback;
    private long lastBackPressTime = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Global crash guard
        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            @Override
            public void uncaughtException(Thread thread, final Throwable throwable) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        showErrorView("Live Server is currently off. Please start the server and tap Reconnect.");
                    }
                });
            }
        });

        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        progressBar = findViewById(R.id.progressBar);
        errorLayout = findViewById(R.id.errorLayout);
        errorTitle = findViewById(R.id.errorTitle);
        errorMessage = findViewById(R.id.errorMessage);
        retryButton = findViewById(R.id.retryButton);
        changeUrlButton = findViewById(R.id.changeUrlButton);

        setupWebView();

        final String activeUrl = getServerUrl();

        retryButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (!isNetworkConnected()) {
                    Toast.makeText(MainActivity.this, "No internet connection detected", Toast.LENGTH_SHORT).show();
                    return;
                }
                errorLayout.setVisibility(View.GONE);
                if (webView != null) {
                    webView.setVisibility(View.VISIBLE);
                    webView.loadUrl(getServerUrl());
                } else {
                    setupWebView();
                    webView.loadUrl(getServerUrl());
                }
            }
        });

        if (changeUrlButton != null) {
            changeUrlButton.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    showChangeUrlDialog();
                }
            });
        }

        if (!isNetworkConnected()) {
            showErrorView("No internet connection detected. Please connect to Wi-Fi or cellular network and tap Reconnect.");
        } else {
            if (savedInstanceState != null) {
                webView.restoreState(savedInstanceState);
            } else {
                webView.loadUrl(activeUrl);
            }
        }
    }

    private String getServerUrl() {
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        return prefs.getString(PREF_KEY_URL, DEFAULT_PORTAL_URL);
    }

    private void saveServerUrl(String url) {
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        prefs.edit().putString(PREF_KEY_URL, url).apply();
    }

    private void showChangeUrlDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Server Configuration");
        builder.setMessage("Enter the CT Group KRA & KPI Portal URL (Cloud or Local):");

        final EditText input = new EditText(this);
        input.setText(getServerUrl());
        input.setSingleLine(true);
        builder.setView(input);

        builder.setPositiveButton("Connect", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                String newUrl = input.getText().toString().trim();
                if (!newUrl.isEmpty()) {
                    if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
                        newUrl = "https://" + newUrl;
                    }
                    saveServerUrl(newUrl);
                    Toast.makeText(MainActivity.this, "Connecting to: " + newUrl, Toast.LENGTH_SHORT).show();
                    errorLayout.setVisibility(View.GONE);
                    if (webView != null) {
                        webView.setVisibility(View.VISIBLE);
                        webView.loadUrl(newUrl);
                    }
                }
            }
        });

        builder.setNegativeButton("Default Render Cloud", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                saveServerUrl(DEFAULT_PORTAL_URL);
                Toast.makeText(MainActivity.this, "Reset to Render Cloud URL", Toast.LENGTH_SHORT).show();
                errorLayout.setVisibility(View.GONE);
                if (webView != null) {
                    webView.setVisibility(View.VISIBLE);
                    webView.loadUrl(DEFAULT_PORTAL_URL);
                }
            }
        });

        builder.show();
    }

    private boolean isNetworkConnected() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            if (cm != null) {
                NetworkInfo netInfo = cm.getActiveNetworkInfo();
                return netInfo != null && netInfo.isConnected();
            }
        } catch (Exception ignored) {}
        return true;
    }

    private void showErrorView(String message) {
        if (progressBar != null) progressBar.setVisibility(View.GONE);
        if (webView != null) webView.setVisibility(View.GONE);
        if (errorLayout != null) {
            errorLayout.setVisibility(View.VISIBLE);
            if (errorMessage != null && message != null) {
                errorMessage.setText(message);
            }
        }
    }

    private void setupWebView() {
        if (webView == null) {
            webView = findViewById(R.id.webview);
        }

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        try {
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        } catch (Exception ignored) {}

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                if (progressBar != null) progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (progressBar != null) progressBar.setVisibility(View.GONE);
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                showErrorView("Connection to server was interrupted. Tap Reconnect to restart.");
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    showErrorView("Portal is currently unreachable.\nCheck your internet or verify server address.");
                }
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                showErrorView("Unable to connect to portal (" + description + ").\nTap Reconnect or Change Server URL.");
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                if (request != null && request.isForMainFrame()) {
                    int statusCode = (errorResponse != null) ? errorResponse.getStatusCode() : 0;
                    if (statusCode >= 400) {
                        showErrorView("Server returned HTTP " + statusCode + ".\nPlease verify server status and tap Reconnect.");
                    }
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                showErrorView("SSL / Network handshake failed. Tap Reconnect to retry.");
                handler.cancel();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null) return false;
                Uri uri = request.getUrl();
                if (uri == null) return false;
                String scheme = uri.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                } catch (Exception ignored) {}
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (progressBar != null) {
                    progressBar.setProgress(newProgress);
                    if (newProgress >= 100) {
                        progressBar.setVisibility(View.GONE);
                    }
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (uploadMessageCallback != null) {
                    uploadMessageCallback.onReceiveValue(null);
                    uploadMessageCallback = null;
                }
                uploadMessageCallback = filePathCallback;

                Intent intent;
                try {
                    intent = fileChooserParams.createIntent();
                } catch (Exception e) {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }

                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                    return true;
                } catch (Exception e) {
                    uploadMessageCallback = null;
                    return false;
                }
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (uploadMessageCallback == null) return;

            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                }
            }
            uploadMessageCallback.onReceiveValue(results);
            uploadMessageCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }

        if (System.currentTimeMillis() - lastBackPressTime < 2000) {
            super.onBackPressed();
        } else {
            lastBackPressTime = System.currentTimeMillis();
            Toast.makeText(this, "Press BACK again to exit", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }
}
