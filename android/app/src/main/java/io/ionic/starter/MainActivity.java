package io.ionic.starter;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 🔓 Permite que la SDK de PayPal abra el popup de inicio de sesión en el WebView
        WebSettings webSettings = this.bridge.getWebView().getSettings();
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        webSettings.setMultipleWindows(true);
    }
}