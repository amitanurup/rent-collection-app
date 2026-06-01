package com.krishnaresidency.rentledger;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST_CODE = 7001;
    private static final int WRITE_STORAGE_REQUEST_CODE = 7002;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWebView();
        webView.loadUrl("file:///android_asset/index.html");
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void configureWebView() {
        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setTextZoom(100);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
            WebView.setWebContentsDebuggingEnabled(false);
        }

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new RentLedgerWebViewClient());
        webView.setWebChromeClient(new RentLedgerChromeClient());
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST_CODE || filePathCallback == null) {
            return;
        }

        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        }
        filePathCallback.onReceiveValue(result);
        filePathCallback = null;
    }

    private boolean handleExternalUri(Uri uri) {
        if (uri == null || uri.getScheme() == null) {
            return false;
        }

        String scheme = uri.getScheme().toLowerCase();
        if ("file".equals(scheme) || "about".equals(scheme) || "blob".equals(scheme)) {
            return false;
        }

        if ("http".equals(scheme) || "https".equals(scheme) || "sms".equals(scheme)
                || "smsto".equals(scheme) || "tel".equals(scheme) || "mailto".equals(scheme)
                || "whatsapp".equals(scheme) || "intent".equals(scheme)) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                startActivity(intent);
            } catch (ActivityNotFoundException error) {
                Toast.makeText(this, "No app found to open this link.", Toast.LENGTH_SHORT).show();
            }
            return true;
        }

        return false;
    }

    private void injectAndroidHelpers() {
        String script =
                "(function(){" +
                "if(window.__rentLedgerAndroidBridge){return;}" +
                "window.__rentLedgerAndroidBridge=true;" +
                "if(window.AndroidBridge){" +
                "window.print=function(){AndroidBridge.printPage();};" +
                "if(typeof window.downloadBlob==='function'){" +
                "var originalDownloadBlob=window.downloadBlob;" +
                "window.downloadBlob=function(blob,filename){" +
                "try{" +
                "var reader=new FileReader();" +
                "reader.onloadend=function(){AndroidBridge.saveBase64File(filename||'download.bin',blob.type||'application/octet-stream',String(reader.result));};" +
                "reader.readAsDataURL(blob);" +
                "return;" +
                "}catch(error){console.error(error);}" +
                "return originalDownloadBlob(blob,filename);" +
                "};" +
                "}" +
                "}" +
                "})();";
        webView.evaluateJavascript(script, null);
    }

    private void createPrintJob() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
            Toast.makeText(this, "Printing is not supported on this Android version.", Toast.LENGTH_SHORT).show();
            return;
        }

        PrintManager printManager = (PrintManager) getSystemService(PRINT_SERVICE);
        if (printManager == null) {
            Toast.makeText(this, "Print service is not available.", Toast.LENGTH_SHORT).show();
            return;
        }

        PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter("Rent Ledger Receipt");
        PrintAttributes attributes = new PrintAttributes.Builder()
                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                .build();
        printManager.print("Rent Ledger Receipt", adapter, attributes);
    }

    private void saveDataUrlToDownloads(String filename, String mimeType, String dataUrl) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                    && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, WRITE_STORAGE_REQUEST_CODE);
                Toast.makeText(this, "Storage permission granted hone ke baad dobara download karein.", Toast.LENGTH_LONG).show();
                return;
            }

            int commaIndex = dataUrl.indexOf(',');
            String encoded = commaIndex >= 0 ? dataUrl.substring(commaIndex + 1) : dataUrl;
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
            String safeName = sanitizeFilename(filename);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, safeName);
                values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) {
                    throw new IllegalStateException("Could not create download file.");
                }
                OutputStream outputStream = getContentResolver().openOutputStream(uri);
                if (outputStream == null) {
                    throw new IllegalStateException("Could not open download file.");
                }
                try {
                    outputStream.write(bytes);
                } finally {
                    outputStream.close();
                }
            } else {
                File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloads.exists() && !downloads.mkdirs()) {
                    throw new IllegalStateException("Could not open Downloads folder.");
                }
                File file = new File(downloads, safeName);
                FileOutputStream outputStream = new FileOutputStream(file);
                try {
                    outputStream.write(bytes);
                } finally {
                    outputStream.close();
                }
            }

            Toast.makeText(this, "Saved to Downloads: " + safeName, Toast.LENGTH_LONG).show();
        } catch (Exception error) {
            Toast.makeText(this, "Download failed: " + error.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private String sanitizeFilename(String filename) {
        String name = filename == null ? "rent-ledger-download" : filename.trim();
        if (name.length() == 0) {
            name = "rent-ledger-download";
        }
        return name.replaceAll("[\\\\/:*?\"<>|]", "-");
    }

    private class RentLedgerWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return handleExternalUri(request.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return handleExternalUri(Uri.parse(url));
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            injectAndroidHelpers();
        }
    }

    private class RentLedgerChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(null);
            }
            filePathCallback = callback;

            Intent intent;
            try {
                intent = params.createIntent();
            } catch (Exception error) {
                intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "application/pdf", "application/json"});
            }

            try {
                startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                return true;
            } catch (ActivityNotFoundException error) {
                filePathCallback = null;
                Toast.makeText(MainActivity.this, "No file picker found.", Toast.LENGTH_SHORT).show();
                return false;
            }
        }

        @Override
        public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
            WebView popup = new WebView(MainActivity.this);
            popup.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    return handleExternalUri(request.getUrl());
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    return handleExternalUri(Uri.parse(url));
                }

                @Override
                public void onPageStarted(WebView view, String url, Bitmap favicon) {
                    handleExternalUri(Uri.parse(url));
                    view.destroy();
                }
            });

            WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
            transport.setWebView(popup);
            resultMsg.sendToTarget();
            return true;
        }

        @Override
        public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
            return super.onConsoleMessage(consoleMessage);
        }
    }

    private class AndroidBridge {
        @JavascriptInterface
        public void saveBase64File(final String filename, final String mimeType, final String dataUrl) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    saveDataUrlToDownloads(filename, mimeType, dataUrl);
                }
            });
        }

        @JavascriptInterface
        public void printPage() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    createPrintJob();
                }
            });
        }
    }
}
