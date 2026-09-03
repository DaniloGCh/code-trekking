package io.ionic.starter;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        // Habilitar popups y JavaScript para pasarelas de pago como PayPal
        WebView webView = this.getBridge().getWebView();
        if (webView != null) {
            WebSettings webSettings = webView.getSettings();
            webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
            webSettings.setMultipleWindows(true);
        }
    }
}